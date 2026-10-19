import type { Layer, ListKind, ProjectBoard, ProjectCard } from '@/lib/trello'

// How /admin/proyecto lays the board out: one column per sprint (a timeline) or per epic.

export type GroupBy = 'sprint' | 'epic'

export type Column = {
  id: string
  title: string
  subtitle: string
  cards: ProjectCard[]
  current: boolean
}

export const RELEASE_LABEL = 'Release 1.0 — Tiendas'

export const LAYER_COLORS: Record<Layer, string> = {
  App: '#22c55e',
  Backend: '#3b82f6',
  Web: '#a855f7',
  Infra: '#64748b',
  Tiendas: '#ec4899',
  Docs: '#f59e0b',
  Otro: '#94a3b8',
}

/** Work under way first, then what is committed, then what waits, then what is done. */
const STATUS_ORDER: Record<ListKind, number> = { doing: 0, review: 1, sprint: 2, refined: 3, backlog: 4, done: 5 }

const byStatusThenCode = (a: ProjectCard, b: ProjectCard) =>
  STATUS_ORDER[a.listKind] - STATUS_ORDER[b.listKind] || a.code.localeCompare(b.code)
const byCompletion = (a: ProjectCard, b: ProjectCard) =>
  (a.completedAt ?? '').localeCompare(b.completedAt ?? '') || a.code.localeCompare(b.code)

/** "Hecho — Sprint 3 (13–24 jul)" → "13–24 jul". */
const datesOf = (listName: string) => listName.match(/\(([^)]+)\)\s*$/)?.[1] ?? null

export function sprintColumns(board: Pick<ProjectBoard, 'currentSprint'>, cards: ProjectCard[]): Column[] {
  const lastSprint = Math.max(board.currentSprint ?? 0, ...cards.map((c) => c.sprint ?? 0))
  const columns: Column[] = []

  for (let n = 1; n <= lastSprint; n++) {
    const inSprint = cards.filter((c) => c.sprint === n)
    const current = n === board.currentSprint
    const dates = inSprint.map((c) => datesOf(c.listName)).find(Boolean)
    columns.push({
      id: `sprint-${n}`,
      title: current ? `Sprint ${n} · actual` : `Sprint ${n}`,
      subtitle: dates ?? (inSprint.length ? '' : 'Sin entregas'),
      cards: [...inSprint].sort(current ? byStatusThenCode : byCompletion),
      current,
    })
  }

  const refined = cards.filter((c) => c.sprint === null && c.listKind === 'refined')
  const backlog = cards.filter((c) => c.sprint === null && c.listKind === 'backlog')
  if (refined.length) {
    columns.push({ id: 'refined', title: 'Refinado', subtitle: 'Listo para un sprint', cards: refined.sort(byStatusThenCode), current: false })
  }
  if (backlog.length) {
    columns.push({ id: 'backlog', title: 'Product Backlog', subtitle: 'Por prioridad', cards: backlog.sort(byStatusThenCode), current: false })
  }
  return columns
}

export function epicColumns(cards: ProjectCard[]): Column[] {
  const epics = [...new Set(cards.map((c) => c.epic ?? 'Sin épica'))]
  return epics
    .map((epic) => {
      const inEpic = cards.filter((c) => (c.epic ?? 'Sin épica') === epic)
      const done = inEpic.filter((c) => c.listKind === 'done').length
      return {
        id: `epic-${epic}`,
        title: epic,
        subtitle: `${done} de ${inEpic.length} terminadas`,
        // Pending work on top, then what was finished most recently.
        cards: [...inEpic].sort((a, b) =>
          a.listKind === 'done' && b.listKind === 'done' ? -byCompletion(a, b) : byStatusThenCode(a, b)
        ),
        current: false,
      }
    })
    .sort((a, b) => b.cards.length - a.cards.length)
}

/** The most recently finished cards, newest first. */
export function latestDone(cards: ProjectCard[], limit = 8) {
  return cards
    .filter((c) => c.listKind === 'done' && c.completedAt)
    .sort((a, b) => -byCompletion(a, b))
    .slice(0, limit)
}

export function filterCards(cards: ProjectCard[], layers: Set<Layer>, releaseOnly: boolean) {
  return cards.filter((c) => layers.has(c.layer) && (!releaseOnly || c.labels.includes(RELEASE_LABEL)))
}
