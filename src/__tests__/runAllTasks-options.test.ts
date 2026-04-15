import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveWorkflowConfigValues = vi.fn();
const mockRecoverInterruptedRunningTasks = vi.fn();
const mockClaimNextTasks = vi.fn();
const mockListAllTaskItems = vi.fn();
const mockRunWithWorkerPool = vi.fn();

vi.mock('../infra/config/index.js', () => ({
  resolveWorkflowConfigValues: (...args: unknown[]) => mockResolveWorkflowConfigValues(...args),
}));

vi.mock('../infra/task/index.js', () => ({
  TaskRunner: vi.fn().mockImplementation(() => ({
    recoverInterruptedRunningTasks: mockRecoverInterruptedRunningTasks,
    claimNextTasks: mockClaimNextTasks,
    listAllTaskItems: mockListAllTaskItems,
  })),
}));

vi.mock('../features/tasks/execute/parallelExecution.js', () => ({
  runWithWorkerPool: (...args: unknown[]) => mockRunWithWorkerPool(...args),
}));

vi.mock('../shared/ui/index.js', () => ({
  header: vi.fn(),
  info: vi.fn(),
  status: vi.fn(),
  blankLine: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../shared/ui/StatusLine.js', () => ({
  statusLine: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../shared/utils/index.js', () => ({
  getErrorMessage: vi.fn((error: unknown) => String(error)),
  getSlackWebhookUrl: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  sendSlackNotification: vi.fn(),
  buildSlackRunSummary: vi.fn(),
}));

vi.mock('../shared/i18n/index.js', () => ({
  getLabel: vi.fn((key: string) => key),
}));

vi.mock('../features/tasks/execute/slackSummaryAdapter.js', () => ({
  generateRunId: vi.fn(() => 'run-id'),
  toSlackTaskDetail: vi.fn(),
}));

import { runAllTasks } from '../features/tasks/execute/runAllTasks.js';

describe('runAllTasks option propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveWorkflowConfigValues.mockReturnValue({
      notificationSound: false,
      notificationSoundEvents: {},
      concurrency: 1,
      taskPollIntervalMs: 500,
    });
    mockRecoverInterruptedRunningTasks.mockReturnValue(0);
    mockClaimNextTasks.mockReturnValue([
      {
        name: 'task-1',
        content: 'Task 1',
        filePath: '/tasks/task-1.yaml',
        createdAt: '2026-04-15T00:00:00.000Z',
        status: 'pending',
        data: { task: 'Task 1', workflow: 'default' },
      },
    ]);
    mockListAllTaskItems.mockReturnValue([]);
    mockRunWithWorkerPool.mockResolvedValue({
      success: 1,
      fail: 0,
      executedTaskNames: ['task-1'],
    });
  });

  it('should forward ignoreExceed to the worker pool execution context', async () => {
    await runAllTasks('/project', {
      provider: 'mock',
      ignoreExceed: true,
    } as never);

    expect(mockRunWithWorkerPool).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Array),
      1,
      '/project',
      {
        provider: 'mock',
        ignoreExceed: true,
      },
      500,
    );
  });
});
