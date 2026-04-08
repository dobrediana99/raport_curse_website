import type { MondayColumnValueRaw } from "../../core/types.js";

export function byId(cols: MondayColumnValueRaw[]): Map<string, MondayColumnValueRaw> {
  return new Map(cols.map((c) => [c.id, c]));
}

export function getText(map: Map<string, MondayColumnValueRaw>, id: string): string | null {
  const c = map.get(id);
  const t = c?.text?.trim();
  return t && t.length > 0 ? t : null;
}

export function getRawValueJson(map: Map<string, MondayColumnValueRaw>, id: string): unknown {
  const raw = map.get(id)?.value;
  if (!raw || raw === "") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Monday date column: value often `{ date: "YYYY-MM-DD", time?: string }`. */
export function parseDealCreationDate(
  map: Map<string, MondayColumnValueRaw>,
  columnId: string,
): { isoDate: string; atUtcMs: number } | null {
  const j = getRawValueJson(map, columnId);
  if (j && typeof j === "object" && j !== null && "date" in j) {
    const date = (j as { date?: string }).date;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const at = Date.parse(`${date}T12:00:00.000Z`);
      if (!Number.isNaN(at)) return { isoDate: date, atUtcMs: at };
    }
  }
  const text = getText(map, columnId);
  if (text) {
    const m = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const at = Date.parse(`${m[1]}T12:00:00.000Z`);
      if (!Number.isNaN(at)) return { isoDate: m[1], atUtcMs: at };
    }
  }
  return null;
}

export function parseProfitNumber(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/\s/g, "").replace(/,/g, ".");
  const n = Number.parseFloat(cleaned.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Best-effort: formula column may expose display in `text`. */
export function getFormulaDisplay(map: Map<string, MondayColumnValueRaw>, id: string): string | null {
  return getText(map, id);
}

export function getPeopleDisplayNames(map: Map<string, MondayColumnValueRaw>, id: string): string | null {
  const col = map.get(id);
  if (!col) return null;
  const t = col.text?.trim();
  if (t) return t;
  const j = getRawValueJson(map, id);
  if (j && typeof j === "object" && j !== null && "personsAndTeams" in j) {
    const pt = (j as { personsAndTeams?: Array<{ id: number }> }).personsAndTeams;
    if (pt?.length) return pt.map((p) => String(p.id)).join(", ");
  }
  return null;
}
