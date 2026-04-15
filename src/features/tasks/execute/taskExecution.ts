/**
 * Public task execution entrypoints.
 */

import type { TaskRunner, TaskInfo } from '../../../infra/task/index.js';
import { executeWorkflow } from './workflowExecution.js';
import type { TaskExecutionOptions, ExecuteTaskOptions } from './types.js';
import {
  executeAndPersistTask,
  executeTaskWithWorkflow,
  type TaskExecutionParallelOptions,
} from './taskExecutionShared.js';

export type { TaskExecutionOptions, ExecuteTaskOptions };

/**
 * Execute a single task with workflow.
 */
export async function executeTask(options: ExecuteTaskOptions): Promise<boolean> {
  const result = await executeTaskWithWorkflow(options, executeWorkflow);
  return result.success;
}

/**
 * Execute a task: resolve clone → run workflow → auto-commit+push → remove clone → record completion.
 *
 * Shared/public task completion path used by watch mode and direct task execution.
 * Run mode keeps its ignore-exceed control in runTaskExecution.ts.
 *
 * @returns true if the task succeeded
 */
export async function executeAndCompleteTask(
  task: TaskInfo,
  taskRunner: TaskRunner,
  cwd: string,
  taskExecutionOptions?: TaskExecutionOptions,
  parallelOptions?: TaskExecutionParallelOptions,
): Promise<boolean> {
  return executeAndPersistTask(task, taskRunner, cwd, executeWorkflow, taskExecutionOptions, parallelOptions);
}
