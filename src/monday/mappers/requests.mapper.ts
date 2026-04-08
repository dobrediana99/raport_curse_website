import type { MondayItemRaw } from "../../core/types.js";
import {
  byId,
  getText,
  parseDealCreationDate,
  getFormulaDisplay,
  parseProfitNumber,
  getPeopleDisplayNames,
} from "./columnHelpers.js";
import { normalizeAndFilterValidEmails } from "../../domain/email/normalizeEmails.js";

export const REQUEST_COLUMNS = {
  nrSolicitare: "pulse_id_mks1dcwz",
  dealCreationDate: "deal_creation_date",
  sursaClient: "color_mkpv6sj4",
  principal: "deal_owner",
  denumireCompanie: "text_mkxb64cd",
  numeClient: "text_mkx73bb0",
  emailClient: "email_mkvmar5w",
  emailCompanie: "text_mkpywzvm",
  profit: "formula_mm1m2vsb",
  moneda: "color_mksh2abx",
} as const;

export interface RequestRow {
  itemId: string;
  itemName: string;
  createdAt: string;
  nrSolicitare: string | null;
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

function extractRequestEmails(map: ReturnType<typeof byId>): string[] {
  const parts: string[] = [];
  const e1 = getText(map, REQUEST_COLUMNS.emailClient);
  const e2 = getText(map, REQUEST_COLUMNS.emailCompanie);
  if (e1) parts.push(e1);
  if (e2) parts.push(e2);
  return normalizeAndFilterValidEmails(parts.join(";"));
}

function clientName(map: ReturnType<typeof byId>, itemName: string): string | null {
  const c = getText(map, REQUEST_COLUMNS.denumireCompanie);
  if (c) return c;
  const n = getText(map, REQUEST_COLUMNS.numeClient);
  if (n) return n;
  return itemName;
}

export function mapRequestItem(raw: MondayItemRaw): RequestRow {
  const map = byId(raw.column_values);
  const date = parseDealCreationDate(map, REQUEST_COLUMNS.dealCreationDate);
  const profitText = getFormulaDisplay(map, REQUEST_COLUMNS.profit);

  return {
    itemId: raw.id,
    itemName: raw.name,
    createdAt: raw.created_at,
    nrSolicitare: getText(map, REQUEST_COLUMNS.nrSolicitare),
    dealCreationDate: date?.isoDate ?? null,
    dealCreationAtUtcMs: date?.atUtcMs ?? null,
    sursaClient: getText(map, REQUEST_COLUMNS.sursaClient),
    principalDisplay: getPeopleDisplayNames(map, REQUEST_COLUMNS.principal),
    profitRaw: profitText,
    profitNumber: parseProfitNumber(profitText),
    moneda: getText(map, REQUEST_COLUMNS.moneda),
    emailsNormalized: extractRequestEmails(map),
    clientNameDisplay: clientName(map, raw.name),
  };
}
