// Textos extraídos de radar_fiscal_v4_final.html — variável SRC_GL
// Chave = rowLabel exato conforme banco de dados

export const GLOSSARIO_FONTES: Record<string, string> = {
  // Grupo TESOURO
  'RECURSOS ADMINISTRADOS PELO TESOURO (I)':
    'Conjunto de recursos sob gestão direta do Tesouro Estadual. São os de uso mais livre — impostos e receitas sem destinação constitucional específica.',

  // Sublinhas TESOURO
  'Recursos Não Vinculados de Impostos':
    'ICMS, IPVA, ITCD e outros impostos estaduais sem vinculação específica. Principal base financeira do Tesouro para despesas gerais de governo.',
  'Outros Recursos Não Vinculados - Administração Direta':
    'Receitas da administração direta sem vinculação — patrimônio, aluguéis, retornos de empréstimos e outras entradas sem destinação prevista em lei.',
  'Outros Recursos Não Vinculados - Precatórios - Ação Civil Originária 2178':
    'Recursos da União para pagamento de precatórios (dívidas judiciais do Estado) no âmbito da Ação Cível Originária 2178 no STF.',
  'Recursos Não Vinculados da Compesação de Impostos':
    'Compensação federal pela desoneração do ICMS sobre exportações (Lei Kandir, LC 87/1996). O Estado abre mão de arrecadar; a União repõe parte da perda.',
  'Royalties do Petróleo - Destinação Não Vinculada':
    'Participação especial e royalties pelo petróleo produzido na costa do ES que não têm destinação legal específica — uso livre pelo Tesouro.',
  'Recursos de Operações de Crédito - Reembolso de Despesas Executadas com Recurso do Tesouro':
    'Recursos de empréstimos vinculados a projetos cujos gastos serão ressarcidos ao Tesouro pela fonte original do financiamento.',

  // Grupo DEMAIS
  'DEMAIS RECURSOS - PODER EXECUTIVO (II)':
    'Fontes com destinação legal específica (saúde, educação, fundos) e entidades da administração indireta. Cada fonte tem regras de aplicação e não podem ser usadas livremente pelo Tesouro.',

  // Sublinhas DEMAIS
  'FEFIN':
    'Fundo Estadual de Financiamento. Braço de crédito do Estado para projetos de desenvolvimento econômico e social com previsão de retorno financeiro.',
  'FUNSES':
    'Fundo de Saúde do ES. Concentra os recursos do SUS e receitas próprias destinadas à saúde pública estadual, gerido pela SESA.',
  'ROYALTIES DO PETRÓLEO - DESTINAÇÃO VINCULADA':
    'Parcela dos royalties de petróleo que, por força de lei, tem destinação obrigatória (saúde, educação etc.). Não pode ser usada livremente pelo Tesouro.',
  'OUTROS RECURSOS NÃO VINCULADOS - ADMINISTRAÇÃO INDIRETA':
    'Receitas de autarquias, fundações e outros entes da administração indireta sem vinculação legal de aplicação.',
  'RECURSOS VINCULADOS A FUNDOS':
    'Recursos geridos por fundos públicos estaduais com finalidade específica definida em lei — cultura, ciência, tecnologia, meio ambiente etc.',
  'RECURSOS VINCULADOS À EDUCAÇÃO':
    'Recursos de aplicação constitucional obrigatória em manutenção e desenvolvimento do ensino. Mínimo: 25% da receita líquida de impostos (Art. 212 CF).',
  'RECURSOS VINCULADOS À SAUDE':
    'Recursos de aplicação obrigatória em ações e serviços públicos de saúde. Mínimo: 12% da receita líquida de impostos (LC 141/2012).',
  'RECURSOS DE OPERAÇÕES DE CRÉDITO':
    'Recursos de empréstimos (BNDES, BID, Banco Mundial etc.) vinculados exclusivamente aos projetos de investimento que motivaram a contratação.',
  'RECURSOS VINCULADOS À ASSISTÊNCIA SOCIAL':
    'Transferências do Fundo Nacional de Assistência Social (FNAS) e receitas próprias destinadas por lei a políticas de assistência social.',
  'DEMAIS VINCULAÇÕES DECORRENTES DE TRANSFERÊNCIAS':
    'Transferências voluntárias da União com finalidade específica definida pelo transferidor — convênios, contratos de repasse, termos de colaboração.',
  'RECURSOS DA CONTRIBUIÇÃO DE INTERVENÇÃO NO DOMÍNIO ECONÔMICO - CIDE':
    'Parcela da CIDE-combustíveis repassada pela União, com aplicação vinculada a projetos de infraestrutura de transporte (Lei 10.336/2001).',
  'RECURSOS VINCULADOS AO TRÂNSITO - MULTAS':
    'Receitas de multas de trânsito com destinação obrigatória a projetos de segurança viária e educação de trânsito (CTB, Art. 320).',
  'RECURSOS PROVENIENTES DE TAXAS DE CONTROLE E FISCALIZAÇÃO AMBIENTAL DO ES':
    'Taxas cobradas pelo IEMA por serviços de licenciamento e fiscalização ambiental, vinculadas às atividades do órgão ambiental estadual.',
  'RECURSOS DE ALIENAÇÃO DE BENS':
    'Receitas de venda de bens do patrimônio público. Por lei, só podem financiar despesas de capital (novos investimentos) — vedado o uso em custeio.',
  'RECURSOS VINCULADOS AO FUNDO DE COMBATE E ERRADICAÇÃO DA POBREZA':
    'Fundo estadual criado com base na EC 31/2000, financiado por adicional de ICMS, destinado exclusivamente a programas de combate à pobreza.',
  'DEMAIS RECURSOS VINCULADOS - ROMPIMENTO DA BARRAGEM DE FUNDÃO/MARIANA':
    'Recursos do acordo de reparação pelo rompimento da Barragem de Fundão (Samarco/Vale/BHP, Mariana/MG, nov. 2015). Uso vinculado à recuperação da bacia do Rio Doce.',
  'DEMAIS RECURSOS VINCULADOS':
    'Demais fontes com vinculação legal específica que não se enquadram nas categorias anteriores — diversas origens com regras de aplicação particulares.',
  'RECURSOS EXTRAORÇAMENTÁRIOS':
    'Recursos de terceiros em custódia do Estado (cauções, depósitos, consignações). Não são receita própria — são obrigações do Estado para com terceiros.',

  // Grupo PREVIDÊNCIA
  'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL (IV)':
    'Recursos do IPAJM (Instituto de Previdência dos Servidores do ES) para pagamento de benefícios previdenciários. Constitucionalmente protegidos contra uso em outras finalidades.',
}
