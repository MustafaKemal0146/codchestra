import { execa } from 'execa';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { CodchestraConfig } from '../config/types.js';
import { loadConfig } from '../config/loader.js';
import { resolveAiCommand } from '../utils/aiCommand.js';
import { stateDir, tasksPath, promptPath } from '../utils/paths.js';
import { getGitDiffSummary, fileChangeScore } from '../utils/git.js';
import { getTasks } from '../tasks/manager.js';
import { loadState, saveState, clearState, type RunState, type ParsedStatus } from '../core/state.js';
import { parseStatusBlock } from '../core/exitAnalyzer.js';
import { logVerbose, logWarn } from '../utils/logger.js';

export interface LoopContext {
  cwd: string;
  config: CodchestraConfig;
  aiCommand: string;
}

export interface LoopResult {
  ok: boolean;
  exitReason?: 'exit_signal' | 'max_loops' | 'timeout' | 'stagnation' | 'repeated_output' | 'error';
  loop: number;
  lastStatus?: ParsedStatus;
}

function hashOutput(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function buildPrompt(context: LoopContext, runState: RunState | null): string {
  const cwd = context.cwd;
  const tasksPathFile = tasksPath(cwd);
  let tasksSection = 'No tasks file found.';
  if (existsSync(tasksPathFile)) {
    tasksSection = readFileSync(tasksPathFile, 'utf-8');
  }
  const promptPathFile = promptPath(cwd);
  let systemPrompt = 'You are an autonomous development agent.';
  if (existsSync(promptPathFile)) {
    systemPrompt = readFileSync(promptPathFile, 'utf-8');
  }
  const gitSummary = getGitDiffSummary(cwd);
  const gitSection = gitSummary
    ? `\n\n## Git diff summary\n\`\`\`\n${gitSummary.summary}\n\`\`\``
    : '\n\n(No git diff or not a git repo.)';
  const lastStatus = runState?.lastStatus
    ? `\n\n## Last loop status\n- progress: ${runState.lastStatus.progress}\n- tasks_completed: ${runState.lastStatus.tasksCompleted}\n- tasks_total: ${runState.lastStatus.tasksTotal}\n- summary: ${runState.lastStatus.summary}`
    : '';
  return `${systemPrompt}

## Current tasks (codchestra.tasks.md)

${tasksSection}
${gitSection}
${lastStatus}

Remember: at the end of your response you MUST output a STATUS block:

STATUS:
progress: <0-100>
tasks_completed: <number>
tasks_total: <number>
EXIT_SIGNAL: <true|false>
summary: <one line>
`;
}

/** Codex CLI non-interactive: reads prompt from stdin. Chatgpt-style CLIs also use stdin. */
function getAiArgs(context: LoopContext): string[] {
  if (context.config.aiArgs && context.config.aiArgs.length > 0) {
    return context.config.aiArgs;
  }
  const cmd = context.aiCommand.trim().toLowerCase();
  if (cmd === 'codex') {
    return ['exec', '-', '--full-auto'];
  }
  return [];
}

export async function runOneLoop(context: LoopContext, runState: RunState | null): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const prompt = buildPrompt(context, runState);
  const cmd = context.aiCommand;
  const args = getAiArgs(context);
  const sub = await execa(cmd, args, {
    cwd: context.cwd,
    input: prompt,
    reject: false,
    all: true,
  });
  const all = (sub.all ?? sub.stdout ?? '') + (sub.stderr ?? '');
  return {
    stdout: typeof sub.stdout === 'string' ? sub.stdout : all,
    stderr: typeof sub.stderr === 'string' ? sub.stderr : '',
    exitCode: sub.exitCode ?? 1,
  };
}

export interface RunLoopOptions {
  maxLoops: number;
  timeoutMinutes: number;
  stagnationThreshold: number;
  repeatedOutputThreshold: number;
}

const DEFAULT_LOOP_OPTIONS: RunLoopOptions = {
  maxLoops: 50,
  timeoutMinutes: 120,
  stagnationThreshold: 3,
  repeatedOutputThreshold: 2,
};

export async function runLoop(
  cwd: string,
  options: Partial<RunLoopOptions> = {}
): Promise<LoopResult> {
  const config = loadConfig(cwd);
  const opts: RunLoopOptions = { ...DEFAULT_LOOP_OPTIONS, ...options };
  opts.maxLoops = config.maxLoops ?? opts.maxLoops;
  opts.timeoutMinutes = config.timeoutMinutes ?? opts.timeoutMinutes;

  const aiCommand = resolveAiCommand(config.aiCommand);
  const context: LoopContext = { cwd, config, aiCommand };

  let runState = loadState(cwd);
  const startedAt = runState?.startedAt ?? new Date().toISOString();
  if (!runState) {
    runState = {
      loop: 0,
      stagnationCount: 0,
      startedAt,
      cwd,
    };
    saveState(cwd, runState);
  }

  const deadline = Date.now() + opts.timeoutMinutes * 60 * 1000;
  let lastOutputHash: string | undefined = runState.lastOutputHash;
  let sameOutputCount = 0;
  let lastScore = fileChangeScore(cwd);

  while (runState.loop < opts.maxLoops) {
    if (Date.now() > deadline) {
      return { ok: false, exitReason: 'timeout', loop: runState.loop, lastStatus: runState.lastStatus };
    }

    runState.loop += 1;
    logVerbose(`Loop ${runState.loop}/${opts.maxLoops}`);

    const { stdout, stderr, exitCode } = await runOneLoop(context, runState);

    const status = parseStatusBlock(stdout);
    if (!status) {
      logWarn('AI response missing STATUS block.');
    } else {
      runState.lastStatus = status;
    }

    const outHash = hashOutput(stdout);
    if (outHash === lastOutputHash) {
      sameOutputCount += 1;
      if (sameOutputCount >= opts.repeatedOutputThreshold) {
        return {
          ok: false,
          exitReason: 'repeated_output',
          loop: runState.loop,
          lastStatus: runState.lastStatus,
        };
      }
    } else {
      sameOutputCount = 0;
    }
    lastOutputHash = outHash;
    runState.lastOutputHash = outHash;

    const score = fileChangeScore(cwd);
    if (score === lastScore) {
      runState.stagnationCount = (runState.stagnationCount ?? 0) + 1;
      if (runState.stagnationCount >= opts.stagnationThreshold) {
        return {
          ok: false,
          exitReason: 'stagnation',
          loop: runState.loop,
          lastStatus: runState.lastStatus,
        };
      }
    } else {
      runState.stagnationCount = 0;
    }
    lastScore = score;

    saveState(cwd, runState);

    const tasks = getTasks(cwd);
    const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'done');
    if (status?.exitSignal === true && allDone) {
      return {
        ok: true,
        exitReason: 'exit_signal',
        loop: runState.loop,
        lastStatus: status,
      };
    }
  }

  return {
    ok: false,
    exitReason: 'max_loops',
    loop: runState.loop,
    lastStatus: runState.lastStatus,
  };
}
