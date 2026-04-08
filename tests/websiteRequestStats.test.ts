import { describe, it, expect } from "vitest";
import { countWebsiteRequestsByBoard } from "../src/domain/requests/websiteRequestStats.js";
import type { UnifiedRequestRow } from "../src/domain/requests/unifiedRequest.types.js";

const B1 = 111;
const B2 = 222;
const LABEL = "Website";

function req(
  boardId: number,
  sursa: string,
  emails: string[],
  itemId: string,
): UnifiedRequestRow {
  return {
    boardId,
    boardName: boardId === B1 ? "Solicitari" : "Solicitari 2",
    itemId,
    itemName: itemId,
    createdAt: "2026-01-01T00:00:00Z",
    requestNumber: itemId,
    dealCreationDate: null,
    dealCreationAtUtcMs: null,
    sursaClient: sursa,
    principalDisplay: null,
    profitRaw: null,
    profitNumber: null,
    moneda: null,
    emailsNormalized: emails,
    clientNameDisplay: null,
  };
}

describe("countWebsiteRequestsByBoard", () => {
  it("aggregates candidates from merged board lists", () => {
    const merged: UnifiedRequestRow[] = [
      req(B1, LABEL, ["a@a.com"], "1"),
      req(B2, LABEL, ["b@b.com"], "2"),
      req(B1, "Other", ["c@c.com"], "3"),
      req(B2, LABEL, [], "4"),
    ];
    const out = countWebsiteRequestsByBoard(merged, LABEL, B1, B2);
    expect(out.totalWebsiteRequestsBoard1).toBe(1);
    expect(out.totalWebsiteRequestsBoard2).toBe(1);
    expect(out.totalWebsiteRequestsConsidered).toBe(2);
  });
});
