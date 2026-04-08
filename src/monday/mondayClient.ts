import { withRetry } from "../core/utils/retry.js";
import type { Logger } from "../core/logger.js";
import type { AppConfig } from "../config/env.js";

export interface MondayGraphQLError {
  message: string;
  extensions?: { code?: string };
}

export interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
}

export class MondayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errors?: MondayGraphQLError[],
  ) {
    super(message);
    this.name = "MondayApiError";
  }
}

export class MondayClient {
  constructor(
    private readonly config: AppConfig,
    private readonly log: Logger,
  ) {}

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return withRetry(
      async () => {
        const res = await fetch(this.config.MONDAY_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.config.MONDAY_API_TOKEN,
            "API-Version": this.config.MONDAY_API_VERSION,
          },
          body: JSON.stringify({ query, variables }),
        });

        const status = res.status;
        const body = (await res.json()) as MondayGraphQLResponse<T>;

        if (!res.ok) {
          const msg = body.errors?.map((e) => e.message).join("; ") ?? res.statusText;
          throw new MondayApiError(`Monday HTTP ${status}: ${msg}`, status, body.errors);
        }

        if (body.errors?.length) {
          const msg = body.errors.map((e) => e.message).join("; ");
          if (status === 429 || body.errors.some((e) => /rate/i.test(e.message))) {
            throw new MondayApiError(`Monday rate/error: ${msg}`, status, body.errors);
          }
          throw new MondayApiError(`Monday GraphQL errors: ${msg}`, status, body.errors);
        }

        if (body.data === undefined) {
          throw new MondayApiError("Monday response missing data", status);
        }

        return body.data;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 800,
        maxDelayMs: 8000,
        isRetryable: (err) => {
          if (err instanceof MondayApiError) {
            if (err.statusCode === 429) return true;
            if (err.statusCode !== undefined && err.statusCode >= 500) return true;
            if (err.message.toLowerCase().includes("rate")) return true;
          }
          return false;
        },
      },
    ).catch((e) => {
      this.log.error({ err: e }, "Monday API request failed after retries");
      throw e;
    });
  }
}
