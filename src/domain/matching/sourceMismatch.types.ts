import type { OrderRow } from "../../monday/mappers/orders.mapper.js";
import type { RequestRow } from "../../monday/mappers/requests.mapper.js";

export interface SourceMismatchRow {
  runMonthLabel: string;
  order: OrderRow;
  selectedRequest: RequestRow;
  emailMatch: string;
  matchesCount: number;
  profitEur: number | null;
  notes: string;
}

export const WEBSITE_LABEL = "Website";
