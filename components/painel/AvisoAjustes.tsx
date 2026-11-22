import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'

/**
 * Aviso, em rosa, de que os números partem da PLOA enviada e não contêm o que a votação pode acrescentar. Pela LDO 2027 (Lei nº 12.967/2026),
 * emendas só podem usar recursos de anulação de outras despesas (art. 23, I), de modo que realocam e não aumentam o total; a contingência
 * pode ser fonte das emendas individuais (art. 9º, § 3º). Já as propostas dos Poderes, até os limites do art. 21, podem aumentá-lo.
 */
export function AvisoAjustes({ ajustes }: { ajustes: AjustesVotacao }) {
  return (
    <p role="note" className="mb-3 border-l-4 border-serie2 bg-serie2/10 px-3 py-2 text-small leading-snug text-serie2 print:mb-1 print:py-0.5 print:text-[0.6875rem]">
      <span className="font-semibold">Sem ajustes da votação:</span> emendas impositivas (cerca de R$ {milhoes(ajustes.emendas, 0)} mi) só realocam despesa (LDO, arts. 23, I, e 9º, § 3º); os Poderes até os limites da LDO (art. 21, cerca de R$ {milhoes(ajustes.poderes, 0)} mi) podem elevar o total. Ordem de grandeza.
    </p>
  )
}
