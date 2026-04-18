/**
 * Hermes provider — bridges to a long-lived Python process running AIAgent.
 */

import { HermesBridge, DEFAULT_DISABLED_TOOLSETS } from './hermesBridge.js';
import type { AgentResponse } from '../../core/models/index.js';
import type { AgentSetup, Provider, ProviderAgent, ProviderCallOptions } from './types.js';

/** Map TAKT permission mode to Hermes toolset restrictions */
function toHermesPermissionConfig(mode?: string): {
  permissionMode: string;
  disabledToolsets: string[];
} {
  switch (mode) {
    case 'readonly':
      return {
        permissionMode: 'readonly',
        disabledToolsets: [...DEFAULT_DISABLED_TOOLSETS],
      };
    case 'edit':
      return {
        permissionMode: 'edit',
        disabledToolsets: [...DEFAULT_DISABLED_TOOLSETS],
      };
    case 'full':
      return { permissionMode: 'full', disabledToolsets: [] };
    default:
      return {
        permissionMode: 'readonly',
        disabledToolsets: [...DEFAULT_DISABLED_TOOLSETS],
      };
  }
}

export class HermesProvider implements Provider {
  readonly supportsStructuredOutput = false;

  setup(config: AgentSetup): ProviderAgent {
    const { name, systemPrompt } = config;

    return {
      call: async (prompt: string, options: ProviderCallOptions): Promise<AgentResponse> => {
        const bridge = HermesBridge.getInstance();
        const permConfig = toHermesPermissionConfig(options.permissionMode);

        // Setup the agent if not already initialized
        await bridge.setup({
          name,
          systemPrompt: systemPrompt ?? '',
          permissionMode: permConfig.permissionMode,
          disabledToolsets: permConfig.disabledToolsets,
          sessionId: options.sessionId,
          model: options.model,
          maxTurns: options.maxTurns,
        });

        // Execute the call — pass abortSignal for cancellation (#2)
        const result = await bridge.call(
          {
            prompt,
            systemMessage: systemPrompt ?? undefined,
            sessionId: options.sessionId,
            taskId: name,
          },
          options.abortSignal,
        );

        // Map bridge result → AgentResponse
        let status: 'done' | 'blocked' | 'error' = 'done';
        if (result.status === 'error') {
          status = 'error';
        } else if (result.status === 'blocked') {
          status = 'blocked';
        }

        return {
          persona: name,
          status,
          content: result.content ?? '',
          timestamp: new Date(),
          sessionId: result.sessionId,
          error: result.error,
          providerUsage: result.usage
            ? {
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                totalTokens: result.usage.totalTokens,
                cacheReadInputTokens: result.usage.cacheReadTokens,
                cacheCreationInputTokens: result.usage.cacheWriteTokens,
                usageMissing: false,
              }
            : { usageMissing: true, reason: 'bridge-no-usage' },
        };
      },
    };
  }
}