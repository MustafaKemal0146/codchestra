import chalk from 'chalk';
import { loadConfig } from '../config/loader.js';
import { setLogLevel } from '../utils/logger.js';
import { getCodchestraBanner } from '../utils/banner.js';
import { initSessionLog, closeSessionLog, writeSessionLog, writeSessionError } from '../utils/sessionLog.js';
import { runLoop } from '../loop/runner.js';
import { loadPlugins, invokeHook } from '../plugins/loader.js';
import { clearState } from '../core/state.js';
import { selectRunPrompt } from './promptUi.js';

export async function runCommand(cwd: string): Promise<void> {
  const config = loadConfig(cwd);
  setLogLevel(config.verbosity);

  if (config.verbosity !== 'quiet' && process.stdout.isTTY) {
    console.log(getCodchestraBanner());
  }

  const logPath = initSessionLog(cwd);
  writeSessionLog(`Run started (verbosity: ${config.verbosity})`);
  if (config.verbosity !== 'quiet') {
    if (process.stdout.isTTY) {
      console.log(chalk.gray('────────────────────────────────────────────────────────────────'));
    }
    console.log(chalk.gray(`Session log: ${logPath}`));
  }

  const plugins = await loadPlugins(cwd);
  await invokeHook(plugins, 'beforeRun', { cwd });

  const selectedPrompt = await selectRunPrompt(cwd);
  writeSessionLog(`Prompt selected via UI (length: ${selectedPrompt.length})`);

  clearState(cwd);
  try {
    const result = await runLoop(cwd, { promptOverride: selectedPrompt });
    writeSessionLog(`Run finished: ok=${result.ok} exitReason=${result.exitReason ?? '-'} loop=${result.loop}`);
    closeSessionLog();
    await invokeHook(plugins, 'afterRun', { cwd, result });

    if (result.ok) {
      console.log(chalk.green(`\nComplete after ${result.loop} loop(s).`));
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
    const msg = err instanceof Error ? err.message : String(err);
    writeSessionError(`Run failed: ${msg}`);
    if (err instanceof Error && err.stack) {
      writeSessionError(err.stack);
    }
    closeSessionLog();
    console.error(chalk.red(msg));
    console.error(chalk.gray(`Session log: ${logPath}`));
    process.exitCode = 1;
  }
}
