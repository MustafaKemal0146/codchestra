import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/loader.js';
import { setLogLevel } from '../utils/logger.js';
import { runLoop } from '../loop/runner.js';
import { loadPlugins, invokeHook } from '../plugins/loader.js';
import { clearState } from '../core/state.js';

export async function runCommand(cwd: string): Promise<void> {
  const config = loadConfig(cwd);
  setLogLevel(config.verbosity);

  const plugins = await loadPlugins(cwd);
  await invokeHook(plugins, 'beforeRun', { cwd });

  clearState(cwd);
  const spinner = ora('Starting Codchestra…').start();
  try {
    const result = await runLoop(cwd);
    spinner.stop();
    await invokeHook(plugins, 'afterRun', { cwd, result });

    if (result.ok) {
      console.log(chalk.green(`\n✓ Complete after ${result.loop} loop(s).`));
      if (result.lastStatus?.summary) {
        console.log(chalk.gray(result.lastStatus.summary));
      }
    } else {
      console.log(chalk.yellow(`\nStopped: ${result.exitReason} (loop ${result.loop})`));
      if (result.lastStatus?.summary) {
        console.log(chalk.gray(result.lastStatus.summary));
      }
    }
  } catch (err) {
    spinner.fail('Run failed');
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  }
}
