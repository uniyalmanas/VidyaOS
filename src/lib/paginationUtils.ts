/**
 * Pure page-merging helpers for G1 cursor pagination. No Firebase imports here
 * so the node test-runner can exercise the merge math directly.
 */

export interface PaginationMeta {
  hasMore: boolean;
  totalLoaded: number;
}

/**
 * Merge a fetched page into an existing id-keyed map. Returns how many records
 * were new (`added`) and whether another page may exist.
 */
export function appendPage<T>(
  existing: Map<string, T>,
  batch: T[],
  getId: (item: T) => string,
  pageSize: number
): { added: number; hasMore: boolean } {
  let added = 0;
  for (const item of batch) {
    const id = getId(item);
    if (!existing.has(id)) {
      existing.set(id, item);
      added++;
    }
  }
  return { added, hasMore: batch.length === pageSize };
}

/**
 * Fold a fresh live first page into the already-loaded set.
 *
 * - Nothing beyond page 1 loaded yet (`existing.size <= pageSize`) → mirror the
 *   live page exactly, so realtime adds/edits/deletes behave as before. Returns
 *   whether more pages may exist (the classic `page full ⇒ maybe more` heuristic).
 * - A tail is already loaded → keep the tail, refresh the page-1 ids, and drop
 *   ids that disappeared from the first page. `hasMore` is then governed by the
 *   cursor in the factory, not by this call.
 */
export function applyLiveFirstPage<T>(
  existing: Map<string, T>,
  liveDocs: T[],
  getId: (item: T) => string,
  pageSize: number
): boolean {
  const firstPageIds = new Set(liveDocs.map(doc => getId(doc)));
  if (existing.size <= pageSize) {
    existing.clear();
    for (const doc of liveDocs) existing.set(getId(doc), doc);
    return liveDocs.length === pageSize;
  }
  const tail = [...existing.entries()].filter(([id]) => !firstPageIds.has(id));
  existing.clear();
  for (const doc of liveDocs) existing.set(getId(doc), doc);
  for (const [id, item] of tail) existing.set(id, item);
  return false;
}