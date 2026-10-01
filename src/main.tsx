import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for offline resilience
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
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
