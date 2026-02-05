import chalk from 'chalk';
import { loadConfig, findConfigDir } from '../config/loader.js';
import { resolveAiCommand } from '../utils/aiCommand.js';
import { stateDir, tasksPath, promptPath } from '../utils/paths.js';
import { isGitRepo } from '../utils/git.js';
import { existsSync } from 'node:fs';

export function doctorCommand(cwd: string): void {
  const configDir = findConfigDir(cwd);
  const config = loadConfig(configDir);
  const aiCommand = resolveAiCommand(config.aiCommand);

  console.log(chalk.bold('Codchestra Doctor\n'));

  const ok = (msg: string) => console.log(chalk.green('✓') + ' ' + msg);
  const fail = (msg: string) => console.log(chalk.red('✗') + ' ' + msg);
  const warn = (msg: string) => console.log(chalk.yellow('?') + ' ' + msg);

  if (configDir === cwd) {
    ok(`Config dir: ${configDir}`);
  } else {
    warn(`Using config from: ${configDir}`);
  }

  ok(`AI command: ${aiCommand}`);
  ok(`maxLoops: ${config.maxLoops}, timeoutMinutes: ${config.timeoutMinutes}`);

  const statePath = stateDir(cwd);
  if (existsSync(statePath)) {
    ok(`State dir exists: ${statePath}`);
  } else {
    fail(`State dir missing. Run: codchestra init`);
  }

  if (existsSync(tasksPath(cwd))) {
    ok(`Tasks file: ${tasksPath(cwd)}`);
  } else {
    fail(`Tasks file missing: ${tasksPath(cwd)}`);
  }

  if (existsSync(promptPath(cwd))) {
    ok(`Prompt file: ${promptPath(cwd)}`);
  } else {
    warn(`Prompt file missing (optional): ${promptPath(cwd)}`);
  }

  if (isGitRepo(cwd)) {
    ok('Git repo detected');
  } else {
    warn('Not a git repo (git diff summary will be empty)');
  }

  console.log('');
}
