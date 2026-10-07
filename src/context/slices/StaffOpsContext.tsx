import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  TeacherAttendance,
  TeacherAttendanceStatus,
  SalarySlip,
  PaymentRecord,
  Organization,
  User
} from '../../types';
import {
  subscribeToTeacherAttendance,
  persistTeacherAttendanceToFirestore,
  deleteTeacherAttendanceFromFirestore,
  subscribeToSalarySlips,
  persistSalarySlipToFirestore,
  deleteSalarySlipFromFirestore
} from '../../lib/firestoreService';
import {
  teacherAttendanceId,
  upsertTeacherAttendance,
  computeSlipNet,
  formatRupees
} from '../../lib/staffOps';
import { getIndiaDateString } from '../../lib/date';
import { useAcademics } from './AcademicContext';
import { useCommunication } from './CommunicationContext';
import { useAuditLog } from './AuditContext';

export interface NewSalarySlipInput {
  teacherId: string;
  /** e.g. "October 2026". */
  monthYear: string;
  basic: number;
  allowances?: number;
  deductions?: number;
  /** 'issued' (default) bells the teacher; 'draft' stays desk-internal. */
  status?: 'draft' | 'issued';
}

export interface MarkAttendanceOptions {
  /** YYYY-MM-DD (India); defaults to today. */
  date?: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

export interface StaffOpsContextType {
  /** Tenant-filtered faculty attendance rows (one per teacher per day). */
  teacherAttendance: TeacherAttendance[];
  /** Tenant-filtered salary slips, newest issued first. */
  salarySlips: SalarySlip[];
  /**
   * Stamps one (teacher, day) row — self check-in/out from the My Day card,
   * desk corrections on the Staff Ops grid. A teacher may only ever touch
   * their own row; staff/admin any row (mirrors the rules, fails closed).
   */
  markTeacherAttendance: (
    teacherId: string,
    status: TeacherAttendanceStatus,
    options?: MarkAttendanceOptions
  ) => void;
  /** Clears a cell on the admin grid (staff/admin only). */
  clearTeacherAttendance: (teacherId: string, date: string) => void;
  /** Composes a slip from `Teacher.salary` — returns null when validation fails. */
  issueSalarySlip: (input: NewSalarySlipInput) => SalarySlip | null;
  /** Draft → issued: stamps `issuedAt` and bells the teacher. Idempotent. */
  issueDraftSlip: (slipId: string) => void;
  /** Pays an unpaid slip in full and bells the teacher. Idempotent. */
  markSlipPaid: (slipId: string, method: PaymentRecord['paymentMethod']) => void;
  /** Front-desk removal of a slip (staff/admin, mirrors the rules). */
  deleteSalarySlip: (slipId: string) => void;
}

const StaffOpsContext = createContext<StaffOpsContextType | undefined>(undefined);

interface StaffOpsProviderProps {
  currentOrg: Organization;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const StaffOpsProvider: React.FC<StaffOpsProviderProps> = ({
  currentOrg,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { teachers } = useAcademics();
  const { pushNotification } = useCommunication();
  const { recordAudit } = useAuditLog();

  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendance[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);

  // Real-time Firestore subscriptions — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsubAttendance = subscribeToTeacherAttendance(data => {
      if (data) setTeacherAttendance(data);
    }, targetOrg);
    const unsubSlips = subscribeToSalarySlips(data => {
      if (data) setSalarySlips(data);
    }, targetOrg);
    return () => {
      unsubAttendance();
      unsubSlips();
    };
  }, [currentOrg.id, isPlatformOwner]);

  /** Audit rows can only be written by desk sessions (rules: F1 — teachers cannot). */
  const canAudit =
    currentUser.role === 'CENTER_ADMIN' ||
    currentUser.role === 'STAFF' ||
    currentUser.role === 'PLATFORM_OWNER';

  const markTeacherAttendance = (
    teacherId: string,
    status: TeacherAttendanceStatus,
    options: MarkAttendanceOptions = {}
  ): void => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    // Product gate mirrors the rules: faculty write only their own row.
    const isSelf = teacher.userId === currentUser.id;
    const isDesk = canAudit;
    if (!isSelf && !isDesk) return;

    const date = options.date || getIndiaDateString();
    const existing = teacherAttendance.find(
      r => r.teacherId === teacherId && r.date === date
    );
    const now = new Date().toISOString();
    const record: TeacherAttendance = {
      id: teacherAttendanceId(teacherId, date),
      orgId: currentOrg.id,
      branchId:
        teacher.branchId || currentOrg.branches?.[0]?.id || 'branch-1',
      teacherId,
      date,
      status,
      checkIn: options.checkIn ?? existing?.checkIn,
      checkOut: options.checkOut ?? existing?.checkOut,
      remarks: options.remarks ?? existing?.remarks,
      markedByUserId: currentUser.id,
      markedAt: now
    };

    setTeacherAttendance(prev => upsertTeacherAttendance(prev, record));
    persistTeacherAttendanceToFirestore(record).catch(() => {
      /* details already logged by handleFirestoreError */
    });

    // Desk-stamped corrections enter the audit trail; a faculty member's own
    // check-in is recorded on the row itself (markedByUserId/markedAt) — the
    // auditLogs rules deny teacher writes, so never queue one for a self-tap.
    if (canAudit) {
      recordAudit({
        action: existing ? 'update' : 'create',
        targetType: 'teacher_attendance',
        targetId: record.id,
        summary: `${isSelf ? 'Checked in' : `Marked ${status.replace('_', ' ')}`} for ${teacher.name} on ${date}${options.checkIn ? ` (in ${options.checkIn})` : ''}${options.checkOut ? ` (out ${options.checkOut})` : ''}.`,
        branchId: record.branchId
      });
    }
  };

  const clearTeacherAttendance = (teacherId: string, date: string): void => {
    if (!canAudit) return;
    const existing = teacherAttendance.find(
      r => r.teacherId === teacherId && r.date === date
    );
    if (!existing) return;
    const teacher = teachers.find(t => t.id === teacherId);

    setTeacherAttendance(prev =>
      prev.filter(r => !(r.teacherId === teacherId && r.date === date))
    );
    deleteTeacherAttendanceFromFirestore(existing.id).catch(() => {});

    recordAudit({
      action: 'delete',
      targetType: 'teacher_attendance',
      targetId: existing.id,
      summary: `Cleared attendance for ${teacher?.name ?? teacherId} on ${date}.`,
      branchId: existing.branchId
    });
  };

  const issueSalarySlip = (input: NewSalarySlipInput): SalarySlip | null => {
    if (!canAudit) return null;
    const teacher = teachers.find(t => t.id === input.teacherId);
    if (!teacher || !input.monthYear?.trim()) return null;
    if (!Number.isFinite(input.basic) || input.basic < 0) return null;

    const now = Date.now();
    const netAmount = computeSlipNet(
      input.basic,
      input.allowances ?? 0,
      input.deductions ?? 0
    );
    const status = input.status === 'draft' ? 'draft' : 'issued';

    const slip: SalarySlip = {
      id: `slip-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      orgId: currentOrg.id,
      branchId: teacher.branchId || currentOrg.branches?.[0]?.id || 'branch-1',
      teacherId: input.teacherId,
      monthYear: input.monthYear.trim(),
      basic: input.basic,
      allowances: input.allowances ?? 0,
      deductions: input.deductions ?? 0,
      netAmount,
      paidAmount: 0,
      status,
      issuedAt: new Date(now).toISOString(),
      createdAt: new Date(now).toISOString(),
      createdAtMs: now
    };

    setSalarySlips(prev => [slip, ...prev]);
    persistSalarySlipToFirestore(slip).catch(() => {});

    // Bell the teacher when the slip actually goes out (drafts stay quiet).
    if (status === 'issued' && teacher.userId && teacher.userId !== currentUser.id) {
      pushNotification(
        teacher.userId,
        'Salary Slip Issued',
        `${slip.monthYear} · ${formatRupees(netAmount)} — ready for review in My Day.`,
        'salary'
      );
    }

    recordAudit({
      action: 'create',
      targetType: 'salary',
      targetId: slip.id,
      summary: `Issued ${slip.monthYear} salary slip for ${teacher.name} (${formatRupees(netAmount)})${status === 'draft' ? ' as draft' : ''}.`,
      branchId: slip.branchId
    });
    return slip;
  };

  // A draft is a desk-side rehearsal: nothing leaves the console until the
  // desk presses "Issue" — then issuedAt re-stamps and the teacher is belled.
  // The rules allow only status/issuedAt (plus pay fields) to change on an
  // existing slip, so amounts stay frozen once composed.
  const issueDraftSlip = (slipId: string): void => {
    if (!canAudit) return;
    const target = salarySlips.find(s => s.id === slipId);
    if (!target || target.status !== 'draft') return; // idempotent
    const teacher = teachers.find(t => t.id === target.teacherId);

    const issued: SalarySlip = {
      ...target,
      status: 'issued',
      issuedAt: new Date().toISOString()
    };

    setSalarySlips(prev => prev.map(s => (s.id === slipId ? issued : s)));
    persistSalarySlipToFirestore(issued).catch(() => {});

    if (teacher?.userId && teacher.userId !== currentUser.id) {
      pushNotification(
        teacher.userId,
        'Salary Slip Issued',
        `${issued.monthYear} · ${formatRupees(issued.netAmount)} — ready for review in My Day.`,
        'salary'
      );
    }

    recordAudit({
      action: 'update',
      targetType: 'salary',
      targetId: issued.id,
      summary: `Issued ${issued.monthYear} salary slip for ${teacher?.name ?? issued.teacherId} (${formatRupees(issued.netAmount)}).`,
      changes: { status: 'issued' },
      branchId: issued.branchId
    });
  };

  const markSlipPaid = (slipId: string, method: PaymentRecord['paymentMethod']): void => {
    if (!canAudit) return;
    const target = salarySlips.find(s => s.id === slipId);
    if (!target || target.status === 'paid') return; // idempotent
    const teacher = teachers.find(t => t.id === target.teacherId);

    const now = Date.now();
    const paid: SalarySlip = {
      ...target,
      status: 'paid',
      paidAmount: target.netAmount,
      paymentMethod: method,
      paidAt: new Date(now).toISOString(),
      paidBy: currentUser.name
    };

    setSalarySlips(prev => prev.map(s => (s.id === slipId ? paid : s)));
    persistSalarySlipToFirestore(paid).catch(() => {});

    if (teacher?.userId && teacher.userId !== currentUser.id) {
      pushNotification(
        teacher.userId,
        'Salary Paid',
        `${paid.monthYear} · ${formatRupees(paid.paidAmount)} via ${method}. Slip is marked paid.`,
        'salary'
      );
    }

    recordAudit({
      action: 'update',
      targetType: 'salary',
      targetId: paid.id,
      summary: `Marked ${paid.monthYear} salary for ${teacher?.name ?? paid.teacherId} as paid (${formatRupees(paid.paidAmount)} via ${method}).`,
      changes: { status: 'paid', paidAmount: paid.paidAmount },
      branchId: paid.branchId
    });
  };

  const deleteSalarySlip = (slipId: string): void => {
    if (!canAudit) return;
    const target = salarySlips.find(s => s.id === slipId);
    if (!target) return;
    const teacher = teachers.find(t => t.id === target.teacherId);

    setSalarySlips(prev => prev.filter(s => s.id !== slipId));
    deleteSalarySlipFromFirestore(slipId).catch(() => {});

    recordAudit({
      action: 'delete',
      targetType: 'salary',
      targetId: slipId,
      summary: `Removed ${target.monthYear} salary slip for ${teacher?.name ?? target.teacherId} (${formatRupees(target.netAmount)}).`,
      branchId: target.branchId
    });
  };

  // Multi-tenant isolation for the view layer.
  const tenantAttendance = isPlatformOwner
    ? teacherAttendance
    : teacherAttendance.filter(r => r.orgId === currentOrg.id);
  const tenantSlips = isPlatformOwner
    ? salarySlips
    : salarySlips.filter(s => s.orgId === currentOrg.id);

  return (
    <StaffOpsContext.Provider
      value={{
        teacherAttendance: tenantAttendance,
        salarySlips: tenantSlips,
        markTeacherAttendance,
        clearTeacherAttendance,
        issueSalarySlip,
        issueDraftSlip,
        markSlipPaid,
        deleteSalarySlip
      }}
    >
      {children}
    </StaffOpsContext.Provider>
  );
};

export const useStaffOps = () => {
  const context = useContext(StaffOpsContext);
  if (!context) {
    throw new Error('useStaffOps must be used within a StaffOpsProvider');
  }
  return context;
};
