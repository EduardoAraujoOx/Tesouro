import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { todas, geradoEm } from '@/lib/acervo'

export const metadata: Metadata = {
  title: 'Conheça o Tesouro Estadual',
  description: 'O que o Tesouro Estadual do Espírito Santo publica e onde encontrar cada informação neste portal.',
}

const mapa = [
  ['Resultado do Tesouro Estadual', 'Desempenho fiscal do Estado, publicado por quadrimestre.', '/publicacoes?tipo=resultado-tesouro'],
  ['Resultado de Caixa do Tesouro', 'Demonstrativo bimestral do resultado de caixa.', '/publicacoes?tipo=resultado-caixa'],
  ['Relatórios fiscais (LRF)', 'RREO (bimestral) e RGF (quadrimestral), exigidos pela Lei de Responsabilidade Fiscal.', '/publicacoes?tipo=lrf'],
  ['Dívida pública e PAF', 'Relatório anual da dívida pública e documentos do Programa de Reestruturação e de Ajuste Fiscal.', '/publicacoes?tipo=divida-paf'],
  ['Transferências aos Municípios', 'Distribuição mensal das transferências constitucionais.', '/publicacoes?tipo=municipios'],
  ['Contabilidade aplicada', 'Normas e procedimentos do Sistema de Contabilidade.', '/publicacoes?tipo=normas-contabeis'],
  ['Tesouro Cidadão', 'Versões em linguagem acessível do RREO e do RGF.', '/publicacoes?tipo=cidadao'],
  ['Finanças: serviços e orientações', 'Contas bancárias, obrigações de pequeno valor, transferências especiais e sistemas.', '/servicos'],
] as const

export default function Sobre() {
  return (
    <>
    <PageHeader titulo="Conheça o Tesouro Estadual" imagem={{ src: '/img/vitoria-noite.jpg', alt: 'Terceira Ponte iluminada à noite, com os prédios de Vitória ao fundo' }}>
      Este portal organiza as informações do Tesouro Estadual da Secretaria da Fazenda do Espírito Santo (SEFAZ-ES):
      publicações fiscais e contábeis, dívida pública, transferências aos municípios e orientações para gestores.
      Reúne hoje {todas.length} documentos, todos hospedados no site oficial da SEFAZ.
    </PageHeader>
    <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
      <h2 className="mt-2 text-2xl font-bold">Onde encontrar cada informação</h2>
      <span className="accent-bar" aria-hidden="true" />
      <ul className="mt-4 border-t border-line">
        {mapa.map(([titulo, texto, href]) => (
          <li key={titulo} className="border-b border-line">
            <Link href={href} className="block py-4 hover:bg-surface md:px-2">
              <span className="font-semibold text-ink">{titulo}</span>
              <span className="mt-0.5 block text-[0.9375rem] text-ink-soft">{texto}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-ink-soft">
        Foto do cabeçalho: Vitor Jubini/MTur, domínio público (<Link href="/creditos" className="underline underline-offset-4">créditos</Link>). Índice atualizado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
      </p>
    </div>
    </>
  )
}
