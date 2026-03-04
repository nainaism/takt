import type { LoadedConfig } from './resolvedConfig.js';
import {
  MIGRATED_PROJECT_LOCAL_CONFIG_KEYS,
  MIGRATED_PROJECT_LOCAL_CONFIG_METADATA,
  type MigratedProjectLocalConfigKey,
} from './migratedProjectLocalKeys.js';

const defaults: Record<string, unknown> = {};
for (const key of MIGRATED_PROJECT_LOCAL_CONFIG_KEYS) {
  const metadata = MIGRATED_PROJECT_LOCAL_CONFIG_METADATA[key] as { defaultValue?: unknown };
  const defaultValue = metadata.defaultValue;
  if (defaultValue !== undefined) {
    defaults[key] = defaultValue;
  }
}

export const MIGRATED_PROJECT_LOCAL_DEFAULTS =
  defaults as Partial<Pick<LoadedConfig, MigratedProjectLocalConfigKey>>;
