/**
 * Identidade institucional da Secretaria da Fazenda (SEFAZ), transcrita do Mapa Estratégico publicado em
 * https://sefaz.es.gov.br/identidade-institucional (a página publica o mapa como imagem; aqui o texto fica acessível).
 */
export const FONTE_MAPA = 'https://sefaz.es.gov.br/identidade-institucional'
export const FONTE_HISTORIA = 'https://sefaz.es.gov.br/historia-institucional'
export const FONTE_ORGANOGRAMA = 'https://organograma.es.gov.br'

/** Definição do Tesouro Estadual, a partir das competências fixadas na Lei nº 12.379/2025 e no Decreto nº 6.005-R/2025. */
export const definicao =
  'O Tesouro Estadual é responsável pela administração financeira e pela contabilidade geral do Governo do Espírito Santo. Gerencia a Conta Única e a programação financeira, coordena a prestação de contas anual do Governador, administra a dívida pública e acompanha a política fiscal, gerencia os fundos públicos a ele vinculados e publica os demonstrativos que expõem a situação fiscal do Estado.'

export const funcoes = [
  {
    titulo: 'Administração financeira',
    sigla: 'GEFIN',
    texto: 'Gerencia a Conta Única do Tesouro Estadual, programa e libera os recursos às unidades gestoras e acompanha as ordens bancárias e os repasses aos demais Poderes.',
    href: '/tesouro/execucao-financeira-tesouro',
  },
  {
    titulo: 'Contabilidade geral e prestação de contas',
    sigla: 'GECOG',
    texto: 'Edita as normas contábeis, mantém o plano de contas, orienta o uso do SIGEFES, consolida as demonstrações do Estado e coordena a prestação de contas anual do Governador.',
    href: '/tesouro/prestacao-de-contas-do-governador',
  },
  {
    titulo: 'Dívida pública e política fiscal',
    sigla: 'GEPOF',
    texto: 'Controla a dívida contratual do Poder Executivo, conduz o Programa de Reestruturação e Ajuste Fiscal junto à União, analisa a capacidade de pagamento e acompanha as metas fiscais.',
    href: '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal',
  },
  {
    titulo: 'Fundos públicos',
    sigla: 'GEFAP',
    texto: 'Gerencia as atividades financeiras, contábeis e orçamentárias dos fundos vinculados ao Tesouro, como o Fundo Soberano, e acompanha a análise de parcerias público-privadas e concessões.',
    href: '/tesouro/funses',
  },
  {
    titulo: 'Encargos gerais e regularidade fiscal',
    sigla: 'GEREF',
    texto: 'Trata de precatórios e sentenças judiciais, restituições de tributos e participações societárias, confere os repasses aos municípios e mantém a regularidade fiscal do Estado perante a União.',
    href: '/tesouro/transferencias-constitucionais-aos-municipios',
  },
  {
    titulo: 'Transparência fiscal',
    sigla: 'SUBSET',
    texto: 'Publica os demonstrativos exigidos pela Lei de Responsabilidade Fiscal, as versões em linguagem cidadã e os indicadores do painel fiscal.',
    href: '/cidadao',
  },
] as const

export const missao = 'Prover recursos e realizar a Gestão Fiscal do Estado do Espírito Santo, de forma a viabilizar o Desenvolvimento Econômico e Social.'
export const visao = 'Ser reconhecida por promover o equilíbrio das contas públicas e a excelência em Administração Tributária, garantindo a estabilidade do modelo tributário vigente e viabilizando as políticas públicas e o controle social.'
export const valores = ['Integridade', 'Colaboração', 'Inovação', 'Efetividade', 'Transparência', 'Justiça Fiscal', 'Valorização das Pessoas']

export const resultadosParaSociedade = [
  'Fomentar o controle social do gasto público',
  'Promover a sustentabilidade fiscal e financeira do Estado',
  'Desenvolver maior transparência e relacionamento com os diversos públicos',
]

export const objetivosFinalisticos = [
  'Aprimorar os sistemas de administração financeira e contábil e o controle da dívida pública estadual, assegurando a sustentabilidade das contas estaduais.',
  'Ampliar a base tributária com políticas de incentivo que estimulem o crescimento das empresas locais e a atração de novos investimentos.',
  'Facilitar o acesso ao uso dos serviços da SEFAZ, oferecendo soluções mais simples, rápidas e eficientes, em busca da conformidade tributária.',
]

/** Secretário de Estado da Fazenda, conforme a página oficial (https://sefaz.es.gov.br/benicio-suzana-costa). */
export const secretario = {
  nome: 'Benicio Suzana Costa',
  cargo: 'Secretário de Estado da Fazenda',
  resumo:
    'Auditor fiscal da Secretaria da Fazenda do Espírito Santo desde 2016, foi também subsecretário da Receita Estadual. É especialista em Direito Tributário e graduado em Engenharia Elétrica pela Universidade Federal do Espírito Santo (Ufes). Mestrando em Administração e Contabilidade pela Fucape Business School.',
  fonte: 'https://sefaz.es.gov.br/benicio-suzana-costa',
}

/** Marcos da história da Fazenda capixaba, resumidos do texto de "História Institucional" da SEFAZ. */
export const marcosHistoria = [
  { quando: 'Desde 1560', texto: 'No período colonial, as funções de Fazenda eram exercidas na Capitania pela Provedoria da Fazenda Real.' },
  { quando: '1809', texto: 'É criada a Junta de Administração da Real Fazenda do Espírito Santo, subordinada ao Real Erário, no Rio de Janeiro.' },
  { quando: '1904', texto: 'Na República, as funções fazendárias passam a um órgão chamado Tesouro, regulamentado pelo Decreto nº 82, de 12 de dezembro de 1904.' },
  { quando: 'Décadas de 1920 a 1950', texto: 'A Secretaria funciona no antigo Colégio dos Jesuítas, hoje Palácio Anchieta, até a inauguração do edifício Aureliano Hoffmann.' },
]
