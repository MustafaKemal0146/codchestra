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

  it('parses the last STATUS block when multiple exist', () => {
    const out = `STATUS:\nprogress: 10\ntasks_completed: 1\ntasks_total: 10\nEXIT_SIGNAL: false\nsummary: First\n\nSTATUS:\nprogress: 80\ntasks_completed: 8\ntasks_total: 10\nEXIT_SIGNAL: false\nsummary: Latest`;
    const s = parseStatusBlock(out);
    expect(s).not.toBeNull();
    expect(s!.progress).toBe(80);
    expect(s!.summary).toBe('Latest');
  });

  it('parses markdown bullet formatting', () => {
    const out = `
Some answer
- STATUS:
- progress: 100%
- tasks_completed: 12
- tasks_total: 12
- EXIT_SIGNAL: true
- summary: all tasks done
`;
    const s = parseStatusBlock(out);
    expect(s).not.toBeNull();
    expect(s!.progress).toBe(100);
    expect(s!.tasksCompleted).toBe(12);
    expect(s!.tasksTotal).toBe(12);
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
