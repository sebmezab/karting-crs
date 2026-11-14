import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataProvider } from '@/data/DataProvider'
import { DEMO_IDS, TIRE_DEMO_CASES } from '@/data/demo'
import { createMockRepositories } from '@/data/mock/mockRepositories'
import { createMemoryStorage } from '@/data/mock/mockState'
import type { DataRepositories, EntrySummary } from '@/data/repositories'
import { TireMarkingForm } from './TireMarkingForm'

type Registered = EntrySummary & { eventEntry: NonNullable<EntrySummary['eventEntry']> }

async function setup(caseKey: (typeof TIRE_DEMO_CASES)[number]['key'], canRequestException = true) {
  const repos: DataRepositories = createMockRepositories({
    storage: createMemoryStorage(),
    now: () => new Date('2026-11-21T15:00:00Z'),
  })
  const demo = TIRE_DEMO_CASES.find((c) => c.key === caseKey)
  if (!demo) throw new Error(caseKey)
  const entries = await repos.entries.listForEvent(DEMO_IDS.currentEvent)
  const entry = entries.find(
    (e) => e.championshipEntry.kartNumber === demo.kartNumber,
  ) as Registered
  render(
    <DataProvider repositories={repos}>
      <TireMarkingForm
        entry={entry}
        eventId={DEMO_IDS.currentEvent}
        actorPersonId={DEMO_IDS.techInspector}
        canRequestException={canRequestException}
        initialSerials={demo.serials}
        onDone={vi.fn()}
      />
    </DataProvider>,
  )
  return { repos, user: userEvent.setup() }
}

describe('TireMarkingForm — semáforo de la marcación', () => {
  it('caso OK: verde y permite guardar', async () => {
    const { user } = await setup('ok')
    expect(await screen.findByText('Marcación válida')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Guardar marcación' })
    expect(save).toBeEnabled()
    await user.click(save)
    expect(await screen.findByText('Marcación guardada')).toBeInTheDocument()
  })

  it('caso bloqueado: rojo con el mensaje de la regla, no permite guardar y ofrece solicitar excepción', async () => {
    const { user, repos } = await setup('mismatch')
    expect(await screen.findByText('Marcación bloqueada')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Fecha de continuación: este juego debe ser el mismo de la Fecha 4. Neumático RR no coincide.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar marcación' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Solicitar excepción por pinchazo' }))
    expect(await screen.findByText(/Esperando al comisario/)).toBeInTheDocument()
    expect(await repos.exceptions.listForEvent(DEMO_IDS.currentEvent)).toHaveLength(1)
  })

  it('caso bloqueado: si el comisario aprueba, la marcación pasa a "válida con excepción" sin recargar', async () => {
    const { repos } = await setup('mismatch')
    await screen.findByText('Marcación bloqueada')
    const ex = await repos.exceptions.request({
      eventId: DEMO_IDS.currentEvent,
      eventEntryId: 'ee-f6-327',
      type: 'puncture_replacement',
      description: 'Pinchazo',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await repos.exceptions.decide(ex.id, true, 'OK', DEMO_IDS.steward)
    expect(await screen.findByText('Válida con excepción aprobada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar marcación' })).toBeEnabled()
  })

  it('sin permiso exceptions.request no se muestra el botón de excepción', async () => {
    await setup('mismatch', false)
    await screen.findByText('Marcación bloqueada')
    expect(
      screen.queryByRole('button', { name: 'Solicitar excepción por pinchazo' }),
    ).not.toBeInTheDocument()
  })

  it('caso intercambio: rojo indicando el kart dueño del neumático', async () => {
    await setup('exchange')
    expect(
      await screen.findByText(/registrado a nombre de otro piloto \(kart #355\)/),
    ).toBeInTheDocument()
  })

  it('caso ingreso tardío: ámbar y exige confirmar que son usados antes de guardar', async () => {
    const { user } = await setup('late_entry')
    expect(await screen.findByText('Revisar antes de guardar')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Guardar marcación' })
    expect(save).toBeDisabled()
    await user.click(
      screen.getByRole('checkbox', { name: 'Confirmo que los 4 neumáticos son usados' }),
    )
    expect(save).toBeEnabled()
  })

  it('con seriales incompletos no muestra semáforo', async () => {
    const { user } = await setup('ok')
    await screen.findByText('Marcación válida')
    await user.clear(screen.getByLabelText(/^RR/))
    await waitFor(() => expect(screen.queryByText('Marcación válida')).not.toBeInTheDocument())
    expect(screen.getByText('Completa los 4 seriales para ver el resultado.')).toBeInTheDocument()
    expect(document.querySelector('[data-verdict]')).toBeNull()
  })
})
