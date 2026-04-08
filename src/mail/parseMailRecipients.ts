/**
 * Parses `MAIL_TO` / `MAIL_CC` style strings into trimmed, non-empty addresses.
 * Supports comma or semicolon separators (and mixed).
 */
export function parseMailRecipients(raw: string): string[] {
  return raw
    .split(/[,;]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Format for nodemailer `to` / `cc` / `bcc`: RFC-friendly comma-separated list without stray spaces.
 */
export function formatRecipientsForNodemailer(addresses: string[]): string {
  return addresses.join(", ");
}
