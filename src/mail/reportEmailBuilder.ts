import type { MonthRange } from "../domain/matching/previousMonthRange.js";

export function buildReportEmailHtml(params: {
  auditedRange: MonthRange;
  matchCount: number;
  ordersChecked: number;
  generatedAtIso: string;
  emptyRun: boolean;
}): string {
  const { auditedRange, matchCount, ordersChecked, generatedAtIso, emptyRun } = params;

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
    <li><strong>Interval verificat (Data Ctr. comenzi):</strong> ${auditedRange.startIso} → ${auditedRange.endIso} (${auditedRange.labelYm})</li>
    <li><strong>Comenzi luate în calcul (în interval, toate sursele):</strong> ${ordersChecked}</li>
    <li><strong>Total erori raportate:</strong> ${matchCount}</li>
    <li><strong>Generat la:</strong> ${generatedAtIso}</li>
  </ul>
  <p style="margin-top:16px;color:#444;">
    Raportul Excel atașat conține detalii pe linii (dacă există erori) și un sheet Summary cu agregate.
    Logica: comenzi din luna anterioară cu sursă ≠ Website și cu email valid, pentru care există solicitare Website cu email comun.
  </p>
</body>
</html>
`.trim();
}
