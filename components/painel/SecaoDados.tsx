'use client'

import type { DadosPainel } from '@/lib/dados-painel'
import { VisaoGeral, type Vista } from './Agregado'
import { AvisoAjustes } from './AvisoAjustes'
import { DespesaOrgaos } from './DespesaOrgaos'
import { Emendas } from './Emendas'
import { Subvisoes } from './Estrutura'
import { IndicadoresCapag, IndicadoresLrf } from './IndicadoresFiscais'
import { OrcadoExecutado } from './OrcadoExecutado'
import { ProjecaoReceitas } from './ProjecaoReceitas'

export function SecaoDados({ vista, dados, ativa, onMudar, relatorio = false }: {
  vista: Vista
  dados: DadosPainel
  ativa?: string
  onMudar?: (id: string) => void
  relatorio?: boolean
}) {
  const { macro, elementosPloa, receitaMes, ajustes, orgaos, fiscais, rclPloa, pessoalExecPloa, loa, receitaAnual, emendas, projecaoReceitas } = dados
  const geral = <VisaoGeral vista={vista} elementosPloa={elementosPloa} receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} dados={receitaMes} />
  const aviso = <AvisoAjustes ajustes={ajustes} />
  const indicadores = { receita: macro.receita, despesa: macro.despesa, dados: receitaMes, fiscais, rclPloa, pessoalExecPloa }
  const itens = vista === 'receita'
    ? [
        { id: 'resumo', rotulo: 'Resumo', conteudo: geral },
        { id: 'projecao', rotulo: 'Projeção das maiores fontes', conteudo: <ProjecaoReceitas dados={projecaoReceitas} /> },
      ]
    : vista === 'despesa'
    ? [
        { id: 'resumo', rotulo: 'Resumo', conteudo: <>{aviso}{geral}</> },
        { id: 'orgao', rotulo: 'Detalhamento por órgão', conteudo: <>{aviso}<DespesaOrgaos orgaos={orgaos} ipca={macro.ipca} /></> },
        { id: 'emendas', rotulo: 'Emendas', conteudo: <Emendas dados={emendas} /> },
      ]
    : [
        { id: 'resultado', rotulo: 'Resultado', conteudo: <>{aviso}{geral}</> },
        { id: 'orcado', rotulo: 'Orçado × executado', conteudo: <OrcadoExecutado receita={macro.receita} dados={receitaMes} loa={loa} receitaAnual={receitaAnual} /> },
        { id: 'lrf', rotulo: 'LRF', conteudo: <>{aviso}<IndicadoresLrf {...indicadores} /></> },
        { id: 'capag', rotulo: 'CAPAG', conteudo: <>{aviso}<IndicadoresCapag {...indicadores} /></> },
      ]

  return relatorio
    ? itens.map(({ id, rotulo, conteudo }) => (
        <div key={id} id={`${vista}-${id}`} className="relatorio-subsecao mt-3">
          {id !== itens[0].id && <h3 className="mb-1.5 text-body">{rotulo}</h3>}
          {conteudo}
        </div>
      ))
    : <Subvisoes rotulo={vista === 'receita' ? 'Receita' : vista === 'despesa' ? 'Despesa' : 'Resultado'} itens={itens} ativa={ativa} onMudar={onMudar} />
}
