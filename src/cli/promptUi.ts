import chalk from 'chalk';
import { createInterface } from 'node:readline';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { buildDefaultPrompt } from '../loop/runner.js';

function hLine(width: number): string {
  return '─'.repeat(Math.max(10, width));
}

function boxTitle(title: string): string {
  const inner = ` ${title} `;
  return `${chalk.cyan('┌')}${chalk.cyan(hLine(14))}${chalk.cyan(inner)}${chalk.cyan(hLine(14))}${chalk.cyan('┐')}`;
}

function boxFooter(): string {
  return `${chalk.cyan('└')}${chalk.cyan(hLine(34))}${chalk.cyan('┘')}`;
}

function boxLine(text: string): string {
  return `${chalk.cyan('│')} ${text}`;
}

function promptBlock(text: string): string {
  const lines = text.split('\n').map((line) => boxLine(chalk.gray(line)));
  return [boxTitle('Default Prompt Preview'), ...lines, boxFooter()].join('\n');
}

async function readMultilineInput(title: string): Promise<string> {
  console.log(chalk.cyan(`\n${title}`));
  console.log(chalk.gray('Metni yapistir, bitirmek icin bos satir + Enter (Windows: Ctrl+Z+Enter).'));

  const rl = createInterface({ input, output, terminal: true });
  const lines: string[] = [];
  rl.setPrompt(chalk.bgBlackBright(chalk.cyan('│ ')));
  rl.prompt();
  try {
    for await (const line of rl) {
      if (line.trim().length === 0) break;
      lines.push(line);
      rl.prompt();
    }
  } finally {
    rl.close();
  }
  return lines.join('\n').trim();
}

export async function selectRunPrompt(cwd: string): Promise<string> {
  const defaultPrompt = buildDefaultPrompt(cwd);

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultPrompt;
  }

  console.log();
  console.log(boxTitle('Prompt Setup'));
  console.log(boxLine(chalk.white('Enter = varsayilan, e = ek gorev, c = ozel prompt')));
  console.log(boxLine(chalk.gray(hLine(56))));
  console.log(boxFooter());
  console.log(promptBlock(defaultPrompt));

  const rl = readline.createInterface({ input, output });
  try {
    const choice = (await rl.question(chalk.cyan('Selection: '))).trim().toLowerCase();
    if (choice === '' || choice === 'start') {
      return defaultPrompt;
    }
    if (choice === 'e' || choice === 'edit') {
      const extra = await readMultilineInput(
        'Varsayilan prompta eklenecek gorev/notu gir:'
      );
      if (!extra) return defaultPrompt;
      return `${defaultPrompt}\n\n## User task\n\n${extra}`;
    }
    if (choice === 'c' || choice === 'custom') {
      const userTask = await readMultilineInput('Gorevi/promptu yapistir:');
      if (!userTask) return defaultPrompt;
      return `${defaultPrompt}\n\n## User task\n\n${userTask}`;
    }
    return defaultPrompt;
  } finally {
    rl.close();
  }
}
