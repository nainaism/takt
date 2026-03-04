import { describe, expect, it } from 'vitest';
import type { PersistedGlobalConfig } from '../core/models/persisted-global-config.js';
import type { ProjectLocalConfig } from '../infra/config/types.js';
import type { MigratedProjectLocalConfigKey } from '../infra/config/migratedProjectLocalKeys.js';
import * as migratedProjectLocalKeysModule from '../infra/config/migratedProjectLocalKeys.js';

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

const globalConfigTypeBoundaryGuard: Assert<
  IsNever<Extract<keyof PersistedGlobalConfig, MigratedProjectLocalConfigKey>>
> = true;
void globalConfigTypeBoundaryGuard;

const projectConfigTypeBoundaryGuard: Assert<
  IsNever<Exclude<MigratedProjectLocalConfigKey, keyof ProjectLocalConfig>>
> = true;
void projectConfigTypeBoundaryGuard;

describe('migrated config key contracts', () => {
  it('should expose only runtime exports needed by migrated key metadata module', () => {
    expect(Object.keys(migratedProjectLocalKeysModule).sort()).toEqual([
      'MIGRATED_PROJECT_LOCAL_CONFIG_KEYS',
      'MIGRATED_PROJECT_LOCAL_CONFIG_METADATA',
    ]);
  });

  it('should not expose helper exports that bypass metadata contract', () => {
    expect('isMigratedProjectLocalConfigKey' in migratedProjectLocalKeysModule).toBe(false);
  });
});
