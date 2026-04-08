import type { MondayItemRaw } from "../../core/types.js";
import type { UnifiedRequestRow } from "../../domain/requests/unifiedRequest.types.js";
import type { RequestBoardDefinition } from "./requestBoard.types.js";
import {
  byId,
  getText,
  parseDealCreationDate,
  getFormulaDisplay,
  parseProfitNumber,
  getPeopleDisplayNames,
} from "./columnHelpers.js";
import { normalizeAndFilterValidEmails } from "../../domain/email/normalizeEmails.js";

function extractEmails(
  map: ReturnType<typeof byId>,
  emailClientId: string,
  emailCompanieId: string,
): string[] {
  const parts: string[] = [];
  const e1 = getText(map, emailClientId);
  const e2 = getText(map, emailCompanieId);
  if (e1) parts.push(e1);
  if (e2) parts.push(e2);
  return normalizeAndFilterValidEmails(parts.join(";"));
}

function clientDisplayName(
  map: ReturnType<typeof byId>,
  def: RequestBoardDefinition,
  itemName: string,
): string | null {
  const c = getText(map, def.columns.denumireCompanieColumnId);
  if (c) return c;
  const n = getText(map, def.columns.numeClientColumnId);
  if (n) return n;
  return itemName;
}

export function mapItemToUnifiedRequest(
  raw: MondayItemRaw,
  def: RequestBoardDefinition,
): UnifiedRequestRow {
  const map = byId(raw.column_values);
  const { columns } = def;

  const date = parseDealCreationDate(map, columns.dealCreationDateColumnId);

  const nrCol = columns.nrSolicitareColumnId;
  const nrFromCol = nrCol ? getText(map, nrCol) : null;
  const requestNumber = (nrFromCol && nrFromCol.length > 0 ? nrFromCol : raw.id).trim();

  const profitCol = columns.profitColumnId;
  const profitText = profitCol ? getFormulaDisplay(map, profitCol) : null;

  const monedaCol = columns.monedaColumnId;
  const moneda = monedaCol ? getText(map, monedaCol) : null;

  return {
    boardId: def.boardId,
    boardName: def.boardName,
    itemId: raw.id,
    itemName: raw.name,
    createdAt: raw.created_at,
    requestNumber,
    dealCreationDate: date?.isoDate ?? null,
    dealCreationAtUtcMs: date?.atUtcMs ?? null,
    sursaClient: getText(map, columns.sursaClientColumnId),
    principalDisplay: getPeopleDisplayNames(map, columns.principalColumnId),
    profitRaw: profitText,
    profitNumber: profitText ? parseProfitNumber(profitText) : null,
    moneda,
    emailsNormalized: extractEmails(map, columns.emailClientColumnId, columns.emailCompanieColumnId),
    clientNameDisplay: clientDisplayName(map, def, raw.name),
  };
}
