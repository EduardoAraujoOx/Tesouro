import { Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@sefaz.es.gov.br'
export const ADMIN_PASS  = process.env.E2E_ADMIN_PASS  || 'admin123'

export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASS) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10_000 })
}
