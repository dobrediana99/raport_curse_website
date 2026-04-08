/**
 * Column IDs for mapping a monday item into {@link UnifiedRequestRow}.
 * Omit `nrSolicitare` when the board has no dedicated “Nr solicitare” column — then `item.id` is used.
 */
export interface RequestBoardColumnMapping {
  nrSolicitareColumnId?: string;
  dealCreationDateColumnId: string;
  sursaClientColumnId: string;
  principalColumnId: string;
  denumireCompanieColumnId: string;
  numeClientColumnId: string;
  emailClientColumnId: string;
  emailCompanieColumnId: string;
  profitColumnId?: string;
  monedaColumnId?: string;
}

export interface RequestBoardDefinition {
  boardId: number;
  boardName: string;
  columns: RequestBoardColumnMapping;
}
