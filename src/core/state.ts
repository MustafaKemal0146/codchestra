import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from '../utils/paths.js';

const STATE_FILE = 'state.json';

export interface RunState {
  loop: number;
  stagnationCount: number;
  lastOutputHash?: string;
  lastStatus?: ParsedStatus;
  startedAt: string;
  cwd: string;
}

export interface ParsedStatus {
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  exitSignal: boolean;
  summary: string;
}

export function loadState(cwd: string): RunState | null {
  const dir = stateDir(cwd);
  const path = join(dir, STATE_FILE);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as RunState;
  } catch {
    return null;
  }
}

export function saveState(cwd: string, state: RunState): void {
  const dir = stateDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, STATE_FILE);
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8');
}

export function clearState(cwd: string): void {
  const dir = stateDir(cwd);
  const path = join(dir, STATE_FILE);
  if (existsSync(path)) unlinkSync(path);
}
