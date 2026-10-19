'use client'

import { useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTheme } from 'next-themes'
import { IconCamera } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { LAYER_COLORS, type Column } from '@/lib/project-layout'
import type { ProjectCard, ProjectEdge } from '@/lib/trello'

const COLUMN_WIDTH = 236
const COLUMN_GAP = 28
const HEADER_HEIGHT = 64
const CARD_HEIGHT = 50
const CARD_GAP = 8
const LANE_PADDING = 10

type CardNodeData = { card: ProjectCard; dimmed: boolean }
type HeaderNodeData = { column: Column }
type LaneNodeData = { current: boolean }

type CardNode = Node<CardNodeData, 'card'>
type HeaderNode = Node<HeaderNodeData, 'header'>
type LaneNode = Node<LaneNodeData, 'lane'>

const STATUS_TEXT: Partial<Record<ProjectCard['listKind'], string>> = {
  doing: 'En progreso',
  review: 'En revisión',
  sprint: 'Comprometida',
  refined: 'Refinada',
}

function CardNodeView({ data, selected }: NodeProps<CardNode>) {
  const { card, dimmed } = data
  const done = card.listKind === 'done'
  const active = card.listKind === 'doing' || card.listKind === 'review'
  return (
    <div
      className={cn(
        'flex h-12.5 w-54 cursor-pointer flex-col justify-center gap-0.5 rounded-lg border bg-card px-2.5 shadow-xs transition-all',
        done && 'bg-muted/60',
        active && 'border-brand-orange shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-brand-orange)_25%,transparent)]',
        selected && 'ring-2 ring-foreground',
        dimmed && 'opacity-30'
      )}
      style={{ borderLeft: `4px solid ${LAYER_COLORS[card.layer]}` }}
    >
      <Handle type="target" position={Position.Left} className="size-1! min-h-0! min-w-0! border-0! bg-transparent!" />
      <div className="flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{card.code}</span>
        <span>{card.layer}</span>
        {active ? (
          <span className="flex items-center gap-1 font-medium text-brand-orange">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-orange" />
            {STATUS_TEXT[card.listKind]}
          </span>
        ) : null}
        {!active && STATUS_TEXT[card.listKind] ? <span>· {STATUS_TEXT[card.listKind]}</span> : null}
        {card.labels.includes('Parcial') ? <span className="text-amber-600 dark:text-amber-400">· Parcial</span> : null}
        <span className="ml-auto flex items-center gap-1">
          {card.attachments.length ? <IconCamera className="size-3" aria-label="Con pantallazos" /> : null}
          {card.points ? <span className="rounded bg-muted px-1 font-medium text-foreground">{card.points}</span> : null}
        </span>
      </div>
      <p className={cn('truncate text-xs font-medium', done && 'text-muted-foreground')}>{card.title}</p>
      <Handle type="source" position={Position.Right} className="size-1! min-h-0! min-w-0! border-0! bg-transparent!" />
    </div>
  )
}

function HeaderNodeView({ data }: NodeProps<HeaderNode>) {
  const { column } = data
  const points = column.cards.reduce((sum, c) => sum + (c.points ?? 0), 0)
  return (
    <div className="flex w-54 flex-col gap-0.5">
      <p className={cn('text-sm font-semibold', column.current && 'text-brand-orange')}>{column.title}</p>
      <p className="text-xs text-muted-foreground">
        {[column.subtitle, `${column.cards.length} tarjetas`, points ? `${points} pts` : null].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

function LaneNodeView({ data, width, height }: NodeProps<LaneNode>) {
  return (
    <div
      style={{ width, height }}
      className={cn(
        'rounded-2xl border border-dashed bg-muted/30',
        data.current && 'border-brand-orange/60 bg-[color-mix(in_oklch,var(--color-brand-orange)_6%,transparent)]'
      )}
    />
  )
}

const nodeTypes = { card: CardNodeView, header: HeaderNodeView, lane: LaneNodeView }

export function ProjectGraph({
  columns,
  edges,
  selectedId,
  onSelect,
}: {
  columns: Column[]
  edges: ProjectEdge[]
  selectedId: string | null
  onSelect: (card: ProjectCard | null) => void
}) {
  const { resolvedTheme } = useTheme()

  const { nodes, flowEdges, focusIds } = useMemo(() => {
    const byCode = new Map(columns.flatMap((col) => col.cards.map((c) => [c.code, c] as const)))
    const selected = columns.flatMap((col) => col.cards).find((c) => c.id === selectedId) ?? null
    const visibleEdges = edges.filter((e) => byCode.has(e.from) && byCode.has(e.to))
    // With a card selected, everything not linked to it fades.
    const linked = new Set<string>()
    if (selected) {
      linked.add(selected.code)
      for (const e of visibleEdges) {
        if (e.from === selected.code) linked.add(e.to)
        if (e.to === selected.code) linked.add(e.from)
      }
    }

    const nodes: Node[] = []
    columns.forEach((column, i) => {
      const x = i * (COLUMN_WIDTH + COLUMN_GAP)
      const laneHeight = HEADER_HEIGHT + Math.max(column.cards.length, 1) * (CARD_HEIGHT + CARD_GAP) + LANE_PADDING
      nodes.push({
        id: `lane-${column.id}`,
        type: 'lane',
        position: { x: x - LANE_PADDING, y: -LANE_PADDING },
        width: COLUMN_WIDTH - COLUMN_GAP / 2 + LANE_PADDING,
        height: laneHeight,
        data: { current: column.current },
        selectable: false,
        draggable: false,
        zIndex: -1,
      } satisfies LaneNode)
      nodes.push({
        id: `header-${column.id}`,
        type: 'header',
        position: { x, y: 0 },
        data: { column },
        selectable: false,
        draggable: false,
      } satisfies HeaderNode)
      column.cards.forEach((card, j) => {
        nodes.push({
          id: card.code,
          type: 'card',
          position: { x, y: HEADER_HEIGHT + j * (CARD_HEIGHT + CARD_GAP) },
          data: { card, dimmed: !!selected && !linked.has(card.code) },
          selected: card.id === selectedId,
          draggable: false,
        } satisfies CardNode)
      })
    })

    const flowEdges: Edge[] = visibleEdges.map((e) => {
      const touches = !!selected && (e.from === selected.code || e.to === selected.code)
      const depends = e.kind === 'depends'
      return {
        id: `${e.from}>${e.to}`,
        source: e.from,
        target: e.to,
        animated: depends,
        style: {
          stroke: depends ? 'var(--color-brand-orange)' : 'var(--muted-foreground)',
          strokeWidth: touches ? 2.5 : 1.5,
          strokeDasharray: depends ? undefined : '4 4',
          opacity: selected && !touches ? 0.15 : 0.85,
        },
      }
    })

    // Open on the latest work, readable: the current sprint (or the last columns) and the tops of their lists.
    const currentIndex = columns.findIndex((col) => col.current)
    const focusColumns = currentIndex >= 0 ? columns.slice(Math.max(currentIndex - 1, 0), currentIndex + 2) : columns.slice(0, 3)
    const focusIds = focusColumns.flatMap((col) => [`header-${col.id}`, ...col.cards.slice(0, 6).map((c) => c.code)])
    return { nodes, flowEdges, focusIds }
  }, [columns, edges, selectedId])

  return (
    <ReactFlow
      nodes={nodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      fitView
      fitViewOptions={{ nodes: focusIds.map((id) => ({ id })), padding: 0.1, minZoom: 0.7, maxZoom: 1 }}
      minZoom={0.1}
      maxZoom={1.5}
      onNodeClick={(_event, node) => {
        if (node.type === 'card') onSelect((node.data as CardNodeData).card)
      }}
      onPaneClick={() => onSelect(null)}
    >
      <Background gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => (node.type === 'card' ? LAYER_COLORS[(node.data as CardNodeData).card.layer] : 'transparent')}
        className="hidden! xl:block!"
      />
    </ReactFlow>
  )
}
