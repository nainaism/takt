import { ProjectConfigSchema } from '../../../core/models/index.js';
import {
  normalizePipelineConfig,
  normalizePersonaProviders,
} from '../configNormalizers.js';
import {
  MIGRATED_PROJECT_LOCAL_CONFIG_METADATA,
  type MigratedProjectLocalConfigKey,
} from '../migratedProjectLocalKeys.js';
import type { ProjectLocalConfig } from '../types.js';

export type GlobalMigratedProjectLocalFallback = Partial<
  Pick<ProjectLocalConfig, MigratedProjectLocalConfigKey>
>;

export function removeMigratedProjectLocalKeys(config: Record<string, unknown>): void {
  for (const metadata of Object.values(MIGRATED_PROJECT_LOCAL_CONFIG_METADATA)) {
    delete config[metadata.legacyGlobalYamlKey];
  }
}

export function extractMigratedProjectLocalFallback(
  rawConfig: Record<string, unknown>,
): GlobalMigratedProjectLocalFallback {
  const rawMigratedConfig: Record<string, unknown> = {};
  for (const metadata of Object.values(MIGRATED_PROJECT_LOCAL_CONFIG_METADATA)) {
    const value = rawConfig[metadata.legacyGlobalYamlKey];
    if (value !== undefined) {
      rawMigratedConfig[metadata.legacyGlobalYamlKey] = value;
    }
  }
  if (Object.keys(rawMigratedConfig).length === 0) {
    return {};
  }

  const parsedMigratedConfig = ProjectConfigSchema.partial().parse(rawMigratedConfig);
  const {
    log_level,
    pipeline,
    persona_providers,
    branch_name_strategy,
    minimal_output,
    verbose,
    concurrency,
    task_poll_interval_ms,
    interactive_preview_movements,
  } = parsedMigratedConfig;

  return {
    logLevel: log_level as ProjectLocalConfig['logLevel'],
    pipeline: normalizePipelineConfig(
      pipeline as {
        default_branch_prefix?: string;
        commit_message_template?: string;
        pr_body_template?: string;
      } | undefined,
    ),
    personaProviders: normalizePersonaProviders(
      persona_providers as Record<string, string | { type?: string; provider?: string; model?: string }> | undefined,
    ),
    branchNameStrategy: branch_name_strategy as ProjectLocalConfig['branchNameStrategy'],
    minimalOutput: minimal_output as ProjectLocalConfig['minimalOutput'],
    verbose: verbose as ProjectLocalConfig['verbose'],
    concurrency: concurrency as ProjectLocalConfig['concurrency'],
    taskPollIntervalMs: task_poll_interval_ms as ProjectLocalConfig['taskPollIntervalMs'],
    interactivePreviewMovements: interactive_preview_movements as ProjectLocalConfig['interactivePreviewMovements'],
  };
}
