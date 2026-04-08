/**
 * Normalized request row from any "Solicitari*" board — used for matching and reporting.
 */
export interface UnifiedRequestRow {
  boardId: number;
  boardName: string;
  itemId: string;
  itemName: string;
  createdAt: string;
  /** User-facing request number; falls back to monday item id when no dedicated column. */
  requestNumber: string;
  dealCreationDate: string | null;
  dealCreationAtUtcMs: number | null;
  sursaClient: string | null;
  principalDisplay: string | null;
  profitRaw: string | null;
  profitNumber: number | null;
  moneda: string | null;
  emailsNormalized: string[];
  clientNameDisplay: string | null;
}
