import chalk from 'chalk';

/** Custom ASCII banner for CODCHESTRA with improved readability. */
const BANNER_ART = [
  '   ____ ___  ____   ____ _   _ _____ ____ _____ ____      _',
  '  / ___/ _ \\|  _ \\ / ___| | | | ____/ ___|_   _|  _ \\    / \\',
  " | |  | | | | | | | |   | |_| |  _| \\___ \\ | | | |_) |  / _ \\",
  ' | |__| |_| | |_| | |___|  _  | |___ ___) || | |  _ <  / ___ \\',
  '  \\____\\___/|____/ \\____|_| |_|_____|____/ |_| |_| \\_\\/_/   \\_\\',
].join('\n');

export function getCodchestraBanner(): string {
  return chalk.cyan(BANNER_ART);
}
