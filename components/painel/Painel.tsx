'use client'

import { useEffect, useState } from 'react'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { VisaoGeral, type Vista, type IndicadoresFiscais as Fiscais } from './Agregado'
import { IndicadoresLrf, IndicadoresCapag } from './IndicadoresFiscais'
import { NOTA_DISCRETA, Subvisoes } from './Estrutura'
import { DespesaOrgaos, type OrgaoPloa } from './DespesaOrgaos'
import { ControlesAcessibilidade } from '@/components/TopBar'
import type { DadosReceita } from './projecao'
import type { LinhaMacro } from '@/lib/macro'

type Aba = Vista
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado orçamentário' },
]

type MacroProps = {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; fonteIpca: string
}

/**
 * Painel em três seções: Receita, Despesa e Resultado orçamentário, cada uma a PLOA 2027 contra a história, o fechamento projetado de 2026 e a nossa
 * projeção de 2027. O restante do material (cenários, detalhamentos, LRF e CAPAG, método) ficou de fora por ora, até se decidir o que acrescentar.
 */
export function Painel({ macro, receitaMes, elementosPloa, orgaos, fiscais, rclPloa, pessoalExecPloa }: { macro: MacroProps; receitaMes: DadosReceita; elementosPloa: Record<string, Record<string, number>>; orgaos: OrgaoPloa[]; fiscais: Fiscais; rclPloa: number; pessoalExecPloa: number }) {
  const [aba, setAba] = useState<Aba>('receita')
  const [menuAberto, setMenuAberto] = useState(false)
  useEffect(() => {
    if (!menuAberto) return
    const fecha = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false) }
    window.addEventListener('keydown', fecha)
    return () => window.removeEventListener('keydown', fecha)
  }, [menuAberto])
  useEffect(() => {
    const h = window.location.hash.slice(1)
    /* endereços das versões anteriores: visão geral e demais abas levam à seção mais próxima */
    const alvo = h === 'despesa' || h === 'fontes' || h === 'atencao' ? 'despesa' : h === 'resultado' ? 'resultado' : 'receita'
    setAba(alvo)
  }, [])
  const escolheAba = (a: Aba) => { setAba(a); try { window.history.replaceState(null, '', `#${a}`) } catch { /* sem histórico: segue */ } }
  const abaAtual = ABAS.find((a) => a.id === aba)!

  return (
    <div className="painel mx-auto max-w-[1600px] px-4 pb-8 sm:px-5 md:px-8">
      {/* barra no topo da página, fixa ao rolar: identidade, seções (abas no computador, menu no celular) e exportação */}
      <div className="print:hidden sticky top-0 z-30 -mx-4 border-b border-navy-deep bg-navy px-4 text-on-navy sm:-mx-5 sm:px-5 md:-mx-8 md:px-8 [&_:focus-visible]:outline-[rgb(var(--on-navy))]">
        <div className="flex items-center gap-2 lg:gap-6">
          <div className="hidden shrink-0 py-1.5 lg:block">
            <span className="block text-body font-semibold leading-tight text-on-navy">{IDENTIDADE.nome}</span>
            <span className="block text-label normal-case leading-tight tracking-normal text-on-navy/75">{IDENTIDADE.apoio}</span>
          </div>
          <div role="tablist" aria-label="Seções do painel" className="hidden md:flex">
            {ABAS.map((a) => (
              <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1}
                onClick={() => escolheAba(a.id)}
                onKeyDown={(e) => {
                  const i = ABAS.findIndex((x) => x.id === aba)
                  if (e.key === 'ArrowRight') { e.preventDefault(); escolheAba(ABAS[(i + 1) % ABAS.length].id) }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); escolheAba(ABAS[(i + ABAS.length - 1) % ABAS.length].id) }
                }}
                className={`-mb-px whitespace-nowrap border-b-[3px] px-4 py-2.5 text-small font-semibold lg:px-5 ${aba === a.id ? 'border-on-navy text-on-navy' : 'border-transparent text-on-navy/70 hover:text-on-navy'}`}>
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="relative md:hidden">
            <button type="button" aria-expanded={menuAberto} aria-controls="menu-secoes" onClick={() => setMenuAberto((v) => !v)}
              className="-ml-2 inline-flex items-center gap-2 px-2 py-2.5 text-body font-semibold text-on-navy">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
              {abaAtual.rotulo}
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${menuAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5 5 5-5" /></svg>
            </button>
            {menuAberto && (
              <ul id="menu-secoes" className="absolute left-0 top-full z-40 mt-px w-64 overflow-hidden rounded-b-brand border border-line bg-paper shadow-lg">
                {ABAS.map((a) => (
                  <li key={a.id} className="border-t border-line first:border-t-0">
                    <button type="button" aria-current={aba === a.id ? 'page' : undefined} onClick={() => { escolheAba(a.id); setMenuAberto(false); window.scrollTo({ top: 0 }) }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-body ${aba === a.id ? 'bg-surface font-semibold text-navy' : 'text-ink'}`}>
                      {a.rotulo}{aba === a.id && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="ml-auto text-label font-semibold normal-case tracking-normal text-on-navy lg:hidden"><span className="md:hidden">{IDENTIDADE.nome}</span></span>
          <ControlesAcessibilidade compacto className="ml-auto hidden xl:flex" />
          <button type="button" onClick={() => window.print()} title="Abre a impressão: escolha “Salvar como PDF”" className="inline-flex items-center gap-1.5 rounded-brand px-2.5 py-1.5 text-small font-semibold text-on-navy/85 hover:bg-white/10 hover:text-on-navy md:ml-auto xl:ml-0">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2h12v-2" /></svg>
            PDF<span className="sr-only"> (exportar esta seção)</span>
          </button>
        </div>
      </div>

      <h1 className="sr-only print:hidden">{abaAtual.rotulo}</h1>
      <div className="hidden print:block">
        <p className={`${NOTA_DISCRETA}`}>{IDENTIDADE.nome} · {IDENTIDADE.apoio}</p>
        <h1 className="text-title font-semibold">{IDENTIDADE.painel} · {abaAtual.rotulo}</h1>
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="mt-3">
        {aba === 'despesa' ? (
          <Subvisoes key="despesa" rotulo="Despesa" itens={[
            { id: 'resumo', rotulo: 'Resumo', conteudo: <VisaoGeral vista="despesa" elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} /> },
            { id: 'orgao', rotulo: 'Detalhamento por órgão', conteudo: <DespesaOrgaos orgaos={orgaos} ipca={macro.ipca} /> },
          ]} />
        ) : aba === 'resultado' ? (
          <Subvisoes key="resultado" rotulo="Resultado" itens={[
            { id: 'resultado', rotulo: 'Resultado', conteudo: <VisaoGeral vista="resultado" elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} /> },
            { id: 'lrf', rotulo: 'LRF', conteudo: <IndicadoresLrf receita={macro.receita} despesa={macro.despesa} dados={receitaMes} fiscais={fiscais} rclPloa={rclPloa} pessoalExecPloa={pessoalExecPloa} /> },
            { id: 'capag', rotulo: 'CAPAG', conteudo: <IndicadoresCapag receita={macro.receita} despesa={macro.despesa} dados={receitaMes} fiscais={fiscais} rclPloa={rclPloa} pessoalExecPloa={pessoalExecPloa} /> },
          ]} />
        ) : (
          <VisaoGeral key={aba} vista={aba} elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} />
        )}
      </div>

      <p className={`mt-4 ${NOTA_DISCRETA} print:mt-2`}>
        <span className="print:hidden">{IDENTIDADE.aviso}</span>
      </p>
    </div>
  )
}
