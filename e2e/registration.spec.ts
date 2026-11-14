import { expect, test } from '@playwright/test'
import { openAs } from './helpers'

// Flujo crítico: inscripción a la fecha con equipo declarado. SPEC 7.2 y 7.3.
test.describe('inscripción a F6 (piloto)', () => {
  test.beforeEach(async ({ page }) => {
    await openAs(page, 'driver', '/piloto/inscripcion')
    await expect(page.getByRole('heading', { name: 'Inscripción Fecha 6' })).toBeVisible()
  })

  test('R-8/R-9: declara chasis y motores válidos y queda pendiente de validación', async ({
    page,
  }) => {
    const submit = page.getByRole('button', { name: 'Enviar inscripción' })
    await expect(submit).toBeDisabled()
    await page.getByRole('checkbox', { name: /Chasis .* CH-318-1/ }).check()
    await page.getByRole('checkbox', { name: /Motor .* EN-318-1/ }).check()
    await page.getByRole('checkbox', { name: /Motor .* EN-318-2/ }).check()
    await submit.click()
    await expect(page.getByText('Inscripción enviada')).toBeVisible()
    await expect(page.getByText(/pendiente de validación/)).toBeVisible()

    await page.getByRole('link', { name: 'Volver a mi equipo' }).click()
    await expect(page.getByText(/Inscripción: Pendiente de validación/)).toBeVisible()
  })

  test('E-3/E-4: el motor sin sello y el exceso de motores se informan y bloquean el envío', async ({
    page,
  }) => {
    await page.getByRole('checkbox', { name: /Chasis .* CH-318-1/ }).check()
    await page.getByRole('checkbox', { name: /Motor .* EN-318-1/ }).check()
    await page.getByRole('checkbox', { name: /Motor .* EN-318-2/ }).check()
    await page.getByRole('checkbox', { name: /Motor .* EN-318-3/ }).check()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Máximo 2 motores por fecha (declaraste 3).')
    await expect(alert).toContainText('El motor EN-318-3 no tiene sello vigente.')
    await expect(page.getByRole('button', { name: 'Enviar inscripción' })).toBeDisabled()
  })
})
