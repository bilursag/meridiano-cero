'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { IconExternalLink } from '@tabler/icons-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FetchError } from '@/components/fetch-error'
import { ProjectCardPanel, formatCardDate } from '@/components/project-card-panel'
import {
  LAYER_COLORS,
  RELEASE_LABEL,
  epicColumns,
  filterCards,
  latestDone,
  sprintColumns,
  type GroupBy,
} from '@/lib/project-layout'
import type { Layer, ProjectBoard, ProjectCard } from '@/lib/trello'
import { cn } from '@/lib/utils'

const ProjectGraph = dynamic(() => import('@/components/project-graph').then((m) => m.ProjectGraph), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
})

const TITLE = 'Proyecto'
const SUBTITLE = 'Avance del desarrollo, sprint a sprint'
const ALL_LAYERS: Layer[] = ['App', 'Backend', 'Web', 'Infra', 'Tiendas', 'Docs']
const PANEL_HEIGHT = 'h-[calc(100vh-300px)] min-h-[480px]'

const STATUS_TEXT: Record<ProjectCard['listKind'], string> = {
  doing: 'En progreso',
  review: 'En revisión',
  sprint: 'Por empezar',
  refined: 'Refinada',
  backlog: 'Backlog',
  done: 'Terminada',
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-0.5 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}

function CardRow({ card, meta, onSelect }: { card: ProjectCard; meta: string; onSelect: (card: ProjectCard) => void }) {
  return (
    <button onClick={() => onSelect(card)} className="flex items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted">
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: LAYER_COLORS[card.layer] }} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">
          <span className="font-mono text-xs text-muted-foreground">{card.code}</span> {card.title}
        </span>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </span>
    </button>
  )
}

function OverviewPanel({ board, onSelect }: { board: ProjectBoard; onSelect: (card: ProjectCard) => void }) {
  const inSprint = board.cards
    .filter((c) => c.sprint === board.currentSprint && c.listKind !== 'done')
    .sort((a, b) => a.listKind.localeCompare(b.listKind) || a.code.localeCompare(b.code))
  return (
    <div className="flex flex-col gap-4 p-2">
      <section className="flex flex-col">
        <h2 className="px-2 pt-2 text-sm font-semibold">En curso · Sprint {board.currentSprint}</h2>
        {inSprint.map((card) => (
          <CardRow key={card.id} card={card} meta={`${STATUS_TEXT[card.listKind]}${card.points ? ` · ${card.points} pts` : ''}`} onSelect={onSelect} />
        ))}
      </section>
      <section className="flex flex-col">
        <h2 className="px-2 text-sm font-semibold">Últimos cambios</h2>
        {latestDone(board.cards).map((card) => (
          <CardRow key={card.id} card={card} meta={`Terminada el ${formatCardDate(card.completedAt!)}`} onSelect={onSelect} />
        ))}
      </section>
      <p className="px-2 pb-2 text-xs text-muted-foreground">Toca una tarjeta para ver su detalle, sus criterios, su código y sus pantallazos.</p>
    </div>
  )
}

export default function AdminProjectPage() {
  const [board, setBoard] = useState<ProjectBoard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('sprint')
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set(ALL_LAYERS))
  const [releaseOnly, setReleaseOnly] = useState(false)
  const [selected, setSelected] = useState<ProjectCard | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/v1/admin/project')
    if (res.ok) {
      setBoard(await res.json())
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo cargar el tablero del proyecto.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  const columns = useMemo(() => {
    if (!board) return []
    const cards = filterCards(board.cards, layers, releaseOnly)
    return groupBy === 'sprint' ? sprintColumns(board, cards) : epicColumns(cards)
  }, [board, groupBy, layers, releaseOnly])

  if (error && !board) {
    return (
      <>
        <SiteHeader title={TITLE} subtitle={SUBTITLE} />
        <FetchError message={error} onRetry={load} />
      </>
    )
  }

  if (!board) {
    return (
      <>
        <SiteHeader title={TITLE} subtitle={SUBTITLE} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className={PANEL_HEIGHT} />
        </div>
      </>
    )
  }

  const sprintCards = board.cards.filter((c) => c.sprint === board.currentSprint)
  const sprintPoints = sprintCards.reduce((sum, c) => sum + (c.points ?? 0), 0)
  const sprintDonePoints = sprintCards.filter((c) => c.listKind === 'done').reduce((sum, c) => sum + (c.points ?? 0), 0)
  const doneCount = board.cards.filter((c) => c.listKind === 'done').length
  const release = board.cards.filter((c) => c.labels.includes(RELEASE_LABEL))
  const releaseDone = release.filter((c) => c.listKind === 'done').length
  const sprintDates = sprintCards.map((c) => c.listName.match(/\(([^)]+)\)/)?.[1]).find(Boolean)

  const toggleLayer = (layer: Layer) =>
    setLayers((current) => {
      const next = new Set(current)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next.size ? next : new Set(ALL_LAYERS)
    })

  return (
    <>
      <SiteHeader title={TITLE} subtitle={SUBTITLE} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label={`Sprint ${board.currentSprint ?? '—'} en curso`}
            value={`${sprintDonePoints} / ${sprintPoints} pts`}
            detail={sprintDates ?? undefined}
          />
          <Stat label="Tarjetas terminadas" value={String(doneCount)} detail={`desde el Sprint 1`} />
          <Stat label="Pendientes" value={String(board.cards.length - doneCount)} detail="en backlog y sprint actual" />
          <Stat label="Release 1.0 — Tiendas" value={`${releaseDone} / ${release.length}`} detail="tarjetas que bloquean la publicación" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={groupBy}
            onValueChange={(value) => value && setGroupBy(value as GroupBy)}
          >
            <ToggleGroupItem value="sprint" className="px-3">
              Por sprint
            </ToggleGroupItem>
            <ToggleGroupItem value="epic" className="px-3">
              Por épica
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap gap-1">
            {ALL_LAYERS.map((layer) => (
              <Toggle
                key={layer}
                size="sm"
                variant="outline"
                pressed={layers.has(layer)}
                onPressedChange={() => toggleLayer(layer)}
                className={cn('gap-1.5 px-2.5', !layers.has(layer) && 'opacity-50')}
              >
                <span className="size-2 rounded-full" style={{ background: LAYER_COLORS[layer] }} />
                {layer}
              </Toggle>
            ))}
          </div>
          <Toggle size="sm" variant="outline" pressed={releaseOnly} onPressedChange={setReleaseOnly} className="px-3">
            Solo Release 1.0
          </Toggle>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href={board.boardUrl} target="_blank" rel="noreferrer">
              Abrir en Trello <IconExternalLink className="size-4" />
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <Card className={cn('overflow-hidden py-0', PANEL_HEIGHT)}>
            <ProjectGraph columns={columns} edges={board.edges} selectedId={selected?.id ?? null} onSelect={setSelected} />
          </Card>
          <Card className={cn('overflow-y-auto py-0', PANEL_HEIGHT)}>
            {selected ? (
              <ProjectCardPanel card={selected} onClose={() => setSelected(null)} />
            ) : (
              <OverviewPanel board={board} onSelect={setSelected} />
            )}
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">
          Las líneas naranjas animadas son dependencias; las punteadas unen una tarjeta pendiente con la funcionalidad que completa.
          Los datos se leen del tablero de Trello y se actualizan cada 5 minutos.
        </p>
      </div>
    </>
  )
}
