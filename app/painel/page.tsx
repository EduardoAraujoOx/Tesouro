import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { coletadoEm, linhasCompactas, nomesPainel, ORGAOS_OUTROS_PODERES, pessoalPloaExecutivo, ploaPorElemento, reservaContingenciaPloa, totaisPorFuncao } from '@/lib/orcamento'
import { despesaMacro, parametros, receitaMacro } from '@/lib/macro'
import receitaRaw from '@/data/receita.json'
import rreoRaw from '@/data/rreo.json'
import rclRaw from '@/data/ploa2027-rcl.json'
import indicadoresRaw from '@/data/indicadores.json'
import petroleoRaw from '@/data/petroleo-sefaz.json'
import mercadoRaw from '@/data/petroleo-mercado.json'
import type { PetroleoMercado, PetroleoSefaz } from '@/components/painel/Fontes'
import type { DadosReceita } from '@/components/painel/ReceitaMensal'
import type { RclOficial } from '@/components/painel/Agregado'

export const metadata: Metadata = {
  title: { absolute: `${IDENTIDADE.nome} · ${IDENTIDADE.painel}` },
  description: IDENTIDADE.aviso,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: IDENTIDADE.painel, description: IDENTIDADE.aviso },
  robots: { index: false, follow: false },
}

/** RCL oficial (LRF, art. 2º, IV): série do RGF/RREO até 2025, Quadro VI da Mensagem para a PLOA 2027, e o indicador de pessoal do RGF do Poder Executivo. */
function rclOficial(): RclOficial {
  const q = (rclRaw as unknown as { linhas: Record<string, number> }).linhas
  const serie = (rreoRaw as unknown as { serie: { ano: number; rcl12m: number }[] }).serie
  const lrf = (indicadoresRaw as unknown as { lrf: { serie: { ano: number; quad: number; pessoal: { valor: number; limite: number; prudencial: number } }[] } }).lrf.serie
  return {
    historico: Object.fromEntries(serie.filter((s) => s.ano >= 2023 && s.ano <= 2025).map((s) => [String(s.ano), s.rcl12m])),
    ploa27: { rcl: q.rcl, correntes: q.receitas_correntes, previdenciarias: q.contribuicao_servidor_previdencia + q.compensacao_previdenciaria + q.rendimento_aplicacoes_previdenciarias },
    rgfPessoal: lrf.filter((x) => x.ano >= 2023).map((x) => ({ ano: x.ano, quad: x.quad, valor: x.pessoal.valor, limite: x.pessoal.limite, prudencial: x.pessoal.prudencial })),
    pessoalExecutivoPloa: pessoalPloaExecutivo(),
  }
}

export default function PaginaPainel() {
  const linhas = linhasCompactas()
  const coleta = new Date(coletadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return <Painel linhas={linhas} nomes={nomesPainel(linhas)} coleta={coleta} outrosPoderes={[...ORGAOS_OUTROS_PODERES]}
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    funcoes={totaisPorFuncao()} contingencia={reservaContingenciaPloa()} elementosPloa={ploaPorElemento()} rclOficial={rclOficial()} receitaMes={receitaRaw as unknown as DadosReceita} petroleo={petroleoRaw as unknown as PetroleoSefaz} mercado={mercadoRaw as unknown as PetroleoMercado} />
}
