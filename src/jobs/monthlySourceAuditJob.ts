import { join } from "node:path";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../core/logger.js";
import { MondayClient } from "../monday/mondayClient.js";
import { OrdersRepository } from "../monday/repositories/orders.repository.js";
import { RequestsRepository } from "../monday/repositories/requests.repository.js";
import { getPreviousMonthRange, isDateInRange } from "../domain/matching/previousMonthRange.js";
import { WEBSITE_LABEL } from "../domain/matching/sourceMismatch.types.js";
import { buildSourceMismatches } from "../domain/matching/sourceMismatchMatcher.js";
import { buildExcelReport, type ExcelSummaryInput } from "../report/excelReportBuilder.js";
import { Mailer } from "../mail/mailer.js";
import { buildReportEmailHtml } from "../mail/reportEmailBuilder.js";

export interface JobDeps {
  config: AppConfig;
  log: Logger;
}

export class MonthlySourceAuditJob {
  constructor(private readonly deps: JobDeps) {}

  async run(): Promise<void> {
    const { config, log } = this.deps;
    const range = getPreviousMonthRange(config.APP_TIMEZONE);
    const generatedAt = new Date().toISOString();

    log.info(
      {
        auditedMonth: range.labelYm,
        start: range.startIso,
        end: range.endIso,
        ordersBoard: config.ORDERS_BOARD_ID,
        requestsBoard: config.REQUESTS_BOARD_ID,
      },
      "Starting monthly source audit job",
    );

    const client = new MondayClient(config, log);
    const ordersRepo = new OrdersRepository(client, config.ORDERS_BOARD_ID, log);
    const requestsRepo = new RequestsRepository(client, config.REQUESTS_BOARD_ID, log);

    const [orders, requests] = await Promise.all([
      ordersRepo.fetchAllOrders(),
      requestsRepo.fetchAllRequests(),
    ]);

    const missingDealDate = orders.filter((o) => !o.dealCreationDate).length;
    if (missingDealDate > 0) {
      log.warn(
        { count: missingDealDate },
        "Order items missing Data Ctr.; they are excluded from the audited period filter",
      );
    }

    const inAuditedPeriod = orders.filter(
      (o) => o.dealCreationDate != null && isDateInRange(o.dealCreationDate, range),
    );
    const skippedNoEmail = inAuditedPeriod.filter(
      (o) => o.sursaClient !== WEBSITE_LABEL && o.emailsNormalized.length === 0,
    ).length;
    if (skippedNoEmail > 0) {
      log.warn(
        { count: skippedNoEmail },
        "Non-Website orders in audited month skipped: no valid client email after normalization",
      );
    }

    const { rows, stats } = buildSourceMismatches(orders, requests, range, range.labelYm);

    log.info({ stats }, "Matching complete");

    const summary: ExcelSummaryInput = {
      generatedAtIso: generatedAt,
      auditedRange: range,
      totalOrdersInPeriod: stats.totalOrdersInPeriod,
      totalOrdersNonWebsite: stats.totalOrdersNonWebsite,
      totalOrdersWithValidEmail: stats.totalOrdersWithValidEmail,
      totalWebsiteRequestsConsidered: stats.totalWebsiteRequestsConsidered,
      totalMatchesFound: stats.totalMatchesFound,
      totalReportRows: rows.length,
      appVersion: config.APP_VERSION,
    };

    const safeTs = generatedAt.replace(/[:.]/g, "-");
    const fileName = `source-audit-${range.labelYm}-${safeTs}.xlsx`;
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
    const subject = `[Audit monday] Erori sursa client - ${range.labelYm}`;

    if (rows.length === 0 && !config.SEND_EMPTY_REPORT) {
      log.info("No matches and SEND_EMPTY_REPORT=false; skipping email");
      return;
    }

    const attach =
      rows.length > 0 || (config.SEND_EMPTY_REPORT && config.ATTACH_REPORT_ON_EMPTY);

    const html = buildReportEmailHtml({
      auditedRange: range,
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
