'use client'

import { useEffect, useState } from 'react'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { VisaoGeral, type Vista, type IndicadoresFiscais as Fiscais } from './Agregado'
import { IndicadoresLrf, IndicadoresCapag } from './IndicadoresFiscais'
import { NOTA_DISCRETA, Subvisoes } from './Estrutura'
import { AvisoAjustes } from './AvisoAjustes'
import { Conclusoes, type Destino } from './Conclusoes'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'
import { OrcadoExecutado, type LoaAnual, type ReceitaAnual } from './OrcadoExecutado'
import { DespesaOrgaos, type OrgaoPloa } from './DespesaOrgaos'
import { ControlesAcessibilidade } from '@/components/TopBar'
import type { DadosReceita } from './projecao'
import type { LinhaMacro } from '@/lib/macro'

type Aba = 'conclusoes' | Vista
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'conclusoes', rotulo: 'Considerações gerais' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado orçamentário' },
]

type MacroProps = {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; fonteIpca: string
}

/**
 * Painel em quatro seções: Considerações gerais (a abertura, com links para os dados), Receita, Despesa e Resultado orçamentário, cada uma a PLOA 2027 contra a
 * história e o fechamento projetado de 2026. O restante do material (cenários, detalhamentos, método) ficou de fora por ora, até se decidir o que acrescentar.
 */
export function Painel({ macro, receitaMes, elementosPloa, orgaos, fiscais, rclPloa, pessoalExecPloa, ajustes, loa, receitaAnual }: { macro: MacroProps; receitaMes: DadosReceita; elementosPloa: Record<string, Record<string, number>>; orgaos: OrgaoPloa[]; fiscais: Fiscais; rclPloa: number; pessoalExecPloa: number; ajustes: AjustesVotacao; loa: LoaAnual; receitaAnual: ReceitaAnual }) {
  const aviso = <AvisoAjustes ajustes={ajustes} />
  const [aba, setAba] = useState<Aba>('conclusoes')
  /* sub-visão escolhida em cada grupo, para que os links das conclusões levem direto ao ponto */
  const [sub, setSub] = useState<Record<string, string>>({ despesa: 'resumo', resultado: 'resultado' })
  useEffect(() => {
    const h = window.location.hash.slice(1)
    /* endereços das versões anteriores: visão geral e demais abas levam à seção mais próxima */
    const alvo: Aba = h === 'despesa' || h === 'fontes' || h === 'atencao' ? 'despesa' : h === 'resultado' ? 'resultado' : h === 'receita' ? 'receita' : 'conclusoes'
    setAba(alvo)
  }, [])
  const escolheAba = (a: Aba) => { setAba(a); try { window.history.replaceState(null, '', `#${a}`) } catch { /* sem histórico: segue */ } }
  const abaAtual = ABAS.find((a) => a.id === aba)!
  const ir = (d: Destino) => { if (d.sub) setSub((x) => ({ ...x, [d.aba]: d.sub! })); escolheAba(d.aba); window.scrollTo({ top: 0 }) }

  return (
    <div className="painel min-h-screen bg-surface print:min-h-0 print:bg-paper">
      <header className="painel-cabecalho bg-navy-deep text-on-navy print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-5 sm:px-6 md:px-8 md:py-8">
          <div>
            <p className="mb-2 text-small font-semibold">{IDENTIDADE.faixa}</p>
            <h1 className="text-display font-semibold tracking-tight">{IDENTIDADE.painel}</h1>
            <p className="mt-2 text-small">{IDENTIDADE.apoio}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ControlesAcessibilidade compacto className="flex" />
            <button type="button" onClick={() => window.print()} title="Abre a impressão: escolha “Salvar como PDF”"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-brand border border-current px-2.5 text-small font-semibold hover:underline">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2h12v-2" /></svg>
              PDF<span className="sr-only"> (exportar esta seção)</span>
            </button>
          </div>
        </div>
      </header>

      <div className="z-30 border-b border-line bg-paper md:sticky md:top-0 print:hidden">
        <div role="tablist" aria-label="Seções do painel" className="mx-auto grid max-w-[1600px] grid-cols-2 gap-1 px-4 py-2 sm:px-6 md:flex md:gap-2 md:px-8">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={aba === a.id ? `painel-${a.id}` : undefined} tabIndex={aba === a.id ? 0 : -1}
              onClick={() => { escolheAba(a.id); window.scrollTo({ top: 0 }) }}
              onKeyDown={(e) => {
                const i = ABAS.findIndex((x) => x.id === a.id)
                const proxima = {
                  ArrowRight: (i + 1) % ABAS.length,
                  ArrowLeft: (i + ABAS.length - 1) % ABAS.length,
                  Home: 0,
                  End: ABAS.length - 1,
                }[e.key]
                if (proxima === undefined) return
                e.preventDefault()
                const destino = ABAS[proxima].id
                escolheAba(destino)
                document.getElementById(`aba-${destino}`)?.focus()
              }}
              className={`min-h-11 rounded-brand px-2 py-2 text-small font-semibold md:px-4 ${aba === a.id ? 'bg-navy text-on-navy' : 'text-ink-soft hover:bg-surface hover:text-navy'}`}>
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pt-7 print:max-w-none print:p-0">
        <div className="hidden print:block">
          <p className={NOTA_DISCRETA}>{IDENTIDADE.nome} · {IDENTIDADE.apoio}</p>
          <h1 className="text-title font-semibold">{IDENTIDADE.painel} · {abaAtual.rotulo}</h1>
        </div>

        <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} tabIndex={0}>
          <h2 className="mb-4 text-section print:hidden">{abaAtual.rotulo}</h2>
          {aba === 'conclusoes' ? (
            <Conclusoes ajustes={ajustes} onIr={ir} />
          ) : aba === 'despesa' ? (
            <Subvisoes key="despesa" rotulo="Despesa" ativa={sub.despesa} onMudar={(id) => setSub((x) => ({ ...x, despesa: id }))} itens={[
              { id: 'resumo', rotulo: 'Resumo', conteudo: <>{aviso}<VisaoGeral vista="despesa" elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} /></> },
              { id: 'orgao', rotulo: 'Detalhamento por órgão', conteudo: <>{aviso}<DespesaOrgaos orgaos={orgaos} ipca={macro.ipca} /></> },
            ]} />
          ) : aba === 'resultado' ? (
            <Subvisoes key="resultado" rotulo="Resultado" ativa={sub.resultado} onMudar={(id) => setSub((x) => ({ ...x, resultado: id }))} itens={[
              { id: 'resultado', rotulo: 'Resultado', conteudo: <>{aviso}<VisaoGeral vista="resultado" elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} /></> },
              { id: 'orcado', rotulo: 'Orçado × executado', conteudo: <OrcadoExecutado receita={macro.receita} dados={receitaMes} loa={loa} receitaAnual={receitaAnual} /> },
              { id: 'lrf', rotulo: 'LRF', conteudo: <>{aviso}<IndicadoresLrf receita={macro.receita} despesa={macro.despesa} dados={receitaMes} fiscais={fiscais} rclPloa={rclPloa} pessoalExecPloa={pessoalExecPloa} /></> },
              { id: 'capag', rotulo: 'CAPAG', conteudo: <>{aviso}<IndicadoresCapag receita={macro.receita} despesa={macro.despesa} dados={receitaMes} fiscais={fiscais} rclPloa={rclPloa} pessoalExecPloa={pessoalExecPloa} /></> },
            ]} />
          ) : (
            <VisaoGeral key={aba} vista={aba as Vista} elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} />
          )}
        </div>

        <p className={`mt-5 border-t border-line pt-3 ${NOTA_DISCRETA} print:hidden`}>
          {IDENTIDADE.aviso}
        </p>
      </div>
    </div>
  )
}
