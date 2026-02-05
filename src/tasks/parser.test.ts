import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTasksFile, countByStatus, tasksToMarkdown } from './parser.js';

const TEST_DIR = join(tmpdir(), 'codchestra-parser-test-' + Date.now());

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('parseTasksFile', () => {
  it('returns empty when file missing', () => {
    const tasks = parseTasksFile(TEST_DIR);
    expect(tasks).toEqual([]);
  });

  it('parses markdown task list', () => {
    const path = join(TEST_DIR, 'codchestra.tasks.md');
    writeFileSync(
      path,
      `
# Tasks
[ ] First
[-] Second
[x] Done
`
    );
    const tasks = parseTasksFile(TEST_DIR);
    expect(tasks.length).toBe(3);
    expect(tasks[0].status).toBe('pending');
    expect(tasks[1].status).toBe('in-progress');
    expect(tasks[2].status).toBe('done');
  });
});

describe('countByStatus', () => {
  it('counts pending, in-progress, done', () => {
    const path = join(TEST_DIR, 'codchestra.tasks.md');
    writeFileSync(path, '[ ] A\n[-] B\n[x] C');
    const tasks = parseTasksFile(TEST_DIR);
    const c = countByStatus(tasks);
    expect(c.pending).toBe(1);
    expect(c.inProgress).toBe(1);
    expect(c.done).toBe(1);
  });
});
