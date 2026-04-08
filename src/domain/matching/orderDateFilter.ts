import { getPreviousMonthRange, type MonthRange } from "./previousMonthRange.js";

/**
 * Resolved date scope for a run. `range` is always the previous calendar month (for metadata);
 * `applyMonthFilter` controls whether orders are restricted to that month.
 */
export interface ResolvedOrderDateFilter {
  applyMonthFilter: boolean;
  range: MonthRange;
}

/**
 * @param noDateFilter - When true, all orders are in scope (debug / manual runs).
 *   Production cron should omit this or pass false.
 */
export function resolveOrderDateFilterForRun(
  timezone: string,
  noDateFilter?: boolean,
): ResolvedOrderDateFilter {
  const range = getPreviousMonthRange(timezone);
  if (noDateFilter) return { applyMonthFilter: false, range };
  return { applyMonthFilter: true, range };
}
