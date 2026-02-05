import { parseStatusBlock, hasStatusBlock } from './exitAnalyzer.js';

describe('parseStatusBlock', () => {
  it('returns null when no block', () => {
    expect(parseStatusBlock('hello world')).toBeNull();
  });

  it('parses valid STATUS block', () => {
    const out = `
Some text
STATUS:
progress: 80
tasks_completed: 3
tasks_total: 10
EXIT_SIGNAL: false
summary: Did something
`;
    const s = parseStatusBlock(out);
    expect(s).not.toBeNull();
    expect(s!.progress).toBe(80);
    expect(s!.tasksCompleted).toBe(3);
    expect(s!.tasksTotal).toBe(10);
    expect(s!.exitSignal).toBe(false);
    expect(s!.summary).toContain('Did something');
  });

  it('parses EXIT_SIGNAL true', () => {
    const out = `STATUS:\nprogress: 100\ntasks_completed: 5\ntasks_total: 5\nEXIT_SIGNAL: true\nsummary: Done`;
    const s = parseStatusBlock(out);
    expect(s!.exitSignal).toBe(true);
  });
});

describe('hasStatusBlock', () => {
  it('returns true when block present', () => {
    expect(hasStatusBlock('STATUS:\nprogress: 0\ntasks_completed: 0\ntasks_total: 1\nEXIT_SIGNAL: false\nsummary: x')).toBe(true);
  });
  it('returns false when block absent', () => {
    expect(hasStatusBlock('no status here')).toBe(false);
  });
});
