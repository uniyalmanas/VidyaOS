/**
 * G1 — cursor pagination for realtime Firestore subscriptions.
 *
 * A plain `onSnapshot(query(..., limit(N)))` silently DROPS records beyond N —
 * an institute with 130 login accounts only ever sees 100. This module keeps the
 * first page live (so adds/edits/deletes still stream through) and loads the rest
 * with cursor pages ("Load more"), deduplicated by document id so a document that
 * legitimately moves between pages is never shown twice.
 *
 * Ordering is by document id (`__name__`) — the only sort that is perfectly
 * stable across page boundaries without depending on a field that may be missing
 * or equal on many documents.
 *
 * The pure merge math lives in `paginationUtils.ts` (no Firebase import, directly
 * unit-tested). This module only adds the browser-side `subscribePaginated`.
 */
import {
  collection,
  db,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  QueryDocumentSnapshot,
  Unsubscribe
} from './firebase';
import { appendPage, applyLiveFirstPage, PaginationMeta } from './paginationUtils';
export { appendPage, applyLiveFirstPage } from './paginationUtils';
export type { PaginationMeta } from './paginationUtils';

export interface PaginatedLoadHandle<T> {
  unsubscribe: () => void;
  loadMore: () => Promise<number>;
  hasMore: () => boolean;
}

/**
 * Subscribe to the first `pageSize` documents live, with `loadMore()` fetching
 * the next cursor page on demand. `onData` fires with the full loaded list and
 * meta (so "hasMore" can drive a Load-more button).
 */
export function subscribePaginated<T>(options: {
  collectionPath: string;
  orgField?: string;
  orgId?: string;
  pageSize?: number;
  mapDoc: (snapshot: QueryDocumentSnapshot) => T;
  getId: (item: T) => string;
  onData: (items: T[], meta: PaginationMeta) => void;
  onError?: (error: unknown) => void;
}): PaginatedLoadHandle<T> {
  const { collectionPath, orgField, orgId, pageSize = 100, mapDoc, getId, onData, onError } = options;

  const base = orgField && orgId
    ? query(collection(db, collectionPath), where(orgField, '==', orgId))
    : collection(db, collectionPath);
  const liveQuery = query(base, orderBy(documentId()), limit(pageSize));

  const loaded = new Map<string, T>();
  let hasMore = true;
  let lastVisible: QueryDocumentSnapshot | undefined;
  let loading = false;

  const emit = () => {
    const items = [...loaded.values()];
    onData(items, { hasMore, totalLoaded: items.length });
  };

  let detach: Unsubscribe = () => {};

  const handle: PaginatedLoadHandle<T> = {
    unsubscribe: () => detach(),
    hasMore: () => hasMore,
    loadMore: async () => {
      if (loading || !hasMore || !lastVisible) return 0;
      loading = true;
      try {
        const pageQuery = query(
          base,
          orderBy(documentId()),
          startAfter(lastVisible),
          limit(pageSize)
        );
        const snapshot = await getDocs(pageQuery);
        const batch = snapshot.docs.map(mapDoc);
        const { added } = appendPage(loaded, batch, getId, pageSize);
        if (snapshot.docs.length > 0) {
          lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }
        if (snapshot.docs.length < pageSize) hasMore = false;
        if (added > 0) emit();
        return added;
      } catch (error) {
        if (onError) onError(error);
        return 0;
      } finally {
        loading = false;
      }
    }
  };

  detach = onSnapshot(
    liveQuery,
    snapshot => {
      const liveDocs = snapshot.docs.map(mapDoc);
      if (liveDocs.length > 0) {
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
      }
      if (loaded.size <= pageSize) {
        hasMore = applyLiveFirstPage(loaded, liveDocs, getId, pageSize);
      } else {
        applyLiveFirstPage(loaded, liveDocs, getId, pageSize);
      }
      emit();
    },
    error => {
      if (onError) onError(error);
    }
  );

  return handle;
}