import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register';

// Initializes the service worker for offline caching and installation
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: You can trigger a toast notification here later if you want users to refresh for an update
  },
  onOfflineReady() {
    console.log('App is ready to work offline!');
  },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)