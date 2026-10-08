import React, { createContext, useContext } from 'react';
import { Organization, User } from '../../types';
import { useStudents } from './StudentContext';
import { useFees } from './FeeContext';
import { useAuditLog } from './AuditContext';
import {
  buildRolloverPlan,
  RolloverPlan,
  suggestedRolloverYears
} from '../../lib/rollover';

export interface RolloverPreviewInput {
  fromYear: string;
  toYear: string;
  feeOverrides?: Record<string, number>;
}

export interface RolloverExecutionResult {
  batchesCreated: number;
  batchesCompleted: number;
  invoicesCreated: number;
  studentsCarried: number;
  skipped: number;
}

export interface RolloverContextType {
  previewRollover: (input: RolloverPreviewInput) => RolloverPlan;
  executeRollover: (plan: RolloverPlan) => Promise<RolloverExecutionResult>;
  /** Latest active academic year + the suggested next one, or `null` when empty. */
  suggestedYears: () => { fromYear: string; toYear: string } | null;
}

const RolloverContext = createContext<RolloverContextType | undefined>(undefined);

interface RolloverProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

/**
 * F12 — Session rollover. This slice sits inside both the student and fee
 * providers so the wizard can read the live roster and reuse the same
 * `addBatch` / `updateBatch` / `createInvoice` mutations the rest of the admin
 * console uses (each already persists to Firestore and keeps local state in
 * sync). Confirmation-only: there is no undo.
 */
export const RolloverProvider: React.FC<RolloverProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { students, batches, addBatch, updateBatch } = useStudents();
  const { createInvoice } = useFees();
  const { recordAudit } = useAuditLog();

  const academicBatches = () => {
    if (isPlatformOwner) return batches;
    return batches.filter(batch => batch.orgId === currentOrg.id);
  };

  const previewRollover = (input: RolloverPreviewInput): RolloverPlan => {
    const scopedBatches = academicBatches();
    return buildRolloverPlan({
      batches: scopedBatches,
      students,
      fromYear: input.fromYear,
      toYear: input.toYear,
      existingBatchIds: scopedBatches.map(batch => batch.id),
      feeOverrides: input.feeOverrides
    });
  };

  const suggestedYears = () => suggestedRolloverYears(academicBatches());

  const executeRollover = async (plan: RolloverPlan): Promise<RolloverExecutionResult> => {
    const canExecute = currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'PLATFORM_OWNER';
    if (!canExecute) {
      throw new Error('Only a center admin can start a new academic year.');
    }

    const rows = plan.batches.filter(item => !item.skipReason && item.toClassGrade);
    if (rows.length === 0) {
      throw new Error('Nothing to roll over — there are no active batches carrying students forward.');
    }

    const branchId = selectedBranchId !== 'all' ? selectedBranchId : currentOrg.branches[0]?.id || 'branch-1';
    const batchIdByPlanKey = new Map<string, string>();

    let batchesCreated = 0;
    let batchesCompleted = 0;

    for (const row of rows) {
      updateBatch(row.sourceBatchId, { status: 'completed' });
      batchesCompleted++;

      const created = addBatch({
        branchId: row.branchId || branchId,
        name: row.newName,
        subject: row.subject,
        classGrade: row.toClassGrade as string,
        teacherId: row.teacherId,
        classroom: row.classroom,
        scheduleDays: row.scheduleDays,
        timeSlot: row.timeSlot,
        capacity: row.capacity,
        studentIds: [...row.carriedStudentIds],
        feeAmountMonthly: row.feeAmountMonthly,
        academicYear: plan.toYear,
        status: 'active'
      });
      batchesCreated++;
      batchIdByPlanKey.set(row.targetBatchId, created.id);

      recordAudit({
        action: 'create',
        targetType: 'batch',
        targetId: created.id,
        summary: `Rolled "${row.sourceName}" into ${plan.toYear} as "${row.newName}" with ${row.carriedStudentIds.length} carried student${row.carriedStudentIds.length === 1 ? '' : 's'} (₹${row.feeAmountMonthly.toLocaleString('en-IN')}/month).`,
        changes: {
          fromYear: plan.fromYear,
          toYear: plan.toYear,
          sourceBatchId: row.sourceBatchId,
          carriedStudentCount: row.carriedStudentIds.length
        }
      });
    }

    let invoicesCreated = 0;
    for (const draft of plan.invoices) {
      const newBatchId = batchIdByPlanKey.get(draft.planKey);
      if (!newBatchId) continue;
      createInvoice({
        branchId: draft.branchId || branchId,
        studentId: draft.studentId,
        batchId: newBatchId,
        monthYear: draft.monthYear,
        title: draft.title,
        amount: draft.amount,
        discount: 0,
        lateFee: 0,
        netAmount: draft.amount,
        paidAmount: 0,
        dueDate: draft.dueDate,
        status: 'pending'
      });
      invoicesCreated++;
    }

    recordAudit({
      action: 'create',
      targetType: 'academicYear',
      targetId: `${plan.fromYear}-to-${plan.toYear}`,
      summary: `Started academic year ${plan.toYear}: ${batchesCreated} batch${batchesCreated === 1 ? '' : 'es'} created, ${batchesCompleted} completed, ${plan.carriedStudentCount} student${plan.carriedStudentCount === 1 ? '' : 's'} carried, ${invoicesCreated} first-month invoice${invoicesCreated === 1 ? '' : 's'} raised.`,
      changes: {
        fromYear: plan.fromYear,
        toYear: plan.toYear,
        batchesCreated,
        batchesCompleted,
        carriedStudentCount: plan.carriedStudentCount,
        invoicesCreated
      }
    });

    return {
      batchesCreated,
      batchesCompleted,
      invoicesCreated,
      studentsCarried: plan.carriedStudentCount,
      skipped: plan.batches.filter(item => item.skipReason).length
    };
  };

  return (
    <RolloverContext.Provider value={{ previewRollover, executeRollover, suggestedYears }}>
      {children}
    </RolloverContext.Provider>
  );
};

export const useRollover = () => {
  const context = useContext(RolloverContext);
  if (!context) {
    throw new Error('useRollover must be used within a RolloverProvider');
  }
  return context;
};