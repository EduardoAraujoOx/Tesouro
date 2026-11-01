/**
 * Identidade institucional da Secretaria da Fazenda (SEFAZ), transcrita do Mapa Estratégico publicado em
 * https://sefaz.es.gov.br/identidade-institucional (a página publica o mapa como imagem; aqui o texto fica acessível).
 */
export const FONTE_MAPA = 'https://sefaz.es.gov.br/identidade-institucional'
export const FONTE_HISTORIA = 'https://sefaz.es.gov.br/historia-institucional'
export const FONTE_ORGANOGRAMA = 'https://organograma.es.gov.br'

/** Texto institucional do Tesouro Estadual (Subsecretaria do Tesouro Estadual, SUBSET). */
export const chamada = 'Gestão responsável das finanças públicas para o presente e o futuro do Espírito Santo.'
export const resumo =
  'O Tesouro Estadual atua para preservar o equilíbrio das contas públicas, assegurar uma gestão financeira responsável e produzir informações que apoiem as decisões do Governo do Estado.'

export const quemSomos = [
  'A Subsecretaria do Tesouro Estadual (SUBSET) integra a Secretaria da Fazenda do Espírito Santo e exerce funções centrais na administração financeira e contábil do Estado.',
  'Sua atuação envolve o planejamento e o acompanhamento dos recursos financeiros, a gestão das disponibilidades de caixa, o monitoramento da dívida pública, a produção de informações fiscais e contábeis e o apoio técnico aos órgãos estaduais.',
  'Mais do que acompanhar receitas e despesas, o Tesouro contribui para antecipar riscos, preservar a sustentabilidade das contas públicas e aperfeiçoar a gestão dos recursos públicos.',
]

export const funcoes = [
  {
    titulo: 'Gestão financeira e de caixa',
    texto: 'Planejamos e acompanhamos os fluxos financeiros do Estado, buscando compatibilizar a disponibilidade de recursos com os compromissos assumidos pelo poder público.',
    href: '/tesouro/execucao-financeira-tesouro',
  },
  {
    titulo: 'Política fiscal e dívida pública',
    texto: 'Monitoramos indicadores fiscais, endividamento e riscos para subsidiar decisões que preservem o equilíbrio das contas estaduais.',
    href: '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal',
  },
  {
    titulo: 'Contabilidade e prestação de contas',
    texto: 'Produzimos e consolidamos informações contábeis, orientamos os órgãos públicos e contribuímos para a transparência e a confiabilidade das contas do Estado.',
    href: '/tesouro/prestacao-de-contas-do-governador',
  },
  {
    titulo: 'Transferências e regularidade fiscal',
    texto: 'Atuamos na gestão financeira das transferências legais e constitucionais e no acompanhamento das obrigações e da regularidade fiscal do Estado.',
    href: '/tesouro/transferencias-constitucionais-aos-municipios',
  },
  {
    titulo: 'Fundos e recursos financeiros',
    texto: 'Acompanhamos a gestão de fundos sob nossa responsabilidade e das disponibilidades financeiras do Estado, observando segurança, liquidez e responsabilidade na aplicação dos recursos.',
    href: '/tesouro/funses',
  },
  {
    titulo: 'Inteligência fiscal e eficiência do gasto',
    texto: 'Desenvolvemos estudos, projeções e informações gerenciais para apoiar decisões e contribuir para a melhoria da gestão financeira e da qualidade do gasto público.',
    href: '/indicadores',
  },
] as const

export const porQueImporta = [
  'Uma gestão financeira responsável permite que o Estado cumpra seus compromissos, enfrente períodos de incerteza e preserve sua capacidade de realizar investimentos.',
  'O Tesouro não executa diretamente as políticas de saúde, educação ou segurança pública. Sua contribuição está em ajudar a criar as condições financeiras para que essas e outras políticas possam ser realizadas de forma sustentável.',
  'É uma atuação que nem sempre aparece para o cidadão, mas que participa do funcionamento cotidiano dos serviços públicos.',
]

export const futuro = [
  'O Espírito Santo enfrenta novos desafios, entre eles as mudanças decorrentes da reforma tributária, as transformações econômicas e a necessidade de preservar a capacidade de investimento do Estado.',
  'Nesse contexto, o Tesouro contribui com projeções fiscais, acompanhamento dos fluxos financeiros, análise de riscos e adaptação dos procedimentos contábeis, em articulação com as demais áreas da Secretaria da Fazenda.',
]

export const transparencia = {
  texto: [
    'Conhecer a situação das contas públicas é fundamental para acompanhar a gestão do Estado.',
    'Neste portal, cidadãos, pesquisadores e gestores encontram indicadores fiscais, demonstrativos contábeis, informações sobre a dívida pública, transferências aos municípios e publicações técnicas.',
  ],
  links: [
    { rotulo: 'Painel fiscal', href: '/indicadores' },
    { rotulo: 'Relatórios e publicações', href: '/publicacoes' },
    { rotulo: 'Dívida pública', href: '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal' },
    { rotulo: 'Prestação de contas', href: '/tesouro/prestacao-de-contas-do-governador' },
    { rotulo: 'Tesouro Cidadão', href: '/cidadao' },
  ],
}

export const estrutura =
  'A Subsecretaria do Tesouro Estadual é formada por equipes técnicas especializadas em administração financeira, política fiscal, dívida pública, contabilidade, encargos gerais, fundos e avaliação econômico-financeira.'

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
