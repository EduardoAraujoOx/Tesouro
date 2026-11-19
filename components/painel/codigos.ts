/**
 * Código da natureza da receita (classificação por categoria econômica, origem e espécie, Portaria Interministerial STN/SOF nº 163/2001
 * e atualizações) e do grupo de natureza da despesa (GND), para identificar cada linha nas tabelas do painel.
 * As chaves são as do quadro "Evolução da Receita" e "Evolução da Despesa" da PLOA 2027 (data/ploa2027-macro.json).
 */
export const COD_RECEITA: Record<string, string> = {
  receitas_correntes: '1',
  impostos_taxas_cm: '1.1',
  impostos: '1.1.1',
  ipva: '1.1.1.2.51',
  itcd: '1.1.1.2.52',
  irrf: '1.1.1.3.03',
  icms: '1.1.1.4',
  taxas: '1.1.2',
  contrib_melhoria: '1.1.3',
  contribuicoes: '1.2',
  patrimonial: '1.3',
  agropecuaria: '1.4',
  industrial: '1.5',
  servicos: '1.6',
  transf_correntes: '1.7',
  transf_corr_uniao: '1.7.1',
  transf_corr_outras: '1.7.x',
  outras_correntes: '1.9',
  intra: '7',
  receitas_capital: '2',
  operacoes_credito: '2.1',
  alienacao: '2.2',
  amortizacao_emprestimos: '2.3',
  transf_capital: '2.4',
  transf_cap_uniao: '2.4.1',
  transf_cap_outras: '2.4.x',
  outras_capital: '2.9',
  deducoes: '9',
  ded_municipios: '9',
  ded_fundeb: '9',
  ded_outras: '9',
}

/** Chaves dos grupos usados na Visão geral e na tabela de ritmo, ligadas ao código acima. */
export const COD_GRUPO: Record<string, string> = {
  imp: '1.1.1', impostos: '1.1.1', icms: '1.1.1.4', ipva: '1.1.1.2.51', irrf: '1.1.1.3.03', itcd: '1.1.1.2.52',
  taxas: '1.1.2–1.1.3', contrib: '1.2', patrim: '1.3', transf: '1.7', tuniao: '1.7.1', toutras: '1.7.x',
  demais: '1.4–1.6, 1.9', intra: '7', cap: '2', cred: '2.1', capout: '2.2–2.4, 2.9', ded: '9', liq: '', total: '',
}

/** Despesa: grupo de natureza da despesa (GND). */
export const COD_DESPESA: Record<string, string> = {
  pessoal: '1', juros: '2', outras: '3', inv: '4', invf: '5', amort: '6', res: '9', corr: '', capd: '', tot: '',
  despesas_correntes: '', pessoal_chave: '1', outras_correntes: '3', investimento: '4', inversoes: '5', amortizacao: '6', reserva_rpps: '9', reserva_contingencia: '9',
}
