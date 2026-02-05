import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CodchestraConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

const CONFIG_FILENAME = '.codchestrarc';

export function findConfigDir(cwd: string): string {
  return cwd;
}

export function loadConfig(cwd: string): CodchestraConfig {
  const configDir = findConfigDir(cwd);
  const path = join(configDir, CONFIG_FILENAME);
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CodchestraConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
