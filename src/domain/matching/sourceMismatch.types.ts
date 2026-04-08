import type { OrderRow } from "../../monday/mappers/orders.mapper.js";
import type { UnifiedRequestRow } from "../requests/unifiedRequest.types.js";

export interface SourceMismatchRow {
  runMonthLabel: string;
  order: OrderRow;
  selectedRequest: UnifiedRequestRow;
  emailMatch: string;
  matchesCount: number;
  /** Distinct board names among all matching requests, sorted, joined with "; " */
  allMatchedRequestBoards: string;
  profitEur: number | null;
  notes: string;
}

export const WEBSITE_LABEL = "Website";
