import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopNPicker, type TopNCandidate } from './TopNPicker'

const candidates: TopNCandidate[] = [312, 327, 341, 355].map((k) => ({
  eventEntryId: `ee-${k}`,
  kartNumber: k,
  categoryId: 'cat-dd2-senior',
  name: `Piloto ${k}`,
}))

function setup(n = 3) {
  const onConfirm = vi.fn()
  render(
    <TopNPicker candidates={candidates} n={n} onConfirm={onConfirm} onCancel={() => undefined} />,
  )
  const kart = (k: number) => screen.getByRole('button', { name: new RegExp(`^Kart ${k},`) })
  const confirm = screen.getByRole('button', { name: 'Cerrar sesión y enviar a revisión' })
  return { onConfirm, kart, confirm, user: userEvent.setup() }
}

describe('TopNPicker — ingreso del Top N tocando números (SPEC 7.4)', () => {
  it('I-7: confirma el Top 3 en el orden en que se tocaron', async () => {
    const { onConfirm, kart, confirm, user } = setup()
    expect(confirm).toBeDisabled()
    await user.click(kart(341))
    await user.click(kart(312))
    await user.click(kart(355))
    expect(kart(341)).toHaveAttribute('aria-pressed', 'true')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith(['ee-341', 'ee-312', 'ee-355'])
  })

  it('no deja elegir más de N karts', async () => {
    const { kart, user } = setup(2)
    await user.click(kart(312))
    await user.click(kart(327))
    await user.click(kart(341))
    expect(kart(341)).toHaveAttribute('aria-pressed', 'false')
  })

  it('tocar un kart elegido lo quita y los siguientes suben un puesto', async () => {
    const { kart, user } = setup()
    await user.click(kart(312))
    await user.click(kart(327))
    await user.click(kart(341))
    await user.click(kart(312))
    expect(kart(327)).toHaveAccessibleName(/1° lugar/)
    expect(kart(341)).toHaveAccessibleName(/2° lugar/)
  })

  it('"Deshacer último" quita el último elegido', async () => {
    const { kart, user } = setup()
    await user.click(kart(312))
    await user.click(kart(327))
    await user.click(screen.getByRole('button', { name: 'Deshacer último' }))
    expect(kart(327)).toHaveAttribute('aria-pressed', 'false')
    expect(kart(312)).toHaveAttribute('aria-pressed', 'true')
  })

  it('si hay menos inscritos que N, basta con elegirlos a todos', async () => {
    const onConfirm = vi.fn()
    render(
      <TopNPicker
        candidates={candidates.slice(0, 2)}
        n={3}
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Kart 312,/ }))
    await user.click(screen.getByRole('button', { name: /^Kart 327,/ }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión y enviar a revisión' }))
    expect(onConfirm).toHaveBeenCalledWith(['ee-312', 'ee-327'])
  })
})
