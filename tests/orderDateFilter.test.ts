import { describe, it, expect } from "vitest";
import { resolveOrderDateFilterForRun } from "../src/domain/matching/orderDateFilter.js";

describe("resolveOrderDateFilterForRun", () => {
  it("applies month filter by default", () => {
    const ctx = resolveOrderDateFilterForRun("Europe/Bucharest", false);
    expect(ctx.applyMonthFilter).toBe(true);
    expect(ctx.range.startIso <= ctx.range.endIso).toBe(true);
    expect(ctx.range.labelYm).toMatch(/^\d{4}-\d{2}$/);
  });

  it("disables month filter when noDateFilter is true", () => {
    const ctx = resolveOrderDateFilterForRun("Europe/Bucharest", true);
    expect(ctx.applyMonthFilter).toBe(false);
    expect(ctx.range.labelYm).toMatch(/^\d{4}-\d{2}$/);
  });
});
