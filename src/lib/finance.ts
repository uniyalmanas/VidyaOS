/**
 * VidyaOS finance (F5) — pure, dependency-free Profit & Loss helpers.
 *
 * Same philosophy as `lib/leave.ts` / `lib/staffOps.ts`: no Firestore imports,
 * so the identical arithmetic runs in the browser (the P&L tab) and in node
 * (the unit suite in test-auth.ts).
 *
 * Cash-basis model, in plain words:
 *   money in  = fees actually received during the month (recorded payments)
 *   money out = expenses recorded for the month + salaries actually PAID
 *   net       = money in − money out
 *
 * Only paid salary slips count (an issued slip is a promise, not cash out),
 * and they roll into the `salaries` expense category so the breakdown reads
 * like the owner's own ledger.
 */

import { Expense, ExpenseCategory, FeeInvoice, PaymentRecord, SalarySlip } from '../types';
import { monthKeyFromDate, monthYearFromKey, formatRupees } from './staffOps';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent',
  'salaries',
  'electricity',
  'internet',
  'marketing',
  'maintenance',
  'printing',
  'misc'
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  salaries: 'Salaries',
  electricity: 'Electricity',
  internet: 'Internet',
  marketing: 'Marketing',
  maintenance: 'Maintenance',
  printing: 'Printing & Stationery',
  misc: 'Miscellaneous'
};

/** Category accent colours shared by the P&L bars and the expense chips. */
export const EXPENSE_CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  rent: '#1A73E8',
  salaries: '#9334E6',
  electricity: '#F9AB00',
  internet: '#12B5CB',
  marketing: '#E8710A',
  maintenance: '#188038',
  printing: '#D93025',
  misc: '#5F6368'
};

/** ₹1 crore sanity cap — anything above is almost certainly a typo. */
export const MAX_EXPENSE_AMOUNT = 10_000_000;

export interface NewExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** YYYY-MM-DD (India). */
  expenseDate: string;
  paymentMethod: PaymentRecord['paymentMethod'];
  vendor?: string;
  notes?: string;
  branchId?: string;
}

/**
 * "October 2026" → "2026-10" — the exact inverse of `monthYearFromKey`, used
 * to bucket salary slips (which store a printable label) into a month.
 */
export function monthKeyFromSalaryLabel(label: string): string {
  const trimmed = label?.trim() ?? '';
  if (!trimmed) return '';
  const yearMatch = trimmed.match(/(\d{4})\s*$/);
  if (!yearMatch) return '';
  const year = yearMatch[1];
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (monthYearFromKey(key) === trimmed) return key;
  }
  return '';
}

export interface MonthIncome {
  total: number;
  /** Distinct invoices that received money this month. */
  invoiceCount: number;
  /** Number of payment entries counted. */
  paymentCount: number;
}

/**
 * Fees actually received during `monthKey`. Only recorded payments count —
 * a payment still awaiting verification is not money in the bank yet, and a
 * rejected one never was.
 */
export function incomeForMonth(invoices: FeeInvoice[], monthKey: string): MonthIncome {
  let total = 0;
  let paymentCount = 0;
  const touched = new Set<string>();
  invoices.forEach(invoice => {
    (invoice.payments || []).forEach(payment => {
      if (payment.status === 'rejected' || payment.status === 'pending_verification') return;
      if (monthKeyFromDate(payment.paymentDate) !== monthKey) return;
      total += payment.amount;
      paymentCount += 1;
      touched.add(invoice.id);
    });
  });
  return { total, invoiceCount: touched.size, paymentCount };
}

export interface SalaryRollup {
  total: number;
  slipCount: number;
}

/** Salaries actually paid for `monthKey` — draft/issued slips are excluded. */
export function salaryTotalForMonth(slips: SalarySlip[], monthKey: string): SalaryRollup {
  let total = 0;
  let slipCount = 0;
  slips.forEach(slip => {
    if (slip.status !== 'paid') return;
    if (monthKeyFromSalaryLabel(slip.monthYear) !== monthKey) return;
    total += slip.paidAmount || slip.netAmount;
    slipCount += 1;
  });
  return { total, slipCount };
}

export function expensesForMonth(expenses: Expense[], monthKey: string): Expense[] {
  return expenses.filter(expense => monthKeyFromDate(expense.expenseDate) === monthKey);
}

export interface CategoryTotal {
  category: ExpenseCategory;
  label: string;
  color: string;
  amount: number;
  count: number;
}

/**
 * Expense totals per category for the month, with paid salaries folded into
 * `salaries`. Zero rows are dropped and the list reads largest-first.
 */
export function categoryTotals(
  expenses: Expense[],
  monthKey: string,
  salaryTotal = 0,
  salaryCount = 0
): CategoryTotal[] {
  const map = new Map<ExpenseCategory, { amount: number; count: number }>();
  expensesForMonth(expenses, monthKey).forEach(expense => {
    const current = map.get(expense.category) || { amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    map.set(expense.category, current);
  });
  if (salaryTotal > 0) {
    const current = map.get('salaries') || { amount: 0, count: 0 };
    current.amount += salaryTotal;
    current.count += salaryCount;
    map.set('salaries', current);
  }
  return [...map.entries()]
    .map(([category, value]) => ({
      category,
      label: EXPENSE_CATEGORY_LABEL[category],
      color: EXPENSE_CATEGORY_COLOR[category],
      amount: value.amount,
      count: value.count
    }))
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface ProfitAndLoss {
  monthKey: string;
  monthLabel: string;
  /** Money in — fees received. */
  income: number;
  /** Money out — recorded expenses + paid salaries. */
  expense: number;
  /** income − expense; negative means the month ran at a loss. */
  net: number;
  /** Net as a percentage of income (0 when there was no income). */
  marginPct: number;
  /** Expenses-collection only, excluding the salary rollup. */
  recordedExpense: number;
  salaryTotal: number;
  salarySlipCount: number;
  incomeInvoiceCount: number;
  incomePaymentCount: number;
  categories: CategoryTotal[];
}

/**
 * Assembles the whole month's P&L from the three live collections. Safe on an
 * empty month: every figure is 0 and the category breakdown is empty.
 */
export function buildProfitAndLoss(
  monthKey: string,
  data: { invoices: FeeInvoice[]; expenses: Expense[]; salarySlips: SalarySlip[] }
): ProfitAndLoss {
  const income = incomeForMonth(data.invoices, monthKey);
  const salary = salaryTotalForMonth(data.salarySlips, monthKey);
  const recordedExpense = expensesForMonth(data.expenses, monthKey).reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const expense = recordedExpense + salary.total;
  const net = income.total - expense;
  return {
    monthKey,
    monthLabel: monthYearFromKey(monthKey) || monthKey,
    income: income.total,
    expense,
    net,
    marginPct: income.total > 0 ? Math.round((net / income.total) * 100) : 0,
    recordedExpense,
    salaryTotal: salary.total,
    salarySlipCount: salary.slipCount,
    incomeInvoiceCount: income.invoiceCount,
    incomePaymentCount: income.paymentCount,
    categories: categoryTotals(data.expenses, monthKey, salary.total, salary.slipCount)
  };
}

/** Returns a human error string, or null when the expense is good to save. */
export function validateExpense(input: { title: string; amount: number; expenseDate: string }): string | null {
  const title = input.title?.trim() ?? '';
  if (title.length < 2) return 'Give the expense a short title.';
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'Amount must be more than zero.';
  if (input.amount > MAX_EXPENSE_AMOUNT) {
    return `That looks too large — split expenses above ${formatRupees(MAX_EXPENSE_AMOUNT)}.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) return 'Pick a valid expense date.';
  return null;
}

/** Re-exported so the P&L UI can pull every finance helper from one module. */
export {
  formatRupees,
  monthKeyFromDate,
  monthYearFromKey,
  currentMonthKey,
  shiftMonthKey
} from './staffOps';

/** Newest expense date first, then newest recorded — matches the P&L ledger. */
export function sortExpensesNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.expenseDate !== b.expenseDate) return a.expenseDate < b.expenseDate ? 1 : -1;
    return b.createdAtMs - a.createdAtMs;
  });
}

/** Free-text search across title, vendor, category label and notes. */
export function searchExpenses(expenses: Expense[], query: string): Expense[] {
  const q = query.trim().toLowerCase();
  if (!q) return expenses;
  return expenses.filter(expense => {
    const haystack = [
      expense.title,
      expense.vendor ?? '',
      expense.notes ?? '',
      EXPENSE_CATEGORY_LABEL[expense.category]
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}