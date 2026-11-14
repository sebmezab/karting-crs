import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
// Fase 0: datos de ejemplo en memoria + localStorage. Fase 1: cambiar SOLO esta línea por
// la implementación de Supabase (ADR 0004).
import { createMockRepositories } from '@/data/mock/mockRepositories'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Falta #root en index.html')

createRoot(root).render(
  <StrictMode>
    <App repositories={createMockRepositories()} />
  </StrictMode>,
)

// PWA: service worker básico solo en producción (se "instala" desde el navegador).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
  })
}
