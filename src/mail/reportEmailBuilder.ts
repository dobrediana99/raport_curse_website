import type { MonthRange } from "../domain/matching/previousMonthRange.js";

export function buildReportEmailHtml(params: {
  auditedRange: MonthRange;
  /** Default true — production month filter on order Data Ctr. */
  orderDateFilterApplied?: boolean;
  matchCount: number;
  ordersChecked: number;
  generatedAtIso: string;
  emptyRun: boolean;
}): string {
  const {
    auditedRange,
    orderDateFilterApplied = true,
    matchCount,
    ordersChecked,
    generatedAtIso,
    emptyRun,
  } = params;

  const intervalLine = orderDateFilterApplied
    ? `<li><strong>Interval verificat (Data Ctr. comenzi):</strong> ${auditedRange.startIso} → ${auditedRange.endIso} (${auditedRange.labelYm})</li>`
    : `<li><strong>Filtru dată comenzi:</strong> dezactivat (toate comenzile încărcate din board)</li><li><strong>Lună de referință (metadata):</strong> ${auditedRange.labelYm} (${auditedRange.startIso} → ${auditedRange.endIso})</li>`;

  const ordersLine = orderDateFilterApplied
    ? `<li><strong>Comenzi luate în calcul (în interval, toate sursele):</strong> ${ordersChecked}</li>`
    : `<li><strong>Comenzi luate în calcul (toate datele, toate sursele):</strong> ${ordersChecked}</li>`;

  const footerLogic = orderDateFilterApplied
    ? "Logica: comenzi din luna anterioară cu sursă ≠ Website și cu email valid, pentru care există solicitare Website (în board-urile Solicitari și Solicitari 2) cu email comun. Raportul arată din ce board provine solicitarea potrivită."
    : "Mod debug: filtrul pe Data Ctr. este oprit — sunt evaluate toate comenzile încărcate din board (cu sursă ≠ Website și email valid), față de solicitările Website din ambele board-uri.";

  const intro = emptyRun
    ? "<p><strong>Nu s-au identificat erori</strong> de atribuire a sursei pentru intervalul verificat.</p>"
    : `<p>S-au identificat <strong>${matchCount}</strong> cazuri suspecte (comenzi cu sursă diferită de Website, dar cu solicitare Website pe același email).</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#222;">
  <h2 style="margin:0 0 12px;">Audit sursă client — monday.com</h2>
  ${intro}
  <ul>
    ${intervalLine}
    ${ordersLine}
    <li><strong>Total erori raportate:</strong> ${matchCount}</li>
    <li><strong>Generat la:</strong> ${generatedAtIso}</li>
  </ul>
  <p style="margin-top:16px;color:#444;">
    Raportul Excel atașat conține detalii pe linii (dacă există erori) și un sheet Summary cu agregate.
    ${footerLogic}
  </p>
</body>
</html>
`.trim();
}
