import { rmSync, existsSync } from 'node:fs';
import chalk from 'chalk';
import { stateDir } from '../utils/paths.js';
import { clearState } from '../core/state.js';
import { logSuccess } from '../utils/logger.js';

export function resetCommand(cwd: string): void {
  const dir = stateDir(cwd);
  if (!existsSync(dir)) {
    console.log(chalk.gray('No state to reset.'));
    return;
  }
  clearState(cwd);
  try {
    rmSync(dir, { recursive: true });
    logSuccess('State cleared.');
  } catch (err) {
    console.error(chalk.red('Failed to remove state dir: ' + (err instanceof Error ? err.message : String(err))));
    process.exitCode = 1;
  }
}
