/**
 * VidyaOS motion system.
 *
 * Central place for transition variants + easing so every screen animates
 * consistently. Uses the `motion` package (already a dependency) with
 * durations kept in the 150–380ms "polished & tasteful" range.
 *
 * All variants are safe to use with `AnimatePresence` and respect the
 * user's `prefers-reduced-motion` setting automatically via motion's
 * `MotionConfig reducedMotion="user"` (wired in App.tsx).
 */
import type { Variants, Transition } from 'motion/react';

/** Standard easings (mirrors the CSS tokens in index.css). */
export const easings = {
  outQuart: [0.25, 1, 0.5, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

/** Default snappy transition used across the app. */
export const tDefault: Transition = {
  duration: 0.32,
  ease: easings.outQuart,
};

export const tFast: Transition = {
  duration: 0.18,
  ease: easings.outQuart,
};

export const tSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.7,
};

export const tSoftSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 26,
};

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

/** Simple fade. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tFast },
  exit: { opacity: 0, transition: { duration: 0.14, ease: easings.inOut } },
};

/** Fade + rise — the workhorse for sections, cards and panels. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: tDefault },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: easings.inOut } },
};

/** Slightly larger rise, for hero-level content. */
export const fadeUpLg: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { ...tDefault, duration: 0.5 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18, ease: easings.inOut } },
};

/** Fade + scale in, for modals, popovers and dropdowns. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: tSpring },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.14, ease: easings.inOut } },
};

/** Slide down from under a top bar (dropdowns). */
export const dropdownIn: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: tSoftSpring },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12, ease: easings.inOut } },
};

/** Slide up from the bottom (toasts, mobile sheets). */
export const toastIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: tSpring },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18, ease: easings.inOut } },
};

/** Enter from the left (sidebar-style panels). */
export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: tDefault },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2, ease: easings.inOut } },
};

/** Page/module transition used when switching dashboard tabs. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: easings.outQuart } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: easings.inOut } },
};

/**
 * Parent variant for staggered lists. Children should use `fadeUp` with
 * `custom = index`, or simply inherit via `whileHover`/`variants`.
 */
export const staggerContainer: Variants = {
  hidden: { transition: { staggerChildren: 0, delayChildren: 0 } },
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

/** Tighter stagger for dense grids / tables. */
export const staggerContainerFast: Variants = {
  hidden: { transition: { staggerChildren: 0, delayChildren: 0 } },
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
};

/** Shared hover/tap micro-interaction for cards and buttons. */
export const hoverLift = {
  rest: { y: 0, scale: 1, transition: tFast },
  hover: { y: -4, scale: 1.012, transition: tSoftSpring },
  tap: { y: -1, scale: 0.985, transition: { duration: 0.1 } },
};

/** Press feedback for buttons. */
export const tapScale = {
  rest: { scale: 1 },
  tap: { scale: 0.96, transition: { duration: 0.08 } },
};

/**
 * Scroll-reveal config for `whileInView`. Used by <Reveal>.
 */
export const viewportOnce = { once: true, amount: 0.25, margin: '0px 0px -60px 0px' } as const;

/** Stagger helper so `whileInView` containers can stagger children. */
export function containerStagger(delay = 0.055): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: delay, delayChildren: 0.05 } },
  };
}

export function itemFadeUp(): Variants {
  return fadeUp;
}
