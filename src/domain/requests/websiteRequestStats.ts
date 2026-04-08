import type { UnifiedRequestRow } from "./unifiedRequest.types.js";

export function isWebsiteRequestCandidate(r: UnifiedRequestRow, websiteLabel: string): boolean {
  return r.sursaClient === websiteLabel && r.emailsNormalized.length > 0;
}

export function countWebsiteRequestsByBoard(
  requests: UnifiedRequestRow[],
  websiteLabel: string,
  board1Id: number,
  board2Id: number,
): {
  totalWebsiteRequestsBoard1: number;
  totalWebsiteRequestsBoard2: number;
  totalWebsiteRequestsConsidered: number;
} {
  const candidates = requests.filter((r) => isWebsiteRequestCandidate(r, websiteLabel));
  return {
    totalWebsiteRequestsBoard1: candidates.filter((r) => r.boardId === board1Id).length,
    totalWebsiteRequestsBoard2: candidates.filter((r) => r.boardId === board2Id).length,
    totalWebsiteRequestsConsidered: candidates.length,
  };
}
