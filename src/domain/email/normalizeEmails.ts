const SPLIT_RE = /[,;]+/g;

/** Lightweight validity check (not full RFC). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isProbablyValidEmail(normalized: string): boolean {
  return EMAIL_RE.test(normalized);
}

/**
 * Normalize emails: trim, lowercase, split on "," / ";", drop empties, dedupe (stable order).
 */
export function normalizeEmails(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const chunks = raw
    .split(SPLIT_RE)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of chunks) {
    if (!seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

export function normalizeEmailList(lists: Iterable<string>): string[] {
  const joined = [...lists].join(";");
  return normalizeEmails(joined);
}

export function normalizeAndFilterValidEmails(raw: string | null | undefined): string[] {
  return normalizeEmails(raw).filter(isProbablyValidEmail);
}
