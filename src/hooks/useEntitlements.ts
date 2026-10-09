import { useApp } from '../context/AppContext';
import { resolveEntitlements } from '../lib/entitlements';
import type { Entitlements } from '../types';

/**
 * Effective cloud entitlements for the currently-selected organisation.
 *
 * "Free software, paid cloud": the core ERP is always available; this hook is
 * what the paywall, usage meters and "upgrade" nudges read. Resolution is pure,
 * so the value is cheap to recompute on every render.
 */
export function useEntitlements(): Entitlements {
  return resolveEntitlements(useApp().currentOrg);
}
