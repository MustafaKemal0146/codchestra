import chalk from 'chalk';
import logUpdate from 'log-update';
import { getCodchestraBanner } from '../utils/banner.js';

interface LiveUiState {
  loopLabel: string;
  lastStatus: string;
  lastAiSummary: string;
  runState: string;
  errors: string[];
}

export interface LiveUi {
  setLoop(loop: number, maxLoops: number): void;
  setStatus(message: string): void;
  setAiSummary(message: string): void;
  setStopReason(message: string): void;
  addError(message: string): void;
  render(): void;
  stop(): void;
}

const MAX_ERRORS = 12;

function line(width: number): string {
  return '─'.repeat(Math.max(12, width));
}

function wrapSection(title: string, body: string[], color: (s: string) => string): string[] {
  const width = Math.max(46, title.length + 4);
  return [
    color(`┌${line(width)}┐`),
    color(`│ ${title}`),
    color(`├${line(width)}┤`),
    ...body.map((row) => `  ${row}`),
    color(`└${line(width)}┘`),
  ];
}

function stateBadge(state: string): string {
  const low = state.toLowerCase();
  if (low.startsWith('complete')) return chalk.green('● Complete');
  if (low.startsWith('stopped')) return chalk.yellow('● Stopped');
  if (low.startsWith('error')) return chalk.red('● Error');
  return chalk.green('● Running');
}

export function createLiveUi(enabled: boolean): LiveUi | null {
  if (!enabled) return null;

  const state: LiveUiState = {
    loopLabel: '-',
    lastStatus: '-',
    lastAiSummary: '-',
    runState: 'Running',
    errors: [],
  };

  const render = (): void => {
    const errorRows = state.errors.length > 0
      ? state.errors.slice(-MAX_ERRORS).map((e) => chalk.red(`• ${e}`))
      : [chalk.gray('No errors recorded')];

    const lines: string[] = [
      getCodchestraBanner(),
      chalk.gray(`Session: ${stateBadge(state.runState)}  ${chalk.cyan('Loop')} ${state.loopLabel}`),
      chalk.gray(line(76)),
      ...wrapSection('Last STATUS', [chalk.white(state.lastStatus)], chalk.cyan),
      ...wrapSection('Last AI', [chalk.white(state.lastAiSummary)], chalk.blue),
      ...wrapSection('Errors (last 12)', errorRows, chalk.yellow),
    ];
    logUpdate(lines.join('\n'));
  };

  return {
    setLoop(loop: number, maxLoops: number): void {
      state.loopLabel = `${loop}/${maxLoops}`;
    },
    setStatus(message: string): void {
      state.lastStatus = message;
    },
    setAiSummary(message: string): void {
      state.lastAiSummary = message;
    },
    setStopReason(message: string): void {
      state.runState = message;
    },
    addError(message: string): void {
      state.errors.push(message);
      if (state.errors.length > MAX_ERRORS) {
        state.errors = state.errors.slice(-MAX_ERRORS);
      }
    },
    render,
    stop(): void {
      logUpdate.done();
    },
  };
}
