import chalk from 'chalk';
import { getTasks } from '../tasks/manager.js';
import { loadConfig } from '../config/loader.js';
import { tasksPath } from '../utils/paths.js';
import { existsSync } from 'node:fs';

export function tasksCommand(cwd: string, opts: { json?: boolean }): void {
  const config = loadConfig(cwd);
  const useJson = opts.json ?? config.outputFormat === 'json';
  const path = tasksPath(cwd);

  if (!existsSync(path)) {
    if (useJson) {
      console.log(JSON.stringify({ tasks: [], file: path }));
    } else {
      console.log(chalk.yellow(`No ${path}. Run: codchestra init`));
    }
    return;
  }

  const tasks = getTasks(cwd);
  if (useJson) {
    console.log(JSON.stringify({ tasks, file: path }));
    return;
  }

  console.log(chalk.bold('Tasks\n'));
  for (const t of tasks) {
    const icon = t.status === 'done' ? chalk.green('[x]') : t.status === 'in-progress' ? chalk.yellow('[-]') : '[ ]';
    console.log(`  ${icon} ${t.title}`);
  }
}
