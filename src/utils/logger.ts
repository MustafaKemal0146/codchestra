import chalk from 'chalk';

export type LogLevel = 'quiet' | 'normal' | 'verbose';

let level: LogLevel = 'normal';

export function setLogLevel(l: LogLevel): void {
  level = l;
}

export function log(msg: string): void {
  if (level === 'quiet') return;
  console.log(msg);
}

export function logVerbose(msg: string): void {
  if (level !== 'verbose') return;
  console.log(chalk.gray(msg));
}

export function logWarn(msg: string): void {
  if (level === 'quiet') return;
  console.warn(chalk.yellow('⚠ ' + msg));
}

export function logError(msg: string): void {
  console.error(chalk.red('✗ ' + msg));
}

export function logSuccess(msg: string): void {
  if (level === 'quiet') return;
  console.log(chalk.green('✓ ' + msg));
}
