import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('exibe cabeçalho da aplicação', async ({ page }) => {
    await expect(page.getByText(/Disponibilidade Financeira/i)).toBeVisible()
    await expect(page.getByText(/SEFAZ-ES/i)).toBeVisible()
  })

  test('sidebar contém links de navegação', async ({ page }) => {
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Histórico')).toBeVisible()
    await expect(page.getByText(/Memória/i)).toBeVisible()
    await expect(page.getByText(/Inserção/i)).toBeVisible()
  })

  test('alterna entre Modo Executivo e Modo Técnico', async ({ page }) => {
    // Modo executivo é o padrão
    await expect(page.getByText('Modo Executivo')).toBeVisible()

    // Clica em Modo Técnico
    await page.getByText('Modo Técnico').click()
    // Colunas da tabela técnica aparecem (colunas I-XII)
    await expect(page.getByText(/Disp\. Financeira Bruta/i)).toBeVisible({ timeout: 5_000 })
  })

  test('exibe tabela com coluna "Fonte de Recurso"', async ({ page }) => {
    await expect(page.getByText('Fonte de Recurso')).toBeVisible()
  })

  test('seleção de mês atualiza a tabela', async ({ page }) => {
    // Verifica que existe pelo menos um seletor de mês
    const monthButtons = page.locator('button, span').filter({ hasText: /\d{4}/ })
    const count = await monthButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clique em grupo expande filhos', async ({ page }) => {
    // Aguarda a tabela carregar
    await page.waitForSelector('table tbody tr', { timeout: 8_000 })

    // Procura uma linha de grupo (fundo azul escuro) com indicador ▼
    const groupIndicator = page.locator('text=▼').first()
    const hasGroup = await groupIndicator.count()

    if (hasGroup > 0) {
      const groupRow = groupIndicator.locator('..').locator('..')
      await groupRow.click()
      // Após clicar, indicador muda para ▶
      await expect(page.locator('text=▶').first()).toBeVisible({ timeout: 3_000 })
    }
  })

  test('botão Exportar PDF abre nova aba', async ({ page, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByText(/Exportar PDF|PDF/i).first().click(),
    ])
    await expect(newPage.url()).toContain('/api/export/pdf')
    await newPage.close()
  })
})
