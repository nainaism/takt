/**
 * HermesBridge — TypeScript side of the long-lived Python bridge process.
 *
 * Manages the lifecycle of `vendor/hermes/takt_hermes_bridge.py`:
 * - Spawns the Python process on first use
 * - Communicates via newline-delimited JSON on stdin/stdout
 * - Supports setup, call, and shutdown commands
 * - Handles abortSignal, race conditions, and process lifecycle
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default disabled toolsets for readonly/edit permission modes */
const DEFAULT_DISABLED_TOOLSETS = ['image_gen', 'tts', 'homeassistant'] as const;

/** Max buffer size for stdout (1MB) */
const MAX_BUFFER_SIZE = 1024 * 1024;

/** Request timeout for bridge calls (5 minutes for long agent conversations) */
const REQUEST_TIMEOUT_MS = 300_000;

/** Grace period after sending shutdown before killing the process */
const SHUTDOWN_GRACE_MS = 3_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BridgeSetupParams {
  name?: string;
  systemPrompt?: string;
  permissionMode?: string;
  disabledToolsets?: string[];
  enabledToolsets?: string[];
  sessionId?: string;
  model?: string;
  maxTurns?: number;
  baseUrl?: string;
  apiKey?: string;
}

export interface BridgeCallParams {
  prompt: string;
  systemMessage?: string;
  conversationHistory?: unknown[];
  sessionId?: string;
  taskId?: string;
}

export interface BridgeUsageResult {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
  provider: string;
  apiCalls: number;
}

export interface BridgeCallResult {
  status: 'done' | 'blocked' | 'error';
  content: string;
  error?: string;
  sessionId?: string;
  usage?: BridgeUsageResult;
  completed?: boolean;
  interrupted?: boolean;
}

interface BridgeRequest {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface BridgeResponse {
  id: number;
  result?: BridgeCallResult;
  error?: { message: string; type: string };
}

interface PendingEntry {
  resolve: (value: BridgeResponse) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  abortSignal?: AbortSignal;
  abortHandler?: () => void;
}

// ---------------------------------------------------------------------------
// Bridge singleton
// ---------------------------------------------------------------------------

let _instance: HermesBridge | null = null;
let _reqId = 0;

function expandHome(path: string): string {
  if (path.startsWith('~')) {
    return resolve(process.env.HOME ?? '/Users/nainai', path.slice(1));
  }
  return path;
}

export class HermesBridge {
  private process: ChildProcess | null = null;
  private pending: Map<number, PendingEntry> = new Map();
  private buffer = '';
  private initialized = false;
  /** Guard against double-spawn race condition (#3) */
  private startingPromise: Promise<void> | null = null;

  static getInstance(): HermesBridge {
    if (!_instance) {
      _instance = new HermesBridge();
    }
    return _instance;
  }

  static resetInstance(): void {
    if (_instance) {
      _instance.shutdown().catch(() => {});
    }
    _instance = null;
  }

  // ---------------------------------------------------------------------------
  // Process lifecycle
  // ---------------------------------------------------------------------------

  private async ensureProcess(): Promise<void> {
    // Race condition guard — reuse the same promise (#3)
    if (this.startingPromise) {
      return this.startingPromise;
    }

    if (this.process && !this.process.killed) return;

    this.startingPromise = this._startProcess();
    try {
      await this.startingPromise;
    } finally {
      this.startingPromise = null;
    }
  }

  private async _startProcess(): Promise<void> {
    const python = this.resolvePython();
    const script = this.resolveScript();

    this.process = spawn(python, [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    this.process.on('error', (err) => {
      this.rejectAllPending(err);
    });

    // Fix #4: reject pending on ANY exit, including code 0
    this.process.on('exit', (code) => {
      const err = new Error(
        `Bridge process exited unexpectedly (code=${code ?? 'null'})`,
      );
      this.rejectAllPending(err);
      this.process = null;
      this.initialized = false;
    });

    this.process.stdout!.on('data', (chunk: Buffer) => {
      this.handleData(chunk.toString('utf-8'));
    });

    this.process.stderr!.on('data', (chunk: Buffer) => {
      const lines = chunk.toString('utf-8').trim().split('\n');
      for (const line of lines) {
        if (line && (line.includes('ERROR') || line.includes('Traceback'))) {
          console.error(`[hermes-bridge] ${line}`);
        }
      }
    });

    // Wait for the "ready" signal (id=0 from bridge startup)
    const ready = await this.sendRequest('setup', {});
    if (ready.error) {
      throw new Error(`Bridge setup failed: ${ready.error.message}`);
    }
    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async setup(params: BridgeSetupParams): Promise<BridgeCallResult> {
    await this.ensureProcess();
    return this.callInternal('setup', params as unknown as Record<string, unknown>);
  }

  async call(params: BridgeCallParams, abortSignal?: AbortSignal): Promise<BridgeCallResult> {
    await this.ensureProcess();
    return this.callInternal('call', { ...params } as Record<string, unknown>, abortSignal);
  }

  async shutdown(): Promise<void> {
    if (this.process && !this.process.killed) {
      try {
        // Fix #8: give Python time to clean up before killing
        await Promise.race([
          this.callInternal('shutdown', {}),
          new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_GRACE_MS)),
        ]);
      } catch {
        // Ignore errors during shutdown
      }
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async callInternal(
    method: string,
    params: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): Promise<BridgeCallResult> {
    const response = await this.sendRequest(method, params, abortSignal);
    if (response.error) {
      return {
        status: 'error',
        content: '',
        error: response.error.message,
      };
    }
    return response.result ?? { status: 'error', content: '', error: 'empty-result' };
  }

  private sendRequest(
    method: string,
    params: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): Promise<BridgeResponse> {
    return new Promise<BridgeResponse>((resolve, reject) => {
      if (!this.process || this.process.killed) {
        reject(new Error('Bridge process not running'));
        return;
      }

      const id = ++_reqId;
      const request: BridgeRequest = { id, method, params };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Bridge request ${id} timeout (method=${method})`));
      }, REQUEST_TIMEOUT_MS);

      // Fix #2: abortSignal support
      let abortHandler: (() => void) | undefined;
      if (abortSignal && !abortSignal.aborted) {
        abortHandler = () => {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(new Error(`Bridge request ${id} aborted (method=${method})`));
        };
        abortSignal.addEventListener('abort', abortHandler);
      } else if (abortSignal?.aborted) {
        reject(new Error(`Bridge request aborted before sending (method=${method})`));
        return;
      }

      this.pending.set(id, { resolve, reject, timer, abortSignal, abortHandler });

      const line = JSON.stringify(request) + '\n';
      // Fix #7: handle stdin backpressure via drain
      const written = this.process.stdin!.write(line, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(id);
          if (abortHandler && abortSignal) {
            abortSignal.removeEventListener('abort', abortHandler);
          }
          reject(err);
        }
      });

      // If write returned false (backpressure), wait for drain
      if (!written && this.process.stdin!.writable) {
        this.process.stdin!.once('drain', () => {
          // Data was already buffered; just let the write callback handle errors
        });
      }
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Fix: buffer size limit to prevent unbounded growth
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      // Keep only the last portion that could contain a valid response
      this.buffer = this.buffer.slice(-MAX_BUFFER_SIZE / 2);
      console.warn('[hermes-bridge] Buffer size limit reached, truncating');
    }

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const response: BridgeResponse = JSON.parse(trimmed);
        const id = response.id;
        const entry = this.pending.get(id);
        if (entry) {
          clearTimeout(entry.timer);
          if (entry.abortHandler && entry.abortSignal) {
            entry.abortSignal.removeEventListener('abort', entry.abortHandler);
          }
          this.pending.delete(id);
          entry.resolve(response);
        }
      } catch {
        console.warn(`[hermes-bridge] Unexpected stdout line: ${trimmed}`);
      }
    }
  }

  /** Reject all pending requests — used on process exit/error (#4) */
  private rejectAllPending(err: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      if (entry.abortHandler && entry.abortSignal) {
        entry.abortSignal.removeEventListener('abort', entry.abortHandler);
      }
      entry.reject(err);
    }
    this.pending.clear();
  }

  private resolvePython(): string {
    const hermesHome = expandHome(process.env.HERMES_HOME ?? '~/.hermes');
    const venvPython = resolve(hermesHome, 'hermes-agent', 'venv', 'bin', 'python3');
    if (existsSync(venvPython)) return venvPython;
    return 'python3';
  }

  private resolveScript(): string {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    // dist/infra/providers/hermesBridge.js → vendor/hermes/takt_hermes_bridge.py
    const distPath = resolve(thisDir, '..', '..', 'vendor', 'hermes', 'takt_hermes_bridge.py');
    // src/infra/providers/hermesBridge.ts → vendor/hermes/takt_hermes_bridge.py
    const srcPath = resolve(thisDir, '..', '..', '..', 'vendor', 'hermes', 'takt_hermes_bridge.py');

    if (existsSync(distPath)) return distPath;
    if (existsSync(srcPath)) return srcPath;
    return distPath; // fallback, will fail at runtime with clear error
  }
}

/** Re-export constant for use in hermesProvider.ts */
export { DEFAULT_DISABLED_TOOLSETS };