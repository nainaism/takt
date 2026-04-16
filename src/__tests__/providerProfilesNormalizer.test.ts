import { describe, expect, it } from 'vitest';
import { normalizeProviderProfiles } from '../infra/config/configNormalizers.js';

describe('normalizeProviderProfiles', () => {
  it('normalizes provider profile overrides with canonical step keys', () => {
    expect(normalizeProviderProfiles({
      codex: {
        default_permission_mode: 'full',
        step_permission_overrides: {
          implement: 'edit',
        },
      },
    })).toEqual({
      codex: {
        defaultPermissionMode: 'full',
        stepPermissionOverrides: {
          implement: 'edit',
        },
      },
    });
  });
});
