import chalk from 'chalk';
import logUpdate from 'log-update';
import { loadState } from '../core/state.js';
import { getTasks } from '../tasks/manager.js';
import { countByStatus } from '../tasks/parser.js';
import { getGitDiffSummary, fileChangeScore } from '../utils/git.js';
import { loadConfig } from '../config/loader.js';
import { stateDir } from '../utils/paths.js';
import { existsSync } from 'node:fs';

export function monitorCommand(cwd: string): void {
  const hasState = existsSync(stateDir(cwd));
  if (!hasState) {
    console.log(chalk.yellow('Not initialized. Run: codchestra init'));
    return;
  }

  const render = (): string => {
    const state = loadState(cwd);
    const tasks = getTasks(cwd);
    const counts = countByStatus(tasks);
    const git = getGitDiffSummary(cwd);
    const score = fileChangeScore(cwd);

    const lines: string[] = [
      chalk.bold('Codchestra Monitor'),
      '',
      `Loop: ${state?.loop ?? 0}`,
      `Stagnation: ${state?.stagnationCount ?? 0}`,
      `Task progress: ${counts.done}/${tasks.length} done (${counts.pending} pending, ${counts.inProgress} in progress)`,
      `File change score: ${score}`,
      git ? `Git: ${git.filesChanged} files, +${git.insertions} -${git.deletions}` : 'Git: —',
      '',
      state?.lastStatus
        ? chalk.gray(`Last: ${state.lastStatus.progress}% — ${state.lastStatus.summary}`)
        : chalk.gray('No last status'),
    ];
    return lines.join('\n');
  };

  console.log(render());
  const interval = setInterval(() => {
    logUpdate(render());
  }, 2000);
  const stop = () => {
    clearInterval(interval);
    logUpdate.clear();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
