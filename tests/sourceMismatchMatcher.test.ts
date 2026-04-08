import { describe, it, expect } from "vitest";
import { buildSourceMismatches } from "../src/domain/matching/sourceMismatchMatcher.js";
import type { OrderRow } from "../src/monday/mappers/orders.mapper.js";
import type { UnifiedRequestRow } from "../src/domain/requests/unifiedRequest.types.js";

const BOARD_1 = 1_905_911_565;
const BOARD_2 = 5_092_436_128;

const matcherOpts = { requestsBoard1Id: BOARD_1, requestsBoard2Id: BOARD_2 };

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

function baseRequest(over: Partial<UnifiedRequestRow> = {}): UnifiedRequestRow {
  return {
    boardId: BOARD_1,
    boardName: "Solicitari",
    itemId: "r1",
    itemName: "Req",
    createdAt: "2026-03-01T00:00:00Z",
    requestNumber: "S1",
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
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(0);
  });

  it("no match when request is not Website", () => {
    const orders = [baseOrder()];
    const reqs = [baseRequest({ sursaClient: "Altceva" })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(0);
  });

  it("match on first order email", () => {
    const orders = [baseOrder({ emailsNormalized: ["a@b.com", "x@y.com"] })];
    const reqs = [baseRequest({ emailsNormalized: ["x@y.com"] })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.emailMatch).toBe("x@y.com");
  });

  it("match on secondary order email", () => {
    const orders = [baseOrder({ emailsNormalized: ["a@b.com", "z@z.com"] })];
    const reqs = [baseRequest({ emailsNormalized: ["z@z.com"] })];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
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
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.selectedRequest.itemId).toBe("r-old");
    expect(rows[0]!.matchesCount).toBe(2);
  });

  it("ignores orders outside audited month", () => {
    const orders = [baseOrder({ dealCreationDate: "2026-03-31" })];
    const reqs = [baseRequest()];
    const { rows, stats } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(0);
    expect(stats.totalOrdersInPeriod).toBe(0);
  });

  it("ignores orders without valid emails", () => {
    const orders = [baseOrder({ emailsNormalized: [] })];
    const reqs = [baseRequest()];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(0);
  });

  it("Profit EUR only when moneda EUR", () => {
    const orders = [baseOrder({ moneda: "RON", profitNumber: 99 })];
    const reqs = [baseRequest()];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.profitEur).toBeNull();
  });

  it("match only in Solicitari 2 sets board metadata on row", () => {
    const orders = [baseOrder()];
    const reqs = [
      baseRequest({
        boardId: BOARD_2,
        boardName: "Solicitari 2",
        itemId: "r2",
        requestNumber: "5092436128-internal",
      }),
    ];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.selectedRequest.boardName).toBe("Solicitari 2");
    expect(rows[0]!.selectedRequest.boardId).toBe(BOARD_2);
    expect(rows[0]!.allMatchedRequestBoards).toBe("Solicitari 2");
  });

  it("cross-board: picks globally oldest request and sums matches_count", () => {
    const orders = [baseOrder()];
    const reqs = [
      baseRequest({
        boardId: BOARD_1,
        boardName: "Solicitari",
        itemId: "r-b1-new",
        dealCreationDate: "2026-05-01",
        dealCreationAtUtcMs: Date.parse("2026-05-01T12:00:00Z"),
      }),
      baseRequest({
        boardId: BOARD_2,
        boardName: "Solicitari 2",
        itemId: "r-b2-old",
        dealCreationDate: "2026-01-01",
        dealCreationAtUtcMs: Date.parse("2026-01-01T12:00:00Z"),
      }),
      baseRequest({
        boardId: BOARD_2,
        boardName: "Solicitari 2",
        itemId: "r-b2-mid",
        dealCreationDate: "2026-02-01",
        dealCreationAtUtcMs: Date.parse("2026-02-01T12:00:00Z"),
      }),
    ];
    const { rows } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.selectedRequest.itemId).toBe("r-b2-old");
    expect(rows[0]!.matchesCount).toBe(3);
    expect(rows[0]!.allMatchedRequestBoards).toBe("Solicitari; Solicitari 2");
  });

  it("summary counts website requests per board", () => {
    const orders: OrderRow[] = [];
    const reqs: UnifiedRequestRow[] = [
      baseRequest({ boardId: BOARD_1, itemId: "a", emailsNormalized: ["a@a.com"] }),
      baseRequest({ boardId: BOARD_1, itemId: "b", emailsNormalized: ["b@b.com"] }),
      baseRequest({
        boardId: BOARD_2,
        boardName: "Solicitari 2",
        itemId: "c",
        emailsNormalized: ["c@c.com"],
        sursaClient: "Altceva",
      }),
    ];
    const { stats } = buildSourceMismatches(orders, reqs, range, range.labelYm, matcherOpts);
    expect(stats.totalWebsiteRequestsBoard1).toBe(2);
    expect(stats.totalWebsiteRequestsBoard2).toBe(0);
    expect(stats.totalWebsiteRequestsConsidered).toBe(2);
  });
});
