import type { MondayClient } from "../mondayClient.js";
import { QUERY_ITEMS_PAGE } from "../mondayQueries.js";
import type { MondayItemRaw } from "../../core/types.js";
import type { Logger } from "../../core/logger.js";
import { mapOrderItem } from "../mappers/orders.mapper.js";
import type { OrderRow } from "../mappers/orders.mapper.js";

interface GqlItemsPage {
  boards: Array<{
    items_page: { cursor: string | null; items: MondayItemRaw[] } | null;
  } | null> | null;
}

export class OrdersRepository {
  constructor(
    private readonly client: MondayClient,
    private readonly boardId: number,
    private readonly log: Logger,
  ) {}

  async fetchAllOrders(): Promise<OrderRow[]> {
    const items: MondayItemRaw[] = [];
    let cursor: string | null = null;

    do {
      const data: GqlItemsPage = await this.client.query<GqlItemsPage>(QUERY_ITEMS_PAGE, {
        boardId: [String(this.boardId)],
        cursor,
      });

      const page = data.boards?.[0]?.items_page;
      if (!page) {
        this.log.warn({ boardId: this.boardId }, "Monday returned no items_page for orders board");
        break;
      }

      items.push(...page.items);
      cursor = page.cursor;
      this.log.debug(
        { boardId: this.boardId, batch: page.items.length, hasMore: Boolean(cursor) },
        "Fetched orders page",
      );
    } while (cursor);

    return items.map(mapOrderItem);
  }
}
