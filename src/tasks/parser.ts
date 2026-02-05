import { readFileSync, existsSync } from 'node:fs';
import { tasksPath } from '../utils/paths.js';

export type TaskStatus = 'pending' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  raw: string;
}

const DONE_MARKERS = ['[x]', '[X]'];
const IN_PROGRESS_MARKERS = ['[-]'];

export function parseTasksFile(cwd: string): Task[] {
  const path = tasksPath(cwd);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf-8');
  const lines = content.split(/\r?\n/);
  const tasks: Task[] = [];
  let id = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\s*\[[ x\-]\]\s*)(.*)$/);
    if (!match) continue;
    const statusPart = match[1].trim();
    const title = match[2].trim();
    let status: TaskStatus = 'pending';
    if (DONE_MARKERS.some((m) => statusPart.toUpperCase() === m)) status = 'done';
    else if (IN_PROGRESS_MARKERS.includes(statusPart)) status = 'in-progress';
    tasks.push({
      id: String(++id),
      title,
      status,
      raw: line,
    });
  }
  return tasks;
}

export function tasksToMarkdown(tasks: Task[]): string {
  return tasks
    .map((t) => {
      const box = t.status === 'done' ? '[x]' : t.status === 'in-progress' ? '[-]' : '[ ]';
      return `${box} ${t.title}`;
    })
    .join('\n');
}

export function countByStatus(tasks: Task[]): { pending: number; inProgress: number; done: number } {
  let pending = 0;
  let inProgress = 0;
  let done = 0;
  for (const t of tasks) {
    if (t.status === 'pending') pending++;
    else if (t.status === 'in-progress') inProgress++;
    else done++;
  }
  return { pending, inProgress, done };
}
