import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { getPreviousMonthRange, isDateInRange } from "../src/domain/matching/previousMonthRange.js";

describe("getPreviousMonthRange", () => {
  it("May 1 2026 -> April 2026 full month", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 5, day: 1 },
      { zone: "Europe/Bucharest" },
    );
    const r = getPreviousMonthRange("Europe/Bucharest", now);
    expect(r.labelYm).toBe("2026-04");
    expect(r.startIso).toBe("2026-04-01");
    expect(r.endIso).toBe("2026-04-30");
  });

  it("Mar 15 2026 -> February 2026 (leap year)", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 3, day: 15 },
      { zone: "Europe/Bucharest" },
    );
    const r = getPreviousMonthRange("Europe/Bucharest", now);
    expect(r.labelYm).toBe("2026-02");
    expect(r.startIso).toBe("2026-02-01");
    expect(r.endIso).toBe("2026-02-28");
  });
});

describe("isDateInRange", () => {
  it("inclusive boundaries", () => {
    const r = getPreviousMonthRange(
      "Europe/Bucharest",
      DateTime.fromObject({ year: 2026, month: 5, day: 1 }, { zone: "Europe/Bucharest" }),
    );
    expect(isDateInRange("2026-04-01", r)).toBe(true);
    expect(isDateInRange("2026-04-30", r)).toBe(true);
    expect(isDateInRange("2026-03-31", r)).toBe(false);
    expect(isDateInRange("2026-05-01", r)).toBe(false);
  });
});
