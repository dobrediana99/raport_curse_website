import { describe, it, expect } from "vitest";
import { buildSourceMismatches } from "../src/domain/matching/sourceMismatchMatcher.js";
import type { OrderRow } from "../src/monday/mappers/orders.mapper.js";
import type { RequestRow } from "../src/monday/mappers/requests.mapper.js";

function baseOrder(over: Partial<OrderRow> = {}): OrderRow {
  return {
    itemId: "o1",
    itemName: "Order",
    createdAt: "2026-04-01T00:00:00Z",
    nrComanda: "C1",
    dealCreationDate: "2026-04-10",
    dealCreationAtUtcMs: Date.parse("2026-04-10T12:00:00Z"),
    sursaClient: "Altceva",
    principalDisplay: "A",
    profitRaw: "10",
    profitNumber: 10,
    moneda: "EUR",
    emailsNormalized: ["x@y.com"],
    clientNameDisplay: "Co",
    ...over,
  };
}

function baseRequest(over: Partial<RequestRow> = {}): RequestRow {
  return {
    itemId: "r1",
    itemName: "Req",
    createdAt: "2026-03-01T00:00:00Z",
    nrSolicitare: "S1",
    dealCreationDate: "2026-03-15",
    dealCreationAtUtcMs: Date.parse("2026-03-15T12:00:00Z"),
    sursaClient: "Website",
    principalDisplay: "B",
    profitRaw: null,
    profitNumber: null,
    moneda: null,
    emailsNormalized: ["x@y.com"],
    clientNameDisplay: "Co2",
    ...over,
  };
}

const range = {
  startIso: "2026-04-01",
  endIso: "2026-04-30",
  startMs: 0,
  endExclusiveMs: 0,
  labelYm: "2026-04",
};

describe("buildSourceMismatches", () => {
  it("no match when order is Website", () => {
    const orders = [baseOrder({ sursaClient: "Website" })];
    const reqs = [baseRequest()];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(0);
  });

  it("no match when request is not Website", () => {
    const orders = [baseOrder()];
    const reqs = [baseRequest({ sursaClient: "Altceva" })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(0);
  });

  it("match on first order email", () => {
    const orders = [baseOrder({ emailsNormalized: ["a@b.com", "x@y.com"] })];
    const reqs = [baseRequest({ emailsNormalized: ["x@y.com"] })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.emailMatch).toBe("x@y.com");
  });

  it("match on secondary order email", () => {
    const orders = [baseOrder({ emailsNormalized: ["a@b.com", "z@z.com"] })];
    const reqs = [baseRequest({ emailsNormalized: ["z@z.com"] })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(1);
  });

  it("picks oldest Website request and counts matches", () => {
    const orders = [baseOrder()];
    const reqs = [
      baseRequest({
        itemId: "r-new",
        dealCreationDate: "2026-04-01",
        dealCreationAtUtcMs: Date.parse("2026-04-01T12:00:00Z"),
        createdAt: "2026-04-01T00:00:00Z",
      }),
      baseRequest({
        itemId: "r-old",
        dealCreationDate: "2026-01-01",
        dealCreationAtUtcMs: Date.parse("2026-01-01T12:00:00Z"),
        createdAt: "2026-01-01T00:00:00Z",
      }),
    ];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.selectedRequest.itemId).toBe("r-old");
    expect(rows[0]!.matchesCount).toBe(2);
  });

  it("ignores orders outside audited month", () => {
    const orders = [baseOrder({ dealCreationDate: "2026-03-31" })];
    const reqs = [baseRequest()];
    const { rows, stats } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(0);
    expect(stats.totalOrdersInPeriod).toBe(0);
  });

  it("ignores orders without valid emails", () => {
    const orders = [baseOrder({ emailsNormalized: [] })];
    const reqs = [baseRequest()];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(0);
  });

  it("Profit EUR only when moneda EUR", () => {
    const orders = [baseOrder({ moneda: "RON", profitNumber: 99 })];
    const reqs = [baseRequest()];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.profitEur).toBeNull();
  });
});
