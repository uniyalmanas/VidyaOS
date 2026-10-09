import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AuditLogEntry, Organization, User } from '../../types';
import { subscribeAuditLogsPaginated, persistAuditLogToFirestore } from '../../lib/firestoreService';
import {
  RecordAuditInput,
  createAuditEntry,
  captureAuditLocally,
  emitAuditLocal,
  subscribeAuditLocal,
  upsertAuditEntry,
  auditForOrg,
  readAuditMirror
} from '../../lib/audit';

export interface AuditContextType {
  auditLogs: AuditLogEntry[];
  auditLogsHasMore: boolean;
  loadMoreAuditLogs: () => Promise<number>;
  recordAudit: (input: RecordAuditInput) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

interface AuditProviderProps {
  currentOrg: Organization;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const AuditProvider: React.FC<AuditProviderProps> = ({
  currentOrg,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    // DEV mirror lets the demo fortress keep its history across a reload; prod
    // boots from Firestore (persistent cache) alone.
    return import.meta.env.DEV ? readAuditMirror() : [];
  });

  // G1 — paginated audit stream (newest-first, first page live). The audit
  // history grows without bound, so a fixed limit silently drops the oldest
  // frames; `loadMoreAuditLogs` fetches the next older page on demand.
  const [auditLogsHasMore, setAuditLogsHasMore] = useState(false);
  const auditHandleRef = useRef<ReturnType<typeof subscribeAuditLogsPaginated> | null>(null);

  // Real-time Firestore subscription — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const handle = subscribeAuditLogsPaginated((data, meta) => {
      if (data) {
        setAuditLogs(data);
        setAuditLogsHasMore(meta.hasMore);
      }
    }, targetOrg);
    auditHandleRef.current = handle;

    return () => {
      if (auditHandleRef.current) {
        auditHandleRef.current.unsubscribe();
        auditHandleRef.current = null;
      }
    };
  }, [currentOrg.id, isPlatformOwner]);

  /**
   * G1 — fetch the next (older) page of audit frames on demand. Returns how
   * many records were actually added (for the UI state).
   */
  const loadMoreAuditLogs = async (): Promise<number> => {
    if (!auditHandleRef.current) return 0;
    return auditHandleRef.current.loadMore();
  };

  // Session-local additions (optimistic; also the only channel in the DEV demo
  // personas where no Firebase session exists at all).
  useEffect(() => {
    return subscribeAuditLocal(entry => {
      setAuditLogs(prev => upsertAuditEntry(prev, entry));
    });
  }, []);

  const recordAudit = (input: RecordAuditInput) => {
    const entry = createAuditEntry({
      orgId: input.orgId || currentOrg.id,
      branchId: input.branchId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      changes: input.changes
    });

    // Optimistic local render: mirror on DEV only (audit is person-attributable
    // and must not outlive a logout in production). Firestore remains the source
    // of truth everywhere.
    if (import.meta.env.DEV) {
      captureAuditLocally(entry);
    } else {
      emitAuditLocal(entry);
    }

    // Best-effort cloud persist — never blocks the primary mutation.
    persistAuditLogToFirestore(entry);
  };

  // Multi-tenant isolation: only ever expose entries for the current centre.
  const tenantAudit = useMemo(() => {
    if (isPlatformOwner) return auditLogs;
    return auditForOrg(auditLogs, currentOrg.id);
  }, [auditLogs, currentOrg.id, isPlatformOwner]);

  return (
    <AuditContext.Provider
      value={{
        auditLogs: tenantAudit,
        auditLogsHasMore,
        loadMoreAuditLogs,
        recordAudit
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAuditLog = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditProvider');
  }
  return context;
};