import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push new code
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Optional static assets
      manifest: {
        name: 'Saturday AM Vault',
        short_name: 'Saturday AM',
        description: 'The premier digital manga reader for diverse shonen-style comics.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone', // This is what hides the Safari/Chrome address bar!
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Ensures the icon looks good on Android devices
          }
        ]
      }
    })
  ]
});