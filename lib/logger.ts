type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  route?: string;
  error?: unknown;
  [key: string]: unknown;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function log(entry: LogEntry): void {
  const { level, message, error, ...rest } = entry;
  const timestamp = new Date().toISOString();
  const output = {
    timestamp,
    level,
    message,
    ...(error !== undefined ? { error: formatError(error) } : {}),
    ...rest,
  };

  if (level === "error") {
    console.error(JSON.stringify(output));
  } else if (level === "warn") {
    console.warn(JSON.stringify(output));
  } else {
    console.log(JSON.stringify(output));
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log({ level: "info", message, ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log({ level: "warn", message, ...meta }),
  error: (message: string, meta?: Record<string, unknown>) =>
    log({ level: "error", message, ...meta }),
};
