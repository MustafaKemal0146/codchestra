import { join } from 'node:path';

export const STATE_DIR = '.codchestra';
export const TASKS_FILE = 'codchestra.tasks.md';
export const PROMPT_FILE = 'CODCHESTRA_PROMPT.md';

export function stateDir(cwd: string): string {
  return join(cwd, STATE_DIR);
}

export function tasksPath(cwd: string): string {
  return join(cwd, TASKS_FILE);
}

export function promptPath(cwd: string): string {
  return join(cwd, PROMPT_FILE);
}

export function pluginsDir(cwd: string): string {
  return join(cwd, STATE_DIR, 'plugins');
}
