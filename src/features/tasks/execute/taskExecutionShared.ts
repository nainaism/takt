/**
 * Shared task execution and persistence logic.
 */

import { loadWorkflowByIdentifier, isWorkflowPath, resolveWorkflowConfigValues } from '../../../infra/config/index.js';
import { validateWorkflowExecutionTrustBoundary } from '../../../infra/config/loaders/workflowTrustBoundary.js';
import { resolveProviderOptionsWithTrace } from '../../../infra/config/resolveConfigValue.js';
import type { TaskRunner, TaskInfo } from '../../../infra/task/index.js';
import { info, error } from '../../../shared/ui/index.js';
import { createLogger } from '../../../shared/utils/index.js';
import type { WorkflowConfig } from '../../../core/models/index.js';
import type {
  TaskExecutionOptions,
  ExecuteTaskOptions,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
} from './types.js';
import { resolveTaskExecution, resolveTaskIssue } from './resolveTask.js';
import { postExecutionFlow } from './postExecution.js';
import {
  buildBooleanTaskResult,
  buildTaskResult,
  persistExceededTaskResult,
  persistTaskError,
  persistPrFailedTaskResult,
  persistTaskResult,
} from './taskResultHandler.js';
import { sanitizeTerminalText } from '../../../shared/utils/text.js';

const log = createLogger('task');

export type TaskExecutionParallelOptions = {
  abortSignal?: AbortSignal;
  taskPrefix?: string;
  taskColorIndex?: number;
  taskDisplayLabel?: string;
};

export type WorkflowExecutor = (
  workflowConfig: WorkflowConfig,
  task: string,
  cwd: string,
  options: WorkflowExecutionOptions,
) => Promise<WorkflowExecutionResult>;

function resolveAgentOverrides(
  agentOverrides: TaskExecutionOptions | undefined,
): TaskExecutionOptions | undefined {
  if (!agentOverrides) {
    return undefined;
  }

  return {
    provider: agentOverrides.provider,
    model: agentOverrides.model,
  };
}

export async function executeTaskWithWorkflow(
  options: ExecuteTaskOptions,
  workflowExecutor: WorkflowExecutor,
): Promise<WorkflowExecutionResult> {
  const {
    task,
    cwd,
    workflowIdentifier,
    projectCwd,
    agentOverrides,
    interactiveUserInput,
    interactiveMetadata,
    startStep,
    retryNote,
    resumePoint,
    reportDirName,
    abortSignal,
    taskPrefix,
    taskColorIndex,
    taskDisplayLabel,
    maxStepsOverride,
    initialIterationOverride,
    currentTaskIssueNumber,
  } = options;
  const workflowConfig = loadWorkflowByIdentifier(workflowIdentifier, projectCwd, { lookupCwd: cwd });
  const safeWorkflowIdentifier = sanitizeTerminalText(workflowIdentifier);

  if (!workflowConfig) {
    if (isWorkflowPath(workflowIdentifier)) {
      error(`Workflow file not found: ${safeWorkflowIdentifier}`);
      return { success: false, reason: `Workflow file not found: ${safeWorkflowIdentifier}` };
    }

    error(`Workflow "${safeWorkflowIdentifier}" not found.`);
    info('Available workflows are searched in .takt/workflows/ and ~/.takt/workflows/.');
    info('If the same workflow name exists in multiple locations, project workflows/ take priority over user workflows/.');
    info('Specify a valid workflow when creating tasks (e.g., via "takt add").');
    return { success: false, reason: `Workflow "${safeWorkflowIdentifier}" not found.` };
  }

  validateWorkflowExecutionTrustBoundary(workflowConfig, projectCwd);

  log.debug('Running workflow', {
    name: workflowConfig.name,
    steps: workflowConfig.steps.map((s: { name: string }) => s.name),
  });

  const config = resolveWorkflowConfigValues(projectCwd, ['language', 'personaProviders', 'providerProfiles']);
  const providerOptions = resolveProviderOptionsWithTrace(projectCwd);
  const workflowExecutionOptions: WorkflowExecutionOptions = {
    projectCwd,
    provider: agentOverrides?.provider,
    model: agentOverrides?.model,
    language: config.language,
    providerOptions: providerOptions.value,
    providerOptionsSource: providerOptions.source,
    providerOptionsOriginResolver: providerOptions.originResolver,
    personaProviders: config.personaProviders,
    providerProfiles: config.providerProfiles,
    interactiveUserInput,
    interactiveMetadata,
    startStep,
    retryNote,
    resumePoint,
    reportDirName,
    abortSignal,
    taskPrefix,
    taskColorIndex,
    taskDisplayLabel,
    maxStepsOverride,
    initialIterationOverride,
    currentTaskIssueNumber,
  };

  return workflowExecutor(workflowConfig, task, cwd, workflowExecutionOptions);
}

export async function executeAndPersistTask(
  task: TaskInfo,
  taskRunner: TaskRunner,
  cwd: string,
  workflowExecutor: WorkflowExecutor,
  taskExecutionOptions?: TaskExecutionOptions,
  parallelOptions?: TaskExecutionParallelOptions,
): Promise<boolean> {
  const startedAt = new Date().toISOString();
  let taskForPersistence = task;
  const taskAbortController = new AbortController();
  const externalAbortSignal = parallelOptions?.abortSignal;
  const taskAbortSignal = externalAbortSignal ? taskAbortController.signal : undefined;

  const onExternalAbort = (): void => {
    taskAbortController.abort();
  };

  if (externalAbortSignal) {
    if (externalAbortSignal.aborted) {
      taskAbortController.abort();
    } else {
      externalAbortSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const {
      execCwd,
      workflowIdentifier,
      isWorktree,
      taskPrompt,
      reportDirName,
      branch,
      worktreePath,
      baseBranch,
      startStep,
      retryNote,
      resumePoint,
      autoPr,
      draftPr,
      shouldPublishBranchToOrigin,
      issueNumber,
      maxStepsOverride,
      initialIterationOverride,
    } = await resolveTaskExecution(task, cwd, taskAbortSignal);

    const executionTask = taskRunner.updateRunningTaskExecution(task.name, {
      runSlug: reportDirName,
      ...(worktreePath ? { worktreePath } : {}),
      ...(branch ? { branch } : {}),
    });
    taskForPersistence = executionTask;

    const projectRootCwd = cwd;
    const taskRunResult = await executeTaskWithWorkflow({
      task: taskPrompt ?? task.content,
      cwd: execCwd,
      workflowIdentifier,
      projectCwd: projectRootCwd,
      agentOverrides: resolveAgentOverrides(taskExecutionOptions),
      startStep,
      retryNote,
      resumePoint,
      reportDirName,
      abortSignal: taskAbortSignal,
      taskPrefix: parallelOptions?.taskPrefix,
      taskColorIndex: parallelOptions?.taskColorIndex,
      taskDisplayLabel: parallelOptions?.taskDisplayLabel,
      maxStepsOverride,
      initialIterationOverride,
      currentTaskIssueNumber: issueNumber,
    }, workflowExecutor);

    if (taskRunResult.exceeded && taskRunResult.exceededInfo) {
      persistExceededTaskResult(taskRunner, executionTask, taskRunResult.exceededInfo, {
        worktreePath,
        branch,
      });
      return false;
    }

    const taskSuccess = taskRunResult.success;
    const completedAt = new Date().toISOString();

    let prUrl: string | undefined;
    let prFailedError: string | undefined;
    let postExecutionTaskError: string | undefined;
    if (taskSuccess && isWorktree) {
      const issues = resolveTaskIssue(issueNumber, projectRootCwd);
      const postResult = await postExecutionFlow({
        execCwd,
        projectCwd: projectRootCwd,
        task: task.name,
        branch,
        baseBranch,
        shouldCreatePr: autoPr,
        shouldPublishBranchToOrigin,
        draftPr,
        workflowIdentifier,
        issues,
      });
      prUrl = postResult.prUrl;
      if (postResult.prFailed) {
        prFailedError = postResult.prError;
      }
      if (postResult.taskFailed) {
        postExecutionTaskError = postResult.taskError;
      }
    }

    if (postExecutionTaskError !== undefined) {
      const taskResult = buildBooleanTaskResult({
        task: executionTask,
        taskSuccess: false,
        startedAt,
        completedAt,
        successResponse: 'Task completed successfully',
        failureResponse: postExecutionTaskError,
        worktreePath,
        branch,
      });
      persistTaskResult(taskRunner, taskResult);
      return false;
    }

    const taskResult = buildTaskResult({
      task: executionTask,
      runResult: taskRunResult,
      startedAt,
      completedAt,
      branch,
      worktreePath,
      prUrl,
    });

    if (prFailedError !== undefined) {
      persistPrFailedTaskResult(taskRunner, taskResult, prFailedError);
      return true;
    }

    persistTaskResult(taskRunner, taskResult);

    return taskRunResult.success;
  } catch (err) {
    const completedAt = new Date().toISOString();
    persistTaskError(taskRunner, taskForPersistence, startedAt, completedAt, err);
    return false;
  } finally {
    if (externalAbortSignal) {
      externalAbortSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
