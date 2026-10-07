import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Expense, Organization, User } from '../../types';
import {
  subscribeToExpenses,
  persistExpenseToFirestore,
  deleteExpenseFromFirestore
} from '../../lib/firestoreService';
import {
  NewExpenseInput,
  EXPENSE_CATEGORY_LABEL,
  formatRupees,
  validateExpense
} from '../../lib/finance';
import { useAuditLog } from './AuditContext';

const EXPENSE_MIRROR_KEY = 'vidyaos_expenses';

/** Editable fields on an existing expense — the recorded-by stamps stay put. */
export type ExpenseEdit = Partial<
  Pick<
    Expense,
    'title' | 'category' | 'amount' | 'expenseDate' | 'paymentMethod' | 'vendor' | 'notes'
  >
>;

export interface FinanceContextType {
  /** Tenant-filtered expense ledger, newest expense date first. */
  expenses: Expense[];
  /** Validates + records a money-out entry. Returns null when invalid/denied. */
  addExpense: (input: NewExpenseInput) => Expense | null;
  /** Desk correction of a recorded expense (staff/admin, mirrors the rules). */
  updateExpense: (expenseId: string, updates: ExpenseEdit) => Expense | null;
  /** Front-desk removal of an expense (staff/admin, mirrors the rules). */
  deleteExpense: (expenseId: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

interface FinanceProviderProps {
  currentOrg: Organization;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

/** DEV-only mirror so the demo ledger survives a reload; prod reads Firestore only. */
function readExpenseMirror(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSE_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((e): e is Expense => !!e && typeof e.id === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeExpenseMirror(expenses: Expense[]): void {
  try {
    localStorage.setItem(EXPENSE_MIRROR_KEY, JSON.stringify(expenses.slice(0, 1000)));
  } catch {
    // Mirror is a convenience — never fatal.
  }
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({
  currentOrg,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { recordAudit } = useAuditLog();

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    import.meta.env.DEV ? readExpenseMirror() : []
  );

  // Real-time Firestore subscription — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToExpenses(data => {
      if (data) setExpenses(data);
    }, targetOrg);
    return () => {
      unsub();
    };
  }, [currentOrg.id, isPlatformOwner]);

  const commit = (next: Expense[]) => {
    setExpenses(next);
    if (import.meta.env.DEV) writeExpenseMirror(next);
  };

  /** Money-out writes are desk-only — same gate the rules enforce. */
  const canWrite =
    currentUser.role === 'CENTER_ADMIN' ||
    currentUser.role === 'STAFF' ||
    currentUser.role === 'PLATFORM_OWNER';

  const addExpense = (input: NewExpenseInput): Expense | null => {
    if (!canWrite) return null;
    const validationError = validateExpense(input);
    if (validationError) return null;

    const now = Date.now();
    const expense: Expense = {
      id: `exp-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      orgId: currentOrg.id,
      branchId: input.branchId || currentOrg.branches?.[0]?.id || 'branch-1',
      title: input.title.trim(),
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate,
      paymentMethod: input.paymentMethod,
      vendor: input.vendor?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      recordedByUserId: currentUser.id,
      recordedByName: currentUser.name,
      createdAt: new Date(now).toISOString(),
      createdAtMs: now
    };

    commit([expense, ...expenses]);
    persistExpenseToFirestore(expense).catch(() => {
      /* details already logged by handleFirestoreError */
    });

    recordAudit({
      action: 'create',
      targetType: 'expense',
      targetId: expense.id,
      summary: `Recorded ${EXPENSE_CATEGORY_LABEL[expense.category]} expense "${expense.title}" (${formatRupees(expense.amount)}) on ${expense.expenseDate}.`,
      branchId: expense.branchId
    });
    return expense;
  };

  const updateExpense = (expenseId: string, updates: ExpenseEdit): Expense | null => {
    if (!canWrite) return null;
    const target = expenses.find(e => e.id === expenseId);
    if (!target) return null;

    const merged: Expense = {
      ...target,
      ...updates,
      id: target.id,
      orgId: target.orgId,
      recordedByUserId: target.recordedByUserId,
      recordedByName: target.recordedByName,
      createdAt: target.createdAt,
      createdAtMs: target.createdAtMs
    };
    const validationError = validateExpense({
      title: merged.title,
      amount: merged.amount,
      expenseDate: merged.expenseDate
    });
    if (validationError) return null;

    const updated: Expense = {
      ...merged,
      title: merged.title.trim(),
      vendor: merged.vendor?.trim() || undefined,
      notes: merged.notes?.trim() || undefined
    };

    commit(expenses.map(e => (e.id === expenseId ? updated : e)));
    persistExpenseToFirestore(updated).catch(() => {});

    recordAudit({
      action: 'update',
      targetType: 'expense',
      targetId: updated.id,
      summary: `Updated expense "${updated.title}" (${formatRupees(updated.amount)}, ${EXPENSE_CATEGORY_LABEL[updated.category]}).`,
      changes: { amount: updated.amount, category: updated.category },
      branchId: updated.branchId
    });
    return updated;
  };

  const deleteExpense = (expenseId: string): void => {
    if (!canWrite) return;
    const target = expenses.find(e => e.id === expenseId);
    if (!target) return;

    commit(expenses.filter(e => e.id !== expenseId));
    deleteExpenseFromFirestore(expenseId).catch(() => {});

    recordAudit({
      action: 'delete',
      targetType: 'expense',
      targetId: expenseId,
      summary: `Removed expense "${target.title}" (${formatRupees(target.amount)}, ${target.expenseDate}).`,
      branchId: target.branchId
    });
  };

  // Multi-tenant isolation for the view layer.
  const tenantExpenses = useMemo(() => {
    if (isPlatformOwner) return expenses;
    return expenses.filter(e => e.orgId === currentOrg.id);
  }, [expenses, currentOrg.id, isPlatformOwner]);

  return (
    <FinanceContext.Provider
      value={{
        expenses: tenantExpenses,
        addExpense,
        updateExpense,
        deleteExpense
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};