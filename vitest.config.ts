import { defineConfig } from 'vitest/config'

/**
 * Vitest-Konfiguration.
 *
 * Aktuell nur für die Firestore-Sicherheitsregeln (tests/rules/). Diese
 * benötigen den Firestore-Emulator (siehe firebase.json > emulators.firestore
 * und die npm-Skripte test:rules / test:rules:ci).
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallel: false,
  },
})
