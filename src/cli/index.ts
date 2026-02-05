#!/usr/bin/env node
/**
 * Codchestra CLI - Author: Mustafa Kemal Cingil
 * https://github.com/mustafakemal0146
 */

import chalk from 'chalk';
import { program } from 'commander';
import { cwd } from 'node:process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCodchestraBanner } from '../utils/banner.js';
import { initCommand } from './init.js';
import { runCommand } from './run.js';
import { statusCommand } from './status.js';
import { resetCommand } from './reset.js';
import { tasksCommand } from './tasks.js';
import { monitorCommand } from './monitor.js';
import { doctorCommand } from './doctor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
const version = pkg.version ?? '1.0.0';

function printHome(): void {
  const lines: string[] = [
    chalk.bold.cyan('CODCHESTRA'),
    getCodchestraBanner(),
    chalk.gray('────────────────────────────────────────────────────────────────'),
    chalk.bold('Codchestra CLI'),
    chalk.gray('Autonomous AI orchestration - loop-based development conductor'),
    '',
    `${chalk.cyan('Usage:')} codchestra ${chalk.gray('[options] [command]')}`,
    '',
    chalk.cyan('Options'),
    `  ${chalk.green('-V, --version')}   Output version`,
    `  ${chalk.green('-h, --help')}      Show help`,
    '',
    chalk.cyan('Commands'),
    `  ${chalk.green('init')}             Initialize Codchestra in current project`,
    `  ${chalk.green('run')}              Run the AI orchestration loop`,
    `  ${chalk.green('status')}           Show run status and task progress`,
    `  ${chalk.green('reset')}            Reset run state (.codchestra/state.json)`,
    `  ${chalk.green('tasks')}            List tasks from codchestra.tasks.md`,
    `  ${chalk.green('monitor')}          Show live monitoring dashboard`,
    `  ${chalk.green('doctor')}           Check environment and config`,
    '',
    chalk.gray('Tip: codchestra <command> --help'),
  ];
  console.log(lines.join('\n'));
}

program
  .name('codchestra')
  .description('Autonomous AI orchestration CLI - loop-based development conductor')
  .version(version);

program.command('init').description('Initialize Codchestra in the current project').action(() => initCommand(cwd()));

program
  .command('run')
  .description('Run the AI orchestration loop until complete or limits hit')
  .action(() => runCommand(cwd()));

program
  .command('status')
  .description('Show current run status and task progress')
  .option('-j, --json', 'Output as JSON')
  .action((opts: { json?: boolean }) => statusCommand(cwd(), opts));

program.command('reset').description('Reset run state (clears .codchestra state)').action(() => resetCommand(cwd()));

program
  .command('tasks')
  .description('List tasks from codchestra.tasks.md')
  .option('-j, --json', 'Output as JSON')
  .action((opts: { json?: boolean }) => tasksCommand(cwd(), opts));

program
  .command('monitor')
  .description('Show monitoring dashboard (loop, progress, stagnation)')
  .action(() => monitorCommand(cwd()));

program.command('doctor').description('Check environment and config').action(() => doctorCommand(cwd()));

if (process.argv.length <= 2) {
  printHome();
  process.exit(0);
}

program.parse();
