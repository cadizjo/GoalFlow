// This file contains a utility function for paginating results in a cursor-based pagination system.

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null // null means no more pages
  hasMore: boolean
}

// Takes a fetched page (limit + 1 items) and returns the paginated result.
// We always fetch one extra item to determine if there's a next page —
// if we get limit+1 items back, there's more data; we return only limit items
// and use the last one's ID as the next cursor.
export function paginate<T extends { id: string }>(
  items: T[],
  limit: number,
): PaginatedResult<T> {
  const hasMore = items.length > limit // e.g., if we requested 20 items and got 21, there's more data
  const data = hasMore ? items.slice(0, limit) : items 
  const nextCursor = hasMore ? data[data.length - 1].id : null 

  return { data, nextCursor, hasMore }
}