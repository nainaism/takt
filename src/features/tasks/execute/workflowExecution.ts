import type { WorkflowConfig } from '../../../core/models/index.js';
import type { WorkflowExecutionResult, WorkflowExecutionOptions } from './types.js';
import { executeWorkflowInternal } from './workflowExecutionShared.js';

export type { WorkflowExecutionResult, WorkflowExecutionOptions };

export async function executeWorkflow(
  workflowConfig: WorkflowConfig,
  task: string,
  cwd: string,
  options: WorkflowExecutionOptions,
): Promise<WorkflowExecutionResult> {
  return executeWorkflowInternal(workflowConfig, task, cwd, options);
}
