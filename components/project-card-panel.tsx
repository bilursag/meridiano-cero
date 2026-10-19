'use client'

import { IconCircleCheckFilled, IconCircleDashed, IconExternalLink, IconX } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CHILE_TIME_ZONE } from '@/lib/dates'
import { LAYER_COLORS } from '@/lib/project-layout'
import type { ProjectCard } from '@/lib/trello'

const dateFormatter = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: CHILE_TIME_ZONE })
export const formatCardDate = (iso: string) => dateFormatter.format(new Date(iso))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function ProjectCardPanel({ card, onClose }: { card: ProjectCard; onClose: () => void }) {
  const labels = card.labels.filter((l) => l !== card.layer)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: LAYER_COLORS[card.layer] }} />
            <span className="font-mono font-semibold text-foreground">{card.code}</span>
            {card.layer} · {card.listName}
          </p>
          <h2 className="text-base font-semibold leading-snug">{card.title}</h2>
          {card.completedAt ? (
            <p className="text-xs text-muted-foreground">Terminada el {formatCardDate(card.completedAt)}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Cerrar detalle">
          <IconX className="size-4" />
        </Button>
      </div>

      {labels.length ? (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <Badge key={label} variant="secondary" className="font-normal">
              {label}
            </Badge>
          ))}
          {card.points ? <Badge variant="outline">{card.points} pts</Badge> : null}
        </div>
      ) : null}

      {card.story ? (
        <Section title="Historia">
          <p className="text-sm">{card.story}</p>
        </Section>
      ) : null}
      {card.summary ? (
        <Section title={card.listKind === 'done' ? 'Qué hace' : 'Qué y por qué'}>
          <p className="text-sm">{card.summary}</p>
        </Section>
      ) : null}

      {card.checklists
        .filter((cl) => cl.items.length)
        .map((cl) => {
          const done = cl.items.filter((i) => i.done).length
          return (
            <Section key={cl.name} title={`${cl.name} · ${done}/${cl.items.length}`}>
              <ul className="flex flex-col gap-1">
                {cl.items.map((item) => (
                  <li key={item.name} className="flex gap-2 text-sm">
                    {item.done ? (
                      <IconCircleCheckFilled className="mt-0.5 size-4 shrink-0 text-green-600" />
                    ) : (
                      <IconCircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={item.done ? 'text-muted-foreground line-through' : ''}>{item.name}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )
        })}

      {card.attachments.length ? (
        <Section title="Pantallazos">
          <div className="grid grid-cols-2 gap-2">
            {card.attachments.map((a) => {
              const src = `/api/v1/admin/project/attachments/${card.id}/${a.id}`
              return (
                <a key={a.id} href={src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by our own authenticated proxy */}
                  <img src={src} alt={a.name} loading="lazy" className="aspect-[9/19] w-full object-cover object-top" />
                </a>
              )
            })}
          </div>
        </Section>
      ) : null}

      {card.snippet ? (
        <Section title="Código">
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={card.snippet.where}>
            {card.snippet.where}
          </p>
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
            <code>{card.snippet.code}</code>
          </pre>
        </Section>
      ) : card.files ? (
        <Section title="Archivos clave">
          <p className="font-mono text-xs">{card.files.replaceAll('`', '')}</p>
        </Section>
      ) : null}

      <Button variant="outline" size="sm" asChild>
        <a href={card.url} target="_blank" rel="noreferrer">
          Abrir en Trello <IconExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  )
}
