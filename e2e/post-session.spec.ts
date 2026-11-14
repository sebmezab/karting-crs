import { expect, test, type Page } from '@playwright/test'
import { openAs, switchPersona } from './helpers'

// Flujo crítico: cronometrista cierra sesión con Top 3 → lista de revisión → OK/observado. SPEC 7.4.

async function closeDd2SeniorWithTop3(page: Page, karts: number[]) {
  await page.getByRole('tab', { name: 'DD2 Senior' }).click()
  const region = page.getByRole('region', { name: 'DD2 Senior' })
  await region
    .getByRole('button', { name: /Cerrar e ingresar Top 3/ })
    .first()
    .click()
  for (const k of karts)
    await region.getByRole('button', { name: new RegExp(`^Kart ${k},`) }).click()
  await region.getByRole('button', { name: 'Cerrar sesión y enviar a revisión' }).click()
  await expect(page.getByText(/Sesión cerrada/)).toBeVisible()
}

test('I-7 a I-9: Top 3, kart a criterio y resolución de revisiones', async ({ page }) => {
  await openAs(page, 'timekeeper', '/sesiones')
  await closeDd2SeniorWithTop3(page, [312, 327, 341])

  await switchPersona(page, 'technical_director', '/revision')
  await expect(page.getByRole('heading', { name: 'Revisión post-sesión' })).toBeVisible()
  await expect(page.getByText('3 karts pendientes.', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar kart a revisión' }).click()
  await page.getByRole('button', { name: 'Enviar kart 372 a revisión' }).click()
  await expect(page.getByTestId('inspection-372')).toContainText('A criterio')

  await switchPersona(page, 'tech_inspector', '/revision')
  const kart312 = page.getByTestId('inspection-312')
  await kart312.getByRole('button', { name: 'Iniciar revisión' }).click()
  await expect(kart312).toContainText('En revisión')
  await kart312.getByRole('button', { name: 'OK' }).click()
  await expect(kart312).toContainText('OK')

  const kart327 = page.getByTestId('inspection-327')
  await kart327.getByRole('button', { name: 'Observado' }).click()
  await kart327.getByLabel('¿Qué se observó?').fill('Peso bajo el mínimo')
  await kart327.getByRole('button', { name: 'Guardar como observado' }).click()
  await expect(kart327).toContainText('Nota: Peso bajo el mínimo')
})

test('I-6: el piloto ve "Seleccionado para revisión" sin el motivo', async ({ page }) => {
  // La piloto de demo se inscribe a F6.
  await openAs(page, 'driver', '/piloto/inscripcion')
  await page.getByRole('checkbox', { name: /Chasis .* CH-318-1/ }).check()
  await page.getByRole('checkbox', { name: /Motor .* EN-318-1/ }).check()
  await page.getByRole('button', { name: 'Enviar inscripción' }).click()
  await expect(page.getByText('Inscripción enviada')).toBeVisible()

  await switchPersona(page, 'timekeeper', '/sesiones')
  await closeDd2SeniorWithTop3(page, [318, 312, 327])

  await switchPersona(page, 'driver', '/piloto')
  const box = page.getByRole('region', { name: 'Seleccionado para revisión' })
  await expect(box).toBeVisible()
  await expect(box).not.toContainText('Top')
  await expect(box).not.toContainText('criterio')
})

test('la pantalla en pista se actualiza sola cuando otro dispositivo cierra una sesión', async ({
  page,
  context,
}) => {
  await openAs(page, 'public', '/pantalla')
  await expect(page.getByText('Ningún kart seleccionado por ahora.')).toBeVisible()

  const staff = await context.newPage()
  await openAs(staff, 'timekeeper', '/sesiones')
  await closeDd2SeniorWithTop3(staff, [312, 327, 341])

  // Sin recargar: llega por el evento `storage` (en Fase 1, Supabase Realtime).
  const board = page.getByRole('region', { name: 'Karts a revisión técnica' })
  await expect(board.getByText('Seleccionado para revisión')).toHaveCount(3)
})
