import { expect, test } from '@playwright/test'

test('portada: próxima fecha, calendario y categorías', async ({ page }) => {
  await page.goto('./#/')
  await expect(page.getByText('Fecha 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Calendario 2026' })).toBeVisible()
  await expect(page.getByText('DD2 Super Master XL')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inscribirse', exact: true })).toBeVisible()
})

test('"Inscribirse" lleva al flujo del piloto', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('button', { name: 'Inscribirse', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inscripción Fecha 6' })).toBeVisible()
})

test('tabla del campeonato: menores con nombre e inicial (SPEC 11.1)', async ({ page }) => {
  await page.goto('./#/tabla')
  await expect(page.getByRole('heading', { name: 'Tabla del campeonato' })).toBeVisible()
  await expect(page.getByRole('cell', { name: /Tomás R\./ })).toBeVisible()
  await expect(page.getByText('Tomás Rivas')).toHaveCount(0)

  await page.getByRole('tab', { name: 'DD2 Senior' }).click()
  await expect(page.getByRole('cell', { name: /Ana Torres/ })).toBeVisible()
})

test('una sección del staff sin rol muestra el aviso de acceso', async ({ page }) => {
  await page.goto('./#/tecnica/neumaticos')
  await expect(page.getByText('Esta sección no está disponible para tu rol')).toBeVisible()
})
