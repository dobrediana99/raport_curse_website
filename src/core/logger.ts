import pino from "pino";
import type { AppConfig } from "../config/env.js";

export function createLogger(config: AppConfig) {
  const isDev = config.NODE_ENV === "development";

  return pino({
    level: config.LOG_LEVEL,
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" },
          },
        }
      : {}),
  });
}

export type Logger = ReturnType<typeof createLogger>;
