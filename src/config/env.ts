import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_TIMEZONE: z.string().min(1).default("Europe/Bucharest"),
  APP_VERSION: z.string().min(1).default("1.0.0"),

  /** Optional secret for /cron endpoint when running in server mode. */
  CRON_SECRET: z.string().optional(),

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

  // SMTP is required only when Gmail API isn't configured.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  /** Optional Google OAuth2 (recommended for Google Workspace/Gmail). */
  GMAIL_OAUTH_CLIENT_ID: z.string().optional(),
  GMAIL_OAUTH_CLIENT_SECRET: z.string().optional(),
  GMAIL_OAUTH_REFRESH_TOKEN: z.string().optional(),

  /** Optional Gmail API (preferred over SMTP in cloud). */
  GMAIL_API_CLIENT_ID: z.string().optional(),
  GMAIL_API_CLIENT_SECRET: z.string().optional(),
  GMAIL_API_REFRESH_TOKEN: z.string().optional(),
  GMAIL_API_SENDER: z.string().optional(),

  MAIL_FROM: z.string().min(1),
  MAIL_TO: z.string().min(1),
  MAIL_CC: z.string().optional(),
  MAIL_BCC: z.string().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const envSchema = baseSchema.superRefine((env, ctx) => {
  const gmailApiConfigured = Boolean(
    env.GMAIL_API_CLIENT_ID?.trim() &&
      env.GMAIL_API_CLIENT_SECRET?.trim() &&
      env.GMAIL_API_REFRESH_TOKEN?.trim() &&
      env.GMAIL_API_SENDER?.trim(),
  );

  if (!gmailApiConfigured) {
    if (!env.SMTP_HOST?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "Required (SMTP_HOST is required when Gmail API is not configured)",
      });
    }
    if (!env.SMTP_PORT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_PORT"],
        message: "Required (SMTP_PORT is required when Gmail API is not configured)",
      });
    }
  }
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
