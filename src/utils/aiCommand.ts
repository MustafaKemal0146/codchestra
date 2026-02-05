import { execaSync } from 'execa';

function which(cmd: string): boolean {
  try {
    const prog = process.platform === 'win32' ? 'where' : 'which';
    const args = process.platform === 'win32' ? [cmd] : [cmd];
    const r = execaSync(prog, args, { reject: false });
    return r.exitCode === 0;
  } catch {
    return false;
  }
}

export function resolveAiCommand(override: string): string {
  if (override && override.trim().length > 0) return override.trim();
  if (which('chatgpt')) return 'chatgpt';
  if (which('codex')) return 'codex';
  return 'chatgpt';
}
