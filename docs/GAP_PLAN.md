# VidyaOS — Cloud Monetization Model + Gap-Closure Roadmap

_status: proposed. Two parts: (A) the business model the owner proposed, hardened; (B) the
engineering plan to close the competitive gaps identified vs Classplus._

> **One line:** VidyaOS software is **free forever**; institutes pay only when they use the
> **cloud** — their photos, their messages, their own branded app, their video.

This plan deliberately **reverses the old "no billing / no Cloud Storage" constraint**. That
constraint was right while the product had no revenue. Now cloud *is* the product's revenue, so
we turn on Firebase Blaze, Cloud Functions, Storage, FCM and a billing provider — on purpose.

---

## Part A — Business model: "Free software, paid cloud"

### A1. Why the idea works

- **Zero friction to adopt.** Price is the #1 objection for a Tier-2/3 tuition centre. "Free
  forever, no card" removes it entirely and lets us out-distribute incumbents on signups.
- **The paid things map to real marginal cost.** Storage, egress, outbound WhatsApp/SMS, push
  infrastructure, app packaging and Play Store distribution all cost *us* money per institute.
  Charging for exactly those is honest and hard to argue with.
- **Transparent, defensible story:** "The software is free. You pay only when you use our
  servers — your photos, your messages, your app."

### A2. The three traps (and the fixes)

1. **Storage alone is too thin.** Firebase Storage is ~$0.026/GB-mo + ~$0.12/GB egress. 500
   students × a 50 KB photo ≈ 25 MB ≈ a fraction of a rupee. **Fix: never sell "GB" as the
   headline.** Sell *outcomes* — a branded app, automated parent WhatsApp, video lectures — and
   meter storage only as a fair-use limit inside those.
2. **"Free everything" is not free for us.** Firestore reads/writes, function invocations and
   notifications also cost money. A few whale institutes doing heavy attendance/exam traffic
   could exceed their revenue. **Fix: per-tenant metering + fair-use caps + auto-throttle**
   (Part B, Phase 0) so a free tenant can never cost more than a small budget.
3. **You can't easily raise the core price later.** If all ERP is free, you can't re-price it.
   **Fix: keep the core free by design, and make the cloud add-ons a permanent store** you can
   add SKUs to forever (messaging, app, video, AI, extra branches).

### A3. The entitlement model

Extend the already-present `Organization.planId` / `subscriptionStatus` fields into an
**entitlements** object on the org doc:

```ts
interface Entitlements {
  // Free-forever core (no card)
  core: true;
  maxStudents: number | 'unlimited';     // free: generous soft cap
  maxBranches: number;
  maxStaff: number;
  // Cloud add-ons
  mediaBytesQuota: number;               // photos / files
  messagingCredits: number;              // WhatsApp + SMS + email
  pushEnabled: boolean;
  customBrand: boolean;                  // logo, colours, custom domain
  brandedApp: boolean;                   // Play Store app
  videoMinutes: number;                  // lecture hosting
  aiCredits: number;                     // Gemini suite
  // Lifecycle
  period: 'free' | 'trial' | 'active' | 'past_due' | 'suspended';
  renewsAt?: string;
}
```

### A4. Suggested pricing shape (India, indicative)

| SKU | What it unlocks | Shape |
|---|---|---|
| **VidyaOS Free** | Full ERP, web + PWA, all portals, up to ~150 students, 2 branches, 1 GB media, in-app notifications, manual `wa.me` share | ₹0, no card |
| **Cloud Media** | Photos (student/teacher/staff), logos, study-material files, receipts archive | included to 1 GB, then ₹99 / 10 GB |
| **Cloud Messaging** | Automated WhatsApp Business API + SMS + email campaigns, push | ₹499–₹999/mo + credits |
| **Brand Cloud** | Custom domain, logo + theme, branded PWA, custom sender | ₹499–₹1,499/mo |
| **App Cloud** | Play Store Android app under *their* brand with *their* photos | ₹9,999–₹24,999 setup + ₹499–₹999/mo |
| **Video Cloud** | Lecture hosting + secure streaming | usage-based (highest cost) |
| **Cloud Pro (bundle)** | Media + Messaging + Brand + AI credits | ₹1,999–₹4,999/mo |

**Positioning rule:** the free tier must always be genuinely usable end-to-end. Never hold the
ERP hostage — that destroys the story and the trust.

### A5. Risk register

| Risk | Mitigation |
|---|---|
| Free abuse / fake institutes / spam data | Phone OTP (exists) + "Verified" badge after manual review + rate limits |
| A free tenant blows the Firebase bill | Per-tenant quotas, budget alerts, auto-disable on overage, cost dashboard |
| Cloud add-on churn (buy once, cancel) | Recurring SKUs (messaging, brand, app maintenance) over one-off |
| White-label apps become an ops nightmare | Ship **one tenant-aware app** first; only build per-org APKs when paid (Part B Phase 3) |
| Can't re-price core later | Core stays free; expand the cloud store instead |
| Data-ownership promise vs cloud lock-in | Keep one-click export free, always |

---

## Part B — Gap-closure roadmap

Gaps are from the competitive analysis vs Classplus. Severity = how much it blocks revenue/adoption.

| ID | Gap | Why it matters | Severity |
|---|---|---|---|
| G1 | `limit(100)` subscriptions (e.g. `users`) | Institutes >100 users silently lose records | **Critical** |
| G2 | No push notifications (in-app only) | Parents miss absent/fee alerts | **Critical** |
| G3 | No automated WhatsApp/SMS/email (manual `wa.me`) | Incumbent's biggest retention hook | **Critical** |
| G8 | No cloud media/photo storage | Blocks the whole "paid cloud" model | **Critical** |
| G13 | No billing/entitlements/metering | Can't charge for anything | **Critical** |
| G5 | UPI with manual UTR verification, no gateway webhook | Reconciliation toil, unpaid dues | High |
| G6 | No custom domain / per-institute branding | Weak objection-killer for "own brand" | High |
| G7 | No branded Android app | Classplus's core value prop | High |
| G4 | No student online tests / auto-grade / question bank | Learning value + exam-prep benchmark | High |
| G9 | No video hosting / DRM | Blocks course selling | Medium |
| G10 | Live classes are embedded links only | No native live/recording | Medium |
| G11 | No AI suite (doubt solve, quiz gen, at-risk) | Competitive parity | Medium |
| G12 | No CI / monitoring / e2e / support ops | Trust at scale | High |
| G14 | Migration/onboarding tooling | Reduces sales friction | Medium |

### Dependency graph (what must come first)

```
Blaze + Cloud Functions + Storage + FCM + billing provider
        │
        ├── G13 entitlements + metering + billing   ← needed before ANY charge
        │        └── G8 media, G3 messaging, G6 brand, G7 app, G9 video, G11 AI
        ├── G1 pagination        (no dependency — do first)
        ├── G2 FCM push          (needs Functions)
        └── G5 gateway webhooks  (needs Functions)
```

---

### Phase 0 — Foundations for paid cloud *(prerequisite)*

**Build status:** the Blaze-independent code foundation is **implemented, typed and tested**;
only the Blaze-gated steps (installing function deps, enabling prod Storage, wiring the billing
provider) remain.

- [x] **Entitlements** on `Organization` + pure `lib/entitlements.ts` catalog + `useEntitlements()` hook.
- [x] **Metering** types (`OrgUsage`) + quota helpers (`remainingQuota`, `isQuotaExceeded`,
  `quotaPct`, `formatBytes`, `withinStudentCap`).
- [x] **Functions codebase** scaffold (`functions/`) — `onOrgCreated`, `sendMessage`, `sendPush`,
  `billingWebhook`, `rollupUsage` + README (requires Blaze to deploy).
- [x] **CI** (`.github/workflows/ci.yml`) — lint + test + build on every push/PR.
- [x] Storage rules already mirror the tenant model (`storage.rules`, emulator on 9199).
- [ ] Enable **Firebase Blaze**; `cd functions && npm install`; deploy functions.
- [ ] **Billing:** Razorpay (INR) subscriptions + webhook → entitlement updates; self-serve
  upgrade/downgrade; GST invoices. Paywall component + plan comparison screen.
- [ ] **Cost guardrails:** per-tenant quotas, Firebase budget alerts, auto-throttle/kill switch,
  internal cost dashboard.
- [ ] **Trust basics:** error monitoring (e.g. Sentry), uptime check.

**Exit criteria:** a free org exists with metered usage; a test org can buy a SKU and receive
its entitlement; quotas enforce and alert.

---

### Phase 1 — Scale + retention essentials *(the "must-have" gaps)*

- **G1 — Pagination.** Replace every `limit(N)` subscription with cursor-paginated loaders
  (start with `users`, then audit attendance/audit logs). Add "Load more" / infinite scroll.
  *Smallest change, biggest reliability win — do it first.*
- **G2 — FCM push.** Web push first (service worker already registered), then Android. Token
  registry per user, notification preferences, per-tenant rate limits.
- **G3 — Automated messaging.** WhatsApp Business Cloud API (Meta) + SMS (e.g. MSG91) + email;
  template registry (absent, fee due, receipt, result, PTM), opt-in/opt-out, delivery log,
  credits metering. Reuse and extend the existing `whatsappTemplate` field and the
  `whatsappAlertSent` flag.
- **G5 — Gateway + auto-reconcile.** Razorpay/Cashfree payment links + webhook that records the
  payment and marks the installment paid automatically; keep the current UPI/UTR flow as the
  zero-fee fallback.

**Revenue unlock:** Cloud Messaging can be launched at the end of this phase (the first
recurring SKU).

---

### Phase 2 — Learning + the cloud value store

- **G8 — Cloud media.** Upload photos (student/teacher/staff), logos, study material, receipts;
  signed URLs, thumbnails, compression, quota enforcement. This is the backbone SKU.
- **G13b — Self-serve cloud store.** Buy media GB / message credits / brand from inside the
  admin console.
- **G6 — Brand Cloud.** Custom subdomain + domain, logo + theme colours everywhere, custom
  email sender, branded PWA install.
- **G4 — Online test engine.** Question bank, test builder, student attempt UI, auto-grade,
  result analytics; feed the existing exam/rank module. *(Largest single build — size L/XL.)*
- **G10 — Native live + recording.** Integrate Zoom/100ms/Jitsa for real live classes with
  recordings; keep Meet/Zoom link embedding as the free option.

**Revenue unlock:** Media + Brand + the Cloud Pro bundle.

---

### Phase 3 — Distribution + intelligence *(premium)*

- **G7 — Branded Android app.** Step 1: **one tenant-aware VidyaOS app** (choose institute at
  login) — cheap, fast, no per-customer Play listing. Step 2: white-label pipeline
  (Capacitor + per-org config + Play Console) sold as App Cloud. Use the institute's and
  teachers' photos from G8.
- **G9 — Video Cloud.** Lecture hosting + secure streaming/DRM (signed playback, no-download).
  Highest storage/egress cost → premium, usage-metered.
- **G11 — AI suite (Gemini).** Doubt solving, quiz generation from syllabus topics, at-risk
  student flags, parent-report summaries. Meter by AI credits.
- **G14 — Onboarding/migration.** Finish CSV import, add spreadsheet/competitor import, guided
  setup, "seed demo data".
- **G12b — Support/ops maturity.** Status page, SLA tiers, onboarding playbooks.

---

### Sizing summary

| Phase | Items | Effort | Outcome |
|---|---|---|---|
| 0 | Blaze, Functions, Storage, metering, billing, CI/monitoring | L | Able to charge; safe free tier |
| 1 | G1 pagination, G2 push, G3 messaging, G5 gateway | L | Parity on the painful daily gaps; first revenue |
| 2 | G8 media, G13b store, G6 brand, G4 tests, G10 live | XL | The cloud value store + learning |
| 3 | G7 app, G9 video, G11 AI, G14 onboarding, G12b | XL | Distribution + premium |

### Guardrails / success metrics

- Free-tier infra cost per active institute stays under a defined ceiling (e.g. ₹x/mo).
- % of free orgs converting to ≥1 cloud SKU.
- Cloud MRR and churn per SKU.
- p95 dashboard load with a 1,000-student org (validates G1).
- Message deliverability + push opt-in rate (validates G2/G3).

### Immediate next 3 moves

1. **G1 pagination** — unblock scale today, no cloud dependency.
2. **Phase 0 scaffolding** — Blaze + Functions + Storage + entitlements/metering skeleton.
3. **G2 + G8** — push and media storage, so the first paid SKU (Media/Messaging) is real.

---

## Verdict on the proposed model

**Ship it — with one correction.** The "free core, paid cloud" idea is the right strategy for
this market and this codebase; it turns our biggest historical constraint (no billing/no
Storage) into the actual revenue engine, and it beats Classplus on trust and total cost for
institutes that don't need a glossy course storefront.

The correction: **don't sell storage — sell the branded app, automated messaging and video, and
meter storage as fair-use inside them.** Raw GB is too cheap to be a business; willingness to
pay in this market is highest for "my own app with my photos" and "automatic parent messages."
Keep the free core genuinely complete, enforce per-tenant cost guardrails, and let the cloud
store grow forever.
