/**
 * Mapa de navegação e destinos do portal.
 * Todos os endereços externos foram verificados no site da SEFAZ (HTTP 200).
 */
const S = 'https://sefaz.es.gov.br'
const T = (slug: string) => `/tesouro/${slug}`
const PAF = 'programa-de-reestruturacao-e-de-ajuste-fiscal-paf'
const DIVIDA = 'relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal'

export type Link = { rotulo: string; href: string; externo?: boolean }

export type ItemMenu = { rotulo: string; href?: string; filhos?: Link[]; prefixos?: string[] }

/**
 * Menu principal: seis itens, cada um responde a uma pergunta diferente (sem sobreposição):
 * o que há de novo (Notícias), como está o Estado (Painel fiscal), onde estão os documentos (Publicações, por assunto),
 * o que preciso para trabalhar (Serviços), quem somos (Institucional) e como falar com o Tesouro (Fale conosco).
 */
export const menu: ItemMenu[] = [
  { rotulo: 'Notícias', href: '/noticias', prefixos: ['/noticias'] },
  { rotulo: 'Painel fiscal', href: '/indicadores', prefixos: ['/indicadores'] },
  {
    rotulo: 'Publicações',
    prefixos: ['/publicacoes', '/tesouro/'],
    filhos: [
      { rotulo: 'Relatórios fiscais (RREO e RGF)', href: '/publicacoes?tipo=lrf' },
      { rotulo: 'Resultado do Tesouro Estadual', href: T('resultado-do-tesouro-estadual') },
      { rotulo: 'Dívida pública', href: T(DIVIDA) },
      { rotulo: 'Programa de Ajuste Fiscal (PAF)', href: T(PAF) },
      { rotulo: 'Prestação de Contas do Governador', href: T('prestacao-de-contas-do-governador') },
      { rotulo: 'Transferências aos municípios', href: T('transferencias-constitucionais-aos-municipios') },
      { rotulo: 'Contabilidade aplicada', href: '/publicacoes?tipo=normas-contabeis' },
      { rotulo: 'Tesouro Cidadão', href: '/publicacoes?tipo=cidadao' },
      { rotulo: 'Todas as publicações', href: '/publicacoes' },
    ],
  },
  { rotulo: 'Serviços', href: '/servicos', prefixos: ['/servicos'] },
  {
    rotulo: 'Institucional',
    prefixos: ['/sobre', '/creditos', '/cidadao'],
    filhos: [
      { rotulo: 'Conheça o Tesouro Estadual', href: '/sobre' },
      { rotulo: 'Tesouro Cidadão', href: '/cidadao' },
      { rotulo: 'Legislação do Tesouro Estadual', href: T('demais-legislacoes-contabeis') },
      { rotulo: 'Fundo Soberano (FUNSES)', href: T('funses') },
    ],
  },
  { rotulo: 'Fale conosco', href: '/contato', prefixos: ['/contato'] },
]

// `curto` é o rótulo usado no celular, como no mockup mobile.
export const acessoRapido = [
  { rotulo: 'Resultado do Tesouro', curto: 'Resultado do Tesouro', href: T('resultado-do-tesouro-estadual'), icone: 'bars' },
  { rotulo: 'Dívida Pública', curto: 'Dívida Pública', href: T(DIVIDA), icone: 'coins' },
  { rotulo: 'Contabilidade Aplicada', curto: 'Contabilidade', href: '/publicacoes?tipo=normas-contabeis', icone: 'doc' },
  { rotulo: 'Transferências aos Municípios', curto: 'Municípios', href: T('transferencias-constitucionais-aos-municipios'), icone: 'people' },
] as const

export const orientacoes = [
  {
    titulo: 'Orientação Orçamentária',
    texto: 'Diretrizes, manuais e orientações sobre execução orçamentária.',
    href: T('grupodearquivos-notas-tecnicas'),
    icone: 'doc',
  },
  {
    titulo: 'Orientação Contábil',
    texto: 'Normas, procedimentos e orientações de contabilidade aplicada ao setor público.',
    href: T('manual-de-contabilidade-mcont'),
    icone: 'calc',
  },
  {
    titulo: 'Orientação Financeira',
    texto: 'Procedimentos, rotinas e orientações sobre gestão financeira e tesouraria.',
    href: T('execucao-financeira-tesouro'),
    icone: 'coins',
  },
] as const

/** Serviços para gestores e servidores (área "Finanças" do Tesouro na SEFAZ). */
export const servicos: { grupo: string; itens: Link[] }[] = [
  {
    grupo: 'Contas e pagamentos',
    itens: [
      { rotulo: 'Abertura de Contas Bancárias', href: T('abertura-de-contas-bancarias') },
      { rotulo: 'Processamento Bancário', href: 'https://portaltesouro.sefaz.es.gov.br/processamento-arquivos-bancarios-v2/', externo: true },
      { rotulo: 'Execução Financeira (orientações)', href: T('execucao-financeira-tesouro') },
      { rotulo: 'Cotas Financeiras (Portaria 34-R)', href: `${S}/Media/Tesouro%20Estadual/Contabilidade%20Aplicada%20ao%20Setor/Formul%C3%A1rio%20-%20Portaria%2034-R%20de%2017mar25.pdf`, externo: true },
      { rotulo: 'Notas Técnicas', href: T('grupodearquivos-notas-tecnicas') },
    ],
  },
  {
    grupo: 'Obrigações e transferências',
    itens: [
      { rotulo: 'OPV, credores não dativos', href: T('obrigacoes-de-pequeno-valor-opv-nao-dativos') },
      { rotulo: 'OPV, credores dativos', href: T('obrigacoes-de-pequeno-valor-opv-dativos') },
      { rotulo: 'Transferências Especiais', href: T('transferencias-especiais') },
      { rotulo: 'Transferências aos Municípios (consulta)', href: 'https://s1-internet.sefaz.es.gov.br/site-ipm-internet/transferencias/liberacao_anteriores', externo: true },
      { rotulo: 'Boletim Informativo de Repasses', href: T('boletim-informativo-2') },
    ],
  },
  {
    grupo: 'Sistemas e normas',
    itens: [
      { rotulo: 'SIGEFES', href: T('sigefes-links') },
      { rotulo: 'SIAFEM', href: T('siafem') },
      { rotulo: 'Manual de Contabilidade (MCONT)', href: T('manual-de-contabilidade-mcont') },
      { rotulo: 'Balancetes contábeis', href: 'https://internet.sefaz.es.gov.br/contas/contabilidade/balancetes.php', externo: true },
      { rotulo: 'Normas do Sistema de Contabilidade', href: T('sistema-de-contabilidade') },
      { rotulo: 'Normas do Sistema Financeiro', href: T('sistema-financeiro') },
    ],
  },
]

export const rodape = {
  institucional: [
    { rotulo: 'Portal da Transparência', href: 'https://transparencia.es.gov.br/', externo: true },
    { rotulo: 'Acesso à Informação (LAI)', href: 'https://acessoainformacao.es.gov.br/', externo: true },
    { rotulo: 'Plano de Dados Abertos', href: `${S}/plano-de-dados-abertos`, externo: true },
    { rotulo: 'Ouvidoria', href: 'https://ouvidoria.es.gov.br/', externo: true },
    { rotulo: 'Aviso de Privacidade', href: `${S}/tratamento-de-dados-pessoais`, externo: true },
  ] satisfies Link[],
  endereco: 'Av. João Batista Parra, 600, Enseada do Suá, Vitória/ES, CEP 29050-375',
  telefone: '(27) 3347-5102',
  faleConosco: `${S}/fale-conosco`,
  atendimento: `${S}/local-e-horario-de-atendimento`,
}
