import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './paths.js';

const LOGS_DIR = 'logs';
let sessionLogPath: string | null = null;

function timestamp(): string {
  return new Date().toISOString();
}

function logsDir(cwd: string): string {
  return join(stateDir(cwd), LOGS_DIR);
}

/**
 * Oturum logunu başlatır. Her run için .codchestra/logs/session-<timestamp>.log oluşturulur.
 */
export function initSessionLog(cwd: string): string {
  const dir = logsDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const name = `session-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  sessionLogPath = join(dir, name);
  appendFileSync(sessionLogPath, `[${timestamp()}] Session started (cwd: ${cwd})\n`);
  return sessionLogPath;
}

export function getSessionLogPath(): string | null {
  return sessionLogPath;
}

function write(type: string, message: string): void {
  if (!sessionLogPath) return;
  try {
    appendFileSync(sessionLogPath, `[${timestamp()}] [${type}] ${message}\n`);
  } catch {
    // ignore
  }
}

/** Normal oturum bilgisi (ne yaptı). */
export function writeSessionLog(message: string): void {
  write('INFO', message);
}

/** Kritik hata; log dosyasına ve takip için işaretlenir. */
export function writeSessionError(message: string): void {
  write('ERROR', message);
}

/** Uyarı. */
export function writeSessionWarn(message: string): void {
  write('WARN', message);
}

export function closeSessionLog(): void {
  if (sessionLogPath) {
    try {
      appendFileSync(sessionLogPath, `[${timestamp()}] Session ended\n`);
    } catch {
      // ignore
    }
  }
  sessionLogPath = null;
}
