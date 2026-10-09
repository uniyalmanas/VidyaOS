/**
 * G5 — Razorpay reconciliation, SERVER MIRROR.
 *
 * Mirrors the pure math in `src/lib/rzp.ts` (app) because functions compile
 * separately (rootDir = src). KEEP IN SYNC with `src/lib/rzp.ts`.
 *
 * Added here only: `verifyRazorpaySignature`, which uses Node crypto and
 * deliberately never runs in the browser. The webhook handler reconciles via
 * the same balance → instalment-allocation → status-derive flow the app's
 * unit tests pin down.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const RZP_WEBHOOK_PAYMENT_EVENTS = ['payment.authorized', 'payment.captured'] as const;

export interface RzpWebhookData {
  event: string;
  paymentId: string;
  orderId?: string;
  amountPaise: number;
  currency?: string;
  method?: string;
  notes: Record<string, string>;
  createdAt?: number;
}

export interface InstallmentLike {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'partially_paid' | 'paid';
  paidAmount: number;
  paymentIds: string[];
}

export interface PaymentLike {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef: string;
  receivedBy: string;
  receiptNo: string;
  status?: string;
  upiApp?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface InvoiceLike {
  id: string;
  orgId?: string;
  netAmount: number;
  paidAmount: number;
  payments?: PaymentLike[];
  installments?: InstallmentLike[];
}

export interface ReconcileResult {
  ok: boolean;
  duplicate: boolean;
  reason?: 'amount_over_balance';
  payment?: PaymentLike;
  paidAmount?: number;
  installments?: InstallmentLike[];
  status?: string;
}

/** Razorpay signs the raw request body with the webhook secret (HMAC-SHA256). */
export function verifyRazorpaySignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret || signature.length % 2 !== 0) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Normalize a payment webhook body into what we reconcile on; null if not a payment event. */
export function parseRzpWebhookEvent(body: unknown): RzpWebhookData | null {
  const root = toRecord(body);
  const event = typeof root.event === 'string' ? root.event : '';
  if (!RZP_WEBHOOK_PAYMENT_EVENTS.includes(event as (typeof RZP_WEBHOOK_PAYMENT_EVENTS)[number])) {
    return null;
  }
  const payload = toRecord(root.payload);
  const entity = toRecord(toRecord(payload.payment).entity);
  const paymentId = typeof entity.id === 'string' ? entity.id : '';
  if (!paymentId) return null;
  const amount = typeof entity.amount === 'number' ? entity.amount : Number(entity.amount || 0);
  return {
    event,
    paymentId,
    orderId: typeof entity.order_id === 'string' ? entity.order_id : undefined,
    amountPaise: Math.round(Number.isFinite(amount) ? amount : 0),
    currency: typeof entity.currency === 'string' ? entity.currency : undefined,
    method: typeof entity.method === 'string' ? entity.method : undefined,
    notes: toRecord(entity.notes) as Record<string, string>,
    createdAt: typeof entity.created_at === 'number' ? entity.created_at : undefined
  };
}

/** Oldest instalment first; each payment tops up the next open instalment. */
export function allocatePayment(
  installments: InstallmentLike[],
  amount: number,
  paymentId: string
): { installments: InstallmentLike[]; allocated: number } {
  let remaining = Math.max(0, Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100);
  const result = installments.map(inst => ({ ...inst, paymentIds: [...(inst.paymentIds || [])] }));
  for (const inst of result) {
    if (remaining <= 0) break;
    const balance = Math.max(0, Math.round((inst.amount - inst.paidAmount) * 100) / 100);
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

export function invoiceStatusFromInstallments(
  installments: InstallmentLike[]
): 'paid' | 'pending' | 'partially_paid' {
  if (!installments.length) return 'pending';
  if (installments.every(i => i.status === 'paid')) return 'paid';
  if (installments.some(i => i.paidAmount > 0)) return 'partially_paid';
  return 'pending';
}

function statusFor(invoice: InvoiceLike, paidAmount: number, installments: InstallmentLike[] | undefined): string {
  if (installments && installments.length) return invoiceStatusFromInstallments(installments);
  return paidAmount >= invoice.netAmount ? 'paid' : 'partially_paid';
}

/**
 * Pure decision for one gateway payment on one invoice — the exact math the
 * app's `recordPaymentAtomically` runs. Duplicate deliveries are idempotent.
 */
export function reconcileGatewayPayment(
  invoice: InvoiceLike,
  paymentId: string,
  amountPaise: number,
  receivedAt: string
): ReconcileResult {
  const amount = Math.round(Number.isFinite(amountPaise) ? amountPaise : 0) / 100;
  const normalized = paymentId.trim();

  const existing = (invoice.payments || []).find(
    p => p.transactionRef.trim().toLowerCase() === normalized.toLowerCase()
  );
  if (existing) {
    return { ok: true, duplicate: true, payment: existing, paidAmount: invoice.paidAmount, status: statusFor(invoice, invoice.paidAmount, invoice.installments) };
  }

  const balance = Math.max(0, Math.round((invoice.netAmount - invoice.paidAmount) * 100) / 100);
  if (amount <= 0 || amount > balance) {
    return { ok: false, duplicate: false, reason: 'amount_over_balance', paidAmount: invoice.paidAmount, status: statusFor(invoice, invoice.paidAmount, invoice.installments) };
  }

  const verifiedAt = receivedAt || new Date().toISOString();
  const payment: PaymentLike = {
    id: `rzp-${normalized}`,
    invoiceId: invoice.id,
    amount,
    paymentDate: verifiedAt.slice(0, 10),
    paymentMethod: 'Razorpay',
    transactionRef: normalized,
    receivedBy: 'Razorpay Webhook',
    receiptNo: `REC-RZP-${normalized.slice(-6)}`,
    status: 'verified',
    verifiedBy: 'Razorpay Webhook',
    verifiedAt
  };

  const paidAmount = Math.round((invoice.paidAmount + amount) * 100) / 100;
  let installments = invoice.installments;
  if (installments && installments.length) {
    installments = allocatePayment(installments, amount, payment.id).installments;
  }
  return {
    ok: true,
    duplicate: false,
    payment,
    paidAmount,
    ...(installments ? { installments } : {}),
    status: statusFor(invoice, paidAmount, installments)
  };
}