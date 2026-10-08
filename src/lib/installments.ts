import { FeeInvoice, Installment } from '../types';
import { getIndiaDateString } from './date';

// F11 — Structured fee instalments.
//
// A term fee ("₹6,000 for the term") can be split into dated instalments. All
// money maths happens in paise so the parts always add back up to the whole to
// the paise, and every payment is allocated to the next unpaid instalment in
// due-date order. Pure functions only, so the same allocation the Firestore
// transaction runs is the one the unit tests exercise.

export const DEFAULT_INSTALLMENT_INTERVAL_DAYS = 30;
export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 12;

export const INSTALLMENT_INTERVAL_PRESETS: { label: string; days: number }[] = [
  { label: 'Monthly (30 days)', days: 30 },
  { label: 'Fortnightly (14 days)', days: 14 },
  { label: 'Quarterly (90 days)', days: 90 },
  { label: 'Weekly (7 days)', days: 7 }
];

/** Round to paise so repeated arithmetic never drifts. */
export function round2(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function clampInstallmentCount(count: number): number {
  const n = Math.floor(Number.isFinite(count) ? count : MIN_INSTALLMENTS);
  return Math.min(MAX_INSTALLMENTS, Math.max(MIN_INSTALLMENTS, n));
}

/**
 * Split `total` into `count` rupee amounts that sum exactly to the total.
 * The remainder paise are handed to the earliest instalments, so a ₹100 / 3
 * plan becomes 33.34 + 33.33 + 33.33.
 */
export function splitAmount(total: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const totalPaise = Math.round((Number.isFinite(total) ? total : 0) * 100);
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

/** Add whole days to a YYYY-MM-DD date, staying in UTC to avoid DST drift. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build an evenly-split plan starting at `startDate`, each subsequent
 * instalment `intervalDays` after the previous one.
 */
export function buildInstallments(
  total: number,
  count: number,
  startDate: string,
  intervalDays: number = DEFAULT_INSTALLMENT_INTERVAL_DAYS
): Installment[] {
  const n = clampInstallmentCount(count);
  const amounts = splitAmount(total, n);
  const start = startDate || getIndiaDateString(new Date());
  const step = Number.isFinite(intervalDays) && intervalDays > 0 ? Math.floor(intervalDays) : DEFAULT_INSTALLMENT_INTERVAL_DAYS;
  return amounts.map((amount, i) => ({
    id: `inst-${i + 1}`,
    label: `Instalment ${i + 1}`,
    amount,
    dueDate: addDays(start, i * step),
    status: 'pending',
    paidAmount: 0,
    paymentIds: []
  }));
}

export function installmentBalance(inst: Installment): number {
  return Math.max(0, Math.round((inst.amount - inst.paidAmount) * 100) / 100);
}

/**
 * Apply a payment to the plan, oldest instalment first, marking each covered
 * instalment paid. Returns a fresh list plus how much was actually allocated
 * (which can be less than the payment if the plan is already settled).
 */
export function allocatePayment(
  installments: Installment[],
  amount: number,
  paymentId: string
): { installments: Installment[]; allocated: number } {
  let remaining = Math.max(0, Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100);
  const result = installments.map(inst => ({ ...inst, paymentIds: [...(inst.paymentIds || [])] }));

  for (const inst of result) {
    if (remaining <= 0) break;
    const balance = installmentBalance(inst);
    if (balance <= 0) continue;
    const applied = Math.min(balance, remaining);
    inst.paidAmount = Math.round((inst.paidAmount + applied) * 100) / 100;
    remaining = Math.round((remaining - applied) * 100) / 100;
    inst.status = inst.paidAmount >= inst.amount ? 'paid' : 'partially_paid';
    if (paymentId && !inst.paymentIds.includes(paymentId)) inst.paymentIds.push(paymentId);
  }

  const allocated = Math.round(((Number.isFinite(amount) ? amount : 0) - remaining) * 100) / 100;
  return { installments: result, allocated };
}

/** The next unpaid instalment (plan order = due-date order). */
export function nextDueInstallment(installments: Installment[] | undefined): Installment | null {
  if (!installments || installments.length === 0) return null;
  return installments.find(inst => inst.status !== 'paid') || null;
}

export function invoiceStatusFromInstallments(
  installments: Installment[]
): 'paid' | 'pending' | 'partially_paid' {
  if (!installments.length) return 'pending';
  if (installments.every(inst => inst.status === 'paid')) return 'paid';
  if (installments.some(inst => inst.paidAmount > 0)) return 'partially_paid';
  return 'pending';
}

export interface InstallmentsSummary {
  count: number;
  paidCount: number;
  total: number;
  paid: number;
  due: number;
  nextDue: Installment | null;
}

export function installmentsSummary(installments: Installment[] | undefined): InstallmentsSummary {
  const list = installments || [];
  const total = list.reduce((sum, i) => sum + i.amount, 0);
  const paid = list.reduce((sum, i) => sum + i.paidAmount, 0);
  return {
    paidCount: list.filter(i => i.status === 'paid').length,
    count: list.length,
    total: Math.round(total * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    due: Math.max(0, Math.round((total - paid) * 100) / 100),
    nextDue: nextDueInstallment(list)
  };
}

/** The next date a family owes money on — the next instalment due, else the invoice due date. */
export function nextPaymentDueDate(invoice: Pick<FeeInvoice, 'installments' | 'dueDate'>): string {
  return nextDueInstallment(invoice.installments)?.dueDate || invoice.dueDate;
}

/** The amount owed on the next instalment — its balance, or the whole remaining when uninstalmented. */
export function nextPaymentDueAmount(invoice: Pick<FeeInvoice, 'installments' | 'netAmount' | 'paidAmount'>): number {
  const next = nextDueInstallment(invoice.installments);
  if (next) return installmentBalance(next);
  return Math.max(0, Math.round((invoice.netAmount - invoice.paidAmount) * 100) / 100);
}

export function isInstallmentOverdue(inst: Installment, today: string): boolean {
  return inst.status !== 'paid' && inst.dueDate < today;
}

/** Human label for an instalment status. */
export function formatInstallmentStatus(status: Installment['status']): string {
  if (status === 'paid') return 'Paid';
  if (status === 'partially_paid') return 'Part-paid';
  return 'Pending';
}

/** Invoice status derived from the plan, honouring overdue when not next settled. */
export function deriveInvoiceStatus(
  installments: Installment[] | undefined,
  fallbackPaid: number,
  netAmount: number,
  today: string
): FeeInvoice['status'] {
  if (installments && installments.length) {
    if (installments.every(i => i.status === 'paid')) return 'paid';
    if (installments.some(i => isInstallmentOverdue(i, today))) return 'overdue';
    if (installments.some(i => i.paidAmount > 0)) return 'partially_paid';
    return 'pending';
  }
  return fallbackPaid >= netAmount ? 'paid' : 'partially_paid';
}