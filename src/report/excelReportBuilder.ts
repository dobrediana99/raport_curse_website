import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SourceMismatchRow } from "../domain/matching/sourceMismatch.types.js";
import type { MonthRange } from "../domain/matching/previousMonthRange.js";

export interface ExcelSummaryInput {
  generatedAtIso: string;
  auditedRange: MonthRange;
  totalOrdersInPeriod: number;
  totalOrdersNonWebsite: number;
  totalOrdersWithValidEmail: number;
  totalWebsiteRequestsBoard1: number;
  totalWebsiteRequestsBoard2: number;
  totalWebsiteRequestsConsidered: number;
  totalMatchesFound: number;
  totalReportRows: number;
  appVersion: string;
}

const ERROR_HEADERS = [
  "Run Month",
  "Nr Comanda",
  "Nr Solicitare",
  "Request Board Name",
  "Request Board ID",
  "All Matched Request Boards",
  "Nume Client Comanda",
  "Nume Client Solicitare",
  "Email Match",
  "Order Emails",
  "Request Emails",
  "Angajat Comanda",
  "Angajat Solicitare",
  "Profit Comanda",
  "Moneda Comanda",
  "Profit EUR",
  "Sursa Comanda",
  "Sursa Solicitare",
  "Data Comanda",
  "Data Solicitare",
  "Matches Count",
  "Order Item Id (internal)",
  "Request Item Id (internal)",
  "Notes",
] as const;

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
}

export async function buildExcelReport(
  outputPath: string,
  rows: SourceMismatchRow[],
  summary: ExcelSummaryInput,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = "monday-source-audit";
  wb.created = new Date();

  const wsE = wb.addWorksheet("Erori", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsE.addRow([...ERROR_HEADERS]);
  styleHeaderRow(wsE.getRow(1));
  wsE.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ERROR_HEADERS.length },
  };

  for (const r of rows) {
    wsE.addRow([
      r.runMonthLabel,
      r.order.nrComanda ?? "",
      r.selectedRequest.requestNumber,
      r.selectedRequest.boardName,
      String(r.selectedRequest.boardId),
      r.allMatchedRequestBoards,
      r.order.clientNameDisplay ?? "",
      r.selectedRequest.clientNameDisplay ?? "",
      r.emailMatch,
      r.order.emailsNormalized.join("; "),
      r.selectedRequest.emailsNormalized.join("; "),
      r.order.principalDisplay ?? "",
      r.selectedRequest.principalDisplay ?? "",
      r.order.profitNumber ?? "",
      r.order.moneda ?? "",
      r.profitEur ?? "",
      r.order.sursaClient ?? "",
      r.selectedRequest.sursaClient ?? "",
      r.order.dealCreationDate ?? "",
      r.selectedRequest.dealCreationDate ?? "",
      r.matchesCount,
      r.order.itemId,
      r.selectedRequest.itemId,
      r.notes,
    ]);
  }

  const profitCol = 14;
  const profitEurCol = 16;
  const matchesCol = 21;
  for (let i = 2; i <= wsE.rowCount; i++) {
    const row = wsE.getRow(i);
    const p = row.getCell(profitCol);
    if (typeof p.value === "number") p.numFmt = "#,##0.00";
    const pe = row.getCell(profitEurCol);
    if (typeof pe.value === "number") pe.numFmt = "#,##0.00";
    const mc = row.getCell(matchesCol);
    if (typeof mc.value === "number") mc.numFmt = "0";
  }

  const widths = [
    12, 14, 14, 18, 16, 28, 28, 28, 28, 36, 36, 22, 22, 14, 12, 12, 18, 18, 14, 14, 12, 14, 14, 48,
  ];
  wsE.columns = ERROR_HEADERS.map((_, idx) => ({ width: widths[idx] ?? 16 }));

  const wsS = wb.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const summaryRows: [string, string | number][] = [
    ["generated_at", summary.generatedAtIso],
    ["audited_month_start", summary.auditedRange.startIso],
    ["audited_month_end", summary.auditedRange.endIso],
    ["total_orders_in_period", summary.totalOrdersInPeriod],
    ["total_orders_non_website", summary.totalOrdersNonWebsite],
    ["total_orders_with_valid_email", summary.totalOrdersWithValidEmail],
    ["total_website_requests_board_1", summary.totalWebsiteRequestsBoard1],
    ["total_website_requests_board_2", summary.totalWebsiteRequestsBoard2],
    ["total_website_requests_considered", summary.totalWebsiteRequestsConsidered],
    ["total_matches_found", summary.totalMatchesFound],
    ["total_report_rows", summary.totalReportRows],
    ["app_version", summary.appVersion],
  ];

  wsS.addRow(["metric", "value"]);
  styleHeaderRow(wsS.getRow(1));
  wsS.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 2 } };
  for (const [k, v] of summaryRows) {
    wsS.addRow([k, v]);
  }
  wsS.getColumn(1).width = 40;
  wsS.getColumn(2).width = 36;

  const buf = await wb.xlsx.writeBuffer();
  await writeFile(outputPath, Buffer.from(buf));
}
