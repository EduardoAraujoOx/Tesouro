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
const ABAS: { id: Aba; rotulo: string; curto?: string }[] = [
  { id: 'conclusoes', rotulo: 'Considerações gerais', curto: 'Geral' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado orçamentário', curto: 'Resultado' },
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
  const ir = ({ aba: destino, sub: detalhe }: Destino) => {
    if (detalhe) setSub((x) => ({ ...x, [destino]: detalhe }))
    escolheAba(destino)
    document.getElementById(`aba-${destino}`)?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="painel min-h-screen bg-surface print:min-h-0 print:bg-paper">
      <header className="painel-cabecalho bg-navy-deep text-on-navy print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 md:px-8 md:py-5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span aria-hidden="true" className="painel-marca aspect-[105/139] w-10 shrink-0 rounded-md sm:w-12" />
            <div className="min-w-0">
              <p className="mb-1 text-label tracking-normal text-on-navy/85">{IDENTIDADE.faixa}</p>
              <h1 className="text-title font-semibold tracking-tight md:text-headline">{IDENTIDADE.painel}</h1>
              <p className="mt-1 text-label tracking-normal md:text-small">{IDENTIDADE.apoio}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
            <ControlesAcessibilidade compacto className="flex max-w-full flex-wrap" />
            <button type="button" onClick={() => window.print()} title="Abre a impressão: escolha “Salvar como PDF”"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-brand border border-current px-2.5 text-small font-semibold hover:underline">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2h12v-2" /></svg>
              PDF<span className="sr-only"> (exportar esta seção)</span>
            </button>
          </div>
        </div>
      </header>

      <div className="painel-navegacao z-30 border-b border-line bg-paper md:sticky md:top-0 print:hidden">
        <div role="tablist" aria-label="Seções do painel" className="painel-abas mx-auto max-w-[1600px] gap-x-1 px-4 sm:px-6 md:gap-x-2 md:px-8">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1}
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
              className={`min-h-11 border-b-[3px] px-1.5 py-2 text-small font-semibold leading-tight focus-visible:outline-offset-[-3px] sm:px-3 md:px-4 ${aba === a.id ? 'border-navy bg-surface text-navy' : 'border-transparent text-ink-soft hover:bg-surface hover:text-navy'}`}>
              {a.curto ? (
                <>
                  <span className="sm:hidden">{a.curto}{a.id === 'conclusoes' && <span className="sr-only"> · {a.rotulo}</span>}</span>
                  <span className="hidden sm:inline">{a.rotulo}</span>
                </>
              ) : a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-3 sm:px-6 md:px-8 md:pt-5 print:max-w-none print:p-0">
        <div className="hidden print:block">
          <p className={NOTA_DISCRETA}>{IDENTIDADE.nome} · {IDENTIDADE.apoio}</p>
          <h1 className="text-title font-semibold">{IDENTIDADE.painel} · {abaAtual.rotulo}</h1>
        </div>

        {ABAS.filter((a) => a.id !== aba).map(({ id }) => (
          <div key={id} role="tabpanel" id={`painel-${id}`} aria-labelledby={`aba-${id}`} hidden />
        ))}
        <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} tabIndex={0}>
          {aba === 'conclusoes' && <h2 className="mb-3 text-title md:text-section print:hidden">{abaAtual.rotulo}</h2>}
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
