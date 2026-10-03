import Link from 'next/link'

/** Layout of the public pages the app stores link to (/privacidad, /soporte): no sign-in, readable on a phone. */
export function PublicPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-10 space-y-3">
        <Link href="/" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/LOGOS/logo-meridiano-naranja.svg" alt="Meridiano Cero" className="h-8 w-auto" />
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated ? <p className="text-sm text-muted-foreground">Última actualización: {updated}</p> : null}
      </header>
      <div className="space-y-10 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </main>
  )
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function List({ items, ordered = false }: { items: React.ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-2 pl-5 marker:text-muted-foreground`}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  )
}

export function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-medium text-foreground">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="font-medium text-foreground underline underline-offset-4">
      {email}
    </a>
  )
}
