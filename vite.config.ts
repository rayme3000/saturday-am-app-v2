import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'ads.txt'],
      manifest: {
        name: 'Saturday AM - Manga Hype',
        short_name: 'Saturday AM',
        description: 'Read original diverse manga online with Saturday AM.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/pwa-192x192-v4.png?v=4',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'https://pub-180171f859f64aa7aadb7001a6b96e65.r2.dev/other%20icons/pwa-512x512-v4.png?v=4',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/share/, /^\/api/, /^\/ads\.txt$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pub-180171f859f64aa7aadb7001a6b96e65\.r2\.dev\/.*\.(?:png|jpg|jpeg|webp|svg|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'saturday-am-r2-images',
              expiration: {
                maxEntries: 350,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 Year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@aws-sdk') || id.includes('smithy') || id.includes('react-easy-crop')) {
            return 'vendor-admin-upload';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('react-virtuoso') || id.includes('react-zoom-pan-pinch')) {
            return 'vendor-reader-ui';
          }
          if (id.includes('react-dom') || id.includes('react/')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
});