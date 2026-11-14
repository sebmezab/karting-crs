import { expect, test } from '@playwright/test'
import { markTires, openAs } from './helpers'

// Flujo crítico: marcación de neumáticos en F6 (continuación del juego de F4). SPEC 7.1.
test.describe('marcación de neumáticos (revisor técnico)', () => {
  test.beforeEach(async ({ page }) => {
    await openAs(page, 'tech_inspector', '/tecnica/neumaticos')
    await expect(page.getByRole('heading', { name: 'Marcación de neumáticos' })).toBeVisible()
  })

  test('caso OK: mismo juego del ciclo → verde y se guarda', async ({ page }) => {
    await markTires(page, 312, {
      FL: 'MG-312-A1',
      FR: 'MG-312-A2',
      RL: 'MG-312-A3',
      RR: 'MG-312-A4',
    })
    await expect(page.locator('[data-verdict="ok"]')).toContainText('Marcación válida')
    await page.getByRole('button', { name: 'Guardar marcación' }).click()
    await expect(page.getByText('Marcación guardada')).toBeVisible()
  })

  test('caso bloqueado: RR distinto → rojo, no se guarda, se solicita excepción y el comisario la aprueba', async ({
    page,
  }) => {
    await markTires(page, 327, {
      FL: 'MG-327-A1',
      FR: 'MG-327-A2',
      RL: 'MG-327-A3',
      RR: 'MG-327-C4',
    })
    const verdict = page.locator('[data-verdict="blocked"]')
    await expect(verdict).toContainText(
      'Fecha de continuación: este juego debe ser el mismo de la Fecha 4. Neumático RR no coincide.',
    )
    await expect(page.getByRole('button', { name: 'Guardar marcación' })).toBeDisabled()
    await page.getByRole('button', { name: 'Solicitar excepción por pinchazo' }).click()
    await expect(verdict).toContainText('Esperando al comisario')

    // El comisario aprueba desde su pantalla.
    await page.getByRole('combobox', { name: 'Ver como' }).selectOption('steward')
    await page.goto('./#/excepciones')
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Aprobada')).toBeVisible()

    // De vuelta en la marcación, ahora es válida con excepción.
    await page.getByRole('combobox', { name: 'Ver como' }).selectOption('tech_inspector')
    await page.goto('./#/tecnica/neumaticos')
    await markTires(page, 327, {
      FL: 'MG-327-A1',
      FR: 'MG-327-A2',
      RL: 'MG-327-A3',
      RR: 'MG-327-C4',
    })
    await expect(page.locator('[data-verdict="overridden"]')).toContainText(
      'Válida con excepción aprobada',
    )
  })

  test('caso intercambio: neumático de otro piloto → rojo', async ({ page }) => {
    await markTires(page, 341, {
      FL: 'MG-341-A1',
      FR: 'MG-355-A2',
      RL: 'MG-341-A3',
      RR: 'MG-341-A4',
    })
    await expect(page.locator('[data-verdict="blocked"]')).toContainText(
      'registrado a nombre de otro piloto (kart #355)',
    )
  })

  test('caso ingreso tardío: ámbar y exige confirmar usados', async ({ page }) => {
    await markTires(page, 366, {
      FL: 'MG-366-U1',
      FR: 'MG-366-U2',
      RL: 'MG-366-U3',
      RR: 'MG-366-U4',
    })
    await expect(page.locator('[data-verdict="warning"]')).toContainText('ingreso tardío')
    const save = page.getByRole('button', { name: 'Guardar marcación' })
    await expect(save).toBeDisabled()
    await page.getByRole('checkbox', { name: 'Confirmo que los 4 neumáticos son usados' }).check()
    await save.click()
    await expect(page.getByText('Marcación guardada')).toBeVisible()
  })

  test('kart no inscrito en la fecha → aviso', async ({ page }) => {
    await page.getByPlaceholder('N° de kart').fill('318')
    await page.getByRole('button', { name: 'Buscar kart' }).click()
    await expect(page.getByText('El kart 318 no está inscrito en esta fecha.')).toBeVisible()
  })

  test('los casos de ejemplo cargan los seriales con un toque', async ({ page }) => {
    await page.getByRole('button', { name: /Mismo juego del ciclo/ }).click()
    await expect(page.locator('#serial-RR')).toHaveValue('MG-312-A4')
    await expect(page.locator('[data-verdict="ok"]')).toBeVisible()
  })
})
