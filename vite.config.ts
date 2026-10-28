import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/share/, /^\/api/]
      },
      manifest: {
        name: 'Saturday AM - Manga Hype',
        short_name: 'Saturday AM',
        description: 'Read original diverse manga online with Saturday AM.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/pwa-512x512-v4.png?v=4',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/pwa-512x512-v4.png?v=4',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});