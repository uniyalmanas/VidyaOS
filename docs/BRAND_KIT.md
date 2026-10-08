# VidyaOS Brand Illustration Kit

_status: shipped — all assets are hand-authored inline SVG. No Cloud Storage, no binaries, no
network requests, theme-aware, crisp at any DPI._

The app's identity mark is **"The Vidya Radiant Prism"** — the sacred Diya/Jyoti flame fused with
geometric crystalline OS layers. This kit extends that mark into supporting illustrations so the
product reads as one coherent brand instead of text + generic icons.

## Palette

| Token | Value | Use |
|---|---|---|
| Indigo primary | `#6366F1` → `#4F46E5` → `#7C3AED` | brand gradient, orbs, rings |
| Saffron accent | `#F97316` → `#EA580C` → `#DC2626` | fees, time, calls-to-action |
| Flame | `#FF1744` / `#FF6D00` / `#FF3D00` | the prism emblem itself |
| Success | `#10B981` / `#188038` | attendance, verification |
| Ink | `#1D1D1F` (light) / `#F5F5F7` (dark) | headings |
| Muted | `#86868B` | secondary copy |

All SVG uses Tailwind `fill-*` / `stroke-*` utilities with `dark:` variants, so it follows the
class-based theme (`ThemeContext` toggles `.dark` on `<html>`).

## Components

All exported from `src/components/ui/index.ts` (i.e. import from `../ui`).

### `src/components/ui/VidyaLogo.tsx`
- **`VidyaIcon`** — the radiant prism. New `mono` prop renders a single-colour
  (`currentColor`) silhouette for printing and coloured headers.
- **`VidyaMonogram`** — the app-icon lockup: white prism on the indigo→violet gradient tile.
  Used as the PWA-style mark, document letterhead seal, and avatar tile.

### `src/components/ui/VidyaIllustrations.tsx`

| Component | Purpose |
|---|---|
| `VidyaAvatar` | Deterministic monogram avatar. Same name/seed always yields the same gradient. Replaces placeholder photos (offline + privacy-preserving). |
| `HeroIllustration` | The "learning constellation": the prism at the centre of an orbital hub linking Attendance, UPI Fees, Reports and Parent Alerts. |
| `HowItWorksInfographic` | 5-step onboarding rail (set up → enroll → attend → fees → results). `variant="full"` for the landing page, `"compact"` for modals. |
| `EmptyStateIllustration` | Nine variants (`students`, `fees`, `attendance`, `search`, `messages`, `timetable`, `exams`, `reports`, `generic`) so "no data" reads as guidance. |
| `VidyaWatermark` | Faint centered emblem for printed documents (`pointer-events: none`). |
| `VidyaBrandChip` | Tiny prism + label for footers / trust lines. |
| `VidyaTrustBadge` | Shielded trust badge for auth + document surfaces. |

`VidyaIcon` also gained a `mono` tone and `VidyaMonogram` (app-icon lockup) lives in
`VidyaLogo.tsx`.

## Where it is wired

| Surface | Asset | File |
|---|---|---|
| Boot splash (flame + wordmark + animated bar) | inline SVG/CSS | `index.html` (`#vidya-splash`) |
| Landing hero | `HeroIllustration` | `src/components/landing/LandingPage.tsx` |
| Landing `#how-it-works` section + nav link | `HowItWorksInfographic` | `src/components/landing/LandingPage.tsx` |
| Login testimonial portrait (was an external Unsplash image) | `VidyaAvatar` | `src/components/auth/LoginPage.tsx` |
| Help modal → Tutorials | `HowItWorksInfographic` (compact) | `src/components/common/HelpSupportModal.tsx` |
| Architecture modal → Product overview | `HowItWorksInfographic` (compact) | `src/components/architecture/ArchitectureModal.tsx` |
| Data tables with no rows | `EmptyStateIllustration` | `src/components/ui/DataTable.tsx` (default empty state; `emptyState.illustration` slot) |
| Fee receipt | `VidyaWatermark` + `VidyaMonogram` letterhead | `src/components/common/ReceiptModal.tsx` |
| Student ID card | `VidyaWatermark` | `src/components/documents/StudentIdCardModal.tsx` |
| Transfer certificate | `VidyaWatermark` + `VidyaMonogram` seal | `src/components/documents/TransferCertificateModal.tsx` |

## Constraints honoured

- **Firestore-only / no Cloud Storage:** every asset is code (SVG/JSX/CSS). Nothing is uploaded.
- **Offline-first:** no external image URLs remain on branding surfaces (the login portrait was
  replaced), so the PWA renders its identity without a network.
- **Print-safe:** watermark/letterhead live inside the `printable-area` / `doc-print-area`
  containers, so they appear on paper (and the print CSS keeps them visible).
- **Accessibility:** illustrations are `aria-hidden` or carry an `aria-label`; decorative motion
  respects `prefers-reduced-motion`.

## Reusing an illustration

```tsx
import { EmptyStateIllustration, VidyaAvatar, HeroIllustration } from '../ui';

<EmptyStateIllustration variant="fees" size={140} />
<VidyaAvatar name="Ananya Sharma" size={40} />
<HeroIllustration className="max-w-3xl mx-auto" />
```

DataTable callers can pass a custom illustration for richer empty states:

```tsx
<DataTable
  ...
  emptyState={{
    title: 'No fees collected yet',
    description: 'Invoices you raise will appear here.',
    illustration: <EmptyStateIllustration variant="fees" />
  }}
/>
```