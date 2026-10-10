/**
 * G3 — message credit metering (pure). No Firebase import, so the node
 * test-runner exercises the math directly.
 *
 * Model: `Entitlements.messagingCredits` is a MONTHLY budget. The client keeps
 * a monthly window on `OrgUsage.messagesThisMonth` (YYYY-MM + count) for
 * fair-use enforcement until the `sendMessage` Function owns metering on Blaze;
 * `OrgUsage.messagesSent` remains the all-time counter.
 */
import { Entitlements, MessageChannel, MessageTemplateId, OrgUsage } from '../types';
import { isUnlimited } from './entitlements';
import { CHANNEL_META, getMessageTemplate } from './messageTemplates';

/** Local-time YYYY-MM string used as the fair-use window key. */
export function currentYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Messages consumed inside the given month window (0 when the window is stale). */
export function messageUsageThisMonth(usage: OrgUsage | undefined, yearMonth: string): number {
  if (!usage?.messagesThisMonth) return 0;
  return usage.messagesThisMonth.yearMonth === yearMonth ? usage.messagesThisMonth.count : 0;
}

/**
 * Derive the next OrgUsage after one more queued message: all-time counter
 * increments forever; the monthly window rolls over when the month changes and
 * otherwise advances by the message's credit cost (channel-weighted). Returns a
 * COMPLETE OrgUsage (no field loss on write).
 */
export function bumpMessageUsage(
  usage: OrgUsage | undefined,
  yearMonth: string,
  now: Date = new Date(),
  credits: number = 1
): OrgUsage {
  return {
    mediaBytes: usage?.mediaBytes ?? 0,
    messagesSent: (usage?.messagesSent ?? 0) + 1,
    videoMinutes: usage?.videoMinutes ?? 0,
    aiCreditsUsed: usage?.aiCreditsUsed ?? 0,
    updatedAt: now.toISOString(),
    messagesThisMonth: {
      yearMonth,
      count: messageUsageThisMonth(usage, yearMonth) + credits
    }
  };
}

/** Remaining monthly credits; Infinity when unlimited. */
export function remainingMessageCredits(
  ent: Entitlements,
  usage: OrgUsage | undefined,
  yearMonth?: string
): number {
  if (isUnlimited(ent.messagingCredits)) return Infinity;
  const used = messageUsageThisMonth(usage, yearMonth ?? currentYearMonth());
  return Math.max(0, ent.messagingCredits - used);
}

export interface MessageCreditCheck {
  allowed: boolean;
  remaining: number;
}

/**
 * Can this org send one more automated message right now? `cost` is the
 * channel-weighted credit cost of the message being attempted (default 1).
 */
export function canSendMessage(
  ent: Entitlements,
  usage: OrgUsage | undefined,
  yearMonth?: string,
  cost: number = 1
): MessageCreditCheck {
  const remaining = remainingMessageCredits(ent, usage, yearMonth);
  return { allowed: remaining >= cost, remaining };
}

/**
 * How many credits one message of this channel consumes. WhatsApp is the
 * pricey channel: utility templates cost the base 2 credits, marketing
 * templates (broadcasts) cost 4 to stay above Meta's ₹0.86/msg COGS.
 */
export function estimateCreditCost(channel: MessageChannel, templateId?: MessageTemplateId | 'custom'): number {
  const base = CHANNEL_META[channel]?.creditCost ?? 1;
  if (channel !== 'whatsapp') return base;
  const template = templateId && templateId !== 'custom' ? getMessageTemplate(templateId) : undefined;
  return template?.whatsappCategory === 'marketing' ? MARKETING_CREDIT_COST : base;
}

/** Credit cost of a WhatsApp marketing (broadcast) message. */
export const MARKETING_CREDIT_COST = 4;