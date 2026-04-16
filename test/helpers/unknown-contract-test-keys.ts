import {
  deprecatedStepPluralTerm,
  deprecatedStepTerm,
  deprecatedWorkflowPluralTerm,
  deprecatedWorkflowTerm,
  getDeprecatedDirName,
} from './deprecated-terminology.js';

const deprecatedWorkflowUpper = deprecatedWorkflowTerm.toUpperCase();
const deprecatedWorkflowPluralUpper = deprecatedWorkflowPluralTerm.toUpperCase();
const deprecatedStepPluralUpper = deprecatedStepPluralTerm.toUpperCase();

export const unexpectedWorkflowKey = deprecatedWorkflowTerm;
export const unexpectedWorkflowCliOptionKey = unexpectedWorkflowKey;
export const unexpectedWorkflowCliOptionFlag = `--${unexpectedWorkflowCliOptionKey}`;

export const unexpectedWorkflowDirName = getDeprecatedDirName('.takt/workflows/');
export const unexpectedWorkflowConfigKey = `${deprecatedWorkflowTerm}_config`;
export const unexpectedStepListKey = deprecatedStepPluralTerm;
export const unexpectedInitialStepKey = `initial_${deprecatedStepTerm}`;
export const unexpectedMaxStepsKey = `max_${deprecatedStepPluralTerm}`;
export const unexpectedStartStepKey = `start_${deprecatedStepTerm}`;
export const unexpectedWorkflowCategoriesFileName = `${deprecatedWorkflowTerm}-categories.yaml`;

export const unexpectedCategoryRootKey = `${deprecatedWorkflowTerm}_categories`;
export const unexpectedWorkflowCategoryListKey = deprecatedWorkflowPluralTerm;

export const unexpectedStepPermissionOverrideKey = `${deprecatedStepTerm}_permission_overrides`;

export const unexpectedInteractivePreviewConfigKey = `interactive_preview_${deprecatedStepPluralTerm}`;
export const unexpectedInteractivePreviewEnvVar = `TAKT_INTERACTIVE_PREVIEW_${deprecatedStepPluralUpper}`;

export const unexpectedWorkflowOverridesConfigKey = `${deprecatedWorkflowTerm}_overrides`;
export const unexpectedWorkflowRuntimePrepareConfigKey = `${deprecatedWorkflowTerm}_runtime_prepare`;
export const unexpectedWorkflowArpeggioConfigKey = `${deprecatedWorkflowTerm}_arpeggio`;
export const unexpectedWorkflowMcpServersConfigKey = `${deprecatedWorkflowTerm}_mcp_servers`;
export const unexpectedEnableBuiltinWorkflowsConfigKey = `enable_builtin_${deprecatedWorkflowPluralTerm}`;
export const unexpectedWorkflowCategoriesFileConfigKey = `${deprecatedWorkflowTerm}_categories_file`;
export const unexpectedNotificationWorkflowCompleteConfigKey = `${deprecatedWorkflowTerm}_complete`;
export const unexpectedNotificationWorkflowAbortConfigKey = `${deprecatedWorkflowTerm}_abort`;

export const unexpectedConfigEnv = {
  workflowRuntimePrepare: `TAKT_${deprecatedWorkflowUpper}_RUNTIME_PREPARE`,
  workflowRuntimePrepareCustomScripts: `TAKT_${deprecatedWorkflowUpper}_RUNTIME_PREPARE_CUSTOM_SCRIPTS`,
  workflowArpeggio: `TAKT_${deprecatedWorkflowUpper}_ARPEGGIO`,
  workflowArpeggioCustomDataSourceModules:
    `TAKT_${deprecatedWorkflowUpper}_ARPEGGIO_CUSTOM_DATA_SOURCE_MODULES`,
  workflowArpeggioCustomMergeInlineJs:
    `TAKT_${deprecatedWorkflowUpper}_ARPEGGIO_CUSTOM_MERGE_INLINE_JS`,
  workflowArpeggioCustomMergeFiles: `TAKT_${deprecatedWorkflowUpper}_ARPEGGIO_CUSTOM_MERGE_FILES`,
  workflowMcpServers: `TAKT_${deprecatedWorkflowUpper}_MCP_SERVERS`,
  workflowMcpServersStdio: `TAKT_${deprecatedWorkflowUpper}_MCP_SERVERS_STDIO`,
  workflowMcpServersHttp: `TAKT_${deprecatedWorkflowUpper}_MCP_SERVERS_HTTP`,
  workflowMcpServersSse: `TAKT_${deprecatedWorkflowUpper}_MCP_SERVERS_SSE`,
  enableBuiltinWorkflows: `TAKT_ENABLE_BUILTIN_${deprecatedWorkflowPluralUpper}`,
  workflowCategoriesFile: `TAKT_${deprecatedWorkflowUpper}_CATEGORIES_FILE`,
  notificationWorkflowComplete: `TAKT_NOTIFICATION_SOUND_EVENTS_${deprecatedWorkflowUpper}_COMPLETE`,
  notificationWorkflowAbort: `TAKT_NOTIFICATION_SOUND_EVENTS_${deprecatedWorkflowUpper}_ABORT`,
} as const;
