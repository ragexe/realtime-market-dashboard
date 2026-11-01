export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface Logger {
  debug(...details: unknown[]): void;
  info(...details: unknown[]): void;
  warn(...details: unknown[]): void;
  error(...details: unknown[]): void;
}

/** Console logger with a `[scope]` prefix; messages below `minLevel` are dropped */
export function createLogger(scope: string, minLevel: LogLevel = 'debug'): Logger {
  const prefix = `[${scope}]`;

  const write =
    (level: LogLevel) =>
    (...details: unknown[]): void => {
      if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
      console[level](prefix, ...details);
    };

  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
  };
}
