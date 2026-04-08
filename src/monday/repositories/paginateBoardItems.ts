import type { MondayClient } from "../mondayClient.js";
import { QUERY_ITEMS_PAGE } from "../mondayQueries.js";
import type { MondayItemRaw } from "../../core/types.js";
import type { Logger } from "../../core/logger.js";

interface GqlItemsPage {
  boards: Array<{
    items_page: { cursor: string | null; items: MondayItemRaw[] } | null;
  } | null> | null;
}

export async function paginateBoardItems(
  client: MondayClient,
  boardId: number,
  log: Logger,
  logContext: string,
): Promise<MondayItemRaw[]> {
  const items: MondayItemRaw[] = [];
  let cursor: string | null = null;

  do {
    const data: GqlItemsPage = await client.query<GqlItemsPage>(QUERY_ITEMS_PAGE, {
      boardId: [String(boardId)],
      cursor,
    });

    const page = data.boards?.[0]?.items_page;
    if (!page) {
      log.warn({ boardId, logContext }, "Monday returned no items_page for board");
      break;
    }

    items.push(...page.items);
    cursor = page.cursor;
    log.debug(
      { boardId, logContext, batch: page.items.length, hasMore: Boolean(cursor) },
      "Fetched board page",
    );
  } while (cursor);

  return items;
}
