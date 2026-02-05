export interface CodchestraConfig {
  maxLoops: number;
  timeoutMinutes: number;
  /** Per-call timeout for AI (minutes). Codex/ChatGPT must return within this or we log and retry. */
  aiCallTimeoutMinutes?: number;
  aiCommand: string;
  /** Extra args for AI command. For Codex use ["exec", "-", "--full-auto"] so prompt is read from stdin. */
  aiArgs?: string[];
  verbosity: 'quiet' | 'normal' | 'verbose';
  outputFormat: 'text' | 'json';
}

export const DEFAULT_CONFIG: CodchestraConfig = {
  maxLoops: 50,
  timeoutMinutes: 120,
  aiCallTimeoutMinutes: 10,
  aiCommand: '',
  verbosity: 'normal',
  outputFormat: 'text',
};
