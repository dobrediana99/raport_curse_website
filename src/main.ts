import { loadConfig } from "./config/env.js";
import { createLogger } from "./core/logger.js";
import { MonthlySourceAuditJob } from "./jobs/monthlySourceAuditJob.js";
import { startScheduledApp } from "./app.js";

const once = process.argv.includes("--once");
const noDateFilterFlag = process.argv.includes("--no-date-filter");
/** Only effective with `--once`; cron/scheduled runs always use month filter. */
const noDateFilter = once && noDateFilterFlag;

async function main() {
  const config = loadConfig();
  const log = createLogger(config);

  if (once) {
    log.info(
      { noDateFilter },
      "Running audit once (--once)" + (noDateFilter ? " with --no-date-filter" : ""),
    );
    const job = new MonthlySourceAuditJob({ config, log, noDateFilter });
    await job.run();
    log.info("Audit run finished");
    return;
  }

  if (noDateFilterFlag && !once) {
    log.warn("--no-date-filter is ignored without --once (scheduled mode always uses previous month)");
  }
  log.info("Process started in scheduled mode (node-cron). Use --once for a single run.");
  startScheduledApp(config, log);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
