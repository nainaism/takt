import type { TaskRunner, TaskInfo } from '../../../infra/task/index.js';
import { executeWorkflow } from './workflowExecution.js';
import { executeWorkflowForRun } from './workflowRunExecution.js';
import {
  executeAndPersistTask,
  type TaskExecutionParallelOptions,
  type WorkflowExecutor,
} from './taskExecutionShared.js';
import type { RunTaskExecutionOptions } from './types.js';

function createRunWorkflowExecutor(
  taskExecutionOptions: RunTaskExecutionOptions | undefined,
): WorkflowExecutor {
  if (taskExecutionOptions?.ignoreExceed === true) {
    return async (workflowConfig, task, cwd, workflowExecutionOptions) =>
      executeWorkflowForRun(workflowConfig, task, cwd, workflowExecutionOptions, {
        ignoreIterationLimit: true,
      });
  }

  return executeWorkflow;
}

export async function executeAndCompleteRunTask(
  task: TaskInfo,
  taskRunner: TaskRunner,
  cwd: string,
  taskExecutionOptions?: RunTaskExecutionOptions,
  parallelOptions?: TaskExecutionParallelOptions,
): Promise<boolean> {
  return executeAndPersistTask(
    task,
    taskRunner,
    cwd,
    createRunWorkflowExecutor(taskExecutionOptions),
    taskExecutionOptions,
    parallelOptions,
  );
}
