/** GraphQL query: paginated items for a board with column values. */
/** `text` carries human-readable labels for status, people, formula (best-effort), etc. */
export const QUERY_ITEMS_PAGE = `
  query ItemsPage($boardId: [ID!]!, $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: 100, cursor: $cursor) {
        cursor
        items {
          id
          name
          created_at
          column_values {
            id
            type
            text
            value
          }
        }
      }
    }
  }
`;
