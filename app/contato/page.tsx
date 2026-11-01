import type { Metadata } from 'next'
import { FormularioContato } from '@/components/FormularioContato'
import { IconExternal, IconPhone, IconPin } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { rodape } from '@/lib/links'

export const metadata: Metadata = {
  title: 'Fale conosco',
  description: 'Escreva para a Subsecretaria do Tesouro Estadual, para uma gerência ou para uma subgerência do Tesouro do Espírito Santo.',
}

// lê as variáveis de ambiente a cada acesso, para o aviso refletir a configuração atual
export const dynamic = 'force-dynamic'

export default function Contato() {
  const habilitado = process.env.CONTATO_MODO_TESTE === '1' || Boolean(process.env.RESEND_API_KEY && process.env.CONTATO_REMETENTE && process.env.CONTATO_EMAIL_PADRAO)
  return (
    <>
      <PageHeader titulo="Fale conosco" trilha="Fale conosco">
        Escolha a área do Tesouro Estadual que deve receber sua mensagem. Se você não souber qual é, envie para a Subsecretaria, que encaminha ao lugar certo.
      </PageHeader>
      <div className="mx-auto grid max-w-page gap-10 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-12 lg:gap-14">
        <div className="relative lg:col-span-8">
          <FormularioContato habilitado={habilitado} />
        </div>
        <aside aria-labelledby="outros-canais" className="lg:col-span-4">
          <div className="rounded-brand border border-line p-6">
            <h2 id="outros-canais" className="text-title">Outros canais</h2>
            <ul className="mt-4 space-y-4 text-body">
              <li className="flex gap-3"><IconPhone className="mt-0.5 h-5 w-5 shrink-0 text-navy" /><span><span className="block font-semibold">Telefone</span><a href="tel:+552733475102" className="underline underline-offset-4">{rodape.telefone}</a></span></li>
              <li className="flex gap-3"><IconPin className="mt-0.5 h-5 w-5 shrink-0 text-navy" /><span><span className="block font-semibold">Endereço</span>{rodape.endereco}</span></li>
            </ul>
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-body">
              <li><a href={rodape.atendimento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-navy underline underline-offset-4">Local e horário de atendimento <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span></a></li>
              <li><a href={rodape.faleConosco} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-navy underline underline-offset-4">Fale conosco da SEFAZ <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span></a></li>
              <li><a href="https://ouvidoria.es.gov.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-navy underline underline-offset-4">Ouvidoria do Estado <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span></a></li>
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-small text-ink-soft">
              Pedidos de acesso à informação seguem pelo canal próprio da Lei de Acesso à Informação, no rodapé desta página.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
