import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  LeaveRequest,
  LeaveCategory,
  LeaveRequester,
  Organization,
  User
} from '../../types';
import {
  subscribeToLeaveRequests,
  persistLeaveRequestToFirestore,
  deleteLeaveRequestFromFirestore
} from '../../lib/firestoreService';
import {
  validateLeaveRange,
  formatLeaveRange,
  planExcusedAttendance,
  getLeaveDisplayName,
  LEAVE_CATEGORY_LABEL
} from '../../lib/leave';
import { getIndiaDateString } from '../../lib/date';
import { useStudents } from './StudentContext';
import { useAttendance } from './AttendanceContext';
import { useAcademics } from './AcademicContext';
import { useCommunication } from './CommunicationContext';
import { useAuditLog } from './AuditContext';

const LEAVE_MIRROR_KEY = 'vidyaos_leaves';

export interface NewLeaveInput {
  requesterType: LeaveRequester;
  studentId?: string;
  teacherId?: string;
  /** YYYY-MM-DD inclusive (India). */
  startDate: string;
  /** YYYY-MM-DD inclusive (India). */
  endDate: string;
  category: LeaveCategory;
  reason: string;
  branchId?: string;
}

export type LeaveReviewDecision = 'approved' | 'rejected';

export interface LeaveContextType {
  /** Tenant-filtered leave requests, newest filed first. */
  leaveRequests: LeaveRequest[];
  /** Validates + files a pending request. Returns null when validation fails. */
  submitLeaveRequest: (input: NewLeaveInput) => LeaveRequest | null;
  /** Filer refines their own request while it is still pending. */
  updateLeaveRequest: (
    leaveId: string,
    updates: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'category' | 'reason'>>
  ) => void;
  /**
   * Decides a pending request: stamps `excused` attendance for an approved
   * student leave, flips faculty status for an approved teacher leave (admin
   * sessions — teachers docs are admin-writable only), notifies the filer and
   * writes the audit frame. One call, every portal behaves identically.
   */
  reviewLeaveRequest: (leaveId: string, decision: LeaveReviewDecision, reviewNote?: string) => void;
  /** Front-desk removal of a stale request (staff/admin, mirrors the rules). */
  deleteLeaveRequest: (leaveId: string) => void;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

interface LeaveProviderProps {
  currentOrg: Organization;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

/** DEV-only mirror so the demo fortress survives a reload; prod reads Firestore only. */
function readLeaveMirror(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(LEAVE_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((r): r is LeaveRequest => !!r && typeof r.id === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeLeaveMirror(requests: LeaveRequest[]): void {
  try {
    localStorage.setItem(LEAVE_MIRROR_KEY, JSON.stringify(requests.slice(0, 500)));
  } catch {
    // Mirror is a convenience — never fatal.
  }
}

export const LeaveProvider: React.FC<LeaveProviderProps> = ({
  currentOrg,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { students, batches } = useStudents();
  const { attendanceRecords, markAttendance } = useAttendance();
  const { teachers, updateTeacher } = useAcademics();
  const { pushNotification } = useCommunication();
  const { recordAudit } = useAuditLog();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    import.meta.env.DEV ? readLeaveMirror() : []
  );

  // Real-time Firestore subscription — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToLeaveRequests(data => {
      if (data) setLeaveRequests(data);
    }, targetOrg);
    return () => {
      unsub();
    };
  }, [currentOrg.id, isPlatformOwner]);

  const commit = (next: LeaveRequest[]) => {
    setLeaveRequests(next);
    if (import.meta.env.DEV) writeLeaveMirror(next);
  };

  /**
   * `on_leave` is a faculty-doc flag only an admin session may write (rules:
   * teachers docs update = center admin / platform owner), so it flips for
   * admin approvals and stays untouched when a batch teacher reviews.
   */
  const canFlipTeacherStatus =
    currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'PLATFORM_OWNER';

  /**
   * Reverts expired faculty `on_leave` flags once the last approved range has
   * passed — the "nice touch" half of the status flip, run in admin sessions
   * where the teachers-doc write is permitted. Idempotent: once flipped back,
   * the guard fails and nothing is written again.
   */
  const sweepRanForOrg = useRef<string>('');
  useEffect(() => {
    if (!canFlipTeacherStatus) return;
    if (sweepRanForOrg.current === currentOrg.id) return;
    const today = getIndiaDateString();
    const expiredTeacherIds = new Set<string>();
    leaveRequests.forEach(r => {
      if (r.requesterType !== 'teacher' || r.status !== 'approved') return;
      if (r.endDate >= today) return; // still within (or before) an approved span
      if (!r.teacherId) return;
      const stillCovered = leaveRequests.some(
        o =>
          o.id !== r.id &&
          o.requesterType === 'teacher' &&
          o.teacherId === r.teacherId &&
          o.status === 'approved' &&
          o.startDate <= today &&
          o.endDate >= today
      );
      if (stillCovered) return;
      expiredTeacherIds.add(r.teacherId);
    });
    if (expiredTeacherIds.size === 0) return;
    sweepRanForOrg.current = currentOrg.id;
    expiredTeacherIds.forEach(teacherId => {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher && teacher.status === 'on_leave') {
        updateTeacher(teacherId, { status: 'active' });
      }
    });
  }, [leaveRequests, teachers, canFlipTeacherStatus, currentOrg.id]);

  const submitLeaveRequest = (input: NewLeaveInput): LeaveRequest | null => {
    // Product gate mirrors the rules: students/parents file for their own
    // linked record, faculty for themselves, staff/admin on anyone's behalf.
    const validationError = validateLeaveRange(input.startDate, input.endDate, input.reason);
    if (validationError) return null;
    if (input.requesterType === 'student' && !input.studentId) return null;
    if (input.requesterType === 'teacher' && !input.teacherId) return null;

    const now = Date.now();
    const branchId =
      input.branchId ||
      (input.requesterType === 'student'
        ? students.find(s => s.id === input.studentId)?.branchId
        : teachers.find(t => t.id === input.teacherId)?.branchId) ||
      currentOrg.branches?.[0]?.id ||
      'branch-1';

    const request: LeaveRequest = {
      id: `leave-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      orgId: currentOrg.id,
      branchId,
      requesterType: input.requesterType,
      studentId: input.requesterType === 'student' ? input.studentId : undefined,
      teacherId: input.requesterType === 'teacher' ? input.teacherId : undefined,
      requestedByUserId: currentUser.id,
      requestedByName: currentUser.name,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason.trim(),
      category: input.category,
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      createdAtMs: now
    };

    commit([request, ...leaveRequests]);
    persistLeaveRequestToFirestore(request).catch(() => {
      /* details already logged by handleFirestoreError */
    });

    recordAudit({
      action: 'create',
      targetType: 'leave',
      targetId: request.id,
      summary: `Filed ${LEAVE_CATEGORY_LABEL[request.category]} for ${getLeaveDisplayName(request, students, teachers)} (${formatLeaveRange(request.startDate, request.endDate)}).`,
      branchId: request.branchId
    });
    return request;
  };

  const updateLeaveRequest = (
    leaveId: string,
    updates: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'category' | 'reason'>>
  ): void => {
    const target = leaveRequests.find(r => r.id === leaveId);
    // Rules allow only the filer to refine their request while pending —
    // fail closed here too so the UI never offers an impossible edit.
    if (!target || target.status !== 'pending' || target.requestedByUserId !== currentUser.id) {
      return;
    }
    const merged = {
      ...target,
      ...updates,
      startDate: updates.startDate ?? target.startDate,
      endDate: updates.endDate ?? target.endDate
    };
    const validationError = validateLeaveRange(merged.startDate, merged.endDate, merged.reason);
    if (validationError) return;

    const updated: LeaveRequest = {
      ...merged,
      id: target.id,
      orgId: target.orgId,
      status: 'pending',
      requestedByUserId: target.requestedByUserId,
      createdAt: target.createdAt,
      createdAtMs: target.createdAtMs,
      updatedAt: new Date().toISOString()
    };
    commit(leaveRequests.map(r => (r.id === leaveId ? updated : r)));
    persistLeaveRequestToFirestore(updated).catch(() => {});

    recordAudit({
      action: 'update',
      targetType: 'leave',
      targetId: updated.id,
      summary: `Updated leave dates/reason for ${getLeaveDisplayName(updated, students, teachers)} (${formatLeaveRange(updated.startDate, updated.endDate)}).`,
      branchId: updated.branchId
    });
  };

  const reviewLeaveRequest = (
    leaveId: string,
    decision: LeaveReviewDecision,
    reviewNote?: string
  ): void => {
    const target = leaveRequests.find(r => r.id === leaveId);
    if (!target || target.status !== 'pending') return;

    const now = Date.now();
    const reviewed: LeaveRequest = {
      ...target,
      status: decision,
      reviewedByUserId: currentUser.id,
      reviewedByName: currentUser.name,
      reviewedAt: new Date(now).toISOString(),
      reviewNote: reviewNote?.trim() || undefined,
      updatedAt: new Date(now).toISOString()
    };
    const displayName = getLeaveDisplayName(reviewed, students, teachers);
    const rangeLabel = formatLeaveRange(reviewed.startDate, reviewed.endDate);
    const approved = decision === 'approved';

    commit(leaveRequests.map(r => (r.id === leaveId ? reviewed : r)));
    persistLeaveRequestToFirestore(reviewed).catch(() => {});

    // Excused attendance — plan first (pure helper), then upsert each slot
    // through markAttendance, which reuses any existing (batch, date) record.
    if (approved && reviewed.requesterType === 'student') {
      const student = students.find(s => s.id === reviewed.studentId);
      if (student) {
        const slots = planExcusedAttendance(reviewed, student, batches, attendanceRecords);
        slots.forEach(slot =>
          markAttendance({
            batchId: slot.batchId,
            studentId: slot.studentId,
            date: slot.date,
            status: 'excused',
            remarks: `Leave approved — ${LEAVE_CATEGORY_LABEL[reviewed.category]}`
          })
        );
      }
    }

    // Faculty status flip (admin sessions only — see canFlipTeacherStatus).
    if (approved && reviewed.requesterType === 'teacher' && reviewed.teacherId) {
      if (canFlipTeacherStatus) {
        const teacher = teachers.find(t => t.id === reviewed.teacherId);
        if (teacher && teacher.status !== 'on_leave') {
          updateTeacher(reviewed.teacherId, { status: 'on_leave' });
        }
      }
    }

    // Bell the filer when the reviewer is somebody else (never yourself).
    if (reviewed.requestedByUserId !== currentUser.id) {
      pushNotification(
        reviewed.requestedByUserId,
        approved ? 'Leave Approved' : 'Leave Rejected',
        `${displayName} · ${rangeLabel} — ${approved ? 'enjoy the day, attendance is marked excused.' : 'declined' + (reviewed.reviewNote ? `: ${reviewed.reviewNote}` : '.')}`,
        'leave'
      );
    }

    recordAudit({
      action: approved ? 'approve' : 'reject',
      targetType: 'leave',
      targetId: reviewed.id,
      summary: `${approved ? 'Approved' : 'Rejected'} ${displayName}'s leave (${rangeLabel})${reviewed.reviewNote ? ` — ${reviewed.reviewNote}` : ''}.`,
      changes: { status: decision },
      branchId: reviewed.branchId
    });
  };

  const deleteLeaveRequest = (leaveId: string): void => {
    const target = leaveRequests.find(r => r.id === leaveId);
    if (!target) return;
    commit(leaveRequests.filter(r => r.id !== leaveId));
    deleteLeaveRequestFromFirestore(leaveId).catch(() => {});
    recordAudit({
      action: 'delete',
      targetType: 'leave',
      targetId: leaveId,
      summary: `Removed leave request for ${getLeaveDisplayName(target, students, teachers)} (${formatLeaveRange(target.startDate, target.endDate)}).`,
      branchId: target.branchId
    });
  };

  // Multi-tenant isolation for the view layer.
  const tenantLeaveRequests = useMemo(() => {
    if (isPlatformOwner) return leaveRequests;
    return leaveRequests.filter(r => r.orgId === currentOrg.id);
  }, [leaveRequests, currentOrg.id, isPlatformOwner]);

  return (
    <LeaveContext.Provider
      value={{
        leaveRequests: tenantLeaveRequests,
        submitLeaveRequest,
        updateLeaveRequest,
        reviewLeaveRequest,
        deleteLeaveRequest
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeaveRequests = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeaveRequests must be used within a LeaveProvider');
  }
  return context;
};
