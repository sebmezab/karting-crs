import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// En Windows, ejecutar siempre vía `npm test` / `npm run test:*` (usan scripts/run-bin.mjs):
// si la ruta del proyecto llega como "c:\..." en minúscula, Vitest se carga dos veces y
// falla con "failed to find the current suite".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts', 'src/domain/**/index.ts', 'src/domain/**/types.ts'],
      reporter: ['text-summary', 'text', 'html'],
      // Objetivo §12.4: ≥ 90% en domain/. No se persigue cobertura en la UI.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
})
