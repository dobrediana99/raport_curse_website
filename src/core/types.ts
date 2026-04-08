/** Raw Monday column value from GraphQL (subset we use). */
export interface MondayColumnValueRaw {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
}

export interface MondayItemRaw {
  id: string;
  name: string;
  created_at: string;
  column_values: MondayColumnValueRaw[];
}

export interface MondayItemsPage {
  cursor: string | null;
  items: MondayItemRaw[];
}
