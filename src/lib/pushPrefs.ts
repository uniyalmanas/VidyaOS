/**
 * G2 — notification preferences. Pure module (no Firebase import) so the node
 * test-runner can exercise the merge/toggle math directly.
 */

export interface PushPrefs {
  /** Attendance & alerts — student absent / late. */
  alerts: boolean;
  /** Fee due & receipts — installment due, payment received. */
  feeDue: boolean;
  /** Results & PTM — exam results, parent-teacher meets. */
  results: boolean;
  /** Announcements — center-wide notices. */
  announcements: boolean;
}

export type PushPrefKey = keyof PushPrefs;

export const DEFAULT_PUSH_PREFS: PushPrefs = {
  alerts: true,
  feeDue: true,
  results: true,
  announcements: true
};

export const ALL_PUSH_PREFS: { key: PushPrefKey; label: string; description: string }[] = [
  { key: 'alerts', label: 'Attendance & alerts', description: 'Student absent / late alerts' },
  { key: 'feeDue', label: 'Fee due & receipts', description: 'Installment due and payment receipts' },
  { key: 'results', label: 'Results & PTM', description: 'Exam results and parent-teacher meets' },
  { key: 'announcements', label: 'Announcements', description: 'Center-wide announcements and notices' }
];

/** Merge a (possibly partial) stored prefs object over the defaults. */
export function mergePushPrefs(input?: Partial<PushPrefs> | null): PushPrefs {
  return { ...DEFAULT_PUSH_PREFS, ...(input || {}) };
}

/** Immutably flip exactly one pref key. */
export function togglePushPref(prefs: PushPrefs, key: PushPrefKey): PushPrefs {
  return { ...prefs, [key]: !prefs[key] };
}

export interface StoredPushState {
  token: string | null;
  enabled: boolean;
  prefs: PushPrefs;
}

const STORAGE_KEY = 'vidyaos_push_v1';

export function saveStoredPushState(state: StoredPushState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // Storage full / blocked — push simply won't persist; not fatal.
  }
}

export function loadStoredPushState(): StoredPushState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPushState>;
    return {
      token: typeof parsed.token === 'string' && parsed.token ? parsed.token : null,
      enabled: !!parsed.enabled && !!parsed.token,
      prefs: mergePushPrefs(parsed.prefs)
    };
  } catch (_) {
    return null;
  }
}

export function clearStoredPushState(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    // No-op.
  }
}