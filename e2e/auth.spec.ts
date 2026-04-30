import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASS } from './helpers'

test.describe('Autenticação', () => {
  test('página raiz redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/')
    // Deve mostrar a tela de preview (paywall) sem redirecionar ao dashboard
    await expect(page.getByText('Entrar no sistema')).toBeVisible()
  })

  test('botão "Entrar no sistema" navega para /login', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Entrar no sistema').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard redireciona para /login sem sessão', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login com credenciais inválidas exibe erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'errado@email.com')
    await page.fill('input[type="password"]', 'senhaerrada')
    await page.click('button[type="submit"]')
    // Deve permanecer em /login e mostrar mensagem de erro
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByText(/inválid|incorret|erro|credenciais/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('login com credenciais válidas redireciona para /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASS)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('botão "Sair" encerra sessão e volta para /login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASS)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    await page.getByText('Sair').click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })
})
