import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { AcervoExplorer } from '@/components/AcervoExplorer'
import { TIPOS, todas, geradoEm } from '@/lib/acervo'

export const metadata: Metadata = {
  title: 'Publicações',
  description: 'Resultado do Tesouro, relatórios fiscais (RREO e RGF), dívida pública, transferências aos municípios e normas contábeis do Tesouro Estadual do Espírito Santo.',
}

export default function Publicacoes() {
  const itens = todas.map(({ id, tipo, pagina, titulo, descricao, grupo, ano, periodo, ordem, atualizadoEm, tamanho, formato, url }) => ({
    id, tipo, pagina, titulo, descricao, grupo, ano, periodo, ordem, atualizadoEm, tamanho, formato, url,
  }))
  return (
    <>
    <PageHeader titulo="Publicações">
      Acervo de documentos do Tesouro Estadual. Os arquivos são hospedados no site oficial da SEFAZ-ES.
      A data exibida é a de <strong className="text-ink">atualização do arquivo</strong>, que pode ser posterior ao período a que o documento se refere.
    </PageHeader>
    <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-12">
      <div>
        <Suspense fallback={<p className="text-ink-soft">Carregando publicações…</p>}>
          <AcervoExplorer itens={itens} tipos={TIPOS} />
        </Suspense>
      </div>
      <p className="mt-10 text-xs text-ink-soft">Índice do acervo atualizado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>
    </div>
    </>
  )
}
