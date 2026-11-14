import type { Page } from '@playwright/test'

export type Persona =
  'public' | 'driver' | 'tech_inspector' | 'steward' | 'timekeeper' | 'technical_director' | 'admin'

/** Abre una ruta como la persona de demo indicada (cada test parte con datos limpios). */
export async function openAs(page: Page, persona: Persona, route: string): Promise<void> {
  await page.goto('./#/')
  await page.getByRole('combobox', { name: 'Ver como' }).selectOption(persona)
  await page.goto(`./#${route}`)
}

export async function switchPersona(page: Page, persona: Persona, route: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Ver como' }).selectOption(persona)
  await page.goto(`./#${route}`)
}

export async function markTires(
  page: Page,
  kart: number,
  serials: { FL: string; FR: string; RL: string; RR: string },
): Promise<void> {
  await page.getByPlaceholder('N° de kart').fill(String(kart))
  await page.getByRole('button', { name: 'Buscar kart' }).click()
  for (const [position, serial] of Object.entries(serials)) {
    await page.locator(`#serial-${position}`).fill(serial)
  }
}
