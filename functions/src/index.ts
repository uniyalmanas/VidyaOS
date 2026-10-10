/**
 * VidyaOS Cloud Functions — the "paid cloud" backend.
 *
 * ⚠️  REQUIRES the Firebase **Blaze** plan to deploy (Cloud Functions cannot be
 * deployed on Spark). The client app builds and runs WITHOUT this module; these
 * functions only matter once cloud billing is switched on.
 *
 * Deploy:  cd functions && npm install && firebase deploy --only functions
 * Emulate: firebase emulators:start --only functions,firestore,auth
 *
 * Money rule: charging happens only through these servers. The client never
 * grants itself paid entitlements.
 */

import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  parseRzpWebhookEvent,
  reconcileGatewayPayment,
  verifyRazorpaySignature
} from './rzp';

initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const db = getFirestore();

/** Mirrors `FREE_ENTITLEMENTS` in src/lib/entitlements.ts — keep in sync. */
const FREE_ENTITLEMENTS = {
  core: true,
  period: 'free',
  maxStudents: 150,
  maxBranches: 2,
  maxStaff: -1,
  mediaBytesQuota: 1024 * 1024 * 1024, // 1 GB
  messagingCredits: 0,
  pushEnabled: true,
  customBrand: false,
  brandedApp: false,
  videoMinutes: 0,
  aiCredits: 0,
  skus: []
};

/**
 * 1. New organisation → stamp free entitlements + zeroed usage.
 * Self-serve signups get the free tier automatically; paid SKUs are added only
 * by the billing webhook below.
 */
export const onOrgCreated = onDocumentCreated('organizations/{orgId}', async event => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  await snap.ref.set(
    {
      entitlements: data.entitlements ?? FREE_ENTITLEMENTS,
      usage: data.usage ?? {
        mediaBytes: 0,
        messagesSent: 0,
        videoMinutes: 0,
        aiCreditsUsed: 0,
        updatedAt: new Date().toISOString()
      }
    },
    { merge: true }
  );
});

/**
 * 2. Outbound message queue → send WhatsApp/SMS/email, then decrement credits.
 * Provider + secrets are configured at deploy time (Blaze). Left as an
 * intentional stub until a provider is chosen.
 */
export const sendMessage = onDocumentCreated('outboundMessages/{messageId}', async event => {
  const snap = event.data;
  if (!snap) return;
  const { orgId } = snap.data();
  // TODO(blaze): call WhatsApp Cloud API / SMS provider, then:
  await snap.ref.set({ status: 'queued', queuedAt: new Date().toISOString() }, { merge: true });
  if (orgId) {
    await db.doc(`organizations/${orgId}`).set(
      { usage: { messagesSent: FieldValue.increment(1) } },
      { merge: true }
    );
  }
});

/**
 * 3. Push queue → fan out FCM notifications to a user's device tokens.
 * Kept free; only function invocations cost.
 */
export const sendPush = onDocumentCreated('pushQueue/{pushId}', async event => {
  const snap = event.data;
  if (!snap) return;
  await snap.ref.set({ status: 'queued', queuedAt: new Date().toISOString() }, { merge: true });
});

/**
 * 4. Billing webhook → verify the Razorpay signature, then:
 *    - `payment.authorized` / `payment.captured` → auto-reconcile the gateway
 *      payment onto the invoice (same math as the app's recordPaymentAtomically)
 *      and flip the originating payment link to `paid`.
 *    - subscription/order events (org SKU purchases) → grant entitlements
 *      server-side (TODO formula once the cloud store UI ships).
 * Every delivery is journaled to `webhookLog` for ops.
 */
export const billingWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const signature = (req.header('x-razorpay-signature') as string | undefined);
  const secret = process.env.RZP_WEBHOOK_SECRET ?? '';
  const rawBody: Buffer | string = req.rawBody ?? '';

  let event: ReturnType<typeof parseRzpWebhookEvent> = null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    parsed = null;
  }
  if (parsed) event = parseRzpWebhookEvent(parsed);

  const verified = !!event && verifyRazorpaySignature(rawBody, signature, secret);
  const receivedAt = new Date().toISOString();
  const invoiceId = event ? event.notes.invoiceId : undefined;

  // Journal every delivery so reconciliation is auditable and re-runs are visible.
  try {
    await db.collection('webhookLog').add({
      event: event?.event ?? 'unparseable',
      paymentId: event?.paymentId ?? '',
      signature: signature ?? '',
      verified,
      notes: event?.notes ?? {},
      receivedAt
    });
  } catch {
    // A logging failure must never turn into a 500 — Razorpay retries on 5xx.
  }

  if (verified && event && invoiceId) {
    try {
      await db.runTransaction(async txn => {
        const invoiceRef = db.doc(`invoices/${invoiceId}`);
        const snapshot = await txn.get(invoiceRef);
        if (!snapshot.exists) return;
        const invoice = snapshot.data() as unknown as Parameters<typeof reconcileGatewayPayment>[0];
        const result = reconcileGatewayPayment(
          invoice,
          event.paymentId,
          event.amountPaise,
          new Date(event.createdAt ? event.createdAt * 1000 : Date.now()).toISOString()
        );
        if (!result.ok || result.duplicate || !result.payment) return;
        const next: Record<string, unknown> = {
          ...invoice,
          paidAmount: result.paidAmount,
          status: result.status,
          payments: [...(invoice.payments || []), result.payment]
        };
        if (result.installments) next.installments = result.installments;
        txn.set(invoiceRef, next);
        if (typeof event.notes.linkId === 'string') {
          txn.update(db.doc(`paymentLinks/${event.notes.linkId}`), {
            status: 'paid',
            updatedAt: receivedAt
          });
        }
      });
    } catch (error) {
      // Logged above; still 200 — the payment link status makes retries cheap.
      console.error('G5 reconcile failure:', error);
    }
  }

  // 4a. Cloud-store SKU purchase (payment link with notes.sku, no invoice):
  // grant the entitlement on the org, server-side, exactly once per payment.
  // Each SKU is a MONTHLY subscription: the grant carries `skuMeta[sku]` with a
  // `renewsAt` 30 days out. Re-paying for an owned SKU (a renewal) extends the
  // window instead of double-granting; the same paymentId never applies twice.
  if (verified && event && !invoiceId && event.notes.sku) {
    const sku = event.notes.sku;
    const knownSkus = ['media', 'messaging', 'growth', 'brand', 'app', 'video', 'ai', 'pro'];
    try {
      await db.runTransaction(async txn => {
        const orgRef = db.doc(`organizations/${event.notes.orgId}`);
        const snapshot = await txn.get(orgRef);
        if (!snapshot.exists || !knownSkus.includes(sku)) return;
        if (event.amountPaise < 9900) return; // ₹99 floor — underpaid grants nothing
        const data = snapshot.data();
        const current: string[] = Array.isArray(data.entitlements?.skus) ? data.entitlements.skus : [];
        const skuMeta = (data.entitlements?.skuMeta || {}) as Record<string, { since: string; renewsAt: string; lastPaymentId?: string }>;
        const prev = skuMeta[sku];
        // Idempotency: a retried delivery of the same payment must not extend twice.
        if (prev && prev.lastPaymentId === event.paymentId) return;

        const since = prev?.since || receivedAt;
        // Renewal extends from the later of (now, previous expiry) so the billing
        // cycle stays continuous; first grant counts from today.
        const baseMs = prev?.renewsAt ? Math.max(new Date(receivedAt).getTime(), new Date(prev.renewsAt).getTime()) : new Date(receivedAt).getTime();
        const renewsAt = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();

        txn.update(orgRef, {
          entitlements: {
            ...(data.entitlements || {}),
            skus: current.includes(sku) ? current : [...current, sku],
            skuMeta: {
              ...skuMeta,
              [sku]: { since, renewsAt, lastPaymentId: event.paymentId }
            },
            period: 'active'
          }
        });
        if (typeof event.notes.linkId === 'string') {
          txn.update(db.doc(`paymentLinks/${event.notes.linkId}`), {
            status: 'paid',
            updatedAt: receivedAt
          });
        }
      });
    } catch (error) {
      console.error('G5 sku grant failure:', error);
    }
  }

  res.status(200).json({ received: true, verified });
});

/**
 * 4b. Payment-link requests → call Razorpay, store the returned URL.
 * Reads `paymentLinks/{id}` requests (client writes them), creates the link on
 * Razorpay when `RZP_KEY_ID`/`RZP_KEY_SECRET` are configured, and writes the
 * short URL back so the collect-fee modal can open it. Until then the request
 * stays `requested` and the UPI/UTR fallback carries the flow.
 */
export const createPaymentLink = onDocumentCreated('paymentLinks/{linkId}', async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const link = snapshot.data();
  if (link.status !== 'requested') return;

  const keyId = process.env.RZP_KEY_ID ?? '';
  const keySecret = process.env.RZP_KEY_SECRET ?? '';
  if (!keyId || !keySecret) {
    // Cloud billing not configured yet — leave the link queued.
    return;
  }

  const project = process.env.GCLOUD_PROJECT ?? 'vidyut-2bcb6';
  const callbackUrl = `https://${project}.web.app/?rzp_invoice=${encodeURIComponent(String(link.invoiceId))}`;
  const body = {
    amount: link.amountPaise,
    currency: 'INR',
    accept_partial: false,
    description: link.notes?.invoiceNo
      ? `VidyaOS fee — ${String(link.notes.invoiceNo)}`
      : 'VidyaOS fee payment',
    customer: {
      name: link.customerName || 'VidyaOS Parent',
      ...(link.customerPhone ? { contact: String(link.customerPhone) } : {}),
      ...(link.customerEmail ? { email: String(link.customerEmail) } : {})
    },
    notes: { source: 'vidyaos', ...(link.notes || {}), linkId: event.params.linkId },
    callback_url: callbackUrl,
    callback_method: 'get',
    notify: { sms: false, email: false }
  };

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  let response: Response;
  try {
    response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    await snapshot.ref.set(
      { status: 'failed', error: String(error).slice(0, 400), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return;
  }

  if (!response.ok) {
    const text = await response.text();
    await snapshot.ref.set(
      { status: 'failed', error: text.slice(0, 400), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return;
  }

  const created = (await response.json()) as Record<string, unknown>;
  await snapshot.ref.set(
    {
      status: 'created',
      rzpLinkId: typeof created.id === 'string' ? created.id : '',
      url: typeof created.short_url === 'string' ? created.short_url : '',
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
});

/**
 * 5. Nightly usage rollup → recompute per-org media bytes / messages from the
 * raw usage events so quota enforcement stays accurate.
 */
export const rollupUsage = onSchedule('every 24 hours', async () => {
  // TODO(blaze): aggregate usage events into organizations/{orgId}.usage.
});
