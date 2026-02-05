import { writeFileSync } from 'node:fs';
import { tasksPath } from '../utils/paths.js';
import { parseTasksFile, tasksToMarkdown, type Task, type TaskStatus } from './parser.js';

export function getTasks(cwd: string): Task[] {
  return parseTasksFile(cwd);
}

export function setTaskStatus(cwd: string, taskId: string, status: TaskStatus): void {
  const tasks = parseTasksFile(cwd);
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  t.status = status;
  writeFileSync(tasksPath(cwd), tasksToMarkdown(tasks), 'utf-8');
}

export function allTasksDone(cwd: string): boolean {
  const tasks = parseTasksFile(cwd);
  return tasks.length > 0 && tasks.every((t) => t.status === 'done');
}
