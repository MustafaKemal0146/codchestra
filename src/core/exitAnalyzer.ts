import type { ParsedStatus } from './state.js';
import stripAnsi from 'strip-ansi';

const STATUS_LINE_RE = /(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?STATUS(?:\*\*)?\s*:\s*(?:\n|$)/gi;

function fieldValue(block: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*:\\s*([^\\n]+)`, 'i');
  return block.match(re)?.[1]?.trim();
}

function getStatusBlock(raw: string): string | null {
  const plain = stripAnsi(raw).replace(/\r\n/g, '\n');
  const matches = Array.from(plain.matchAll(STATUS_LINE_RE));
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const start = (last.index ?? 0) + last[0].length;
  return plain.slice(start);
}

export function parseStatusBlock(stdout: string): ParsedStatus | null {
  const block = getStatusBlock(stdout);
  if (!block) return null;
  const progress = fieldValue(block, 'progress');
  const tasksCompleted = fieldValue(block, 'tasks_completed');
  const tasksTotal = fieldValue(block, 'tasks_total');
  const exitSignal = fieldValue(block, 'EXIT_SIGNAL');
  const summary = fieldValue(block, 'summary');
  const progressNum = progress ? Number.parseInt(progress.match(/\d+/)?.[0] ?? '', 10) : Number.NaN;
  const tasksCompletedNum = tasksCompleted ? Number.parseInt(tasksCompleted.match(/\d+/)?.[0] ?? '', 10) : Number.NaN;
  const tasksTotalNum = tasksTotal ? Number.parseInt(tasksTotal.match(/\d+/)?.[0] ?? '', 10) : Number.NaN;
  const exitSignalBool = exitSignal?.toLowerCase().match(/\b(true|false)\b/)?.[1];
  if (
    Number.isNaN(progressNum) ||
    Number.isNaN(tasksCompletedNum) ||
    Number.isNaN(tasksTotalNum) ||
    exitSignalBool === undefined
  ) {
    return null;
  }
  return {
    progress: Math.min(100, Math.max(0, progressNum)),
    tasksCompleted: Math.max(0, tasksCompletedNum),
    tasksTotal: Math.max(0, tasksTotalNum),
    exitSignal: exitSignalBool === 'true',
    summary: (summary ?? '').trim(),
  };
}

export function hasStatusBlock(stdout: string): boolean {
  return parseStatusBlock(stdout) !== null;
}
