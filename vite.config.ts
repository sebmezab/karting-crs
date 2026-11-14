import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages sirve el sitio en /karting-crs/ (ver docs/decisions/0002-hosting-y-routing.md).
// Se usa la misma base en dev, preview y build para que las rutas sean idénticas.
export default defineConfig({
  base: '/karting-crs/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  preview: { port: 4173, strictPort: true },
})
