import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Vitest-Konfiguration.
 *
 * Zwei Arten von Tests, bewusst getrennt gehalten:
 *
 *  • tests/unit/    – reine Logik ohne Browser und ohne Netz. Läuft mit
 *    `npm test` in Sekunden und deckt vor allem die Karteikarten-Engine ab
 *    (Wiederholungs-Algorithmen, Ableitung des Kartenzustands, Statistik).
 *  • tests/*.test.ts – Firestore-Sicherheitsregeln. Diese brauchen den
 *    Firestore-Emulator und laufen deshalb nur über `npm run test:rules`.
 */
export default defineConfig({
  resolve: {
    // Gleicher Alias wie in vite.config.ts, damit Tests „@/…" importieren können.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallel: false,
  },
})
