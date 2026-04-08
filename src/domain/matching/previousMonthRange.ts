import { DateTime } from "luxon";

export interface MonthRange {
  /** YYYY-MM-DD inclusive start in calendar sense for audited month */
  startIso: string;
  /** YYYY-MM-DD inclusive end */
  endIso: string;
  /** Start at 00:00:00 in timezone */
  startMs: number;
  /** End at end of day in timezone, as exclusive upper bound in ms for comparisons */
  endExclusiveMs: number;
  labelYm: string;
}

/**
 * Previous full calendar month in `timezone`, relative to `now` (default: now in that zone).
 * Order with Data Ctr. on endIso is included (inclusive day comparison on YYYY-MM-DD).
 */
export function getPreviousMonthRange(timezone: string, now?: DateTime): MonthRange {
  const base = (now ?? DateTime.now().setZone(timezone)).startOf("day");
  const prev = base.minus({ months: 1 });
  const start = prev.startOf("month");
  const end = prev.endOf("month");

  return {
    startIso: start.toISODate()!,
    endIso: end.toISODate()!,
    startMs: start.toMillis(),
    endExclusiveMs: end.plus({ days: 1 }).startOf("day").toMillis(),
    labelYm: start.toFormat("yyyy-MM"),
  };
}

/**
 * True if calendar date string YYYY-MM-DD falls within [startIso, endIso] inclusive.
 */
export function isDateInRange(isoDate: string, range: MonthRange): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  return isoDate >= range.startIso && isoDate <= range.endIso;
}
