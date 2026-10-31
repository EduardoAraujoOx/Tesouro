/**
 * Mapa de navegação e destinos do portal.
 * Todos os endereços externos foram verificados no site da SEFAZ (HTTP 200).
 */
const S = 'https://sefaz.es.gov.br'

export type Link = { rotulo: string; href: string; externo?: boolean }

export const institucional: Link[] = [
  { rotulo: 'Conheça o Tesouro Estadual', href: '/sobre' },
  { rotulo: 'Legislação do Tesouro Estadual', href: `${S}/demais-legislacoes-contabeis`, externo: true },
  { rotulo: 'Prestação de Contas do Governador', href: `${S}/prestacao-de-contas-do-governador`, externo: true },
  { rotulo: 'Fundo Soberano – FUNSES', href: `${S}/funses`, externo: true },
  { rotulo: 'Programa de Ajuste Fiscal – PAF', href: '/publicacoes?tipo=divida-paf' },
]

export const menuPrincipal: Link[] = [
  { rotulo: 'Publicações', href: '/publicacoes' },
  { rotulo: 'Contabilidade', href: '/publicacoes?tipo=normas-contabeis' },
  { rotulo: 'Finanças', href: '/servicos' },
  { rotulo: 'Dívida Pública', href: '/publicacoes?tipo=divida-paf' },
  { rotulo: 'Municípios', href: '/publicacoes?tipo=municipios' },
  { rotulo: 'Fale Conosco', href: '#contato' },
]

export const acessoRapido = [
  { rotulo: 'Resultado do Tesouro', href: '/publicacoes?tipo=resultado-tesouro', icone: 'bars' },
  { rotulo: 'Dívida Pública', href: '/publicacoes?tipo=divida-paf', icone: 'coins' },
  { rotulo: 'Contabilidade Aplicada', href: '/publicacoes?tipo=normas-contabeis', icone: 'doc' },
  { rotulo: 'Transferências aos Municípios', href: '/publicacoes?tipo=municipios', icone: 'people' },
] as const

export const orientacoes = [
  {
    titulo: 'Orientação Orçamentária',
    texto: 'Diretrizes, manuais e orientações sobre execução orçamentária.',
    href: `${S}/execucao-financeira-tesouro`,
    icone: 'doc',
  },
  {
    titulo: 'Orientação Contábil',
    texto: 'Normas, procedimentos e orientações de contabilidade aplicada ao setor público.',
    href: `${S}/manual-de-contabilidade-mcont`,
    icone: 'calc',
  },
  {
    titulo: 'Orientação Financeira',
    texto: 'Procedimentos, rotinas e orientações sobre gestão financeira e tesouraria.',
    href: '/servicos',
    icone: 'coins',
  },
] as const

/** Serviços para gestores e servidores (área "Finanças" do Tesouro na SEFAZ). */
export const servicos: { grupo: string; itens: (Link & { texto?: string })[] }[] = [
  {
    grupo: 'Contas e pagamentos',
    itens: [
      { rotulo: 'Abertura de Contas Bancárias', href: `${S}/abertura-de-contas-bancarias`, externo: true },
      { rotulo: 'Processamento Bancário', href: 'https://portaltesouro.sefaz.es.gov.br/processamento-arquivos-bancarios-v2/', externo: true },
      { rotulo: 'Execução Financeira', href: `${S}/execucao-financeira-tesouro`, externo: true },
      { rotulo: 'Cotas Financeiras (Portaria 34-R)', href: `${S}/Media/Tesouro%20Estadual/Contabilidade%20Aplicada%20ao%20Setor/Formul%C3%A1rio%20-%20Portaria%2034-R%20de%2017mar25.pdf`, externo: true },
    ],
  },
  {
    grupo: 'Obrigações e transferências',
    itens: [
      { rotulo: 'Obrigações de Pequeno Valor (OPV) – Não Dativos', href: `${S}/obrigacoes-de-pequeno-valor-opv-nao-dativos`, externo: true },
      { rotulo: 'Obrigações de Pequeno Valor (OPV) – Dativos', href: `${S}/obrigacoes-de-pequeno-valor-opv-dativos`, externo: true },
      { rotulo: 'Transferências Especiais', href: `${S}/transferencias-especiais`, externo: true },
      { rotulo: 'Transferências aos Municípios (consulta)', href: 'https://s1-internet.sefaz.es.gov.br/site-ipm-internet/transferencias/liberacao_anteriores', externo: true },
      { rotulo: 'Boletim Informativo de Repasses', href: `${S}/boletim-informativo-2`, externo: true },
    ],
  },
  {
    grupo: 'Sistemas e normas',
    itens: [
      { rotulo: 'SIGEFES', href: `${S}/sigefes-links`, externo: true },
      { rotulo: 'SIAFEM', href: `${S}/siafem`, externo: true },
      { rotulo: 'Manual de Contabilidade – MCONT', href: `${S}/manual-de-contabilidade-mcont`, externo: true },
      { rotulo: 'Balancetes contábeis', href: 'https://internet.sefaz.es.gov.br/contas/contabilidade/balancetes.php', externo: true },
      { rotulo: 'Normas e procedimentos contábeis', href: '/publicacoes?tipo=normas-contabeis' },
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
  endereco: 'Av. João Batista Parra, 600 – Enseada do Suá, Vitória – ES · CEP 29050-375',
  telefone: '(27) 3347-5102',
  faleConosco: `${S}/fale-conosco`,
  atendimento: `${S}/local-e-horario-de-atendimento`,
}

export const noticia = {
  data: '2026-10-26',
  titulo: 'Espírito Santo se consolida como referência nacional em excelência na gestão fiscal',
  resumo:
    'Pelo terceiro ano consecutivo, o Estado conquistou a Nota A+ da Secretaria do Tesouro Nacional e é primeiro lugar em Solidez Fiscal no Ranking de Competitividade dos Estados.',
  href: `${S}/espirito-santo-se-consolida-como-referencia-nacional-em-excelencia-na-gestao-fiscal`,
}

/** Números citados na notícia da SEFAZ de 26/10/2026 (fonte: noticia.href). */
export const reconhecimentos = [
  {
    valor: 'A+',
    rotuloAcessivel: 'Nota A mais',
    titulo: 'Nota máxima da STN',
    detalhe: 'Pelo terceiro ano consecutivo, segundo a Secretaria do Tesouro Nacional.',
  },
  {
    valor: '1º',
    rotuloAcessivel: 'Primeiro lugar',
    titulo: 'Solidez Fiscal',
    detalhe: 'No Ranking de Competitividade dos Estados, do Centro de Liderança Pública.',
  },
] as const
