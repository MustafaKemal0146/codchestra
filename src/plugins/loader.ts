import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pluginsDir } from '../utils/paths.js';

export type LifecycleHook = 'beforeLoop' | 'afterLoop' | 'beforeRun' | 'afterRun';

export interface CodchestraPlugin {
  name: string;
  beforeLoop?: (context: { cwd: string; loop: number }) => void | Promise<void>;
  afterLoop?: (context: { cwd: string; loop: number; stdout: string }) => void | Promise<void>;
  beforeRun?: (context: { cwd: string }) => void | Promise<void>;
  afterRun?: (context: { cwd: string; result: unknown }) => void | Promise<void>;
}

export async function loadPlugins(cwd: string): Promise<CodchestraPlugin[]> {
  const dir = pluginsDir(cwd);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const plugins: CodchestraPlugin[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.js')) continue;
    const fullPath = join(dir, e.name);
    try {
      const url = pathToFileURL(fullPath).href;
      const mod = await import(url);
      const plugin = mod.default ?? mod.plugin ?? mod;
      if (plugin && typeof plugin.name === 'string') {
        plugins.push(plugin as CodchestraPlugin);
      }
    } catch {
      // skip invalid plugins
    }
  }
  return plugins;
}

export async function invokeHook(
  plugins: CodchestraPlugin[],
  hook: LifecycleHook,
  context: Record<string, unknown>
): Promise<void> {
  for (const p of plugins) {
    const fn = p[hook];
    if (typeof fn === 'function') {
      await Promise.resolve(fn(context as never));
    }
  }
}
