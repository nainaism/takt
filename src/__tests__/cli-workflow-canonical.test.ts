import { describe, expect, it } from 'vitest';
import { resolveWorkflowCliOption } from '../app/cli/helpers.js';
import { program } from '../app/cli/program.js';
import {
  unexpectedWorkflowCliOptionFlag,
  unexpectedWorkflowCliOptionKey,
} from '../../test/helpers/unknown-contract-test-keys.js';

describe('CLI workflow canonical naming', () => {
  it('should expose only the canonical workflow option in global help', () => {
    // Given
    const workflowOptions = program.options.filter((option) => option.long === '--workflow');

    // Then
    expect(workflowOptions).toHaveLength(1);
    expect(workflowOptions[0]?.description).toBe('Workflow name or path to workflow file');
  });

  it('should resolve the workflow option when the canonical key is provided', () => {
    // Given
    const opts = { workflow: 'default' };

    // When
    const resolved = resolveWorkflowCliOption(opts);

    // Then
    expect(resolved).toBe('default');
  });

  it('should ignore unknown option keys in CLI option resolution', () => {
    // Given
    const opts = { [unexpectedWorkflowCliOptionKey]: 'legacy-default' };

    // When
    const resolved = resolveWorkflowCliOption(opts);

    // Then
    expect(resolved).toBeUndefined();
  });

  it('should prefer the canonical workflow key when an unknown key is also present', () => {
    // Given
    const opts = {
      workflow: 'default',
      [unexpectedWorkflowCliOptionKey]: 'legacy-default',
    };

    // When
    const resolved = resolveWorkflowCliOption(opts);

    // Then
    expect(resolved).toBe('default');
  });

  it('should not mention unknown workflow option flags in help output', () => {
    // When
    const help = program.helpInformation();

    // Then
    expect(help).toContain('--workflow <name>');
    expect(help).not.toContain(unexpectedWorkflowCliOptionFlag);
  });
});
