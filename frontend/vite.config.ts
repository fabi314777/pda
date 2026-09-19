import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Bodega WMS - Gestión de Pallets',
        short_name: 'Bodega WMS',
        description: 'Aplicación de gestión y control de bodega: pallets, ingresos, validación, posiciones e historial.',
        theme_color: '#14181F',
        background_color: '#F5F6F8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // No cachear llamadas a la API: siempre deben ir en vivo al backend
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    // El build se copia directo dentro del backend, para que un solo
    // servidor (Express) sirva la API y la app — un solo servicio para desplegar.
    outDir: path.resolve(__dirname, '../backend/public'),
    emptyOutDir: true,
  },
})
