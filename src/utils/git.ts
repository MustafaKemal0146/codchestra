import { execaSync } from 'execa';
import { join } from 'node:path';

export interface GitDiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  summary: string;
}

export function getGitDiffSummary(cwd: string): GitDiffSummary | null {
  try {
    const r = execaSync('git', ['diff', '--stat'], { cwd, reject: false });
    if (r.exitCode !== 0 || !r.stdout) return null;
    const lines = r.stdout.trim().split(/\r?\n/);
    let insertions = 0;
    let deletions = 0;
    const fileSet = new Set<string>();
    for (const line of lines) {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)(?:\s*([+\-]+))?/);
      if (match) {
        fileSet.add(match[1].trim());
        const n = parseInt(match[2], 10);
        const plusMinus = (match[3] || '').trim();
        if (plusMinus.includes('+')) insertions += n;
        if (plusMinus.includes('-')) deletions += n;
      }
    }
    return {
      filesChanged: fileSet.size,
      insertions,
      deletions,
      summary: r.stdout.slice(0, 500),
    };
  } catch {
    return null;
  }
}

export function fileChangeScore(cwd: string): number {
  const s = getGitDiffSummary(cwd);
  if (!s) return 0;
  return s.filesChanged * 2 + s.insertions + s.deletions;
}

export function isGitRepo(cwd: string): boolean {
  try {
    const r = execaSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, reject: false });
    return r.exitCode === 0 && r.stdout?.trim() === 'true';
  } catch {
    return false;
  }
}
