import { spawn } from 'node:child_process'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const raiz = new URL('../', import.meta.url)
const destino = new URL('public/painel/relatorio-orcamentario-2027.pdf', raiz)
const temporario = new URL(`${destino.href}.${process.pid}.tmp`)

function aguardarEndereco(servidor) {
  return new Promise((resolve, reject) => {
    let saida = ''
    const limite = setTimeout(() => reject(new Error('Tempo esgotado ao iniciar o site para gerar o relatório.')), 30_000)
    servidor.once('error', (erro) => { clearTimeout(limite); reject(erro) })
    servidor.once('exit', (codigo) => { clearTimeout(limite); reject(new Error(`O site encerrou antes de gerar o relatório (código ${codigo}).`)) })
    servidor.stdout.on('data', (trecho) => {
      saida = (saida + trecho).slice(-4000)
      const endereco = saida.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/)?.[1]
      if (endereco) { clearTimeout(limite); resolve(endereco) }
    })
  })
}

const navegadorLocal = process.env.TESOURO_CHROMIUM_PATH
if (!navegadorLocal && process.platform !== 'linux') {
  throw new Error('Defina TESOURO_CHROMIUM_PATH com o caminho do Chrome ou Chromium para gerar o relatório fora do Linux.')
}

const servidor = spawn(process.execPath, [
  fileURLToPath(new URL('node_modules/next/dist/bin/next', raiz)),
  'start', '--hostname', '127.0.0.1', '--port', '0',
], { cwd: fileURLToPath(raiz), stdio: ['ignore', 'pipe', 'inherit'] })

let navegador
try {
  const endereco = await aguardarEndereco(servidor)
  navegador = await puppeteer.launch({
    executablePath: navegadorLocal || await chromium.executablePath(),
    args: navegadorLocal ? [] : chromium.args,
    headless: navegadorLocal ? true : 'shell',
  })
  const pagina = await navegador.newPage()
  const erros = []
  pagina.on('pageerror', (erro) => erros.push(String(erro)))
  await pagina.setViewport({ width: 1280, height: 900 })
  await pagina.emulateMediaType('print')
  await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  const resposta = await pagina.goto(`${endereco}/painel/relatorio`, { waitUntil: 'networkidle0' })
  if (!resposta?.ok()) throw new Error(`Falha ao abrir o relatório (HTTP ${resposta?.status()}).`)
  await pagina.waitForSelector('[data-relatorio-painel]')
  await pagina.evaluate(() => document.fonts.ready)
  if (erros.length) throw new Error(`Falha ao renderizar o relatório: ${erros.join(' | ')}`)
  const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true })
  await mkdir(new URL('./', destino), { recursive: true })
  await writeFile(temporario, pdf)
  await rename(temporario, destino)
  console.log(`Relatório do painel gerado em public/painel (${Math.round(pdf.length / 1024)} KB).`)
} finally {
  try {
    await navegador?.close()
  } finally {
    servidor.kill('SIGTERM')
    await rm(temporario, { force: true })
  }
}
