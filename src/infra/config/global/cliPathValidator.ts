import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

export function validateCliPath(pathValue: string, sourceName: string): string {
  const trimmed = pathValue.trim();
  if (trimmed.length === 0) {
    throw new Error(`Configuration error: ${sourceName} must not be empty.`);
  }
  if (hasControlCharacters(trimmed)) {
    throw new Error(`Configuration error: ${sourceName} contains control characters.`);
  }
  if (!isAbsolute(trimmed)) {
    throw new Error(`Configuration error: ${sourceName} must be an absolute path: ${trimmed}`);
  }
  if (!existsSync(trimmed)) {
    throw new Error(`Configuration error: ${sourceName} path does not exist: ${trimmed}`);
  }
  const stats = statSync(trimmed);
  if (!stats.isFile()) {
    throw new Error(`Configuration error: ${sourceName} must point to an executable file: ${trimmed}`);
  }
  try {
    accessSync(trimmed, constants.X_OK);
  } catch {
    throw new Error(`Configuration error: ${sourceName} file is not executable: ${trimmed}`);
  }
  return trimmed;
}
