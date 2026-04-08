import type { RequestBoardDefinition } from "./requestBoard.types.js";

/** Column layout for board “Solicitari” — IDs from original spec. */
export const SOLICITARI_COLUMNS = {
  nrSolicitareColumnId: "pulse_id_mks1dcwz",
  dealCreationDateColumnId: "deal_creation_date",
  sursaClientColumnId: "color_mkpv6sj4",
  principalColumnId: "deal_owner",
  denumireCompanieColumnId: "text_mkxb64cd",
  numeClientColumnId: "text_mkx73bb0",
  emailClientColumnId: "email_mkvmar5w",
  emailCompanieColumnId: "text_mkpywzvm",
  profitColumnId: "formula_mm1m2vsb",
  monedaColumnId: "color_mksh2abx",
} as const;

/** Column layout for board “Solicitari 2”. */
export const SOLICITARI_2_COLUMNS = {
  dealCreationDateColumnId: "date_mm0z9cek",
  sursaClientColumnId: "color_mm0zph3f",
  principalColumnId: "multiple_person_mm0zj2e0",
  denumireCompanieColumnId: "text_mm0z96jr",
  numeClientColumnId: "text_mm0zmbx5",
  emailClientColumnId: "email_mm0zexk0",
  emailCompanieColumnId: "text_mm0z4kr8",
} as const;

export function createSolicitariBoardDefinition(boardId: number): RequestBoardDefinition {
  return {
    boardId,
    boardName: "Solicitari",
    columns: { ...SOLICITARI_COLUMNS },
  };
}

export function createSolicitari2BoardDefinition(boardId: number): RequestBoardDefinition {
  return {
    boardId,
    boardName: "Solicitari 2",
    columns: { ...SOLICITARI_2_COLUMNS },
  };
}
