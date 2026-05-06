import http from "node:http";
import { loadConfig } from "./config/env.js";
import { createLogger } from "./core/logger.js";
import { MonthlySourceAuditJob } from "./jobs/monthlySourceAuditJob.js";

let running = false;

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function sendText(res: http.ServerResponse, status: number, text: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

async function main() {
  const config = loadConfig();
  const log = createLogger(config);

  const port = Number(process.env.PORT ?? 3000);
  const host = "0.0.0.0";

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/cron") {
        const secretConfigured = config.CRON_SECRET?.trim();
        if (secretConfigured) {
          const provided = url.searchParams.get("secret") ?? "";
          if (provided !== secretConfigured) {
            log.warn({ path: url.pathname }, "Cron request rejected: invalid secret");
            return sendText(res, 401, "UNAUTHORIZED");
          }
        }

        if (running) {
          return sendText(res, 409, "ALREADY_RUNNING");
        }

        running = true;
        log.info("Cron endpoint triggered: running MonthlySourceAuditJob");

        try {
          await new MonthlySourceAuditJob({ config, log }).run();
          return sendText(res, 200, "OK");
        } catch (e) {
          log.error({ err: e }, "Cron job failed");
          return sendText(res, 500, "FAILED");
        } finally {
          running = false;
        }
      }

      return sendText(res, 404, "NOT_FOUND");
    } catch (e) {
      // Malformed URL or unexpected error
      // We avoid leaking details to the caller; details go to logs.
      return sendText(res, 500, "FAILED");
    }
  });

  server.listen(port, host, () => {
    log.info(
      { host, port, hasCronSecret: Boolean(config.CRON_SECRET?.trim()) },
      "HTTP server listening",
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

