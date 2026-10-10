/**
 * VidyaOS cloud entitlements & usage metering — "free software, paid cloud".
 *
 * The core ERP is free forever. Institutes pay only for things that cost us
 * money to run in the cloud: media storage, automated WhatsApp/SMS/email,
 * a custom brand, a branded app, hosted video and AI credits.
 *
 * Pure and dependency-free (same philosophy as `lib/programs.ts`): the identical
 * math runs in the browser, in the node test-runner, and in Cloud Functions.
 *
 * NOTE: Cloud Functions keep their own copy of `FREE_ENTITLEMENTS`
 * (`functions/src/index.ts`) because they compile separately. Keep them in sync.
 */

import { CloudSkuId, Entitlements, Organization, OrgUsage } from '../types';

/** Sentinel for "no cap". */
export const UNLIMITED = -1;

const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

/** What every institute gets, forever, for free. No card required. */
export const FREE_ENTITLEMENTS: Entitlements = {
  core: true,
  period: 'free',
  maxStudents: 150,
  maxBranches: 2,
  maxStaff: UNLIMITED,
  mediaBytesQuota: 1 * GB,
  messagingCredits: 0,
  pushEnabled: true, // FCM itself is free — keep push free for retention
  customBrand: false,
  brandedApp: false,
  videoMinutes: 0,
  aiCredits: 0,
  skus: []
};

export interface CloudSku {
  id: CloudSkuId;
  name: string;
  tagline: string;
  /** Indicative INR list price per month; billing provider owns the truth. */
  priceMonthly: number;
  /** Entitlement delta applied when this SKU is active. */
  grants: Partial<Entitlements>;
}

/** The paid cloud store. Add SKUs here — never gate the core ERP. */
export const CLOUD_SKUS: CloudSku[] = [
  {
    id: 'media',
    name: 'Cloud Media',
    tagline: 'Extra photo & file storage for students, staff and receipts',
    priceMonthly: 99,
    grants: { mediaBytesQuota: 10 * GB }
  },
  {
    id: 'messaging',
    name: 'Cloud Messaging',
    tagline: 'Automated WhatsApp + SMS + email to parents',
    // ₹699, not ₹499: covers MSG91's ₹500/mo WhatsApp platform fee per number
    // plus a per-message cushion. Credits are channel-weighted (see CHANNEL_META
    // in lib/messageTemplates.ts) so WhatsApp marketing traffic can't undercut COGS.
    priceMonthly: 699,
    grants: { messagingCredits: 1000, pushEnabled: true }
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'More students & branches for larger centers',
    priceMonthly: 299,
    grants: { maxStudents: 500, maxBranches: 10 }
  },
  {
    id: 'brand',
    name: 'Brand Cloud',
    tagline: 'Your logo, colours and a custom domain',
    priceMonthly: 499,
    grants: { customBrand: true }
  },
  {
    id: 'app',
    name: 'App Cloud',
    tagline: 'A Play-Store Android app under your brand',
    priceMonthly: 999,
    grants: { brandedApp: true }
  },
  {
    id: 'video',
    name: 'Video Cloud',
    tagline: 'Hosted lectures with secure streaming',
    priceMonthly: 999,
    grants: { videoMinutes: 1200 }
  },
  {
    id: 'ai',
    name: 'AI Credits',
    tagline: 'Gemini doubt-solving, quiz generation and at-risk flags',
    priceMonthly: 299,
    grants: { aiCredits: 500 }
  },
  {
    id: 'pro',
    name: 'Cloud Pro (bundle)',
    tagline: 'Everything in the cloud store',
    priceMonthly: 1999,
    grants: {
      maxStudents: UNLIMITED,
      maxBranches: UNLIMITED,
      mediaBytesQuota: 25 * GB,
      messagingCredits: 3000,
      pushEnabled: true,
      customBrand: true,
      brandedApp: true,
      videoMinutes: 1200,
      aiCredits: 2000
    }
  }
];

export function getCloudSku(id: CloudSkuId): CloudSku | undefined {
  return CLOUD_SKUS.find(sku => sku.id === id);
}

/**
 * Resolve the effective entitlements for an org:
 *   free base → legacy tier caps → explicit overrides → purchased SKU grants.
 *
 * SKU lifecycle: a SKU whose `skuMeta[id].renewsAt` has passed no longer grants
 * (the org falls back to free for that meter until it renews). SKUs with no
 * meta entry are grandfathered — treated as active forever — so pre-billing
 * data and demo orgs are never silently stripped.
 */
export function resolveEntitlements(org: Partial<Organization> | null | undefined): Entitlements {
  const base: Entitlements = { ...FREE_ENTITLEMENTS, skus: [] };

  // Legacy pre-cloud orgs stored caps directly on the organisation.
  if (org?.maxStudents && org.maxStudents > 0) base.maxStudents = org.maxStudents;
  if (org?.maxBranches && org.maxBranches > 0) base.maxBranches = org.maxBranches;

  const overrides: Partial<Entitlements> = org?.entitlements || {};
  const merged: Entitlements = {
    ...base,
    ...overrides,
    skus: [...(overrides.skus || [])]
  };

  // Drop expired SKUs (meta present + renewsAt passed). Grandfathered SKUs
  // (no meta) stay active.
  const now = Date.now();
  const meta = (overrides.skuMeta || {}) as Record<CloudSkuId, { since: string; renewsAt: string; lastPaymentId?: string }>;
  const activeSkus = merged.skus.filter(id => {
    const entry = meta[id];
    if (!entry?.renewsAt) return true; // grandfathered one-time grant
    return new Date(entry.renewsAt).getTime() > now;
  });

  merged.skus = activeSkus;
  // Carry renewal meta through so the UI can show "renews on <date>" / expired.
  merged.skuMeta = meta;

  // Apply each purchased SKU's grants on top of the resolved base.
  for (const id of merged.skus) {
    const sku = getCloudSku(id);
    if (sku) Object.assign(merged, sku.grants);
  }
  if (merged.skus.length > 0 && merged.period === 'free') merged.period = 'active';
  // A fully-expired SKU set rolls the org back to the free period.
  if (merged.skus.length === 0 && overrides.period === 'active') {
    merged.period = 'free';
  }

  return merged;
}

/** Monthly billing period for one SKU grant (30 days). */
export const SKU_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** ISO date `periods` SKU-months after `since` (defaults to one renewal). */
export function skuRenewsAt(sinceIso: string, periods: number = 1): string {
  return new Date(new Date(sinceIso).getTime() + periods * SKU_PERIOD_MS).toISOString();
}

/** Next renewal date for a SKU, or null when the SKU is not owned. */
export function skuNextRenewal(ent: Entitlements, id: CloudSkuId): string | null {
  return ent.skuMeta?.[id]?.renewsAt ?? null;
}

/** True when the org holds a SKU that has not expired. */
export function isSkuActive(ent: Entitlements, id: CloudSkuId): boolean {
  if (!hasSku(ent, id)) return false;
  const meta = ent.skuMeta?.[id];
  if (!meta?.renewsAt) return true; // grandfathered
  return new Date(meta.renewsAt).getTime() > Date.now();
}

/** True when the org has a given cloud SKU (Cloud Pro satisfies any SKU). */
export function hasSku(ent: Entitlements, id: CloudSkuId): boolean {
  if (ent.skus.includes(id)) return true;
  return id !== 'pro' && ent.skus.includes('pro');
}

// ---------------------------------------------------------------------------
// Quota helpers
// ---------------------------------------------------------------------------

export function isUnlimited(quota: number): boolean {
  return quota === UNLIMITED;
}

export function remainingQuota(quota: number, used: number): number {
  return isUnlimited(quota) ? Infinity : Math.max(0, quota - used);
}

export function isQuotaExceeded(quota: number, used: number): boolean {
  return !isUnlimited(quota) && used > quota;
}

/** 0–100 for progress bars; unlimited → 0. */
export function quotaPct(quota: number, used: number): number {
  if (isUnlimited(quota) || quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

/** Can this org admit one more student? */
export function withinStudentCap(ent: Entitlements, currentStudents: number): boolean {
  return isUnlimited(ent.maxStudents) || currentStudents < ent.maxStudents;
}

export function emptyUsage(): OrgUsage {
  return { mediaBytes: 0, messagesSent: 0, videoMinutes: 0, aiCreditsUsed: 0, updatedAt: '' };
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const i = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  const exact = i === 0 || value >= 10 || Number.isInteger(value);
  return `${exact ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[i]}`;
}

/** A short, human list of what this org has (for the paywall / account page). */
export function entitlementSummary(ent: Entitlements): string[] {
  const lines: string[] = [];
  lines.push(ent.maxStudents === UNLIMITED ? 'Unlimited students' : `${ent.maxStudents} students`);
  lines.push(ent.maxBranches === UNLIMITED ? 'Unlimited branches' : `${ent.maxBranches} branches`);
  lines.push(`${formatBytes(ent.mediaBytesQuota)} media`);
  if (ent.messagingCredits > 0) lines.push(`${ent.messagingCredits} message credits`);
  if (ent.customBrand) lines.push('Custom brand & domain');
  if (ent.brandedApp) lines.push('Branded Android app');
  if (ent.videoMinutes > 0) lines.push(`${ent.videoMinutes} video minutes`);
  if (ent.aiCredits > 0) lines.push(`${ent.aiCredits} AI credits`);
  return lines;
}
