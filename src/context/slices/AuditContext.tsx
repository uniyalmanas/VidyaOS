import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AuditLogEntry, Organization, User } from '../../types';
import { subscribeToAuditLogs, persistAuditLogToFirestore } from '../../lib/firestoreService';
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

  // Real-time Firestore subscription — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToAuditLogs(data => {
      if (data) setAuditLogs(data);
    }, targetOrg);

    return () => {
      unsub();
    };
  }, [currentOrg.id, isPlatformOwner]);

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