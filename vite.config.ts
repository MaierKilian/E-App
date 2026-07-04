import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Pfad-Logik:
  // - Firebase Hosting liegt unter / (per VITE_BUILD_BASE=/ gesetzt, siehe build:firebase)
  // - GitHub Pages liegt unter /E-App/
  // - lokal (dev/preview) unter /
  base: process.env.VITE_BUILD_BASE ?? (command === 'build' ? '/E-App/' : '/'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
