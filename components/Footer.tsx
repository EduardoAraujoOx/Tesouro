import Link from 'next/link'
import { IconExternal, IconPhone, IconPin } from './Icons'
import { rodape } from '@/lib/links'

export function Footer() {
  return (
    <footer id="contato" className="on-dark mt-20 bg-navy text-on-navy">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-12 md:grid-cols-3 md:gap-0 md:px-8">
        <div className="md:pr-10">
          <div className="flex gap-4">
            <span aria-hidden="true" className="w-1 shrink-0 self-stretch" style={{ background: 'linear-gradient(#39B5E8 50%, #F28AB2 50%)' }} />
            <div>
              <p className="font-serif text-title font-semibold !text-on-navy">Tesouro Estadual do Espírito Santo</p>
              <p className="mt-1 text-body opacity-90">Secretaria da Fazenda (SEFAZ)</p>
              <p className="text-body opacity-90">Governo do Estado do Espírito Santo</p>
            </div>
          </div>
        </div>

        <nav aria-label="Links institucionais" className="md:border-l md:border-white/25 md:px-10">
          <h2 className="!font-sans text-body font-semibold !text-on-navy">Links institucionais</h2>
          <ul className="mt-3 space-y-2 text-body">
            {rodape.institucional.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                  {l.rotulo}<IconExternal className="h-3.5 w-3.5 opacity-70" /><span className="sr-only">(abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:border-l md:border-white/25 md:pl-10">
          <h2 className="!font-sans text-body font-semibold !text-on-navy">Contato</h2>
          <ul className="mt-3 space-y-2.5 text-body">
            <li className="flex gap-2.5"><IconPin className="mt-0.5 h-5 w-5 shrink-0" /><span>{rodape.endereco}</span></li>
            <li className="flex gap-2.5"><IconPhone className="mt-0.5 h-5 w-5 shrink-0" /><a href="tel:+552733475102" className="hover:underline">{rodape.telefone}</a></li>
            <li className="pt-1">
              <a href={rodape.faleConosco} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Fale conosco</a>
              <span aria-hidden="true"> · </span>
              <a href={rodape.atendimento} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Local e horário de atendimento</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/20">
        <p className="mx-auto max-w-page px-5 py-4 text-small opacity-80 md:px-8">
          Os documentos são hospedados no site oficial da SEFAZ-ES, que permanece como fonte de referência.
          {' '}<Link href="/creditos" className="underline underline-offset-4">Créditos das imagens</Link>
        </p>
      </div>
    </footer>
  )
}
