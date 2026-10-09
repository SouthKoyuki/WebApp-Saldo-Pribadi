
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/WebApp-Saldo-Pribadi/',

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],

      manifest: {
        name: 'Aplikasi Saldo',
        short_name: 'Saldo',
        description:
          'Pencatat saldo offline dengan penyimpanan lokal.',
        theme_color: '#176b55',
        background_color: '#f5f7f6',
        display: 'standalone',
        start_url: '/WebApp-Saldo-Pribadi/',
        scope: '/WebApp-Saldo-Pribadi/',

        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,webmanifest}',
        ],
        navigateFallback: 'index.html',
      },
    }),
  ],
});