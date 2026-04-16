import { describe, expect, it } from 'vitest';
import { resolveAliasedPreviewCount } from '../infra/config/configKeyAliases.js';
import {
  unexpectedInteractivePreviewConfigKey,
} from '../../test/helpers/unknown-contract-test-keys.js';

describe('resolveAliasedPreviewCount', () => {
  it('returns the canonical interactive_preview_steps value', () => {
    expect(resolveAliasedPreviewCount({ interactive_preview_steps: 3 })).toBe(3);
  });

  it('ignores missing or invalid preview count values', () => {
    expect(resolveAliasedPreviewCount({})).toBeUndefined();
    expect(resolveAliasedPreviewCount({ interactive_preview_steps: '3' })).toBeUndefined();
  });

  it('reads only the canonical preview count key even when unrelated keys coexist', () => {
    expect(
      resolveAliasedPreviewCount({
        interactive_preview_steps: 5,
        source: 'legacy-shape-no-longer-used',
      }),
    ).toBe(5);
  });

  it('ignores unknown preview count keys', () => {
    expect(resolveAliasedPreviewCount({ [unexpectedInteractivePreviewConfigKey]: 5 })).toBeUndefined();
  });

  it('prefers the canonical preview count key over unknown keys', () => {
    expect(
      resolveAliasedPreviewCount({
        interactive_preview_steps: 5,
        [unexpectedInteractivePreviewConfigKey]: 1,
      }),
    ).toBe(5);
  });
});
