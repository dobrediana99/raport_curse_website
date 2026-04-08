import { join } from "node:path";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../core/logger.js";
import { MondayClient } from "../monday/mondayClient.js";
import { OrdersRepository } from "../monday/repositories/orders.repository.js";
import { RequestsBoardRepository } from "../monday/repositories/requests.repository.js";
import {
  createSolicitari2BoardDefinition,
  createSolicitariBoardDefinition,
} from "../monday/mappers/requestBoardDefinitions.js";
import { isDateInRange } from "../domain/matching/previousMonthRange.js";
import { resolveOrderDateFilterForRun } from "../domain/matching/orderDateFilter.js";
import { WEBSITE_LABEL } from "../domain/matching/sourceMismatch.types.js";
import { buildSourceMismatches } from "../domain/matching/sourceMismatchMatcher.js";
import { buildExcelReport, type ExcelSummaryInput } from "../report/excelReportBuilder.js";
import { Mailer } from "../mail/mailer.js";
import { buildReportEmailHtml } from "../mail/reportEmailBuilder.js";

export interface JobDeps {
  config: AppConfig;
  log: Logger;
  /** When true, all orders are matched (no previous-month filter on Data Ctr.). Manual/debug only. */
  noDateFilter?: boolean;
}

export class MonthlySourceAuditJob {
  constructor(private readonly deps: JobDeps) {}

  async run(): Promise<void> {
    const { config, log, noDateFilter } = this.deps;
    const dateCtx = resolveOrderDateFilterForRun(config.APP_TIMEZONE, noDateFilter);
    const range = dateCtx.range;
    const runMonthLabel = dateCtx.applyMonthFilter ? range.labelYm : "ALL_DATES";
    const generatedAt = new Date().toISOString();

    log.info(
      {
        auditedMonth: range.labelYm,
        start: range.startIso,
        end: range.endIso,
        orderDateFilterApplied: dateCtx.applyMonthFilter,
        ordersBoard: config.ORDERS_BOARD_ID,
        requestsBoard1: config.REQUESTS_BOARD_ID,
        requestsBoard2: config.REQUESTS2_BOARD_ID,
      },
      "Starting monthly source audit job",
    );

    const client = new MondayClient(config, log);
    const ordersRepo = new OrdersRepository(client, config.ORDERS_BOARD_ID, log);
    const solicitariDef = createSolicitariBoardDefinition(config.REQUESTS_BOARD_ID);
    const solicitari2Def = createSolicitari2BoardDefinition(config.REQUESTS2_BOARD_ID);
    const requestsRepo1 = new RequestsBoardRepository(client, solicitariDef, log);
    const requestsRepo2 = new RequestsBoardRepository(client, solicitari2Def, log);

    const [orders, req1, req2] = await Promise.all([
      ordersRepo.fetchAllOrders(),
      requestsRepo1.fetchAllUnified(),
      requestsRepo2.fetchAllUnified(),
    ]);
    const requests = [...req1, ...req2];

    const missingDealDate = orders.filter((o) => !o.dealCreationDate).length;
    if (missingDealDate > 0) {
      log.warn(
        { count: missingDealDate, orderDateFilterApplied: dateCtx.applyMonthFilter },
        dateCtx.applyMonthFilter
          ? "Order items missing Data Ctr.; they are excluded from the audited period filter"
          : "Order items missing Data Ctr. (still in scope: order date filter disabled)",
      );
    }

    const inAuditedPeriod = dateCtx.applyMonthFilter
      ? orders.filter((o) => o.dealCreationDate != null && isDateInRange(o.dealCreationDate, range))
      : orders;
    const skippedNoEmail = inAuditedPeriod.filter(
      (o) => o.sursaClient !== WEBSITE_LABEL && o.emailsNormalized.length === 0,
    ).length;
    if (skippedNoEmail > 0) {
      log.warn(
        { count: skippedNoEmail },
        dateCtx.applyMonthFilter
          ? "Non-Website orders in audited month skipped: no valid client email after normalization"
          : "Non-Website orders skipped: no valid client email after normalization (all dates mode)",
      );
    }

    const { rows, stats } = buildSourceMismatches(orders, requests, range, runMonthLabel, {
      requestsBoard1Id: config.REQUESTS_BOARD_ID,
      requestsBoard2Id: config.REQUESTS2_BOARD_ID,
      skipOrderDateFilter: !dateCtx.applyMonthFilter,
    });

    log.info({ stats }, "Matching complete");

    const summary: ExcelSummaryInput = {
      generatedAtIso: generatedAt,
      auditedRange: range,
      orderDateFilterApplied: dateCtx.applyMonthFilter,
      totalOrdersInPeriod: stats.totalOrdersInPeriod,
      totalOrdersNonWebsite: stats.totalOrdersNonWebsite,
      totalOrdersWithValidEmail: stats.totalOrdersWithValidEmail,
      totalWebsiteRequestsBoard1: stats.totalWebsiteRequestsBoard1,
      totalWebsiteRequestsBoard2: stats.totalWebsiteRequestsBoard2,
      totalWebsiteRequestsConsidered: stats.totalWebsiteRequestsConsidered,
      totalMatchesFound: stats.totalMatchesFound,
      totalReportRows: rows.length,
      appVersion: config.APP_VERSION,
    };

    const safeTs = generatedAt.replace(/[:.]/g, "-");
    const fileName = `source-audit-${runMonthLabel}-${safeTs}.xlsx`;
    const outputPath = join(config.REPORT_OUTPUT_DIR, fileName);

    await buildExcelReport(outputPath, rows, summary);

    log.info(
      {
        outputPath,
        totalMatches: rows.length,
        totalOrdersInPeriod: stats.totalOrdersInPeriod,
        websiteRequests: stats.totalWebsiteRequestsConsidered,
      },
      "Excel report written",
    );

    const mailer = new Mailer(config, log);
    const subject = `[Audit monday] Erori sursa client - ${runMonthLabel}`;

    if (rows.length === 0 && !config.SEND_EMPTY_REPORT) {
      log.info("No matches and SEND_EMPTY_REPORT=false; skipping email");
      return;
    }

    const attach =
      rows.length > 0 || (config.SEND_EMPTY_REPORT && config.ATTACH_REPORT_ON_EMPTY);

    const html = buildReportEmailHtml({
      auditedRange: range,
      orderDateFilterApplied: dateCtx.applyMonthFilter,
      matchCount: rows.length,
      ordersChecked: stats.totalOrdersInPeriod,
      generatedAtIso: generatedAt,
      emptyRun: rows.length === 0,
    });

    await mailer.send({
      subject,
      html,
      attachments: attach ? [{ filename: fileName, path: outputPath }] : undefined,
    });

    log.info(
      { emailed: true, attached: Boolean(attach), errors: rows.length },
      "Monthly source audit job completed",
    );
  }
}
