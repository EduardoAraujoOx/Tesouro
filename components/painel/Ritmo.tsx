'use client'

import { NOTA_DISCRETA } from './Estrutura'
import { useMemo } from 'react'
import { milhoes, numero } from '@/lib/formato'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct, variacoes } from './GraficosMacro'
import { ANOS_RITMO, ritmoReceita, type DadosReceita, type RitmoGrupo } from './projecao'
import { COD_GRUPO } from './codigos'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const crescimento = (de: number, para: number) => variacoes(de, para, 0).nominal

/**
 * Ritmo da arrecadação: o acumulado até o mesmo mês em cada ano (líquido das deduções), o crescimento ano a ano,
 * quanto do ano já costuma estar arrecadado nesse ponto e o fechamento de 2026 que isso implica.
 */
export function RitmoReceita({ dados }: { dados: DadosReceita }) {
  const r = useMemo(() => ritmoReceita(dados), [dados])
  const mes = NOMES_MES[r.meses - 1]
  const linhas = [...r.grupos, r.total].map((g) => ({ ...g, chave: g.id }))
  return (
    <Cartao titulo={`Arrecadação acumulada até ${mes}`}>
      <TabelaItens altura="livre" itens={linhas} legenda={`Arrecadação líquida acumulada de janeiro a ${mes}, por tipo de receita, em R$ milhões`} colunas={[
        { rotulo: 'R$ milhões · natureza', valor: (g) => <span className={g.id === 'total' ? 'font-semibold' : ''}>{COD_GRUPO[g.id] && <span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[6.5rem] md:text-small">{COD_GRUPO[g.id]}</span>}{g.rotulo}{g.oscila && <span title="A participação do período no ano oscila muito entre os anos: projeção pouco confiável" className="ml-1 text-ink-soft">≈</span>}</span> },
        ...ANOS_RITMO.map((a) => ({ rotulo: String(a), valor: (g: RitmoGrupo) => mi(g.acumulado[a]), secundaria: true })),
        { rotulo: '2026', valor: (g) => <span className="font-semibold">{mi(g.acumulado[2026])}</span>, secundaria: true },
        { rotulo: 'Δ% 24', valor: (g) => fmtPct(crescimento(g.acumulado[2023], g.acumulado[2024])), secundaria: true },
        { rotulo: 'Δ% 25', valor: (g) => fmtPct(crescimento(g.acumulado[2024], g.acumulado[2025])), secundaria: true },
        { rotulo: 'Δ% 26', valor: (g) => <span className="font-semibold">{fmtPct(crescimento(g.acumulado[2025], g.acumulado[2026]))}</span> },
        { rotulo: `% do ano até ${mes.slice(0, 3)}`, valor: (g) => `${numero(g.participacaoMedia * 100, 1)}%`, secundaria: true },
        { rotulo: 'Fechamento 2026', valor: (g) => <span className="font-semibold">{Number.isFinite(g.central) ? mi(g.central) : '–'}</span> },
        { rotulo: 'Faixa', valor: (g) => (Number.isFinite(g.min) ? `${mi(g.min)} a ${mi(g.max)}` : '–'), secundaria: true },
      ]} />
      <p className={`mt-2 ${NOTA_DISCRETA}`}>
        Acumulado líquido das deduções (transferências aos municípios e Fundeb). Δ% 24, 25 e 26: crescimento do acumulado sobre o do ano anterior, no mesmo período. “% do ano”: média de 2022 a 2025 do quanto do ano já estava arrecadado até {mes}.
        Fechamento = acumulado de 2026 ÷ essa participação; a faixa usa a menor e a maior participação observadas. ≈ marca tipos de receita cuja participação oscila muito entre os anos. Fontes: Siconfi (RREO, Anexo 01) para 2023 a 2025 e Portal de Dados Abertos do ES para 2026, que coincidem.
      </p>
    </Cartao>
  )
}
