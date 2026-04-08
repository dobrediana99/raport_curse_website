import { describe, it, expect } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ExcelJS from "exceljs";
import { buildExcelReport } from "../src/report/excelReportBuilder.js";

describe("buildExcelReport columns", () => {
  it("includes request board columns and per-board summary metrics", async () => {
    const dir = join(tmpdir(), `audit-xlsx-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "t.xlsx");
    try {
      await buildExcelReport(
        path,
        [],
        {
          generatedAtIso: "2026-01-01T00:00:00Z",
          auditedRange: {
            startIso: "2025-12-01",
            endIso: "2025-12-31",
            startMs: 0,
            endExclusiveMs: 0,
            labelYm: "2025-12",
          },
          orderDateFilterApplied: true,
          totalOrdersInPeriod: 1,
          totalOrdersNonWebsite: 1,
          totalOrdersWithValidEmail: 1,
          totalWebsiteRequestsBoard1: 10,
          totalWebsiteRequestsBoard2: 3,
          totalWebsiteRequestsConsidered: 13,
          totalMatchesFound: 0,
          totalReportRows: 0,
          appVersion: "test",
        },
      );

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path);
      const erori = wb.getWorksheet("Erori");
      expect(erori).toBeDefined();
      const headerRow = erori!.getRow(1).values as unknown[];
      const headers = headerRow.slice(1).map(String);
      expect(headers).toContain("Request Board Name");
      expect(headers).toContain("Request Board ID");
      expect(headers).toContain("All Matched Request Boards");

      const summary = wb.getWorksheet("Summary");
      const metrics = new Map<string, string | number>();
      summary!.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const k = row.getCell(1).value;
        const v = row.getCell(2).value;
        if (typeof k === "string") metrics.set(k, typeof v === "number" || typeof v === "string" ? v : "");
      });
      expect(metrics.get("order_date_filter_applied")).toBe("true");
      expect(metrics.get("total_website_requests_board_1")).toBe(10);
      expect(metrics.get("total_website_requests_board_2")).toBe(3);
      expect(metrics.get("total_website_requests_considered")).toBe(13);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
