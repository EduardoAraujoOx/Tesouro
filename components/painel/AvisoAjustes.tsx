import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'

/** Aviso, em rosa, de que os números partem da PLOA enviada e não contêm o que a votação pode acrescentar. */
export function AvisoAjustes({ ajustes }: { ajustes: AjustesVotacao }) {
  return (
    <p role="note" className="mb-3 border-l-4 border-serie2 bg-serie2/10 px-3 py-2 text-small leading-snug text-serie2 print:mb-1 print:py-0.5 print:text-[0.6875rem]">
      <span className="font-semibold">Sem ajustes da votação:</span> a PLOA enviada não inclui emendas impositivas (cerca de R$ {milhoes(ajustes.emendas, 0)} milhões além da reserva) nem os Poderes até os limites da LDO (cerca de R$ {milhoes(ajustes.poderes, 0)} milhões); ordem de grandeza.
    </p>
  )
}
