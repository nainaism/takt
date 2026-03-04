/**
 * Global configuration public API.
 * Keep this file as a stable facade and delegate implementations to focused modules.
 * Global-only field ownership is defined in PersistedGlobalConfig via `@globalOnly` markers.
 */

import type { PersistedGlobalConfig } from '../../../core/models/persisted-global-config.js';
import type { MigratedProjectLocalConfigKey } from '../migratedProjectLocalKeys.js';

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Compile-time guard:
 * migrated project-local fields must not exist on PersistedGlobalConfig.
 */
const globalConfigMigratedFieldGuard: Assert<
  IsNever<Extract<keyof PersistedGlobalConfig, MigratedProjectLocalConfigKey>>
> = true;
void globalConfigMigratedFieldGuard;

export {
  invalidateGlobalConfigCache,
  loadGlobalConfig,
  loadGlobalMigratedProjectLocalFallback,
  saveGlobalConfig,
  validateCliPath,
} from './globalConfigCore.js';

export {
  getDisabledBuiltins,
  getBuiltinPiecesEnabled,
  getLanguage,
  setLanguage,
  setProvider,
} from './globalConfigAccessors.js';

export {
  resolveAnthropicApiKey,
  resolveOpenaiApiKey,
  resolveCodexCliPath,
  resolveClaudeCliPath,
  resolveCursorCliPath,
  resolveCopilotCliPath,
  resolveCopilotGithubToken,
  resolveOpencodeApiKey,
  resolveCursorApiKey,
} from './globalConfigResolvers.js';
