import nodemailer from "nodemailer";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../core/logger.js";

export interface SendMailInput {
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>;
}

function splitAddresses(s: string | undefined): string | undefined {
  if (!s?.trim()) return undefined;
  const parts = s
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

export class Mailer {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly config: AppConfig,
    private readonly log: Logger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      ...(config.SMTP_USER || config.SMTP_PASS
        ? { auth: { user: config.SMTP_USER ?? "", pass: config.SMTP_PASS ?? "" } }
        : {}),
    });
  }

  async send(input: SendMailInput): Promise<void> {
    const to = splitAddresses(this.config.MAIL_TO);
    if (!to) {
      throw new Error("MAIL_TO is empty");
    }

    try {
      await this.transporter.sendMail({
        from: this.config.MAIL_FROM,
        to,
        cc: splitAddresses(this.config.MAIL_CC),
        bcc: splitAddresses(this.config.MAIL_BCC),
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      });
      this.log.info({ subject: input.subject, to }, "Email sent successfully");
    } catch (e) {
      this.log.error({ err: e, subject: input.subject }, "Failed to send email");
      throw e;
    }
  }
}
