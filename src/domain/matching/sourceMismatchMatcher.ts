import type { OrderRow } from "../../monday/mappers/orders.mapper.js";
import type { UnifiedRequestRow } from "../requests/unifiedRequest.types.js";
import { countWebsiteRequestsByBoard, isWebsiteRequestCandidate } from "../requests/websiteRequestStats.js";
import type { SourceMismatchRow } from "./sourceMismatch.types.js";
import { WEBSITE_LABEL } from "./sourceMismatch.types.js";
import { isDateInRange, type MonthRange } from "./previousMonthRange.js";

export interface MismatchMatcherOptions {
  requestsBoard1Id: number;
  requestsBoard2Id: number;
  /** When true, every loaded order is in scope (no Data Ctr. month filter). */
  skipOrderDateFilter?: boolean;
}

function sortKeyRequestCreated(r: UnifiedRequestRow): number {
  if (r.dealCreationAtUtcMs != null) return r.dealCreationAtUtcMs;
  const ca = Date.parse(r.createdAt);
  return Number.isNaN(ca) ? Number.MAX_SAFE_INTEGER : ca;
}

function intersectEmails(order: OrderRow, req: UnifiedRequestRow): string | null {
  const os = new Set(order.emailsNormalized);
  for (const e of req.emailsNormalized) {
    if (os.has(e)) return e;
  }
  return null;
}

function distinctSortedBoardNames(matches: UnifiedRequestRow[]): string {
  const names = [...new Set(matches.map((m) => m.boardName))];
  names.sort((a, b) => a.localeCompare(b));
  return names.join("; ");
}

export interface MatchSummary {
  rows: SourceMismatchRow[];
  stats: {
    totalOrdersInPeriod: number;
    totalOrdersNonWebsite: number;
    totalOrdersWithValidEmail: number;
    totalWebsiteRequestsBoard1: number;
    totalWebsiteRequestsBoard2: number;
    totalWebsiteRequestsConsidered: number;
    totalMatchesFound: number;
  };
}

export function buildSourceMismatches(
  orders: OrderRow[],
  websiteRequests: UnifiedRequestRow[],
  auditedRange: MonthRange,
  runMonthLabel: string,
  opts: MismatchMatcherOptions,
): MatchSummary {
  const ordersInPeriod = opts.skipOrderDateFilter
    ? orders
    : orders.filter(
        (o) => o.dealCreationDate != null && isDateInRange(o.dealCreationDate, auditedRange),
      );

  const nonWebsite = ordersInPeriod.filter((o) => o.sursaClient !== WEBSITE_LABEL);
  const withEmail = nonWebsite.filter((o) => o.emailsNormalized.length > 0);

  const reqs = websiteRequests.filter((r) => isWebsiteRequestCandidate(r, WEBSITE_LABEL));

  const {
    totalWebsiteRequestsBoard1,
    totalWebsiteRequestsBoard2,
    totalWebsiteRequestsConsidered,
  } = countWebsiteRequestsByBoard(websiteRequests, WEBSITE_LABEL, opts.requestsBoard1Id, opts.requestsBoard2Id);

  const rows: SourceMismatchRow[] = [];

  for (const order of withEmail) {
    const matches: UnifiedRequestRow[] = [];
    for (const r of reqs) {
      if (intersectEmails(order, r)) matches.push(r);
    }
    if (matches.length === 0) continue;

    matches.sort((a, b) => {
      const d = sortKeyRequestCreated(a) - sortKeyRequestCreated(b);
      if (d !== 0) return d;
      const id = a.itemId.localeCompare(b.itemId);
      if (id !== 0) return id;
      return a.boardId - b.boardId;
    });
    const selected = matches[0]!;
    const emailMatch = intersectEmails(order, selected)!;
    const src = order.sursaClient ?? "(lipsă)";
    const notes = `Comanda are sursa ${src}, dar există solicitare Website (${selected.boardName}) pentru același email`;

    const moneda = order.moneda?.trim().toUpperCase() ?? "";
    const profitEur = moneda === "EUR" ? order.profitNumber : null;

    rows.push({
      runMonthLabel,
      order,
      selectedRequest: selected,
      emailMatch,
      matchesCount: matches.length,
      allMatchedRequestBoards: distinctSortedBoardNames(matches),
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
      totalWebsiteRequestsBoard1,
      totalWebsiteRequestsBoard2,
      totalWebsiteRequestsConsidered,
      totalMatchesFound: rows.length,
    },
  };
}
