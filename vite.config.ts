import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/streak-slayer/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Sprites are plain <img> files under public/, which the default
        // patterns skip; precache them so the art loads from cache and offline.
        globPatterns: ['**/*.{js,css,html,png}'],
      },
      manifest: {
        name: 'StreakSlayer',
        short_name: 'StreakSlayer',
        description: 'A gamified habit tracker — check off habits to damage a boss and level up.',
        display: 'standalone',
        theme_color: '#aa3bff',
        background_color: '#16171d',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
