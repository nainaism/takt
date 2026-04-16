import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  unexpectedInitialStepKey,
  unexpectedMaxStepsKey,
  unexpectedStepListKey,
  unexpectedWorkflowConfigKey,
  unexpectedWorkflowDirName,
} from '../../test/helpers/unknown-contract-test-keys.js';

const languageState = vi.hoisted(() => ({ value: 'en' as 'en' | 'ja' }));

vi.mock('../infra/config/global/globalConfig.js', () => ({
  loadGlobalConfig: vi.fn().mockReturnValue({}),
}));

vi.mock('../infra/config/resolveConfigValue.js', () => ({
  resolveConfigValue: vi.fn((_cwd: string, key: string) => {
    if (key === 'language') return languageState.value;
    if (key === 'enableBuiltinWorkflows') return true;
    if (key === 'disabledBuiltins') return [];
    return undefined;
  }),
  resolveConfigValues: vi.fn((_cwd: string, keys: readonly string[]) => {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (key === 'language') result[key] = languageState.value;
      if (key === 'enableBuiltinWorkflows') result[key] = true;
      if (key === 'disabledBuiltins') result[key] = [];
    }
    return result;
  }),
}));

import { listBuiltinWorkflowNames, loadWorkflow } from '../infra/config/loaders/index.js';

function createTestDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'takt-it-workflow-'));
  mkdirSync(join(dir, '.takt'), { recursive: true });
  return dir;
}

describe('Workflow Loader IT: canonical workflow loading', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    languageState.value = 'en';
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load builtin workflows through the workflow API', () => {
    // Given
    const builtinNames = listBuiltinWorkflowNames(testDir, { includeDisabled: true });

    // When
    const config = loadWorkflow('default', testDir);

    // Then
    expect(builtinNames).toContain('default');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('default');
    expect(config!.steps.length).toBeGreaterThan(0);
    expect(config!.initialStep).toBeDefined();
    expect(config!.maxSteps).toBeGreaterThan(0);
  });

  it('should load project-local workflows only from .takt/workflows', () => {
    // Given
    const workflowsDir = join(testDir, '.takt', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    const agentsDir = join(testDir, '.takt', 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, 'custom.md'), 'Custom agent');

    writeFileSync(join(workflowsDir, 'custom.yaml'), `
name: custom
description: Custom project workflow
max_steps: 5
initial_step: start

steps:
  - name: start
    persona: ../agents/custom.md
    instruction: "Do the work"
    rules:
      - condition: Done
        next: COMPLETE
`);

    // When
    const config = loadWorkflow('custom', testDir);

    // Then
    expect(config).not.toBeNull();
    expect(config!.name).toBe('custom');
    expect(config!.steps).toHaveLength(1);
    expect(config!.steps[0]!.name).toBe('start');
  });

  it('should not resolve project-local workflows from an unrelated workflow directory', () => {
    const unexpectedWorkflowsDir = join(testDir, '.takt', unexpectedWorkflowDirName);
    mkdirSync(unexpectedWorkflowsDir, { recursive: true });

    writeFileSync(join(unexpectedWorkflowsDir, 'unexpected-only.yaml'), `
name: unexpected-only
max_steps: 2
initial_step: start
steps:
  - name: start
    persona: ../agents/custom.md
    instruction: "Legacy directory should not be read"
    rules:
      - condition: Done
        next: COMPLETE
`);

    const config = loadWorkflow('unexpected-only', testDir);

    expect(config).toBeNull();
  });

  it('should not let entries in unrelated workflow directories shadow builtin workflows', () => {
    const unexpectedWorkflowsDir = join(testDir, '.takt', unexpectedWorkflowDirName);
    mkdirSync(unexpectedWorkflowsDir, { recursive: true });

    writeFileSync(join(unexpectedWorkflowsDir, 'default.yaml'), `
name: default
description: Unexpected override
max_steps: 1
initial_step: unexpected
steps:
  - name: unexpected
    instruction: "Unexpected directory should not shadow builtin workflows"
    rules:
      - condition: done
        next: COMPLETE
`);

    const config = loadWorkflow('default', testDir);

    expect(config).not.toBeNull();
    expect(config!.name).toBe('default');
    expect(config!.initialStep).not.toBe('unexpected');
  });

  it('should reject unknown workflow YAML keys', () => {
    const workflowsDir = join(testDir, '.takt', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    writeFileSync(join(workflowsDir, 'legacy-keys.yaml'), `
name: unknown-keys
max_steps: 3
${unexpectedInitialStepKey}: plan
steps:
  - name: plan
    instruction: "Legacy keys must fail"
    rules:
      - condition: done
        next: COMPLETE
`);

    expect(() => loadWorkflow('legacy-keys', testDir)).toThrow(new RegExp(unexpectedInitialStepKey, 'i'));
  });

  it.each([
    {
      name: 'unexpected_step_list_key',
      yaml: `
name: unexpected-step-list
${unexpectedStepListKey}:
  - name: plan
    instruction: "Legacy keys must fail"
    rules:
      - condition: done
        next: COMPLETE
`,
      expected: new RegExp(unexpectedStepListKey, 'i'),
    },
    {
      name: 'unexpected_workflow_config_key',
      yaml: `
name: unexpected-workflow-config
${unexpectedWorkflowConfigKey}:
  provider: mock
steps:
  - name: plan
    instruction: "Legacy keys must fail"
    rules:
      - condition: done
        next: COMPLETE
`,
      expected: new RegExp(unexpectedWorkflowConfigKey, 'i'),
    },
    {
      name: 'unexpected_max_steps_key',
      yaml: `
name: unexpected-step-limit
${unexpectedMaxStepsKey}: 2
steps:
  - name: plan
    instruction: "Legacy keys must fail"
    rules:
      - condition: done
        next: COMPLETE
`,
      expected: new RegExp(unexpectedMaxStepsKey, 'i'),
    },
  ])('should reject unknown workflow YAML key: $name', ({ name, yaml, expected }) => {
    const workflowsDir = join(testDir, '.takt', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });
    writeFileSync(join(workflowsDir, `${name}.yaml`), yaml);

    expect(() => loadWorkflow(name, testDir)).toThrow(expected);
  });

  it('should resolve agent paths from workflow YAML location', () => {
    // Given
    const config = loadWorkflow('default', testDir);

    // Then
    expect(config).not.toBeNull();
    for (const step of config!.steps) {
      if (step.personaPath) {
        expect(step.personaPath).toMatch(/^\//);
        expect(existsSync(step.personaPath)).toBe(true);
      }
    }
  });
});
