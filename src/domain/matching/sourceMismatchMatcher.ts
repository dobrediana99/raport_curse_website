import type { OrderRow } from "../../monday/mappers/orders.mapper.js";
import type { RequestRow } from "../../monday/mappers/requests.mapper.js";
import type { SourceMismatchRow } from "./sourceMismatch.types.js";
import { WEBSITE_LABEL } from "./sourceMismatch.types.js";
import { isDateInRange, type MonthRange } from "./previousMonthRange.js";

function sortKeyRequestCreated(r: RequestRow): number {
  if (r.dealCreationAtUtcMs != null) return r.dealCreationAtUtcMs;
  const ca = Date.parse(r.createdAt);
  return Number.isNaN(ca) ? Number.MAX_SAFE_INTEGER : ca;
}

function intersectEmails(order: OrderRow, req: RequestRow): string | null {
  const os = new Set(order.emailsNormalized);
  for (const e of req.emailsNormalized) {
    if (os.has(e)) return e;
  }
  return null;
}

export interface MatchSummary {
  rows: SourceMismatchRow[];
  stats: {
    totalOrdersInPeriod: number;
    totalOrdersNonWebsite: number;
    totalOrdersWithValidEmail: number;
    totalWebsiteRequestsConsidered: number;
    totalMatchesFound: number;
  };
}

export function buildSourceMismatches(
  orders: OrderRow[],
  websiteRequests: RequestRow[],
  auditedRange: MonthRange,
  runMonthLabel: string,
): MatchSummary {
  const ordersInPeriod = orders.filter(
    (o) => o.dealCreationDate != null && isDateInRange(o.dealCreationDate, auditedRange),
  );

  const nonWebsite = ordersInPeriod.filter((o) => o.sursaClient !== WEBSITE_LABEL);
  const withEmail = nonWebsite.filter((o) => o.emailsNormalized.length > 0);

  const reqs = websiteRequests.filter((r) => r.sursaClient === WEBSITE_LABEL && r.emailsNormalized.length > 0);

  const rows: SourceMismatchRow[] = [];

  for (const order of withEmail) {
    const matches: RequestRow[] = [];
    for (const r of reqs) {
      if (intersectEmails(order, r)) matches.push(r);
    }
    if (matches.length === 0) continue;

    matches.sort((a, b) => {
      const d = sortKeyRequestCreated(a) - sortKeyRequestCreated(b);
      if (d !== 0) return d;
      return a.itemId.localeCompare(b.itemId);
    });
    const selected = matches[0]!;
    const emailMatch = intersectEmails(order, selected)!;
    const src = order.sursaClient ?? "(lipsă)";
    const notes = `Comanda are sursa ${src}, dar există solicitare Website pentru același email`;

    const moneda = order.moneda?.trim().toUpperCase() ?? "";
    const profitEur = moneda === "EUR" ? order.profitNumber : null;

    rows.push({
      runMonthLabel,
      order,
      selectedRequest: selected,
      emailMatch,
      matchesCount: matches.length,
      profitEur,
      notes,
    });
  }

  return {
    rows,
    stats: {
      totalOrdersInPeriod: ordersInPeriod.length,
      totalOrdersNonWebsite: nonWebsite.length,
      totalOrdersWithValidEmail: withEmail.length,
      totalWebsiteRequestsConsidered: reqs.length,
      totalMatchesFound: rows.length,
    },
  };
}
