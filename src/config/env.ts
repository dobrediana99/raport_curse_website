import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_TIMEZONE: z.string().min(1).default("Europe/Bucharest"),
  APP_VERSION: z.string().min(1).default("1.0.0"),

  MONDAY_API_TOKEN: z.string().min(1),
  MONDAY_API_URL: z.string().url().default("https://api.monday.com/v2"),
  MONDAY_API_VERSION: z.string().min(1).default("2025-01"),

  ORDERS_BOARD_ID: z.coerce.number().int().positive(),
  REQUESTS_BOARD_ID: z.coerce.number().int().positive(),
  REQUESTS2_BOARD_ID: z.coerce.number().int().positive(),

  CRON_SCHEDULE: z.string().min(1).default("0 8 1 * *"),
  SEND_EMPTY_REPORT: z.coerce.boolean().default(false),
  ATTACH_REPORT_ON_EMPTY: z.coerce.boolean().default(false),
  REPORT_OUTPUT_DIR: z.string().min(1).default("./output"),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1),
  MAIL_TO: z.string().min(1),
  MAIL_CC: z.string().optional(),
  MAIL_BCC: z.string().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  loadDotenv();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(msg, null, 2)}`);
  }
  return parsed.data;
}
