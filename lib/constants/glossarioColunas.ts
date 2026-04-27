// Textos extraídos de radar_fiscal_v4_final.html — variável COL_GL

export interface ColGlossarioItem {
  k: string       // numeral romano
  s: string       // nome curto
  d: string       // definição completa
  m: boolean      // true = preenchimento manual
}

export const GLOSSARIO_COLUNAS: ColGlossarioItem[] = [
  {
    k: 'I',
    s: 'Disponibilidade Financeira Bruta',
    d: 'Saldo total em conta bancária de cada fonte — o "caixa bruto" antes de descontar qualquer compromisso. É o ponto de partida do monitoramento.',
    m: false,
  },
  {
    k: 'II',
    s: 'Obrigações Financeiras',
    d: 'Compromissos já registrados no SIGEFES que consomem esses recursos: restos a pagar processados (serviço entregue, fatura a pagar) e outras dívidas formalizadas.',
    m: false,
  },
  {
    k: 'III',
    s: 'Obrigações s/ Autorização Orçamentária (LRF)',
    d: 'Compromissos assumidos sem cobertura orçamentária prévia. O Art. 42 da LRF proíbe expressamente essa prática — é o cerne do que este sistema monitora.',
    m: false,
  },
  {
    k: 'IV',
    s: 'Crédito Empenhado a Liquidar',
    d: 'Despesas já autorizadas (empenhadas) cujo serviço ou produto ainda não foi entregue. O Estado se obrigou, mas ainda não recebeu a contrapartida.',
    m: false,
  },
  {
    k: 'V',
    s: 'Disponibilidade Líquida',
    d: 'Caixa real disponível: I − II − III − IV. O que sobra efetivamente após descontar todos os compromissos já assumidos. Valores negativos indicam que as obrigações superam os recursos disponíveis.',
    m: false,
  },
  {
    k: 'VI',
    s: 'Arrecadação Prevista a Realizar por Fonte (SUBSET)',
    d: 'Estimativa de quanto ainda será arrecadado até 31/12 em cada fonte. Único campo de preenchimento manual pela equipe do Tesouro (SUBSET). Baseado em projeções de receita e sazonalidade histórica.',
    m: true,
  },
  {
    k: 'VII',
    s: 'Disponibilidade p/ Novas Obrigações',
    d: 'V + VI. Teto máximo de novos compromissos que o Estado pode assumir sem violar o Art. 42: caixa atual mais o que ainda vai entrar.',
    m: false,
  },
  {
    k: 'VIII',
    s: 'Cota Orçamentária Liberada a Empenhar',
    d: 'Dotação já autorizada pelas secretarias mas ainda não empenhada — espaço orçamentário imediatamente disponível para que unidades gestoras assumam compromissos.',
    m: false,
  },
  {
    k: 'IX',
    s: 'Pressões Orçamentárias Identificadas (SEP)',
    d: 'Demandas conhecidas que não estão na cota autorizada: pleitos de secretarias, reajustes previstos, passivos emergentes. Informado pela SEP para antecipar riscos ainda não formalizados.',
    m: true,
  },
  {
    k: 'X',
    s: 'Disponibilidade após Pressões — Saldo do Art. 42',
    d: 'VII − VIII − IX. A margem real de segurança fiscal. Positivo: Estado tem folga para honrar obrigações. Negativo: risco de descumprimento do Art. 42. É o indicador central deste sistema.',
    m: false,
  },
  {
    k: 'XI',
    s: 'Cota Orçamentária a Fixar — Movimentação',
    d: '"Espaço de manobra" do gestor: dotação que ainda pode ser liberada para empenho dentro do limite de caixa disponível.',
    m: false,
  },
  {
    k: 'XII',
    s: 'Cota Orçamentária Bloqueada',
    d: 'Dotação contingenciada — bloqueada administrativamente para garantir equilíbrio fiscal. Não pode ser empenhada sem liberação expressa.',
    m: false,
  },
]
