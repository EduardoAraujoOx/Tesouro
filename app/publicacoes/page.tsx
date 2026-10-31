import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AcervoExplorer } from '@/components/AcervoExplorer'
import { TIPOS, todas, geradoEm } from '@/lib/acervo'

export const metadata: Metadata = {
  title: 'Publicações',
  description: 'Resultado do Tesouro, relatórios fiscais (RREO e RGF), dívida pública, transferências aos municípios e normas contábeis do Tesouro Estadual do Espírito Santo.',
}

export default function Publicacoes() {
  const itens = todas.map(({ id, tipo, titulo, ano, periodo, ordem, atualizadoEm, tamanho, formato, url }) => ({
    id, tipo, titulo, ano, periodo, ordem, atualizadoEm, tamanho, formato, url,
  }))
  return (
    <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Publicações</h1>
      <span className="accent-bar" aria-hidden="true" />
      <p className="mt-5 max-w-3xl text-lg text-ink-soft">
        Acervo de documentos do Tesouro Estadual. Os arquivos são hospedados no site oficial da SEFAZ-ES.
        A data exibida é a de <strong>atualização do arquivo</strong>, que pode ser posterior ao período a que o documento se refere.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-soft">Carregando publicações…</p>}>
          <AcervoExplorer itens={itens} tipos={TIPOS} />
        </Suspense>
      </div>
      <p className="mt-10 text-xs text-ink-soft">Índice do acervo atualizado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>
    </div>
  )
}
