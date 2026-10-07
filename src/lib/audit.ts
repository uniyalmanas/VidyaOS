/**
 * VidyaOS Audit Trail (F1) — pure helpers + DEV localStorage mirror.
 *
 * This module intentionally has NO Firestore imports. It is the shared,
 * dependency-free core used by `AuditContext` (which owns the real-time
 * subscription + `persistAuditLogToFirestore` call) and by the unit suite in
 * `test-auth.ts`. Keeping it pure means the same logic runs in node (tests)
 * and in the browser (app) without any import-order surprises.
 */

import { AuditLogEntry, AuditAction, UserRole } from '../types';

// Re-export so consumers can import the type from the same module as the helpers.
export type { AuditLogEntry } from '../types';

export const AUDIT_MIRROR_KEY = 'vidyaos_audit_logs';
/** Keep the DEV mirror bounded — it exists to survive a reload, not to grow forever. */
const MAX_MIRROR = 500;

export interface RecordAuditInput {
  action: AuditAction;
  targetType: string;
  targetId: string;
  summary: string;
  changes?: Record<string, unknown>;
  /** Defaults to the caller's current organisation when omitted. */
  orgId?: string;
  branchId?: string;
}

/** Every field a caller must supply before the slice injects actor + org context. */
export interface AuditInput {
  orgId: string;
  branchId?: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: string;
  targetId: string;
  summary: string;
  changes?: Record<string, unknown>;
}

export function createAuditEntry(input: AuditInput): AuditLogEntry {
  const now = Date.now();
  return {
    ...input,
    id: `audit-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
    changes:
      input.changes && Object.keys(input.changes).length > 0
        ? input.changes
        : undefined
  };
}

// ---------------------------------------------------------------------------
// DEV-only localStorage mirror (same pattern as attendance: browser-local so a
// reload in the demo fortress still shows history; never the source of truth).
// ---------------------------------------------------------------------------

export function readAuditMirror(): AuditLogEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((e): e is AuditLogEntry => !!e && typeof e.id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeAuditMirror(entries: AuditLogEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(AUDIT_MIRROR_KEY, JSON.stringify(entries.slice(0, MAX_MIRROR)));
  } catch {
    // Storage full / unavailable — the mirror is a convenience, never fatal.
  }
}

// ---------------------------------------------------------------------------
// Tiny in-session pub/sub so an audit write shows up immediately in the open
// Audit Trail tab without waiting for the Firestore round-trip.
// ---------------------------------------------------------------------------

type AuditListener = (entry: AuditLogEntry) => void;
const auditListeners = new Set<AuditListener>();

export function subscribeAuditLocal(listener: AuditListener): () => void {
  auditListeners.add(listener);
  return () => {
    auditListeners.delete(listener);
  };
}

/** Notify in-session listeners only (no storage) — used for optimistic render. */
export function emitAuditLocal(entry: AuditLogEntry): void {
  auditListeners.forEach(listener => listener(entry));
}

/**
 * Merge a single entry into a list by id (no duplicates when the same record
 * arrives from mirror + Firestore + pub/sub).
 */
export function upsertAuditEntry(entries: AuditLogEntry[], entry: AuditLogEntry): AuditLogEntry[] {
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    const next = [...entries];
    next[idx] = entry;
    return next;
  }
  return [entry, ...entries];
}

/**
 * Record a change locally for DEV: append to the mirror AND notify listeners.
 * Production uses `emitAuditLocal` instead (no persist-outside-login mirror).
 */
export function captureAuditLocally(entry: AuditLogEntry): void {
  writeAuditMirror(upsertAuditEntry(readAuditMirror(), entry));
  emitAuditLocal(entry);
}

/** Tenant isolation for in-memory views — never trust an entry's orgId blindly. */
export function auditForOrg(entries: AuditLogEntry[], orgId: string): AuditLogEntry[] {
  if (!orgId) return entries;
  return entries.filter(e => e.orgId === orgId);
}

// ---------------------------------------------------------------------------
// Export helpers (client-side only; no server, no Storage).
// ---------------------------------------------------------------------------

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function auditToCsv(entries: AuditLogEntry[], includeHeader = true): string {
  const header = ['Timestamp', 'Actor', 'Role', 'Action', 'Target Type', 'Target ID', 'Summary'];
  const rows = entries.map(e =>
    [e.createdAt, e.actorName, e.actorRole, e.action, e.targetType, e.targetId, e.summary]
      .map(escapeCsv)
      .join(',')
  );
  return (includeHeader ? [header.map(escapeCsv).join(',')] : []).concat(rows).join('\n');
}

/** Sort newest-first (the Firestore subscription already returns that order). */
export function sortAuditNewestFirst(entries: AuditLogEntry[]): AuditLogEntry[] {
  return [...entries].sort((a, b) => b.createdAtMs - a.createdAtMs);
}