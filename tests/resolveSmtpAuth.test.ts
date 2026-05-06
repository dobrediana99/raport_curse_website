import { describe, it, expect } from "vitest";
import { resolveSmtpAuth } from "../src/mail/mailer.js";
import type { AppConfig } from "../src/config/env.js";

function baseConfig(over: Partial<AppConfig> = {}): AppConfig {
  return {
    NODE_ENV: "test",
    APP_TIMEZONE: "Europe/Bucharest",
    APP_VERSION: "1.0.0",
    CRON_SECRET: undefined,

    MONDAY_API_TOKEN: "x",
    MONDAY_API_URL: "https://api.monday.com/v2",
    MONDAY_API_VERSION: "2025-01",

    ORDERS_BOARD_ID: 1,
    REQUESTS_BOARD_ID: 2,
    REQUESTS2_BOARD_ID: 3,

    CRON_SCHEDULE: "0 8 1 * *",
    SEND_EMPTY_REPORT: false,
    ATTACH_REPORT_ON_EMPTY: false,
    REPORT_OUTPUT_DIR: "./output",

    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "user@example.com",
    SMTP_PASS: "pass",

    GMAIL_OAUTH_CLIENT_ID: undefined,
    GMAIL_OAUTH_CLIENT_SECRET: undefined,
    GMAIL_OAUTH_REFRESH_TOKEN: undefined,

    MAIL_FROM: "from@example.com",
    MAIL_TO: "to@example.com",
    MAIL_CC: undefined,
    MAIL_BCC: undefined,

    LOG_LEVEL: "info",
    ...over,
  };
}

describe("resolveSmtpAuth", () => {
  it("uses OAuth2 when all GMAIL_OAUTH_* are present", () => {
    const cfg = baseConfig({
      SMTP_PASS: undefined,
      GMAIL_OAUTH_CLIENT_ID: "cid",
      GMAIL_OAUTH_CLIENT_SECRET: "csec",
      GMAIL_OAUTH_REFRESH_TOKEN: "rtok",
    });

    const out = resolveSmtpAuth(cfg);
    expect(out.authMode).toBe("oauth2");
  });

  it("falls back to password when OAuth2 is missing", () => {
    const cfg = baseConfig({
      GMAIL_OAUTH_CLIENT_ID: undefined,
      GMAIL_OAUTH_CLIENT_SECRET: undefined,
      GMAIL_OAUTH_REFRESH_TOKEN: undefined,
    });
    const out = resolveSmtpAuth(cfg);
    expect(out.authMode).toBe("password");
  });
});

