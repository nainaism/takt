import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resetGlobalConfigToTemplate } from '../infra/config/global/resetConfig.js';

describe('resetGlobalConfigToTemplate', () => {
  const originalEnv = process.env;
  let testRoot: string;
  let taktDir: string;
  let configPath: string;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'takt-reset-config-'));
    taktDir = join(testRoot, '.takt');
    mkdirSync(taktDir, { recursive: true });
    configPath = join(taktDir, 'config.yaml');
    process.env = { ...originalEnv, TAKT_CONFIG_DIR: taktDir };
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testRoot, { recursive: true, force: true });
  });

  it('should backup existing config and replace with language-matched template', () => {
    writeFileSync(configPath, ['language: ja', 'provider: mock'].join('\n'), 'utf-8');

    const result = resetGlobalConfigToTemplate(new Date('2026-02-19T12:00:00Z'));

    expect(result.language).toBe('ja');
    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);
    expect(readFileSync(result.backupPath!, 'utf-8')).toContain('provider: mock');

    const newConfig = readFileSync(configPath, 'utf-8');
    expect(newConfig).toContain('# TAKT グローバル設定サンプル');
    expect(newConfig).toContain('language: ja');
    expect(newConfig).not.toContain('provider:');
    expect(newConfig).not.toContain('runtime:');
    expect(newConfig).not.toContain('branch_name_strategy:');
    expect(newConfig).not.toContain('concurrency:');
    expect(newConfig).not.toContain('minimal_output:');
    expect(newConfig).not.toContain('task_poll_interval_ms:');
    expect(newConfig).not.toContain('persona_providers:');
    expect(newConfig).not.toContain('pipeline:');
  });

  it('should create config from default language template when config does not exist', () => {
    rmSync(configPath, { force: true });

    const result = resetGlobalConfigToTemplate(new Date('2026-02-19T12:00:00Z'));

    expect(result.backupPath).toBeUndefined();
    expect(result.language).toBe('en');
    expect(existsSync(configPath)).toBe(true);
    const newConfig = readFileSync(configPath, 'utf-8');
    expect(newConfig).toContain('# TAKT global configuration sample');
    expect(newConfig).toContain('language: en');
    expect(newConfig).not.toContain('provider:');
    expect(newConfig).not.toContain('runtime:');
    expect(newConfig).not.toContain('branch_name_strategy:');
    expect(newConfig).not.toContain('concurrency:');
  });
});
