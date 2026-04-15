import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpts: Record<string, unknown> = {};
const mockRunAllTasks = vi.fn();

const { rootCommand, commandActions, commandMocks } = vi.hoisted(() => {
  const commandActions = new Map<string, (...args: unknown[]) => void | Promise<void>>();
  const commandMocks = new Map<string, Record<string, unknown>>();

  function createCommandMock(actionKey: string): {
    description: ReturnType<typeof vi.fn>;
    argument: ReturnType<typeof vi.fn>;
    option: ReturnType<typeof vi.fn>;
    opts: ReturnType<typeof vi.fn>;
    action: (action: (...args: unknown[]) => void | Promise<void>) => unknown;
    command: ReturnType<typeof vi.fn>;
  } {
    const command: Record<string, unknown> = {
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      opts: vi.fn(() => mockOpts),
      optsWithGlobals: vi.fn(() => mockOpts),
    };
    commandMocks.set(actionKey, command);

    command.command = vi.fn((subName: string) => createCommandMock(`${actionKey}.${subName}`));
    command.action = vi.fn((action: (...args: unknown[]) => void | Promise<void>) => {
      commandActions.set(actionKey, action);
      return command;
    });

    return command as {
      description: ReturnType<typeof vi.fn>;
      argument: ReturnType<typeof vi.fn>;
      option: ReturnType<typeof vi.fn>;
      opts: ReturnType<typeof vi.fn>;
      action: (action: (...args: unknown[]) => void | Promise<void>) => unknown;
      command: ReturnType<typeof vi.fn>;
    };
  }

  return {
    rootCommand: createCommandMock('root'),
    commandActions,
    commandMocks,
  };
});

vi.mock('../app/cli/program.js', () => ({
  program: rootCommand,
  resolvedCwd: '/test/cwd',
  pipelineMode: false,
}));

vi.mock('../infra/git/index.js', () => ({
  isIssueReference: vi.fn(() => false),
}));

vi.mock('../infra/config/index.js', () => ({
  clearPersonaSessions: vi.fn(),
  resolveConfigValue: vi.fn(),
}));

vi.mock('../infra/config/paths.js', () => ({
  getGlobalConfigDir: vi.fn(() => '/tmp/takt'),
}));

vi.mock('../shared/ui/index.js', () => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../features/tasks/index.js', () => ({
  runAllTasks: (...args: unknown[]) => mockRunAllTasks(...args),
  addTask: vi.fn(),
  watchTasks: vi.fn(),
  listTasks: vi.fn(),
}));

vi.mock('../features/config/index.js', () => ({
  ejectBuiltin: vi.fn(),
  ejectFacet: vi.fn(),
  parseFacetType: vi.fn(),
  VALID_FACET_TYPES: ['personas', 'policies', 'knowledge', 'instructions', 'output-contracts'],
  resetCategoriesToDefault: vi.fn(),
  resetConfigToDefault: vi.fn(),
  deploySkill: vi.fn(),
  deploySkillCodex: vi.fn(),
}));

vi.mock('../features/prompt/index.js', () => ({
  previewPrompts: vi.fn(),
}));

vi.mock('../features/catalog/index.js', () => ({
  showCatalog: vi.fn(),
}));

vi.mock('../features/workflowAuthoring/index.js', () => ({
  initWorkflowCommand: vi.fn(),
  doctorWorkflowCommand: vi.fn(),
}));

vi.mock('../features/analytics/index.js', () => ({
  computeReviewMetrics: vi.fn(),
  formatReviewMetrics: vi.fn(),
  parseSinceDuration: vi.fn(),
  purgeOldEvents: vi.fn(),
}));

vi.mock('../commands/repertoire/add.js', () => ({
  repertoireAddCommand: vi.fn(),
}));

vi.mock('../commands/repertoire/remove.js', () => ({
  repertoireRemoveCommand: vi.fn(),
}));

vi.mock('../commands/repertoire/list.js', () => ({
  repertoireListCommand: vi.fn(),
}));

import '../app/cli/commands.js';

describe('CLI run command', () => {
  beforeEach(() => {
    mockRunAllTasks.mockClear();
    for (const key of Object.keys(mockOpts)) {
      delete mockOpts[key];
    }
  });

  it('should define --ignore-exceed only on run command', () => {
    const runCommand = commandMocks.get('root.run');
    const watchCommand = commandMocks.get('root.watch');

    expect(runCommand?.option).toHaveBeenCalledWith(
      '--ignore-exceed',
      'Ignore workflow max_steps and continue until completion',
    );
    expect(watchCommand?.option).not.toHaveBeenCalledWith(
      '--ignore-exceed',
      expect.any(String),
    );
  });

  it('should pass ignoreExceed through runAllTasks when enabled', async () => {
    mockOpts.provider = 'mock';
    mockOpts.ignoreExceed = true;

    const runAction = commandActions.get('root.run');

    expect(runAction).toBeTypeOf('function');

    await runAction?.();

    expect(mockRunAllTasks).toHaveBeenCalledWith('/test/cwd', {
      provider: 'mock',
      ignoreExceed: true,
    });
  });
});
