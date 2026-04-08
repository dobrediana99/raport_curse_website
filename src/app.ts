import cron from "node-cron";
import type { AppConfig } from "./config/env.js";
import type { Logger } from "./core/logger.js";
import { MonthlySourceAuditJob } from "./jobs/monthlySourceAuditJob.js";

export function startScheduledApp(config: AppConfig, log: Logger): { stop: () => void } {
  const job = new MonthlySourceAuditJob({ config, log });

  log.info({ cron: config.CRON_SCHEDULE, tz: config.APP_TIMEZONE }, "Scheduler starting");

  const task = cron.schedule(
    config.CRON_SCHEDULE,
    async () => {
      log.info("Cron tick: running monthly source audit");
      try {
        await job.run();
      } catch (e) {
        log.error({ err: e }, "Scheduled audit job failed");
      }
    },
    { timezone: config.APP_TIMEZONE },
  );

  return {
    stop: () => {
      task.stop();
      log.info("Scheduler stopped");
    },
  };
}

export { MonthlySourceAuditJob };
