export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

let currentLogLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${LOG_LEVEL_NAMES[level]}] [${module}] ${message}`;
}

export const logger = {
  debug(module: string, message: string): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(formatMessage(LogLevel.DEBUG, module, message));
    }
  },

  info(module: string, message: string): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(formatMessage(LogLevel.INFO, module, message));
    }
  },

  warn(module: string, message: string): void {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(formatMessage(LogLevel.WARN, module, message));
    }
  },

  error(module: string, message: string, error?: Error): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(formatMessage(LogLevel.ERROR, module, message));
      if (error) {
        console.error(error);
      }
    }
  },
};
