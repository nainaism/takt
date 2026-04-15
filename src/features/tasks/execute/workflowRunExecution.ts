import type { WorkflowConfig } from '../../../core/models/index.js';
import type { WorkflowExecutionOptions, WorkflowExecutionResult } from './types.js';
import { executeWorkflowInternal, type WorkflowRunControlOptions } from './workflowExecutionShared.js';

export async function executeWorkflowForRun(
  workflowConfig: WorkflowConfig,
  task: string,
  cwd: string,
  options: WorkflowExecutionOptions,
  runControlOptions?: WorkflowRunControlOptions,
): Promise<WorkflowExecutionResult> {
  return executeWorkflowInternal(workflowConfig, task, cwd, options, runControlOptions);
}
