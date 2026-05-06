import nodemailer from "nodemailer";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../core/logger.js";
import { formatRecipientsForNodemailer, parseMailRecipients } from "./parseMailRecipients.js";
import { GmailApiMailer, isGmailApiConfigured } from "./gmailApiMailer.js";

export interface SendMailInput {
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>;
}

export type MailAuthMode = "oauth2" | "password" | "none";

function splitAddresses(s: string | undefined): string | undefined {
  if (!s?.trim()) return undefined;
  const parts = parseMailRecipients(s);
  return parts.length ? formatRecipientsForNodemailer(parts) : undefined;
}

export function resolveSmtpAuth(config: AppConfig): {
  authMode: MailAuthMode;
  // Nodemailer typings don't expose `auth` on TransportOptions in all versions; keep it explicit.
  auth?: Record<string, unknown>;
} {
  const user = config.SMTP_USER?.trim();

  const clientId = config.GMAIL_OAUTH_CLIENT_ID?.trim();
  const clientSecret = config.GMAIL_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = config.GMAIL_OAUTH_REFRESH_TOKEN?.trim();

  const hasOauth2 = Boolean(user && clientId && clientSecret && refreshToken);
  if (hasOauth2) {
    return {
      authMode: "oauth2",
      auth: {
        type: "OAuth2",
        user,
        clientId: clientId!,
        clientSecret: clientSecret!,
        refreshToken: refreshToken!,
      },
    };
  }

  const pass = config.SMTP_PASS?.trim();
  if (user && pass) {
    return { authMode: "password", auth: { user, pass } };
  }

  return { authMode: "none" };
}

export class Mailer {
  private transporter: nodemailer.Transporter;
  private gmailApiMailer: GmailApiMailer | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly log: Logger,
  ) {
    if (isGmailApiConfigured(config)) {
      this.gmailApiMailer = new GmailApiMailer(config, log);
      this.log.info({ mode: "gmail-api" }, "Mailer mode selected");
      // SMTP transporter not needed in this mode.
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      return;
    }

    const { authMode, auth } = resolveSmtpAuth(config);
    this.log.info(
      { host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, authMode },
      "Mailer initialized",
    );

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      ...(auth ? ({ auth } as unknown as Record<string, unknown>) : {}),
    });
  }

  async send(input: SendMailInput): Promise<void> {
    if (this.gmailApiMailer) {
      return this.gmailApiMailer.send(input);
    }

    const toList = parseMailRecipients(this.config.MAIL_TO);
    if (toList.length === 0) {
      throw new Error("MAIL_TO is empty");
    }

    try {
      await this.transporter.sendMail({
        from: this.config.MAIL_FROM,
        to: toList,
        cc: splitAddresses(this.config.MAIL_CC),
        bcc: splitAddresses(this.config.MAIL_BCC),
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      });
      this.log.info(
        { subject: input.subject, to: formatRecipientsForNodemailer(toList) },
        "Email sent successfully",
      );
    } catch (e) {
      this.log.error({ err: e, subject: input.subject }, "Failed to send email");
      throw e;
    }
  }
}
