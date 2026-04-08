import type { MondayClient } from "../mondayClient.js";
import type { Logger } from "../../core/logger.js";
import { mapOrderItem } from "../mappers/orders.mapper.js";
import type { OrderRow } from "../mappers/orders.mapper.js";
import { paginateBoardItems } from "./paginateBoardItems.js";

export class OrdersRepository {
  constructor(
    private readonly client: MondayClient,
    private readonly boardId: number,
    private readonly log: Logger,
  ) {}

  async fetchAllOrders(): Promise<OrderRow[]> {
    const items = await paginateBoardItems(this.client, this.boardId, this.log, "orders");
    return items.map(mapOrderItem);
  }
}
