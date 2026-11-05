'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { GraficoExplorador } from './GraficoExplorador'
import { IconArrow, IconCoins, IconBars, IconShield, IconInfo } from './Icons'
import { numero } from '@/lib/formato'
import type { Indicador } from '@/lib/indicadores'

type Aba = 'capag' | 'lrf'

/** O que a nota A exige em cada indicador da CAPAG (Portaria Normativa MF nº 1.583/2023, art. 3º). */
const EXIGENCIA_NOTA_A: Record<string, string> = {
  endividamento: 'endividamento abaixo de 60% da receita corrente líquida',
  poupanca: 'poupança corrente abaixo de 85% das receitas correntes ajustadas',
  liquidez: 'liquidez relativa de 5% ou mais da receita corrente líquida',
}
const ICONES: Record<string, typeof IconCoins> = { endividamento: IconCoins, poupanca: IconBars, liquidez: IconCoins, pessoal: IconShield, divida: IconShield, garantias: IconShield, credito: IconShield }

const ultimoValor = (i: Indicador) => [...i.pontos].reverse().find((p) => p.valor !== null)

function situacao(i: Indicador, v: number): string {
  const limite = i.referencias.find((r) => r.estilo === 'limite')?.valor
  const alerta = i.referencias.find((r) => r.estilo === 'alerta')?.valor
  if (limite === undefined) return ''
  if (v >= limite) return 'Acima do limite'
  if (alerta !== undefined && v >= alerta) return 'Em alerta'
  return 'Abaixo do limite'
}

/**
 * Bloco "Indicadores em destaque" da página inicial: CAPAG e limites da LRF, com valor atual, gráfico e explicação.
 * Reaproveita as séries do painel (/indicadores), sem texto próprio.
 */
export function IndicadoresDestaque({ indicadores, notaGeral, periodoLrf }: { indicadores: Indicador[]; notaGeral: string; periodoLrf: string }) {
  const uid = useId()
  const [aba, setAba] = useState<Aba>('capag')
  const lista = indicadores.filter((i) => i.familia === aba)
  const [escolha, setEscolha] = useState<Record<Aba, string>>({ capag: 'endividamento', lrf: 'pessoal' })
  const atual = lista.find((i) => i.id === escolha[aba]) ?? lista[0]
  const [foco, setFoco] = useState<number | null>(null)
  const n = atual.pontos.length
  const focoAtual = Math.min(foco ?? n - 1, n - 1)
  const u = ultimoValor(atual)
  const nota = u?.nota
  // na CAPAG, só a linha da nota A (a da nota B comprimiria as barras); na LRF, todos os limites
  const refs = aba === 'capag' ? atual.referencias.slice(0, 1) : atual.referencias

  const faixa = aba === 'capag'
    ? (nota === 'A' ? `Nota A: ${EXIGENCIA_NOTA_A[atual.id]}.` : `Nota ${nota ?? '—'}. A nota A exige ${EXIGENCIA_NOTA_A[atual.id]}.`)
    : `${atual.limite}. Último período: ${periodoLrf}.`

  const tab = (id: Aba, rotulo: string) => (
    <button
      key={id} type="button" aria-pressed={aba === id}
      onClick={() => { setAba(id); setFoco(null) }}
      className={`min-h-11 flex-1 rounded-brand px-3 text-small font-semibold sm:px-4 sm:text-body ${aba === id ? 'bg-navy text-on-navy' : 'text-navy hover:bg-paper'}`}
    >{rotulo}</button>
  )

  return (
    <section aria-labelledby={`${uid}-t`} className="mx-auto mt-6 max-w-page px-5 md:mt-8 md:px-8">
      <div className="rounded-brand border border-line bg-surface p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id={`${uid}-t`} className="text-title md:text-section">Indicadores em destaque</h2>
            <p className="text-small text-ink-soft">Principais indicadores fiscais do Estado</p>
          </div>
          <div className="flex w-full gap-1 rounded-brand bg-paper p-1 sm:w-auto sm:min-w-[22rem]" role="group" aria-label="Grupo de indicadores">
            {tab('capag', `CAPAG (Nota ${notaGeral})`)}
            {tab('lrf', 'Limites da LRF')}
          </div>
          <Link href={`/indicadores?g=${aba}`} className="inline-flex min-h-11 items-center gap-2 text-body font-semibold text-navy underline underline-offset-4">
            Ver todos os indicadores <IconArrow className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-6">
          {/* lista de indicadores com o valor atual */}
          <ul className="divide-y divide-line border-y border-line lg:col-span-3 lg:border-y-0" aria-label="Indicadores do grupo">
            {lista.map((i) => {
              const v = ultimoValor(i)
              const Icone = ICONES[i.id] ?? IconBars
              const ativo = i.id === atual.id
              return (
                <li key={i.id}>
                  <button
                    type="button" aria-pressed={ativo}
                    onClick={() => { setEscolha((e) => ({ ...e, [aba]: i.id })); setFoco(null) }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-brand px-3 py-2 text-left ${ativo ? 'bg-paper ring-2 ring-navy' : 'hover:bg-paper'}`}
                  >
                    <Icone className="h-7 w-7 shrink-0 text-navy" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-small font-semibold text-ink">{i.curto}</span>
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-serif text-title font-semibold text-navy">{v ? `${numero(v.valor, 1)}%` : 'sem dado'}</span>
                        {aba === 'capag' && v?.nota && <span className="rounded-brand border border-navy px-1.5 text-small font-semibold text-navy">{v.nota}</span>}
                        {aba === 'lrf' && v?.valor != null && <span className="text-small text-ink-soft">{situacao(i, v.valor)}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* gráfico */}
          <div className="min-w-0 lg:col-span-6 lg:border-x lg:border-line lg:px-6">
            <h3 className="text-title">{atual.curto}</h3>
            <p className="text-small text-ink-soft">{atual.subtitulo}</p>
            <div className="mt-2">
              <GraficoExplorador
                series={[{ id: atual.id, curto: atual.curto, acumulaNoAno: atual.acumulaNoAno, pontos: atual.pontos }]}
                referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={atual.curto} modo="barras" zero animKey={`${aba}-${atual.id}`} unidade="%"
              />
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-brand bg-paper p-3 text-small font-semibold text-ink">
              <IconInfo className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
              <span>{faixa}</span>
            </p>
          </div>

          {/* explicação */}
          <div className="lg:col-span-3">
            <div className="hidden lg:block">
              <h3 className="text-title">O que é?</h3>
              <p className="mt-1 text-body text-ink">{atual.definicao}</p>
              <h3 className="mt-5 border-t border-line pt-5 text-title">Por que importa?</h3>
              <p className="mt-1 text-body text-ink">{atual.porQueImporta}</p>
            </div>
            <details className="group lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between text-body font-semibold text-navy">O que é e por que importa<span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary>
              <h3 className="mt-2 text-title">O que é?</h3>
              <p className="mt-1 text-body text-ink">{atual.definicao}</p>
              <h3 className="mt-4 text-title">Por que importa?</h3>
              <p className="mt-1 text-body text-ink">{atual.porQueImporta}</p>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}
