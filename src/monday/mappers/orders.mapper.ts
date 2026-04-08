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

/** Column IDs — board Comenzi / Curse */
export const ORDER_COLUMNS = {
  nrComanda: "pulse_id_mks1dcwz",
  dealCreationDate: "deal_creation_date",
  sursaClient: "color_mktcvtpz",
  principal: "deal_owner",
  profit: "formula_mkre3gx1",
  moneda: "color_mkse3amh",
  emailSemnare: "email_mkse8jyb",
  emailCompanieLookup: "lookup_mkyqf8ke",
  emailContabilitate: "email_mkvneqyg",
  companieClient: "board_relation_mkpw4bcs",
} as const;

export interface OrderRow {
  itemId: string;
  itemName: string;
  createdAt: string;
  nrComanda: string | null;
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

function extractOrderEmails(map: ReturnType<typeof byId>): string[] {
  const parts: string[] = [];
  const e1 = getText(map, ORDER_COLUMNS.emailSemnare);
  const e2 = getText(map, ORDER_COLUMNS.emailCompanieLookup);
  const e3 = getText(map, ORDER_COLUMNS.emailContabilitate);
  if (e1) parts.push(e1);
  if (e2) parts.push(e2);
  if (e3) parts.push(e3);
  return normalizeAndFilterValidEmails(parts.join(";"));
}

function clientNameFromRelation(map: ReturnType<typeof byId>, itemName: string): string | null {
  const rel = getText(map, ORDER_COLUMNS.companieClient);
  if (rel) return rel;
  return itemName;
}

export function mapOrderItem(raw: MondayItemRaw): OrderRow {
  const map = byId(raw.column_values);
  const date = parseDealCreationDate(map, ORDER_COLUMNS.dealCreationDate);
  const profitText = getFormulaDisplay(map, ORDER_COLUMNS.profit);

  return {
    itemId: raw.id,
    itemName: raw.name,
    createdAt: raw.created_at,
    nrComanda: getText(map, ORDER_COLUMNS.nrComanda),
    dealCreationDate: date?.isoDate ?? null,
    dealCreationAtUtcMs: date?.atUtcMs ?? null,
    sursaClient: getText(map, ORDER_COLUMNS.sursaClient),
    principalDisplay: getPeopleDisplayNames(map, ORDER_COLUMNS.principal),
    profitRaw: profitText,
    profitNumber: parseProfitNumber(profitText),
    moneda: getText(map, ORDER_COLUMNS.moneda),
    emailsNormalized: extractOrderEmails(map),
    clientNameDisplay: clientNameFromRelation(map, raw.name),
  };
}
