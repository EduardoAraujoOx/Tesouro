/**
 * Áreas da Subsecretaria do Tesouro Estadual (SUBSET) que recebem mensagens pelo Fale conosco.
 *
 * Fonte: Decreto nº 5.892-R, de 29/11/2024 (Anexo III, organograma, e arts. 8 a 13, competências).
 * Onde o decreto descreve a competência, o texto de `assuntos` a resume; nas demais unidades, repete apenas o nome da área.
 * ATENÇÃO: a estrutura muda por decreto. A Subsecretaria deve validar esta lista, revisar `assuntos`
 * e informar o e-mail de cada área (`email`). Sem `email`, a mensagem vai para o endereço padrão (variável CONTATO_EMAIL_PADRAO).
 */
export type NivelArea = 'subsecretaria' | 'gerencia' | 'subgerencia'
export type Area = {
  id: string
  sigla: string
  nome: string
  nivel: NivelArea
  pai?: string
  assuntos: string
  email?: string
}

export const AREAS: Area[] = [
  {
    id: 'subset', sigla: 'SUBSET', nome: 'Subsecretaria do Tesouro Estadual', nivel: 'subsecretaria',
    assuntos: 'Assuntos gerais do Tesouro Estadual, ou quando você não sabe qual área procurar. A mensagem é lida e encaminhada à área responsável.',
  },

  // Gerência de Encargos Gerais e Regularidade Fiscal
  { id: 'geref', sigla: 'GEREF', nome: 'Gerência de Encargos Gerais e Regularidade Fiscal do Estado', nivel: 'gerencia', pai: 'subset', assuntos: 'Encargos gerais do Estado e regularidade fiscal do Estado.' },
  { id: 'suref', sigla: 'SUREF', nome: 'Subgerência de Regularidade Fiscal do Estado', nivel: 'subgerencia', pai: 'geref', assuntos: 'Regularidade fiscal do Estado.' },
  { id: 'sueng', sigla: 'SUENG', nome: 'Subgerência de Encargos Gerais do Estado', nivel: 'subgerencia', pai: 'geref', assuntos: 'Encargos gerais do Estado.' },

  // Gerência de Administração e Fiscalização Financeira
  {
    id: 'gefin', sigla: 'GEFIN', nome: 'Gerência de Administração e Fiscalização Financeira do Estado', nivel: 'gerencia', pai: 'subset',
    assuntos: 'Administração financeira e fiscal do Estado: Conta Única, liberação de recursos às unidades gestoras, ordens bancárias, repasses aos demais Poderes e orientação aos Grupos Financeiros Setoriais.',
  },
  { id: 'susif', sigla: 'SUSIF', nome: 'Subgerência de Gestão do Sistema de Finanças Públicas do Estado', nivel: 'subgerencia', pai: 'gefin', assuntos: 'Gestão do sistema de finanças públicas do Estado.' },
  { id: 'sugef', sigla: 'SUGEF', nome: 'Subgerência de Gestão do Fundo Soberano', nivel: 'subgerencia', pai: 'gefin', assuntos: 'Gestão do Fundo Soberano do Espírito Santo.' },
  { id: 'supef', sigla: 'SUPEF', nome: 'Subgerência de Programação e Gestão Financeira', nivel: 'subgerencia', pai: 'gefin', assuntos: 'Programação e gestão financeira.' },
  {
    id: 'sucog', sigla: 'SUCOG', nome: 'Subgerência de Controle Fiscal e do Gasto Público', nivel: 'subgerencia', pai: 'gefin',
    assuntos: 'Acompanhamento das despesas do Poder Executivo, estudos sobre o desempenho das finanças do Estado e eficiência do gasto público.',
  },

  // Gerência de Contabilidade Geral
  {
    id: 'gecog', sigla: 'GECOG', nome: 'Gerência de Contabilidade Geral do Estado', nivel: 'gerencia', pai: 'subset',
    assuntos: 'Normas e manuais contábeis, plano de contas, orientação no uso do SIGEFES e monitoramento dos balancetes e dos relatórios fiscais (RREO e RGF).',
  },
  { id: 'sufic', sigla: 'SUFIC', nome: 'Subgerência de Informações Fiscais do Estado', nivel: 'subgerencia', pai: 'gecog', assuntos: 'Informações fiscais do Estado.' },
  { id: 'sumoc', sigla: 'SUMOC', nome: 'Subgerência de Análise e Monitoramento Contábil', nivel: 'subgerencia', pai: 'gecog', assuntos: 'Análise e monitoramento contábil.' },
  {
    id: 'sugov', sigla: 'SUGOV', nome: 'Subgerência de Contas de Governo', nivel: 'subgerencia', pai: 'gecog',
    assuntos: 'Demonstrações contábeis consolidadas do Estado e Prestação de Contas Anual do Governador (Balanço Geral do Estado).',
  },
  {
    id: 'sunop', sigla: 'SUNOP', nome: 'Subgerência de Normas, Procedimentos e Orientação Contábil', nivel: 'subgerencia', pai: 'gecog',
    assuntos: 'Normas, procedimentos e orientação contábil, e rotinas de registro contábil no SIGEFES.',
  },
  {
    id: 'suinc', sigla: 'SUINC', nome: 'Subgerência de Qualidade da Informação Contábil', nivel: 'subgerencia', pai: 'gecog',
    assuntos: 'Qualidade da informação contábil: Matriz de Saldos Contábeis (MSC), Declaração de Contas Anuais (DCA) e Ranking da Qualidade da Informação Contábil e Fiscal.',
  },

  // Gerência de Política Fiscal e da Dívida Pública
  { id: 'gepof', sigla: 'GEPOF', nome: 'Gerência de Política Fiscal e da Dívida Pública do Estado', nivel: 'gerencia', pai: 'subset', assuntos: 'Política fiscal e dívida pública do Estado.' },
  { id: 'supfi', sigla: 'SUPFI', nome: 'Subgerência de Política Fiscal', nivel: 'subgerencia', pai: 'gepof', assuntos: 'Política fiscal.' },
  { id: 'sudip', sigla: 'SUDIP', nome: 'Subgerência da Dívida Pública', nivel: 'subgerencia', pai: 'gepof', assuntos: 'Dívida pública.' },
  { id: 'suapi', sigla: 'SUAPI', nome: 'Subgerência de Análise Econômico-Fiscal de Projetos de Investimento Público', nivel: 'subgerencia', pai: 'gepof', assuntos: 'Análise econômico-fiscal de projetos de investimento público.' },
]

export const areaPorId = (id: string) => AREAS.find((a) => a.id === id)
export const gerencias = AREAS.filter((a) => a.nivel === 'gerencia')
export const subgerenciasDe = (idGerencia: string) => AREAS.filter((a) => a.pai === idGerencia && a.nivel === 'subgerencia')
export const rotuloArea = (a: Area) => `${a.nome} (${a.sigla})`
