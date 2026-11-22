import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'
import { NOTA_DISCRETA } from './Estrutura'

/** Arredonda ao múltiplo de R$ 50 milhões mais próximo: são ordens de grandeza, e a precisão aparente induziria a erro. */
export const arredonda50 = (x: number) => Math.round(x / 50e6) * 50e6

/**
 * Observação discreta de que os números partem da PLOA enviada e não contêm o que a votação pode acrescentar. Pela LDO 2027 (Lei nº 12.967/2026),
 * as emendas só podem usar recursos de anulação de outras despesas (art. 23, I), de modo que realocam; as propostas dos Poderes, até os limites do
 * art. 21, exigem anulação ou reestimativa da receita para a lei continuar equilibrada.
 */
export function AvisoAjustes({ ajustes }: { ajustes: AjustesVotacao }) {
  return (
    <p role="note" className={`mb-2 border-l-2 border-serie2/60 pl-2 ${NOTA_DISCRETA} print:mb-1`}>
      <span className="font-semibold text-serie2">Sem ajustes da votação:</span> emendas impositivas (cerca de R$ {milhoes(arredonda50(ajustes.emendas), 0)} milhões), que realocam despesa, e dotações dos Poderes até os limites da LDO (cerca de R$ {milhoes(arredonda50(ajustes.poderes), 0)} milhões), que exigem anulação ou reestimativa da receita.
    </p>
  )
}
