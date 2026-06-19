import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // Basis-Pfad je Ziel:
  // - Firebase Hosting (Build mit `--mode firebase`): Root "/"
  // - GitHub Pages (normaler Build): "/E-App/"
  // - Dev-Server: "/"
  base: mode === 'firebase' ? '/' : command === 'build' ? '/E-App/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
