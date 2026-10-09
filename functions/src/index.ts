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
 * 4. Billing webhook → verify signature, map the subscription to entitlements.
 * Provider-agnostic on purpose; wire Razorpay/Cashfree when chosen.
 */
export const billingWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  // TODO(blaze): verify provider signature, resolve orgId + SKU, then set
  // organizations/{orgId}.entitlements.skus + period on the server.
  res.status(200).json({ received: true });
});

/**
 * 5. Nightly usage rollup → recompute per-org media bytes / messages from the
 * raw usage events so quota enforcement stays accurate.
 */
export const rollupUsage = onSchedule('every 24 hours', async () => {
  // TODO(blaze): aggregate usage events into organizations/{orgId}.usage.
});
