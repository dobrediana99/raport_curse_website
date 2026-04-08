import type { MondayClient } from "../mondayClient.js";
import type { Logger } from "../../core/logger.js";
import type { UnifiedRequestRow } from "../../domain/requests/unifiedRequest.types.js";
import type { RequestBoardDefinition } from "../mappers/requestBoard.types.js";
import { mapItemToUnifiedRequest } from "../mappers/unifiedRequest.mapper.js";
import { paginateBoardItems } from "./paginateBoardItems.js";

/**
 * Fetches all items from one requests-type board and maps them to {@link UnifiedRequestRow}.
 */
export class RequestsBoardRepository {
  constructor(
    private readonly client: MondayClient,
    private readonly definition: RequestBoardDefinition,
    private readonly log: Logger,
  ) {}

  async fetchAllUnified(): Promise<UnifiedRequestRow[]> {
    const items = await paginateBoardItems(
      this.client,
      this.definition.boardId,
      this.log,
      `requests:${this.definition.boardName}`,
    );
    return items.map((raw) => mapItemToUnifiedRequest(raw, this.definition));
  }
}
