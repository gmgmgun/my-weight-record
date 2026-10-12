/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages는 /<저장소 이름>/ 아래에서 서비스되므로 배포 시 BASE_PATH로 지정한다.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 숫자용 글꼴(woff2)도 미리 받아 두어 오프라인에서도 같은 모양으로 보이게 한다.
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] },
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '몸무게 기록',
        short_name: '몸무게',
        description: '매일 체중을 기록하고 추세를 확인합니다.',
        lang: 'ko',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#f3f4fb',
        theme_color: '#6a7bff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
