import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir, tasksPath, promptPath, pluginsDir, TASKS_FILE, PROMPT_FILE } from '../utils/paths.js';
import { logSuccess, logWarn } from '../utils/logger.js';

const DEFAULT_TASKS = `# Codchestra tasks
# Use [ ], [-], [x] for pending, in-progress, done

[ ] Add your first task here
`;

const DEFAULT_PROMPT = `You are an autonomous software development agent working under Codchestra.

Your job is to continuously improve the project until all tasks are complete.

Rules:
1. Always work on the highest priority unfinished task.
2. Make real file changes when possible.
3. Do not pretend work is done.
4. Prefer small safe commits over large risky changes.
5. If stuck, try an alternative approach.
6. Never loop doing the same action repeatedly.

At the end of every response you MUST output:

STATUS:
progress: <0-100 estimate>
tasks_completed: <number>
tasks_total: <number>
EXIT_SIGNAL: <true or false>
summary: <one line describing what you did>

EXIT_SIGNAL may only be true when all tasks are complete.
`;

export function initCommand(cwd: string): void {
  const dir = stateDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logSuccess(`Created ${dir}`);
  }
  const plugins = pluginsDir(cwd);
  if (!existsSync(plugins)) {
    mkdirSync(plugins, { recursive: true });
    logSuccess(`Created ${plugins}`);
  }
  const tasksFile = tasksPath(cwd);
  if (!existsSync(tasksFile)) {
    writeFileSync(tasksFile, DEFAULT_TASKS, 'utf-8');
    logSuccess(`Created ${tasksFile}`);
  } else {
    logWarn(`${TASKS_FILE} already exists`);
  }
  const promptFile = promptPath(cwd);
  if (!existsSync(promptFile)) {
    writeFileSync(promptFile, DEFAULT_PROMPT, 'utf-8');
    logSuccess(`Created ${promptFile}`);
  } else {
    logWarn(`${PROMPT_FILE} already exists`);
  }
  const rcPath = join(cwd, '.codchestrarc');
  if (!existsSync(rcPath)) {
    const rc = {
      maxLoops: 50,
      timeoutMinutes: 120,
      aiCommand: '',
      verbosity: 'normal',
      outputFormat: 'text',
    };
    writeFileSync(rcPath, JSON.stringify(rc, null, 2), 'utf-8');
    logSuccess(`Created ${rcPath}`);
  }
  logSuccess('Codchestra initialized.');
}
