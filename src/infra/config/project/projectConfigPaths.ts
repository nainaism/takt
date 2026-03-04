import { join, resolve } from 'node:path';

export function getProjectConfigDir(projectDir: string): string {
  return join(resolve(projectDir), '.takt');
}

export function getProjectConfigPath(projectDir: string): string {
  return join(getProjectConfigDir(projectDir), 'config.yaml');
}
