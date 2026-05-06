import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { google } from "googleapis";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../core/logger.js";
import type { SendMailInput } from "./mailer.js";
import { formatRecipientsForNodemailer, parseMailRecipients } from "./parseMailRecipients.js";

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMimeMessage(params: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>;
}): Promise<Buffer> {
  const { from, to, cc, bcc, subject, html, attachments } = params;

  const headers: string[] = [
    `From: ${from}`,
    `To: ${formatRecipientsForNodemailer(to)}`,
    ...(cc?.length ? [`Cc: ${formatRecipientsForNodemailer(cc)}`] : []),
    ...(bcc?.length ? [`Bcc: ${formatRecipientsForNodemailer(bcc)}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];

  if (!attachments?.length) {
    const parts = [
      ...headers,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      html,
      "",
    ].join("\r\n");
    return Promise.resolve(Buffer.from(parts, "utf8"));
  }

  const boundary = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const head = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ].join("\r\n");

  const bodyParts: string[] = [];
  bodyParts.push(`--${boundary}`);
  bodyParts.push('Content-Type: text/html; charset="UTF-8"');
  bodyParts.push("Content-Transfer-Encoding: 7bit");
  bodyParts.push("");
  bodyParts.push(html);
  bodyParts.push("");

  const attachmentPromises = attachments.map(async (a) => {
    const filename = a.filename || (a.path ? basename(a.path) : "attachment");
    const contentType = a.contentType ?? "application/octet-stream";
    const content = a.content ?? (a.path ? await readFile(a.path) : Buffer.from(""));

    const base64 = content.toString("base64").replace(/(.{76})/g, "$1\r\n");

    return [
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64,
      "",
    ].join("\r\n");
  });

  return Promise.all(attachmentPromises).then((attParts) => {
    const tail = `--${boundary}--\r\n`;
    const full = head + bodyParts.join("\r\n") + attParts.join("\r\n") + tail;
    return Buffer.from(full, "utf8");
  });
}

export function isGmailApiConfigured(config: AppConfig): boolean {
  return Boolean(
    config.GMAIL_API_CLIENT_ID?.trim() &&
      config.GMAIL_API_CLIENT_SECRET?.trim() &&
      config.GMAIL_API_REFRESH_TOKEN?.trim() &&
      config.GMAIL_API_SENDER?.trim(),
  );
}

export class GmailApiMailer {
  constructor(
    private readonly config: AppConfig,
    private readonly log: Logger,
  ) {}

  async send(input: SendMailInput): Promise<void> {
    const sender = this.config.GMAIL_API_SENDER?.trim();
    if (!sender) throw new Error("GMAIL_API_SENDER is empty");

    const to = parseMailRecipients(this.config.MAIL_TO);
    if (to.length === 0) throw new Error("MAIL_TO is empty");
    const cc = this.config.MAIL_CC ? parseMailRecipients(this.config.MAIL_CC) : undefined;
    const bcc = this.config.MAIL_BCC ? parseMailRecipients(this.config.MAIL_BCC) : undefined;

    const mime = await buildMimeMessage({
      // For Gmail API, From should match the authenticated sender (or a configured alias).
      from: this.config.MAIL_FROM?.trim() || sender,
      to,
      cc,
      bcc,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });

    const oauth2 = new google.auth.OAuth2(
      this.config.GMAIL_API_CLIENT_ID,
      this.config.GMAIL_API_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: this.config.GMAIL_API_REFRESH_TOKEN });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    this.log.info({ to: formatRecipientsForNodemailer(to), subject: input.subject }, "Sending email via Gmail API");

    await gmail.users.messages.send({
      userId: sender,
      requestBody: { raw: toBase64Url(mime) },
    });

    this.log.info({ subject: input.subject, to: formatRecipientsForNodemailer(to) }, "Email sent successfully (Gmail API)");
  }
}

// Exported for unit tests
export const __test__ = { buildMimeMessage };

