import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { SeriesProvider } from './userSeriesData.tsx';

let isReaderCurrentlyOpen = false;
let pendingSwUpdate = false;

window.addEventListener('readerToggled', (e: any) => {
  isReaderCurrentlyOpen = Boolean(e?.detail?.isOpen);
  // If an update arrived while the fan was reading a chapter, apply it the moment they close the reader!
  if (!isReaderCurrentlyOpen && pendingSwUpdate) {
    pendingSwUpdate = false;
    updateSW(true);
  }
});

// Initializes the service worker with automatic background update polling & instant activation
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // If the user is actively inside the MangaReader, wait until they close the chapter
    if (isReaderCurrentlyOpen) {
      pendingSwUpdate = true;
      return;
    }
    // Otherwise, immediately activate the new Service Worker and reload into the fresh build
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App is ready to work offline!');
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    // 1. Check for updates every time the user brings the app/tab back to the foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    // 2. Also poll for new deployments every 15 minutes for long sessions
    setInterval(() => {
      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 15 * 60 * 1000);
  }
});

// 3. Catch Vite chunk load errors (when a user clicks a lazy route after a new deploy) and auto-reload cleanly
window.addEventListener('vite:preloadError', () => {
  if (!isReaderCurrentlyOpen) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SeriesProvider>
      <App />
    </SeriesProvider>
  </React.StrictMode>
);