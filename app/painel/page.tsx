import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import { PainelOrcamento } from '@/components/PainelOrcamento'
import { SectionTitle } from '@/components/SectionTitle'
import { IconExternal } from '@/components/Icons'
import { bilhoes, milhoes, numero, pct } from '@/lib/formato'
import {
  acoesPainel, conferenciaPloa, coletadoEm, documentoPloa, ehExecutivo, nomeGnd, nomeFonte, nomes, ORGAOS_OUTROS_PODERES, porFonte, porGnd, ploaExtraidaEm, totais,
} from '@/lib/orcamento'

export const metadata: Metadata = {
  title: 'Painel do orçamento',
  description: 'Proposta orçamentária de 2027 (PLOA) comparada à dotação e à execução de 2026, por unidade orçamentária, ação, grupo de despesa e fonte de recursos, com os pontos que pedem atenção na transição.',
}

const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

export default function Painel() {
  const acoes = acoesPainel().filter((a) => a.v.slice(0, 4).some((x) => x !== 0))
  const coleta = new Date(coletadoEm)
  const inicioAno = new Date(coleta.getFullYear(), 0, 1).getTime()
  const fracaoAno = Math.min(1, Math.max(0, (coleta.getTime() - inicioAno) / (365 * 86400000)))
  const dataColeta = dataBR(coletadoEm)

  const abaixo = acoes
    .filter((a) => a.v[3] - a.v[0] >= 5_000_000 && a.em2026)
    .sort((a, b) => (b.v[3] - b.v[0]) - (a.v[3] - a.v[0]))
    .slice(0, 12)
  const novas = acoes.filter((a) => a.emPloa && !a.em2026 && a.v[0] > 0).sort((a, b) => b.v[0] - a.v[0]).slice(0, 10)
  const extintas = acoes.filter((a) => !a.emPloa && a.v[3] > 0).sort((a, b) => b.v[3] - a.v[3]).slice(0, 10)

  const gnd = porGnd().sort((a, b) => a.chave.localeCompare(b.chave))
  const fontes = porFonte().sort((a, b) => (b.ploa2027 ?? 0) - (a.ploa2027 ?? 0)).slice(0, 12)

  const comparacao = (base: number) => {
    const d = ((totais.ploa2027 - base) / base) * 100
    return `A PLOA 2027 é ${pct(Math.abs(d))} ${d >= 0 ? 'maior' : 'menor'}`
  }
  const cards: { rotulo: string; valor: string; nota: string }[] = [
    { rotulo: 'PLOA 2027', valor: bilhoes(totais.ploa2027), nota: 'Proposta do Executivo à Assembleia (Mensagem nº 189/2026)' },
    { rotulo: 'Dotação inicial 2026', valor: bilhoes(totais.inicial2026), nota: `${comparacao(totais.inicial2026)} que a inicial de 2026` },
    { rotulo: 'Dotação atualizada 2026', valor: bilhoes(totais.atualizada2026), nota: `${comparacao(totais.atualizada2026)} que a atualizada de 2026` },
    { rotulo: 'Empenhado em 2026', valor: bilhoes(totais.empenhado2026), nota: `Até ${dataColeta}; ${pct((totais.empenhado2026 / totais.atualizada2026) * 100, 0)} da dotação atualizada` },
  ]

  const tabela = (titulo: string, id: string, texto: string, linhas: typeof abaixo, col: 'folga' | 'ploa' | 'emp') => (
    <section aria-labelledby={id} className="mt-8">
      <h3 id={id} className="text-title">{titulo}</h3>
      <p className="mt-1 max-w-3xl text-body text-ink-soft">{texto}</p>
      <div tabIndex={0} role="region" aria-label={titulo} className="mt-3 overflow-x-auto rounded-brand border border-line">
        <table className="w-full min-w-[40rem] text-left text-small">
          <thead className="bg-surface">
            <tr>
              <th scope="col" className="px-3 py-2">Ação e unidade</th>
              <th scope="col" className="px-3 py-2 text-right">PLOA 2027</th>
              <th scope="col" className="px-3 py-2 text-right">Atualizada 2026</th>
              <th scope="col" className="px-3 py-2 text-right">Empenhado 2026</th>
              <th scope="col" className="px-3 py-2 text-right">{col === 'folga' ? 'Empenhado − PLOA' : col === 'ploa' ? 'PLOA' : 'Empenhado'}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((a) => (
              <tr key={`${a.uo}-${a.programa}-${a.acao}`} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-2 font-normal">
                  <span className="block font-semibold">{a.nome || a.acao}</span>
                  <span className="text-ink-soft">{nomes.uo[a.uo] ?? a.uo}, ação {a.acao}{a.antiga ? ` (em 2026, ação ${a.antiga})` : ''}</span>
                </th>
                <td className="px-3 py-2 text-right tabular-nums">{milhoes(a.v[0])}</td>
                <td className="px-3 py-2 text-right tabular-nums">{milhoes(a.v[2])}</td>
                <td className="px-3 py-2 text-right tabular-nums">{milhoes(a.v[3])}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{milhoes(col === 'folga' ? a.v[3] - a.v[0] : col === 'ploa' ? a.v[0] : a.v[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <>
      <PageHeader titulo="Painel do orçamento">
        A proposta orçamentária de 2027 comparada ao que foi autorizado e executado em 2026, para acompanhar a transição e, depois, a execução do exercício.
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-6 md:px-8 md:py-8">
        <aside className="rounded-brand border border-line bg-surface p-4 text-body">
          <p>
            <strong>O que este painel mostra.</strong> Os números de 2027 são os da <em>proposta</em> (PLOA) enviada à Assembleia Legislativa, não os da lei aprovada; quando a LOA 2027 for sancionada, a camada será trocada.
            Os de 2026 vêm do Portal de Dados Abertos e mudam todos os dias; por isso o empenhado de 2026 não é o realizado do ano, e sim o acumulado até {dataColeta}.
          </p>
        </aside>

        <section aria-labelledby="visao" className="mt-8">
          <SectionTitle id="visao">Visão geral</SectionTitle>
          <ul className="mt-4 grid gap-3 md:grid-cols-4">
            {cards.map((c) => (
              <li key={c.rotulo} className="rounded-brand border border-line p-4">
                <span className="block text-label uppercase text-ink-soft">{c.rotulo}</span>
                <span className="mt-1 block font-serif text-section font-semibold text-navy">{c.valor}</span>
                <span className="mt-1 block text-small text-ink-soft">{c.nota}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="unidades" className="mt-10">
          <SectionTitle id="unidades">Por unidade orçamentária e ação</SectionTitle>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">
            Cada linha soma as ações da unidade. Abra uma unidade para ver as ações, com a mesma comparação. A coluna <em>PLOA ÷ atualizada</em> mostra quanto da dotação atualizada de 2026 a proposta de 2027 reproduz: abaixo de 100%, a programação encolhe; muito abaixo do já empenhado, convém conferir se a despesa está subdimensionada.
          </p>
          <div className="mt-4">
            <PainelOrcamento
              acoes={acoes}
              nomesUo={nomes.uo}
              nomesPrograma={nomes.programa}
              outrosPoderes={[...ORGAOS_OUTROS_PODERES]}
              fracaoAno={fracaoAno}
              dataColeta={dataColeta}
            />
          </div>
        </section>

        <section aria-labelledby="atencao" className="mt-12">
          <SectionTitle id="atencao">Onde olhar primeiro</SectionTitle>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">
            Três recortes automáticos ajudam a separar o que é rotina do que merece conversa com a unidade. Eles não afirmam erro: apenas apontam diferenças que a leitura do orçamento de 2026 não explica sozinha.
          </p>
          {tabela(
            'Ações em que a PLOA fica abaixo do que já foi empenhado em 2026',
            'abaixo',
            'Quando a proposta de 2027 é menor que o empenhado de 2026 até agora, a ação pode estar subdimensionada, ter sido concluída ou ter mudado de classificação. Mostram-se as de maior diferença, a partir de R$ 5 milhões.',
            abaixo, 'folga',
          )}
          {tabela(
            'Ações novas na proposta de 2027',
            'novas',
            'Ações que existem na PLOA e não tinham dotação nem execução em 2026, sem base de comparação com o ano corrente.',
            novas, 'ploa',
          )}
          {tabela(
            'Ações com execução em 2026 e sem dotação na PLOA',
            'extintas',
            'Ações que empenharam em 2026 e não aparecem na proposta de 2027 (encerradas, renomeadas ou remanejadas).',
            extintas, 'emp',
          )}
        </section>

        <section aria-labelledby="composicao" className="mt-12">
          <SectionTitle id="composicao">Grupo de despesa e fonte de recursos</SectionTitle>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">
            Num orçamento vinculado, o que cobre ou descobre uma despesa é, muitas vezes, a fonte e não o valor total. A comparação por fonte ajuda a ver de quais recursos a programação de 2027 depende.
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div tabIndex={0} role="region" aria-label="Por grupo de natureza da despesa" className="overflow-x-auto rounded-brand border border-line">
              <table className="w-full text-left text-small">
                <caption className="px-3 py-2 text-left font-semibold">Por grupo de natureza da despesa (R$ milhões)</caption>
                <thead className="bg-surface"><tr><th scope="col" className="px-3 py-2">Grupo</th><th scope="col" className="px-3 py-2 text-right">PLOA 2027</th><th scope="col" className="px-3 py-2 text-right">Atual. 2026</th><th scope="col" className="px-3 py-2 text-right">Emp. 2026</th></tr></thead>
                <tbody>
                  {gnd.map((g) => (
                    <tr key={g.chave} className="border-t border-line">
                      <th scope="row" className="px-3 py-1.5 font-normal">{g.chave} · {nomeGnd(g.chave)}</th>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(g.ploa2027)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(g.y2026?.atualizada ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(g.y2026?.empenhado ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div tabIndex={0} role="region" aria-label="Doze maiores fontes na PLOA" className="overflow-x-auto rounded-brand border border-line">
              <table className="w-full text-left text-small">
                <caption className="px-3 py-2 text-left font-semibold">Doze maiores fontes na PLOA (R$ milhões)</caption>
                <thead className="bg-surface"><tr><th scope="col" className="px-3 py-2">Fonte</th><th scope="col" className="px-3 py-2 text-right">PLOA 2027</th><th scope="col" className="px-3 py-2 text-right">Atual. 2026</th><th scope="col" className="px-3 py-2 text-right">Emp. 2026</th></tr></thead>
                <tbody>
                  {fontes.map((f) => (
                    <tr key={f.chave} className="border-t border-line">
                      <th scope="row" className="px-3 py-1.5 font-normal">{f.chave} · {nomeFonte(f.chave)}</th>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(f.ploa2027)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(f.y2026?.atualizada ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(f.y2026?.empenhado ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <details className="mt-12 rounded-brand border border-line p-4">
          <summary className="cursor-pointer text-title font-semibold">Fontes, método e limites</summary>
          <div className="mt-3 max-w-3xl space-y-3 text-body">
            <p>
              <strong>2026 e 2025.</strong> Portal de Dados Abertos do Espírito Santo, conjunto de despesas (arquivos <em>OrcamentosDespesa</em>), somando dotação inicial, dotação atualizada, empenhado, liquidado e pago por unidade orçamentária, programa, ação, grupo de despesa e fonte.
              A soma bate, ao centavo, com o consolidado por unidade gestora para a dotação; o empenhado e o liquidado do ano em curso podem diferir um pouco, porque os dois arquivos são atualizados em horários diferentes. Coleta em {dataColeta}.
            </p>
            <p>
              <strong>PLOA 2027.</strong> {documentoPloa.titulo}. O arquivo oficial é digitalizado (imagem), de modo que as tabelas foram lidas por reconhecimento óptico de caracteres e conferidas por soma contra os totais impressos no próprio documento:
              as {conferenciaPloa.acoes_fechadas} ações fecham o total de cada ação, e a soma sobe por {conferenciaPloa.programas} programas, {conferenciaPloa.unidades} unidades e {conferenciaPloa.orgaos} órgãos até o total geral de R$ {numero(conferenciaPloa.total_linhas / 1e9, 3)} bilhões, igual ao impresso (página 186).
              A abertura por grupo de despesa e fonte também fecha, unidade por unidade, com o Resumo geral do órgão. Extraída em {dataBR(ploaExtraidaEm)}; documento: {' '}
              <a href={documentoPloa.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">Secretaria de Planejamento <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span></a>
              {' '}(SHA-256 {documentoPloa.sha256.slice(0, 12)}…).
            </p>
            <p>
              <strong>Limites.</strong> A PLOA é a proposta original; a lei aprovada pode alterar valores por emendas. A proposta traz o grupo de despesa, e não o elemento. A atribuição de grupo e fonte a cada linha foi resolvida, quando a leitura direta falhou, de modo a fechar o Resumo geral da unidade; a soma por unidade, grupo e fonte é exata, mas a distribuição entre linhas de mesmo valor dentro da unidade pode ser trocada.
              O empenhado de 2026 é parcial; para os fechamentos de 2025, compare a coluna de dotação atualizada.
            </p>
          </div>
        </details>
      </div>
    </>
  )
}
