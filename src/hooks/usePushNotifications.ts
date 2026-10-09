/**
 * G2 — reactive push-notification state for the current session.
 *
 * Opt-in only: nothing is requested until the user hits "Enable". The token and
 * prefs persist to localStorage (`vidyaos_push_v1`), and — when a real Firebase
 * Auth user is signed in — the token is mirrored to Firestore `users/{uid}`
 * (`fcmTokens` array) so the `sendPush` Cloud Function can reach this device.
 * The mirror is best-effort: permission already covers the write path under
 * the existing self-update rule.
 */
import { useCallback, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  deleteStoredPushToken,
  hasPushConfig,
  requestPushToken
} from '../lib/pushNotifications';
import {
  PushPrefKey,
  PushPrefs,
  clearStoredPushState,
  loadStoredPushState,
  mergePushPrefs,
  saveStoredPushState
} from '../lib/pushPrefs';
import {
  persistFcmTokenToFirestore,
  removeFcmTokenFromFirestore
} from '../lib/firestoreService';

export interface UsePushNotifications {
  supported: boolean;
  enabled: boolean;
  busy: boolean;
  permissionDenied: boolean;
  token: string | null;
  prefs: PushPrefs;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  setPref: (key: PushPrefKey, value: boolean) => void;
}

export function usePushNotifications(): UsePushNotifications {
  const [supported] = useState<boolean>(() => hasPushConfig());
  const initial = useState(() => loadStoredPushState());
  const [token, setToken] = useState<string | null>(initial[0]?.token ?? null);
  const [enabled, setEnabled] = useState<boolean>(!!initial[0]?.enabled);
  const [prefs, setPrefs] = useState<PushPrefs>(() => mergePushPrefs(initial[0]?.prefs));
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(
    () => typeof Notification !== 'undefined' && Notification.permission === 'denied'
  );

  // Persist any state change back to localStorage.
  useEffect(() => {
    saveStoredPushState({ token, enabled, prefs });
  }, [token, enabled, prefs]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setBusy(true);
    try {
      const newToken = await requestPushToken();
      if (!newToken) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setPermissionDenied(true);
        }
        return false;
      }
      setPermissionDenied(false);
      setToken(newToken);
      setEnabled(true);
      const currentUid = auth?.currentUser?.uid;
      if (currentUid) {
        await persistFcmTokenToFirestore(currentUid, newToken);
      }
      return true;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async (): Promise<void> => {
    const oldToken = token;
    setToken(null);
    setEnabled(false);
    clearStoredPushState();
    saveStoredPushState({ token: null, enabled: false, prefs });
    const currentUid = auth?.currentUser?.uid;
    if (oldToken) {
      if (currentUid) {
        await removeFcmTokenFromFirestore(currentUid, oldToken);
      }
      await deleteStoredPushToken(oldToken);
    }
  }, [token, prefs]);

  const setPref = useCallback((key: PushPrefKey, value: boolean) => {
    setPrefs(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  return { supported, enabled, busy, permissionDenied, token, prefs, enable, disable, setPref };
}