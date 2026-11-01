import type { ReactNode } from 'react'

export function SectionTitle({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-[1.75rem] font-bold leading-tight tracking-tight md:text-[2rem]">
          {children}
        </h2>
        <span className="accent-bar" aria-hidden="true" />
      </div>
      {action}
    </div>
  )
}
