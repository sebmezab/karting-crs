import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_IDS } from '@/data/demo'
import { createMockRepositories } from '@/data/mock/mockRepositories'
import { createMemoryStorage } from '@/data/mock/mockState'
import type { DataRepositories } from '@/data/repositories'
import { App } from './App'

function renderApp() {
  render(<App repositories={createMockRepositories({ storage: createMemoryStorage() })} />)
  return userEvent.setup()
}

async function navLabels(): Promise<string[]> {
  const nav = await screen.findByRole('navigation', { name: 'Secciones' })
  return within(nav)
    .getAllByRole('link')
    .map((a) => a.textContent ?? '')
}

describe('navegación filtrada por permisos del rol en la fecha (SPEC 4.2)', () => {
  it('Público ve solo las secciones públicas', async () => {
    renderApp()
    expect(await navLabels()).toEqual(['Inicio', 'Tabla', 'Pantalla en pista'])
  })

  it('Revisor técnico ve Neumáticos, Revisión y Excepciones, pero no Sesiones', async () => {
    const user = renderApp()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), 'tech_inspector')
    const labels = await navLabels()
    expect(labels).toEqual(expect.arrayContaining(['Neumáticos', 'Revisión', 'Excepciones']))
    expect(labels).not.toContain('Sesiones')
    expect(labels).not.toContain('Administración')
  })

  it('Cronometrista ve Sesiones pero no Neumáticos', async () => {
    const user = renderApp()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), 'timekeeper')
    const labels = await navLabels()
    expect(labels).toContain('Sesiones')
    expect(labels).not.toContain('Neumáticos')
  })

  it('I-10: el revisor técnico (sin inspection.select) no ve "Agregar kart a revisión"; el comisario sí', async () => {
    const user = renderApp()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), 'tech_inspector')
    await user.click(
      within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('link', {
        name: 'Revisión',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Revisión post-sesión' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar kart a revisión' }),
    ).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), 'steward')
    expect(
      await screen.findByRole('button', { name: 'Agregar kart a revisión' }),
    ).toBeInTheDocument()
  })

  it('una sección sin permiso muestra el aviso en vez del contenido', async () => {
    renderApp()
    window.location.hash = '#/sesiones'
    expect(
      await screen.findByText('Esta sección no está disponible para tu rol'),
    ).toBeInTheDocument()
    window.location.hash = '#/'
  })
})

describe('acciones ocultas a roles sin el permiso (QA, SPEC 4.2 y 11.1)', () => {
  const NOT_ALLOWED = 'Esta sección no está disponible para tu rol'

  async function openAs(persona: string, hash: string, repos?: DataRepositories) {
    render(
      <App repositories={repos ?? createMockRepositories({ storage: createMemoryStorage() })} />,
    )
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), persona)
    window.location.hash = hash
    return user
  }

  afterEach(() => {
    window.location.hash = '#/'
  })

  it('I-6: el piloto no puede abrir la lista interna de revisión (donde se ve el motivo)', async () => {
    await openAs('driver', '#/revision')
    expect(await screen.findByText(NOT_ALLOWED)).toBeInTheDocument()
    expect(screen.queryByText('A criterio')).not.toBeInTheDocument()
  })

  it('P-7: el piloto y el público no pueden abrir la marcación de neumáticos', async () => {
    await openAs('driver', '#/tecnica/neumaticos')
    expect(await screen.findByText(NOT_ALLOWED)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar marcación' })).not.toBeInTheDocument()
  })

  it('P-7: el revisor técnico (solo exceptions.request) ve la excepción pendiente pero no Aprobar/Rechazar', async () => {
    const repos = createMockRepositories({ storage: createMemoryStorage() })
    await repos.exceptions.request({
      eventId: DEMO_IDS.currentEvent,
      eventEntryId: 'ee-f6-327',
      type: 'puncture_replacement',
      description: 'Pinchazo RR (kart #327).',
      actorPersonId: DEMO_IDS.techInspector,
    })
    const user = await openAs('tech_inspector', '#/excepciones', repos)
    expect(await screen.findByText('Pinchazo RR (kart #327).')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ver como' }), 'steward')
    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
  })

  it('I-10: el director de carrera (event.view_all) ve la lista de revisión pero no puede resolver ni agregar karts', async () => {
    const repos = createMockRepositories({ storage: createMemoryStorage() })
    await repos.sessions.closeWithTopN(
      'se-f6-cat-dd2-senior-qualifying',
      ['ee-f6-312', 'ee-f6-327', 'ee-f6-341'],
      DEMO_IDS.timekeeper,
    )
    await openAs('admin', '#/revision', repos)
    expect(await screen.findByTestId('inspection-312')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar kart a revisión' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar revisión' })).not.toBeInTheDocument()
  })

  it('P-7: sin results.enter (director de carrera) no se ofrece ingresar el Top N', async () => {
    await openAs('admin', '#/sesiones')
    await screen.findAllByText(/Práctica libre/)
    expect(screen.queryByRole('button', { name: /Cerrar e ingresar Top/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Tu rol en esta fecha no ingresa resultados/)).toBeInTheDocument()
  })
})
