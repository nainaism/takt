type MigratedProjectLocalConfigMetadata = {
  readonly defaultValue?: unknown;
  readonly legacyGlobalYamlKey: string;
};

/**
 * Project-local keys migrated from persisted global config.
 * Keep this metadata as the single source of truth.
 */
export const MIGRATED_PROJECT_LOCAL_CONFIG_METADATA = {
  logLevel: { defaultValue: 'info', legacyGlobalYamlKey: 'log_level' },
  pipeline: { legacyGlobalYamlKey: 'pipeline' },
  personaProviders: { legacyGlobalYamlKey: 'persona_providers' },
  branchNameStrategy: { legacyGlobalYamlKey: 'branch_name_strategy' },
  minimalOutput: { defaultValue: false, legacyGlobalYamlKey: 'minimal_output' },
  verbose: { defaultValue: false, legacyGlobalYamlKey: 'verbose' },
  concurrency: { defaultValue: 1, legacyGlobalYamlKey: 'concurrency' },
  taskPollIntervalMs: { defaultValue: 500, legacyGlobalYamlKey: 'task_poll_interval_ms' },
  interactivePreviewMovements: { defaultValue: 3, legacyGlobalYamlKey: 'interactive_preview_movements' },
} as const satisfies Record<string, MigratedProjectLocalConfigMetadata>;

export type MigratedProjectLocalConfigKey = keyof typeof MIGRATED_PROJECT_LOCAL_CONFIG_METADATA;

export const MIGRATED_PROJECT_LOCAL_CONFIG_KEYS = Object.freeze(
  Object.keys(MIGRATED_PROJECT_LOCAL_CONFIG_METADATA) as MigratedProjectLocalConfigKey[],
);
