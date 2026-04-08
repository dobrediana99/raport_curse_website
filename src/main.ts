import { loadConfig } from "./config/env.js";
import { createLogger } from "./core/logger.js";
import { MonthlySourceAuditJob } from "./jobs/monthlySourceAuditJob.js";
import { startScheduledApp } from "./app.js";

const once = process.argv.includes("--once");

async function main() {
  const config = loadConfig();
  const log = createLogger(config);

  if (once) {
    log.info("Running audit once (--once)");
    const job = new MonthlySourceAuditJob({ config, log });
    await job.run();
    log.info("Audit run finished");
    return;
  }

  log.info("Process started in scheduled mode (node-cron). Use --once for a single run.");
  startScheduledApp(config, log);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
