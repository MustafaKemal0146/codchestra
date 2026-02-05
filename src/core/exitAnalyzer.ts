import type { ParsedStatus } from './state.js';
import stripAnsi from 'strip-ansi';

const STATUS_BLOCK_RE = /STATUS:\s*\n([\s\S]*)/i;
const PROGRESS_RE = /progress:\s*(\d+)/i;
const TASKS_COMPLETED_RE = /tasks_completed:\s*(\d+)/i;
const TASKS_TOTAL_RE = /tasks_total:\s*(\d+)/i;
const EXIT_SIGNAL_RE = /EXIT_SIGNAL:\s*(true|false)/i;
const SUMMARY_RE = /summary:\s*(.+?)(?=\n|$)/is;

export function parseStatusBlock(stdout: string): ParsedStatus | null {
  const plain = stripAnsi(stdout);
  const blockMatch = plain.match(STATUS_BLOCK_RE);
  if (!blockMatch) return null;
  const block = blockMatch[1];
  const progress = block.match(PROGRESS_RE)?.[1];
  const tasksCompleted = block.match(TASKS_COMPLETED_RE)?.[1];
  const tasksTotal = block.match(TASKS_TOTAL_RE)?.[1];
  const exitSignal = block.match(EXIT_SIGNAL_RE)?.[1];
  const summary = block.match(SUMMARY_RE)?.[1];
  if (
    progress === undefined ||
    tasksCompleted === undefined ||
    tasksTotal === undefined ||
    exitSignal === undefined
  ) {
    return null;
  }
  return {
    progress: Math.min(100, Math.max(0, parseInt(progress, 10))),
    tasksCompleted: Math.max(0, parseInt(tasksCompleted, 10)),
    tasksTotal: Math.max(0, parseInt(tasksTotal, 10)),
    exitSignal: exitSignal.toLowerCase() === 'true',
    summary: (summary ?? '').trim(),
  };
}

export function hasStatusBlock(stdout: string): boolean {
  return parseStatusBlock(stdout) !== null;
}
