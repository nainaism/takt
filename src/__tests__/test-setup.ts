import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach } from 'vitest';

if (process.env.TAKT_TEST_FLG_TOUCH_TTY !== '1') {
  process.env.TAKT_NO_TTY = '1';
}

let isolatedRootDir: string | undefined;
let previousTaktConfigDir: string | undefined;
beforeEach(() => {
  previousTaktConfigDir = process.env.TAKT_CONFIG_DIR;
  isolatedRootDir = mkdtempSync(join(tmpdir(), 'takt-test-global-'));
  process.env.TAKT_CONFIG_DIR = join(isolatedRootDir, '.takt');
  mkdirSync(process.env.TAKT_CONFIG_DIR, { recursive: true });
});

afterEach(() => {
  if (previousTaktConfigDir === undefined) {
    delete process.env.TAKT_CONFIG_DIR;
  } else {
    process.env.TAKT_CONFIG_DIR = previousTaktConfigDir;
  }
  if (isolatedRootDir) {
    rmSync(isolatedRootDir, { recursive: true, force: true });
  }
});
