/**
 * G5 — Razorpay payment links & webhook auto-reconciliation (pure).
 *
 * No Firebase imports, so the identical math runs in the browser, in the node
 * test-runner, and (as a mirrored copy) inside Cloud Functions. The mirror
 * lives at `functions/src/rzp.ts` — keep the two in sync.
 *
 * Reconciliation mirrors `recordPaymentAtomically` in firestoreService.ts:
 * balance check → instalment allocation → status derive. The gateway payment
 * is treated as already-verified (Razorpay has the money), so the admin never
 * touches a UTR for gateway payments — that is the auto-reconcile win.
 *
 * Manual UPI/UTR stays the zero-fee fallback and is untouched by this module.
 */
import { FeeInvoice, PaymentRecord, RazorpayPaymentLink } from '../types';
import {
  allocatePayment,
  invoiceStatusFromInstallments,
  nextPaymentDueAmount,
  round2
} from './installments';

/** Razorpay webhook events that mean "money actually arrived". */
export const RZP_WEBHOOK_PAYMENT_EVENTS = ['payment.authorized', 'payment.captured'] as const;

/** ₹ → integer paise (Razorpay API amounts are in paise). */
export function rzpAmountToPaise(amountInr: number): number {
  return Math.round((Number.isFinite(amountInr) ? amountInr : 0) * 100);
}

/** Paise → ₹. */
export function rzpPaiseToAmount(paise: number): number {
  return round2((Number.isFinite(paise) ? paise : 0) / 100);
}

export interface RzpCustomer {
  name: string;
  contact?: string;
  email?: string;
}

export interface RzpPaymentLinkRequest {
  amount: number;
  currency: 'INR';
  accept_partial: false;
  description: string;
  customer: { name: string; contact?: string; email?: string };
  notes: Record<string, string>;
  callback_url?: string;
  callback_method: 'get';
  expire_by?: number;
  notify: { sms: boolean; email: boolean };
}

export interface BuildLinkOptions {
  /** Override the amount (default: the next due amount on the invoice). */
  amountInr?: number;
  customer?: RzpCustomer;
  callbackUrl?: string;
  expireBy?: number;
  extraNotes?: Record<string, string>;
}

/**
 * Build the exact body Razorpay's POST /v1/payment_links accepts. The notes
 * carry the reconciliation keys (orgId + invoiceId + invoiceNo) so the webhook
 * can map the payment back to the invoice without any guesswork.
 */
export function buildPaymentLinkRequest(
  invoice: Pick<FeeInvoice, 'id' | 'orgId' | 'invoiceNo' | 'title' | 'studentId' | 'netAmount' | 'paidAmount' | 'installments' | 'dueDate'>,
  opts: BuildLinkOptions = {}
): RzpPaymentLinkRequest {
  const amount = rzpAmountToPaise(opts.amountInr ?? nextPaymentDueAmount(invoice));
  const notes = {
    source: 'vidyaos',
    orgId: invoice.orgId,
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    studentId: invoice.studentId,
    ...opts.extraNotes
  };
  const request: RzpPaymentLinkRequest = {
    amount,
    currency: 'INR',
    accept_partial: false,
    description: `VidyaOS fee — ${invoice.invoiceNo} (${invoice.title})`,
    customer: {
      name: opts.customer?.name || 'VidyaOS Parent',
      ...(opts.customer?.contact ? { contact: opts.customer.contact } : {}),
      ...(opts.customer?.email ? { email: opts.customer.email } : {})
    },
    notes,
    ...(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}),
    callback_method: 'get',
    ...(opts.expireBy ? { expire_by: opts.expireBy } : {}),
    notify: { sms: false, email: false }
  };
  return request;
}

export interface RzpWebhookData {
  event: string;
  /** Razorpay payment id (also used as the idempotency key / UTR). */
  paymentId: string;
  orderId?: string;
  amountPaise: number;
  currency?: string;
  method?: string;
  notes: Record<string, string>;
  createdAt?: number;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * Normalize a Razorpay webhook body (payment.authorized / payment.captured)
 * into the fields we reconcile on. Returns null when the payload is not a
 * payment event or is malformed.
 */
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
  const notes = toRecord(entity.notes) as Record<string, string>;
  return {
    event,
    paymentId,
    orderId: typeof entity.order_id === 'string' ? entity.order_id : undefined,
    amountPaise: Math.round(Number.isFinite(amount) ? amount : 0),
    currency: typeof entity.currency === 'string' ? entity.currency : undefined,
    method: typeof entity.method === 'string' ? entity.method : undefined,
    notes,
    createdAt: typeof entity.created_at === 'number' ? entity.created_at : undefined
  };
}

export type GatewayReconcileReason = 'amount_over_balance';

export type GatewayReconcileResult =
  | { ok: true; payment: PaymentRecord; nextInvoice: FeeInvoice; duplicate: boolean }
  | { ok: false; reason: GatewayReconcileReason };

export interface ReconcileGatewayInput {
  invoice: FeeInvoice;
  /** Razorpay payment id — acts as the UTR/idempotency key. */
  paymentId: string;
  amountPaise: number;
  method?: string;
  /** ISO timestamp of settlement; defaults to now. */
  receivedAt?: string;
  /** Human label for `receivedBy`; defaults to the gateway. */
  receivedBy?: string;
}

/**
 * Decide what a gateway webhook payment means for this invoice — WITHOUT
 * touching Firestore. The browser uses it to preview/optimistically reconcile;
 * the Cloud Function uses the same math in a transaction to make it final.
 * Duplicate deliveries return `ok: true, duplicate: true` so re-fired webhooks
 * are idempotent, not errors.
 */
export function reconcileGatewayPayment(input: ReconcileGatewayInput): GatewayReconcileResult {
  const { invoice } = input;
  const amount = rzpPaiseToAmount(input.amountPaise);
  const paymentId = input.paymentId.trim();

  const existing = (invoice.payments || []).find(
    p => p.transactionRef.trim().toLowerCase() === paymentId.toLowerCase()
  );
  if (existing) {
    return { ok: true, payment: existing, nextInvoice: invoice, duplicate: true };
  }

  const balance = Math.max(0, round2(invoice.netAmount - invoice.paidAmount));
  if (amount <= 0 || amount > balance) {
    return { ok: false, reason: 'amount_over_balance' };
  }

  const settledAt = input.receivedAt || new Date().toISOString();
  const payment: PaymentRecord = {
    id: `rzp-${paymentId}`,
    invoiceId: invoice.id,
    amount,
    paymentDate: settledAt.slice(0, 10),
    paymentMethod: 'Razorpay',
    transactionRef: paymentId,
    receivedBy: input.receivedBy || 'Razorpay Webhook',
    receiptNo: `REC-RZP-${String(paymentId).slice(-6)}`,
    status: 'verified',
    verifiedBy: input.receivedBy || 'Razorpay Webhook',
    verifiedAt: settledAt
  };

  const paidAmount = round2(invoice.paidAmount + amount);
  let installments = invoice.installments;
  let status: FeeInvoice['status'];
  if (installments && installments.length) {
    const allocation = allocatePayment(installments, amount, payment.id);
    installments = allocation.installments;
    status = invoiceStatusFromInstallments(installments);
  } else {
    status = paidAmount >= invoice.netAmount ? 'paid' : 'partially_paid';
  }

  const nextInvoice: FeeInvoice = {
    ...invoice,
    paidAmount,
    ...(installments ? { installments } : {}),
    status,
    payments: [...(invoice.payments || []), payment]
  };
  return { ok: true, payment, nextInvoice, duplicate: false };
}

/** Human label for a Razorpay method code, e.g. 'upi' → 'UPI'. */
export function rzpMethodLabel(method?: string): string {
  const map: Record<string, string> = {
    upi: 'UPI',
    card: 'Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    banktransfer: 'Bank Transfer',
    paylater: 'Pay Later'
  };
  if (!method) return 'Gateway';
  return map[method.toLowerCase()] || method;
}

/** Convenience: wraps a fulfilled link in the status the UI hangs off. */
export function paymentLinkStatusOf(link: RazorpayPaymentLink): RazorpayPaymentLink['status'] {
  return link.status;
}