import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, findConfigDir } from './loader.js';

const TEST_DIR = join(tmpdir(), 'codchestra-config-test-' + Date.now());

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('loadConfig', () => {
  it('returns default config when no file', () => {
    const c = loadConfig(TEST_DIR);
    expect(c.maxLoops).toBe(50);
    expect(c.timeoutMinutes).toBe(120);
    expect(c.verbosity).toBe('normal');
  });

  it('merges .codchestrarc when present', () => {
    writeFileSync(join(TEST_DIR, '.codchestrarc'), JSON.stringify({ maxLoops: 99 }));
    const c = loadConfig(TEST_DIR);
    expect(c.maxLoops).toBe(99);
    expect(c.timeoutMinutes).toBe(120);
  });
});

describe('findConfigDir', () => {
  it('returns cwd when .codchestrarc exists', () => {
    writeFileSync(join(TEST_DIR, '.codchestrarc'), '{}');
    expect(findConfigDir(TEST_DIR)).toBe(TEST_DIR);
  });
});
