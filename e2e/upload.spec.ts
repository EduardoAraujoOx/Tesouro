import { test, expect } from '@playwright/test'
import { login } from './helpers'
import path from 'path'
import fs from 'fs'

/**
 * Testes de upload do SIGEFES.
 * Se não houver arquivo de fixture disponível, os testes de upload real
 * são pulados — apenas os guards de UI são verificados.
 */

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sigefes_sample.xlsx')
const HAS_FIXTURE = fs.existsSync(FIXTURE_PATH)

test.describe('Upload SIGEFES', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/inserção')
    // Alguns setups usam "Inserção" na sidebar
    if (!(await page.url()).includes('inser')) {
      await page.getByText(/Inserção/i).click()
      await page.waitForURL(/inser/i, { timeout: 5_000 })
    }
  })

  test('página de inserção carrega sem erros', async ({ page }) => {
    await expect(page.getByText(/SIGEFES|upload|importar/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('exibe área de upload de arquivo', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test.skip(!HAS_FIXTURE, 'fixture sigefes_sample.xlsx não disponível')

  test('upload de arquivo válido exibe prévia e permite confirmar', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(FIXTURE_PATH)

    // Deve aparecer tabela de prévia ou mensagem de sucesso
    await expect(
      page.getByText(/prévia|preview|confirmar|importar/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('upload de arquivo inválido exibe mensagem de erro', async ({ page }) => {
    // Cria um arquivo temporário inválido (texto puro)
    const tmpPath = path.join(__dirname, 'fixtures', '_invalid_test.txt')
    fs.mkdirSync(path.dirname(tmpPath), { recursive: true })
    fs.writeFileSync(tmpPath, 'isso não é uma planilha')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tmpPath)

    await expect(
      page.getByText(/inválido|corrompido|erro/i).first()
    ).toBeVisible({ timeout: 8_000 })

    fs.unlinkSync(tmpPath)
  })
})
