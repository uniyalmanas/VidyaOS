/**
 * Cloud store — the "free software, paid cloud" storefront + cost guardrail.
 *
 * Pure and dependency-free (same philosophy as `lib/programs.ts` / `lib/rzp.ts`):
 * the identical math runs in the browser (the cloud tab) and in the node
 * test-runner. Nothing here touches Firestore.
 *
 * Store model, in plain words:
 *   - the core ERP is free forever;
 *   - institutes buy SKUs from the store (Cloud Media, Messaging, Brand, App,
 *     Video, AI, Pro bundle) via Razorpay payment links;
 *   - the cost guardrail turns entitlements + metered usage into the little
 *     "used vs quota" board the admin sees, plus an estimated monthly bill.
 */
import { CloudSkuId, Entitlements, OrgUsage } from '../types';
import {
  CloudSku,
  CLOUD_SKUS,
  emptyUsage,
  formatBytes,
  getCloudSku,
  isQuotaExceeded,
  isUnlimited,
  quotaPct
} from './entitlements';
import { rzpAmountToPaise } from './rzp';
import { currentYearMonth } from './messagingUtils';

export type CloudMeterKey = 'media' | 'messages' | 'video' | 'ai';
export type CloudMeterTone = 'ok' | 'warn' | 'over' | 'empty';

export interface CloudMeterRow {
  key: CloudMeterKey;
  label: string;
  usedLabel: string;
  quotaLabel: string;
  /** 0–100 bar width (0 when unlimited / zero-quota). */
  pct: number;
  tone: CloudMeterTone;
  note: string;
}

export const CLOUD_METER_META: Record<CloudMeterKey, { label: string; unit: string }> = {
  media: { label: 'Media Storage', unit: 'bytes' },
  messages: { label: 'Auto Messages', unit: 'credits' },
  video: { label: 'Video Minutes', unit: 'min' },
  ai: { label: 'AI Credits', unit: 'credits' }
};

/** Messages metered in the current YYYY-MM window (the queue's fair-use unit). */
function windowMessageCount(usage: OrgUsage): number {
  const window = usage.messagesThisMonth;
  if (window && window.yearMonth === currentYearMonth()) return window.count;
  return usage.messagesSent || 0;
}

/**
 * The cost-guardrail board: one row per metered cloud resource, with the used /
 * quota labels, bar width and tone the dashboard reads. A free org (quota 0)
 * row is tone `empty` so the UI can prompt "add the SKU to raise this".
 */
export function usageBoard(
  ent: Entitlements,
  usage: OrgUsage | null | undefined
): CloudMeterRow[] {
  const u = usage || emptyUsage();
  const built: Array<{ key: CloudMeterKey; used: number; quota: number }> = [
    { key: 'media', used: u.mediaBytes || 0, quota: ent.mediaBytesQuota },
    { key: 'messages', used: windowMessageCount(u), quota: ent.messagingCredits },
    { key: 'video', used: u.videoMinutes || 0, quota: ent.videoMinutes },
    { key: 'ai', used: u.aiCreditsUsed || 0, quota: ent.aiCredits }
  ];

  return built.map(({ key, used, quota }) => {
    const meta = CLOUD_METER_META[key];
    const pct = quotaPct(quota, used);
    const usedLabel = meta.unit === 'bytes' ? formatBytes(used) : String(used);
    const quotaLabel = isUnlimited(quota)
      ? 'Unlimited'
      : meta.unit === 'bytes'
        ? formatBytes(quota)
        : `${quota} ${meta.unit}`;

    let tone: CloudMeterTone;
    let note: string;
    if (quota === 0) {
      tone = 'empty';
      note = 'Free tier — add the SKU to raise this';
    } else if (isQuotaExceeded(quota, used)) {
      tone = 'over';
      note = 'Over the paid cap';
    } else if (pct >= 80) {
      tone = 'warn';
      note = 'Nearing the cap';
    } else {
      tone = 'ok';
      note = 'On track';
    }

    return {
      key,
      label: meta.label,
      usedLabel,
      quotaLabel,
      pct,
      tone,
      note
    };
  });
}

/** Estimated monthly cloud spend = list price of every purchased SKU. */
export function estimatedMonthlyCloudCost(ent: Entitlements): number {
  return ent.skus.reduce((sum, id) => {
    const sku = getCloudSku(id);
    return sum + (sku ? sku.priceMonthly : 0);
  }, 0);
}

/** One-line "what this SKU grants" for the storefront card. */
export function skuGrantLabel(sku: CloudSku): string {
  const g = sku.grants;
  if (g.messagingCredits && g.messagingCredits > 0) {
    return `${g.messagingCredits.toLocaleString('en-IN')} message credits / month`;
  }
  if (g.videoMinutes && g.videoMinutes > 0) {
    return `${g.videoMinutes.toLocaleString('en-IN')} video minutes / month`;
  }
  if (g.aiCredits && g.aiCredits > 0) {
    return `${g.aiCredits.toLocaleString('en-IN')} AI credits / month`;
  }
  if (g.mediaBytesQuota && g.mediaBytesQuota > 0) {
    return `${formatBytes(g.mediaBytesQuota)} media storage`;
  }
  if (g.brandedApp) return 'Play-Store Android app under your brand';
  if (g.customBrand) return 'Your logo, colours & custom domain';
  return 'Cloud add-on';
}

export interface SkuCustomer {
  name?: string;
  contact?: string;
  email?: string;
}

export interface SkuPurchaseRequest {
  amount: number;
  currency: 'INR';
  accept_partial: false;
  description: string;
  customer: { name: string; contact?: string; email?: string };
  notes: { source: 'vidyaos'; orgId: string; sku: string };
  callback_url?: string;
  callback_method: 'get';
  notify: { sms: boolean; email: boolean };
}

export interface BuildSkuOptions {
  customer?: SkuCustomer;
  callbackUrl?: string;
}

/**
 * Build the Razorpay payment-link body for one SKU purchase. Notes carry
 * `sku` + `orgId` so the billingWebhook grants the entitlement server-side.
 * Returns null for an unknown SKU id.
 */
export function buildSkuPurchaseLinkRequest(
  orgId: string,
  skuId: CloudSkuId,
  opts: BuildSkuOptions = {}
): SkuPurchaseRequest | null {
  const sku = getCloudSku(skuId);
  if (!sku) return null;
  return {
    amount: rzpAmountToPaise(sku.priceMonthly),
    currency: 'INR',
    accept_partial: false,
    description: `VidyaOS ${sku.name} — monthly cloud add-on`,
    customer: {
      name: opts.customer?.name || 'VidyaOS Institute',
      ...(opts.customer?.contact ? { contact: opts.customer.contact } : {}),
      ...(opts.customer?.email ? { email: opts.customer.email } : {})
    },
    notes: { source: 'vidyaos', orgId, sku: skuId },
    ...(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}),
    callback_method: 'get',
    notify: { sms: false, email: false }
  };
}

/** All purchasable SKUs in store order (bundle last). */
export function storeCatalog(): CloudSku[] {
  const singles = CLOUD_SKUS.filter(sku => sku.id !== 'pro');
  const bundle = CLOUD_SKUS.find(sku => sku.id === 'pro');
  return bundle ? [...singles, bundle] : singles;
}