import { execa } from 'execa';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';
import type { CodchestraConfig } from '../config/types.js';
import { loadConfig, findConfigDir } from '../config/loader.js';
import { resolveAiCommand } from '../utils/aiCommand.js';
import { tasksPath, promptPath } from '../utils/paths.js';
import { getGitDiffSummary, fileChangeScore } from '../utils/git.js';
import { getTasks } from '../tasks/manager.js';
import { loadState, saveState, type RunState, type ParsedStatus } from '../core/state.js';
import { parseStatusBlock } from '../core/exitAnalyzer.js';
import { logVerbose } from '../utils/logger.js';
import { writeSessionLog, writeSessionError, writeSessionWarn } from '../utils/sessionLog.js';
import { createLiveUi, type LiveUi } from './liveUi.js';

export interface LoopContext {
  cwd: string;
  configDir: string;
  config: CodchestraConfig;
  aiCommand: string;
  promptOverride?: string;
}

export interface LoopResult {
  ok: boolean;
  exitReason?: 'exit_signal' | 'max_loops' | 'timeout' | 'stagnation' | 'repeated_output' | 'error';
  loop: number;
  lastStatus?: ParsedStatus;
}

interface RunOneLoopHooks {
  onCallingAi?: () => void;
  onAiReturned?: (payload: { exitCode: number; outputLength: number; stderr: string }) => void;
  onWarn?: (message: string) => void;
  onError?: (message: string) => void;
}

function hashOutput(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function isCodexCommand(command: string): boolean {
  const base = basename(command).toLowerCase();
  const name = extname(base) ? base.slice(0, -extname(base).length) : base;
  return name === 'codex';
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

CRITICAL: At the very end of your response you MUST output exactly this block (plain text, no markdown or code fence):

STATUS:
progress: <0-100>
tasks_completed: <number>
tasks_total: <number>
EXIT_SIGNAL: <true|false>
summary: <one line>

Codchestra parses this block to continue the loop. Without it the run will stop.
`;
}

export function buildDefaultPrompt(cwd: string): string {
  const configDir = findConfigDir(cwd);
  const config = loadConfig(cwd);
  const aiCommand = resolveAiCommand(config.aiCommand);
  const context: LoopContext = { cwd, configDir, config, aiCommand };
  return buildPrompt(context, null);
}

/** Codex: exit 0 = logged in. Run before loop so we don't hang waiting for auth. */
async function ensureCodexAuth(cwd: string): Promise<void> {
  try {
    const sub = await execa('codex', ['login', 'status'], { cwd, reject: false, timeout: 5000 });
    if (sub.exitCode === 0) return;
  } catch {
    // timeout or spawn error
  }
  writeSessionError('Codex is not logged in or token expired. Run in terminal: codex login');
  throw new Error('Codex is not logged in. Run in your terminal: codex login\nThen run codchestra again.');
}

/** Codex CLI non-interactive: reads prompt from stdin; -C sets workspace. Chatgpt-style CLIs also use stdin. */
function getAiArgs(context: LoopContext): string[] {
  const configured = context.config.aiArgs && context.config.aiArgs.length > 0
    ? [...context.config.aiArgs]
    : [];
  if (!isCodexCommand(context.aiCommand)) {
    return configured;
  }

  const args = configured.length > 0
    ? configured
    : ['exec', '--full-auto', '-s', 'workspace-write', '-c', 'sandbox=workspace-write', '-C', context.cwd, '--skip-git-repo-check', '-'];

  // Keep stdin prompt marker `-` in args so Codex reads the prompt from stdin.
  if (args[0] !== 'exec') {
    args.unshift('exec');
  }
  if (!args.includes('-')) {
    args.push('-');
  }
  if (!args.includes('-C') && !args.includes('--cd')) {
    args.push('-C', context.cwd);
  }
  return args;
}

export async function runOneLoop(
  context: LoopContext,
  runState: RunState | null,
  hooks: RunOneLoopHooks = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const prompt = context.promptOverride ?? buildPrompt(context, runState);
  const cmd = context.aiCommand;
  const args = getAiArgs(context);
  const timeoutMs = (context.config.aiCallTimeoutMinutes ?? 10) * 60 * 1000;
  hooks.onCallingAi?.();
  writeSessionLog(`Calling AI: ${cmd} ${args.join(' ')} (configDir: ${context.configDir}, prompt length: ${prompt.length}, timeout: ${context.config.aiCallTimeoutMinutes ?? 10}min)`);
  try {
    const sub = await execa(cmd, args, {
      cwd: context.cwd,
      input: prompt,
      reject: false,
      all: true,
      timeout: timeoutMs,
    });
    const stdoutStr = typeof sub.stdout === 'string' ? sub.stdout : '';
    const stderrStr = typeof sub.stderr === 'string' ? sub.stderr : '';
    const allStr = (sub.all ?? stdoutStr + stderrStr) as string;
    const combined = allStr.length > 0 ? allStr : stdoutStr + '\n' + stderrStr;
    const exitCode = sub.exitCode ?? 1;
    hooks.onAiReturned?.({ exitCode, outputLength: combined.length, stderr: stderrStr });
    writeSessionLog(`AI returned exitCode=${exitCode} combinedLen=${combined.length} stderrLen=${stderrStr.length}`);
    if (stderrStr.trim().length > 0) {
      writeSessionWarn(`stderr (first 500 chars): ${stderrStr.trim().slice(0, 500)}`);
      hooks.onWarn?.(`AI stderr: ${stderrStr.trim().slice(0, 200)}`);
      if (/refresh_token_reused|please log in again|401 unauthorized|failed to refresh token/i.test(stderrStr)) {
        writeSessionError('Codex/ChatGPT auth failed or token expired. Run in terminal: codex login (or chatgpt login) and sign in again.');
        hooks.onError?.('Codex/ChatGPT auth failed or token expired.');
      }
    }
    if (exitCode !== 0) {
      writeSessionWarn(`AI process exited with code ${exitCode}`);
      hooks.onWarn?.(`AI process exited with code ${exitCode}`);
    }
    return {
      stdout: combined,
      stderr: stderrStr,
      exitCode,
    };
  } catch (err: unknown) {
    const execaErr = err as { message?: string; timedOut?: boolean; shortMessage?: string; code?: string };
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = execaErr.timedOut === true || msg.includes('timed out') || msg.includes('ETIMEDOUT');
    writeSessionError(`AI call failed: ${execaErr.shortMessage ?? msg}`);
    hooks.onError?.(`AI call failed: ${execaErr.shortMessage ?? msg}`);
    if (execaErr.code === 'ENOENT') {
      writeSessionError(`Command not found: ${cmd}. Install it or set ".codchestrarc -> aiCommand".`);
      hooks.onError?.(`Command not found: ${cmd}`);
    }
    if (isTimeout) {
      writeSessionError(`AI (${cmd}) did not return within ${context.config.aiCallTimeoutMinutes ?? 10} minutes. Check that Codex/ChatGPT is installed, logged in, and accepts stdin.`);
      hooks.onError?.(`AI timeout after ${context.config.aiCallTimeoutMinutes ?? 10} minutes`);
    }
    return {
      stdout: '',
      stderr: msg,
      exitCode: 1,
    };
  }
}

export interface RunLoopOptions {
  maxLoops: number;
  timeoutMinutes: number;
  stagnationThreshold: number;
  repeatedOutputThreshold: number;
}

export interface RunLoopExecutionOptions extends Partial<RunLoopOptions> {
  promptOverride?: string;
}

const DEFAULT_LOOP_OPTIONS: RunLoopOptions = {
  maxLoops: 50,
  timeoutMinutes: 120,
  stagnationThreshold: 3,
  repeatedOutputThreshold: 4,
};

export async function runLoop(
  cwd: string,
  options: RunLoopExecutionOptions = {}
): Promise<LoopResult> {
  const configDir = findConfigDir(cwd);
  const config = loadConfig(cwd);
  const { promptOverride, ...loopOptions } = options;
  const opts: RunLoopOptions = { ...DEFAULT_LOOP_OPTIONS, ...loopOptions };
  opts.maxLoops = config.maxLoops ?? opts.maxLoops;
  opts.timeoutMinutes = config.timeoutMinutes ?? opts.timeoutMinutes;

  const aiCommand = resolveAiCommand(config.aiCommand);
  const context: LoopContext = { cwd, configDir, config, aiCommand, promptOverride };
  const shouldPrintLines = config.verbosity !== 'quiet' && !process.stdout.isTTY;
  const liveUi: LiveUi | null = createLiveUi(config.verbosity !== 'quiet' && process.stdout.isTTY);

  const emitInfo = (message: string): void => {
    writeSessionLog(message);
    if (shouldPrintLines) console.log(message);
  };
  const emitWarn = (message: string): void => {
    writeSessionWarn(message);
    if (shouldPrintLines) console.warn(message);
    liveUi?.addError(message);
  };
  const emitError = (message: string): void => {
    writeSessionError(message);
    if (shouldPrintLines) console.error(message);
    liveUi?.addError(message);
  };

  if (isCodexCommand(aiCommand.trim())) {
    emitInfo('Checking Codex auth (codex login status)...');
    await ensureCodexAuth(cwd);
    emitInfo('Codex auth OK.');
  }

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

  const finalize = (result: LoopResult, message: string): LoopResult => {
    emitInfo(message);
    liveUi?.setStopReason(message);
    liveUi?.render();
    liveUi?.stop();
    return result;
  };
  liveUi?.setStopReason('Running');
  liveUi?.render();

  while (runState.loop < opts.maxLoops) {
    if (Date.now() > deadline) {
      return finalize(
        { ok: false, exitReason: 'timeout', loop: runState.loop, lastStatus: runState.lastStatus },
        `Stopped: timeout (loop ${runState.loop})`
      );
    }

    runState.loop += 1;
    emitInfo(`Loop ${runState.loop}/${opts.maxLoops} started`);
    logVerbose(`Loop ${runState.loop}/${opts.maxLoops}`);
    liveUi?.setLoop(runState.loop, opts.maxLoops);
    liveUi?.render();

    const { stdout } = await runOneLoop(context, runState, {
      onCallingAi: () => {
        const msg = 'Calling AI';
        emitInfo(msg);
        liveUi?.setAiSummary(msg);
        liveUi?.render();
      },
      onAiReturned: ({ exitCode, outputLength, stderr }) => {
        const msg = `AI returned (exitCode=${exitCode}, output length=${outputLength})`;
        emitInfo(msg);
        liveUi?.setAiSummary(msg);
        if (stderr.trim().length > 0) {
          emitWarn(`AI returned with stderr: ${stderr.trim().slice(0, 160)}`);
        }
        liveUi?.render();
      },
      onWarn: (message) => emitWarn(message),
      onError: (message) => emitError(message),
    });

    const status = parseStatusBlock(stdout);
    if (!status) {
      const sample = stdout.trim().slice(-400).replace(/\s+/g, ' ');
      emitWarn(`AI response missing STATUS block. Tail sample: ${sample}`);
      liveUi?.setStatus('STATUS not found');
    } else {
      runState.lastStatus = status;
      const statusLine = `STATUS: progress=${status.progress}% tasks=${status.tasksCompleted}/${status.tasksTotal} exitSignal=${status.exitSignal}`;
      emitInfo(statusLine);
      liveUi?.setStatus(statusLine);
    }
    liveUi?.render();

    const outHash = hashOutput(stdout);
    if (outHash === lastOutputHash) {
      sameOutputCount += 1;
      const isSubstantial = stdout.trim().length >= 80;
      if (isSubstantial && sameOutputCount >= opts.repeatedOutputThreshold) {
        return finalize(
          {
            ok: false,
            exitReason: 'repeated_output',
            loop: runState.loop,
            lastStatus: runState.lastStatus,
          },
          `Stopped: repeated_output (loop ${runState.loop})`
        );
      }
      if (!isSubstantial) sameOutputCount = Math.max(0, sameOutputCount - 1);
    } else {
      sameOutputCount = 0;
    }
    lastOutputHash = outHash;
    runState.lastOutputHash = outHash;

    const score = fileChangeScore(cwd);
    if (score === lastScore) {
      runState.stagnationCount = (runState.stagnationCount ?? 0) + 1;
      if (runState.stagnationCount >= opts.stagnationThreshold) {
        return finalize(
          {
            ok: false,
            exitReason: 'stagnation',
            loop: runState.loop,
            lastStatus: runState.lastStatus,
          },
          `Stopped: stagnation (loop ${runState.loop})`
        );
      }
    } else {
      runState.stagnationCount = 0;
    }
    lastScore = score;

    saveState(cwd, runState);

    const tasks = getTasks(cwd);
    const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'done');
    if (status?.exitSignal === true && allDone) {
      return finalize(
        {
          ok: true,
          exitReason: 'exit_signal',
          loop: runState.loop,
          lastStatus: status,
        },
        `Complete: exit_signal (loop ${runState.loop})`
      );
    }
  }

  return finalize(
    {
      ok: false,
      exitReason: 'max_loops',
      loop: runState.loop,
      lastStatus: runState.lastStatus,
    },
    `Stopped: max_loops (loop ${runState.loop})`
  );
}
