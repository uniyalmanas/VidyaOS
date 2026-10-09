/**
 * G2 — FCM web push plumbing.
 *
 * Everything here is guarded and degradable: until the Firebase project has the
 * FCM API enabled, a VAPID key configured AND a runtime `apiKey` present, the
 * app reports "not supported" and keeps working normally. The actual *sending*
 * runs through the `sendPush` Cloud Function (Blaze), which reads device tokens
 * from `users/{uid}.fcmTokens`.
 *
 * Service worker strategy: we never ship a second worker that would fight the
 * existing PWA `sw.js` over the "/" scope. Instead, at enable time we fetch the
 * current `/sw.js`, prepend the FCM messaging-compat block (with the runtime
 * config injected — no secrets hardcoded into committed files), and register the
 * merged worker. It therefore still precaches + serves the app exactly like the
 * original, plus handles background push.
 */
import { app, firebaseConfig } from './firebase';

// Compat builds on Google's CDN are pinned independently of the app SDK version;
// they only render background notifications in the worker.
const MESSAGING_COMPAT_VERSION = '9.23.0';

export function hasPushConfig(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.messagingSenderId &&
    !!firebaseConfig.vapidKey
  );
}

export function isPushSupported(): boolean {
  return hasPushConfig();
}

export interface ForegroundPushPayload {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

function buildMessagingWorkerHeader(): string {
  const cfg = JSON.stringify({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId
  });
  return [
    `importScripts('https://www.gstatic.com/firebasejs/${MESSAGING_COMPAT_VERSION}/firebase-app-compat.js');`,
    `importScripts('https://www.gstatic.com/firebasejs/${MESSAGING_COMPAT_VERSION}/firebase-messaging-compat.js');`,
    `var FIT_CONFIG = ${cfg};`,
    `try { if (typeof firebase !== 'undefined' && firebase.apps.length === 0) { firebase.initializeApp(FIT_CONFIG); } } catch (e) { console.warn('VidyaOS push: FCM init failed', e); }`,
    `var FIT_MESSAGING = null;`,
    `try { FIT_MESSAGING = firebase.messaging(); } catch (e) { console.warn('VidyaOS push: FCM messaging unavailable', e); }`,
    `if (FIT_MESSAGING) { FIT_MESSAGING.onBackgroundMessage(function (payload) {`,
    `  var n = payload && payload.notification ? payload.notification : {};`,
    `  return self.registration.showNotification(n.title || 'VidyaOS', {`,
    `    body: n.body || '',`,
    `    icon: '/favicon-192x192.png',`,
    `    badge: '/favicon-32x32.png',`,
    `    data: payload && payload.data ? payload.data : {}`,
    `  });`,
    `}); }`
  ].join('\n');
}

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Attach FCM background handling to the existing app service worker. Resolves
 * null when push isn't configured or the browser can't register a merged worker.
 */
export function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return Promise.resolve(null);
  if (swRegistrationPromise) return swRegistrationPromise;
  swRegistrationPromise = (async () => {
    try {
      const res = await fetch('/sw.js', { cache: 'no-cache' });
      const baseSw = await res.text();
      const mergedSource = `${buildMessagingWorkerHeader()}\n${baseSw}`;
      const blobUrl = URL.createObjectURL(new Blob([mergedSource], { type: 'text/javascript' }));
      return await navigator.serviceWorker.register(blobUrl, { scope: '/' });
    } catch (error) {
      console.warn('VidyaOS push: could not attach messaging to the service worker.', error);
      return null;
    }
  })();
  return swRegistrationPromise;
}

/**
 * Ask the user for permission and obtain an FCM web-push token. Returns null on
 * denial or any failure (the caller degrades gracefully).
 */
export async function requestPushToken(): Promise<string | null> {
  if (!isPushSupported()) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const module = await import('firebase/messaging');
    const messaging = module.getMessaging(app);
    const registration = await ensureMessagingServiceWorker();
    if (!registration) return null;
    const token = await module.getToken(messaging, {
      vapidKey: firebaseConfig.vapidKey,
      serviceWorkerRegistration: registration
    });
    return token || null;
  } catch (error) {
    console.warn('VidyaOS push: token registration failed — continuing without push.', error);
    return null;
  }
}

/** Delete the current registration for this app (used on opt-out). */
export async function deleteStoredPushToken(token: string): Promise<void> {
  if (!hasPushConfig() || !token) return;
  try {
    const module = await import('firebase/messaging');
    const messaging = module.getMessaging(app);
    // v12 SDK: deleteToken only takes the messaging instance.
    await module.deleteToken(messaging);
  } catch (error) {
    console.warn('VidyaOS push: token cleanup failed.', error);
  }
}

/**
 * Foreground push listener (shown while the app is open). Returns a disposer.
 */
export function onForegroundPushMessage(
  handler: (payload: ForegroundPushPayload) => void
): () => void {
  if (!hasPushConfig()) return () => {};
  let dispose: (() => void) | null = null;
  let cancelled = false;
  import('firebase/messaging')
    .then(module => {
      if (cancelled) return;
      const messaging = module.getMessaging(app);
      dispose = module.onMessage(messaging, payload => {
        const raw = payload as { notification?: { title?: string; body?: string }; data?: Record<string, string> };
        handler({
          title: raw?.notification?.title,
          body: raw?.notification?.body,
          data: raw?.data
        });
      });
    })
    .catch(() => {
      // Unsupported environment — foreground push simply unavailable.
    });
  return () => {
    cancelled = true;
    try {
      if (dispose) dispose();
    } catch (_) {
      // No-op.
    }
  };
}