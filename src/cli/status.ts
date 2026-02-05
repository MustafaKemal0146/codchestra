import chalk from 'chalk';
import { loadState } from '../core/state.js';
import { getTasks } from '../tasks/manager.js';
import { countByStatus } from '../tasks/parser.js';
import { loadConfig } from '../config/loader.js';
import { stateDir } from '../utils/paths.js';
import { existsSync } from 'node:fs';

export function statusCommand(cwd: string, opts: { json?: boolean } = {}): void {
  const state = loadState(cwd);
  const tasks = getTasks(cwd);
  const counts = countByStatus(tasks);
  const config = loadConfig(cwd);
  const hasStateDir = existsSync(stateDir(cwd));
  const useJson = opts.json ?? config.outputFormat === 'json';

  if (useJson) {
    console.log(
      JSON.stringify({
        state: state
          ? {
              loop: state.loop,
              stagnationCount: state.stagnationCount ?? 0,
              lastStatus: state.lastStatus,
              startedAt: state.startedAt,
            }
          : null,
        tasks: { total: tasks.length, ...counts },
        initialized: hasStateDir,
      })
    );
    return;
  }

  if (!state && tasks.length === 0 && !hasStateDir) {
    console.log(chalk.yellow('Not initialized. Run: codchestra init'));
    return;
  }

  if (state) {
    console.log(chalk.bold('Run state'));
    console.log(`  Loop: ${state.loop}`);
    console.log(`  Stagnation count: ${state.stagnationCount ?? 0}`);
    if (state.lastStatus) {
      console.log(`  Last progress: ${state.lastStatus.progress}%`);
      console.log(`  Tasks (last): ${state.lastStatus.tasksCompleted}/${state.lastStatus.tasksTotal}`);
      console.log(`  Summary: ${state.lastStatus.summary}`);
    }
    console.log('');
  }

  console.log(chalk.bold('Tasks'));
  console.log(`  Total: ${tasks.length}`);
  console.log(`  Pending: ${counts.pending}  In progress: ${counts.inProgress}  Done: ${counts.done}`);
}
