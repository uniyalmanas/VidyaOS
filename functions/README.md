# VidyaOS Cloud Functions

The **paid-cloud backend**: entitlement stamping, usage metering, billing webhooks,
message sending and push fan-out.

> ⚠️ **These functions need the Firebase Blaze plan to deploy.** The main app builds
> and runs fine without this folder. Nothing here is required for the free tier.

## Why this exists

VidyaOS is free software. Institutes pay only when they use cloud services
(media storage, automated WhatsApp/SMS, custom brand, branded app, video, AI).
Those paid paths are enforced on the **server** so a client can never grant itself
entitlements.

## Setup (when Blaze is enabled)

```bash
cd functions
npm install
npm run build          # compile TypeScript to lib/
firebase deploy --only functions
```

Local:

```bash
firebase emulators:start --only functions,firestore,auth,storage
```

## Functions

| Function | Trigger | Purpose |
|---|---|---|
| `onOrgCreated` | `organizations/{orgId}` create | Stamp `FREE_ENTITLEMENTS` + zeroed `usage` |
| `sendMessage` | `outboundMessages/{id}` create | Send WhatsApp/SMS/email, decrement credits |
| `sendPush` | `pushQueue/{id}` create | FCM fan-out to device tokens |
| `billingWebhook` | HTTPS POST | Verify provider signature, set paid `skus` |
| `rollupUsage` | daily schedule | Recompute per-org usage counters |

## Keeping entitlements in sync

`FREE_ENTITLEMENTS` and the SKU grants live in the client at
`src/lib/entitlements.ts`. This module keeps a **deliberate copy** because it
compiles separately (CommonJS, no Vite). When you change the catalog, update both.

## Secrets

Configure provider keys with `firebase functions:secrets:set` before enabling the
relevant function (e.g. WhatsApp token, SMS key, payment webhook secret). Do not
commit secrets.
