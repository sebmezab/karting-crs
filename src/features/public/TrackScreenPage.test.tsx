import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { DEMO_IDS } from '@/data/demo'
import { createMockRepositories } from '@/data/mock/mockRepositories'
import { createMemoryStorage } from '@/data/mock/mockState'

// Vista pública (pantalla en pista): sin motivo ni autor de la selección (SPEC 7.4) y menores
// con nombre + inicial del apellido (SPEC 11.1).
async function junioresCerradosConRevision() {
  const repos = createMockRepositories({ storage: createMemoryStorage() })
  await repos.sessions.closeWithTopN(
    'se-f6-cat-junior-qualifying',
    ['ee-f6-101', 'ee-f6-104', 'ee-f6-112'],
    DEMO_IDS.timekeeper,
  )
  await repos.inspections.addStewardSelection(
    'se-f6-cat-junior-qualifying',
    'ee-f6-118',
    DEMO_IDS.technicalDirector,
  )
  return repos
}

afterEach(() => {
  window.location.hash = '#/'
})

describe('pantalla en pista — privacidad', () => {
  it('PR-2: los pilotos menores aparecen como "Nombre I." en el resultado provisional', async () => {
    const repos = await junioresCerradosConRevision()
    window.location.hash = '#/pantalla'
    render(<App repositories={repos} />)

    const results = await screen.findByRole('region', { name: /Junior/ })
    expect(within(results).getByText('Tomás R.')).toBeInTheDocument()
    expect(within(results).getByText('Martina L.')).toBeInTheDocument()
    expect(screen.queryByText(/Tomás Rivas|Martina Lagos|Benjamín Soto/)).not.toBeInTheDocument()
  })

  it('I-6/I-8: un kart a criterio se ve igual que uno del Top N, sin motivo ni quién lo pidió', async () => {
    const repos = await junioresCerradosConRevision()
    window.location.hash = '#/pantalla'
    render(<App repositories={repos} />)

    const board = await screen.findByRole('region', { name: 'Karts a revisión técnica' })
    expect(await within(board).findAllByText('Seleccionado para revisión')).toHaveLength(4)
    expect(board).not.toHaveTextContent(/A criterio|Top N/)
    expect(document.body).not.toHaveTextContent(/Pablo Navarro|Marcelo Vidal/)
    expect(document.body).not.toHaveTextContent(/Isidora Muñoz/)
  })

  it('I-6: la nota del revisor de un kart observado no se muestra al público', async () => {
    const repos = await junioresCerradosConRevision()
    const [first] = await repos.inspections.listForEvent(DEMO_IDS.currentEvent)
    if (!first) throw new Error('sin selección')
    await repos.inspections.transition(
      first.id,
      'observed',
      DEMO_IDS.techInspector,
      'Peso bajo el mínimo',
    )
    window.location.hash = '#/pantalla'
    render(<App repositories={repos} />)

    const board = await screen.findByRole('region', { name: 'Karts a revisión técnica' })
    expect(await within(board).findByText('Observado')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Peso bajo el mínimo')
  })
})
