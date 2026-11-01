import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <h1 className="text-headline">Página não encontrada</h1>
      <span className="accent-bar" aria-hidden="true" />
      <p className="mt-5 text-lead text-ink-soft">O endereço que você acessou não existe ou foi movido.</p>
      <p className="mt-6">
        <Link href="/publicacoes" className="font-semibold text-navy underline underline-offset-4">Ver todas as publicações</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/" className="font-semibold text-navy underline underline-offset-4">Voltar ao início</Link>
      </p>
    </div>
  )
}
