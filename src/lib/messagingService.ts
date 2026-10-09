/**
 * G3 — outbound messaging queue writer.
 *
 * Enqueues a composed message into `outboundMessages` (status `queued`) and
 * bumps the org's usage meter. The `sendMessage` Cloud Function (Blaze) is the
 * delivery path; until it's live, messages sit in the queue with a local
 * fair-use check so no free org over-sends. Write failures degrade gracefully —
 * the UI shows a toast and nothing breaks.
 */
import { Entitlements, MessageChannel, MessageTemplateId, OrgUsage, OutboundMessage } from '../types';
import { db, doc, setDoc, updateDoc } from './firebase';
import { CHANNEL_META } from './messageTemplates';
import {
  bumpMessageUsage,
  canSendMessage,
  currentYearMonth,
  estimateCreditCost,
  remainingMessageCredits
} from './messagingUtils';

export interface OutboundDraft {
  channel: MessageChannel;
  templateId: MessageTemplateId | 'custom';
  toName?: string;
  toPhone?: string;
  toEmail?: string;
  subject?: string;
  body: string;
}

export type EnqueueError = 'quota' | 'write' | 'invalid';

export interface EnqueueResult {
  ok: boolean;
  message?: OutboundMessage;
  remaining?: number;
  error?: EnqueueError;
}

export interface EnqueueOptions {
  entitlements?: Entitlements;
  usage?: OrgUsage;
  now?: Date;
}

/**
 * Queue one automated message and (optionally) enforce + update the monthly
 * credit window. When entitlements are supplied and the window is exhausted the
 * message is NOT queued and `error: 'quota'` is returned.
 */
export async function enqueueOutboundMessage(
  orgId: string,
  draft: OutboundDraft,
  opts: EnqueueOptions = {}
): Promise<EnqueueResult> {
  if (!orgId || !draft?.body?.trim()) return { ok: false, error: 'invalid' };

  const now = opts.now || new Date();
  const month = currentYearMonth(now);
  const usage = opts.usage;

  if (opts.entitlements) {
    const check = canSendMessage(opts.entitlements, usage, month);
    if (!check.allowed) return { ok: false, error: 'quota', remaining: check.remaining };
  }

  const creditCost = estimateCreditCost(draft.channel);
  const message: OutboundMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    channel: draft.channel,
    templateId: draft.templateId,
    toName: draft.toName,
    toPhone: draft.toPhone,
    toEmail: draft.toEmail,
    subject: draft.subject,
    body: draft.body,
    status: 'queued',
    creditCost,
    provider: CHANNEL_META[draft.channel]?.provider ?? 'email',
    createdAt: now.toISOString()
  };

  try {
    await setDoc(doc(db, 'outboundMessages', message.id), message);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('VidyaOS messaging: could not queue message.', error);
    return { ok: false, error: 'write' };
  }

  let remaining: number | undefined;
  try {
    const nextUsage = bumpMessageUsage(usage, month, now);
    await updateDoc(doc(db, 'organizations', orgId), { usage: nextUsage });
    if (opts.entitlements) {
      remaining = remainingMessageCredits(opts.entitlements, nextUsage, month);
    }
  } catch (error) {
    // The message is queued; server-side metering will reconcile the counter.
    if (import.meta.env.DEV) console.warn('VidyaOS messaging: queued, but the usage meter could not be updated.', error);
  }

  return { ok: true, message, remaining };
}