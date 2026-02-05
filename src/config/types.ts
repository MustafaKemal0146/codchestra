export interface CodchestraConfig {
  maxLoops: number;
  timeoutMinutes: number;
  aiCommand: string;
  /** Extra args for AI command. For Codex use ["exec", "-", "--full-auto"] so prompt is read from stdin. */
  aiArgs?: string[];
  verbosity: 'quiet' | 'normal' | 'verbose';
  outputFormat: 'text' | 'json';
}

export const DEFAULT_CONFIG: CodchestraConfig = {
  maxLoops: 50,
  timeoutMinutes: 120,
  aiCommand: '',
  verbosity: 'normal',
  outputFormat: 'text',
};
