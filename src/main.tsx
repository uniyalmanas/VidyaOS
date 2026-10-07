import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Drop the per-collection localStorage mirrors this app no longer writes.
// Production now hydrates from Firestore's persistent IndexedDB cache, so these
// keys held a stale, unauthenticated duplicate of the last tenant's roster,
// invoices and attendance — readable by anyone with access to this browser and
// outliving the session that produced it. Skipped in DEV, where the keys still
// carry mock-mode state between reloads.
if (!import.meta.env.DEV) {
  try {
    for (const key of [
      'vidyaos_students',
      'vidyaos_batches',
      'vidyaos_invoices',
      'vidyaos_attendance',
      'vidyaos_teachers',
      'vidyaos_exams',
      'vidyaos_results',
      'vidyaos_assignments',
      'vidyaos_materials'
    ]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable (private mode / blocked) — nothing to clean up.
  }
}

// Register PWA Service Worker for offline resilience
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('VidyaOS PWA Service Worker registered successfully:', registration.scope);
      },
      (error) => {
        console.warn('VidyaOS PWA Service Worker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(<App />);
