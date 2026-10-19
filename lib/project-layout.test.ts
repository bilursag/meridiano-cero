import { describe, expect, it } from 'vitest'
import type { ProjectCard } from '@/lib/trello'
import { epicColumns, filterCards, latestDone, RELEASE_LABEL, sprintColumns } from '@/lib/project-layout'

function card(overrides: Partial<ProjectCard>): ProjectCard {
  return {
    id: overrides.code ?? 'x',
    code: 'B01',
    title: 'Tarjeta',
    layer: 'Backend',
    epic: 'Giras',
    labels: [],
    listName: 'Product Backlog',
    listKind: 'backlog',
    sprint: null,
    points: null,
    completedAt: null,
    story: null,
    summary: null,
    files: null,
    snippet: null,
    checklists: [],
    attachments: [],
    url: '',
    ...overrides,
  }
}

const cards = [
  card({ code: 'B01', listKind: 'done', listName: 'Hecho — Sprint 1 (15–26 jun)', sprint: 1, completedAt: '2026-06-20T15:00:00Z' }),
  card({ code: 'B02', listKind: 'done', listName: 'Hecho — Sprint 1 (15–26 jun)', sprint: 1, completedAt: '2026-06-18T15:00:00Z' }),
  card({ code: 'A01', layer: 'App', listKind: 'done', listName: 'Hecho — Sprint 3 (13–24 jul)', sprint: 3, completedAt: '2026-07-20T15:00:00Z' }),
  card({ code: 'P11', listKind: 'sprint', listName: 'Sprint Backlog — Sprint 3 (13–24 jul)', sprint: 3 }),
  card({ code: 'P01', listKind: 'doing', listName: 'En progreso', sprint: 3, labels: [RELEASE_LABEL] }),
  card({ code: 'P31', layer: 'Docs', listKind: 'refined', listName: 'Refinado (listo para sprint)', epic: 'Plataforma' }),
  card({ code: 'P20', layer: 'App', epic: 'Plataforma' }),
]

describe('sprintColumns', () => {
  const columns = sprintColumns({ currentSprint: 3 }, cards)

  it('lays out every sprint up to the current one, then Refinado and the backlog', () => {
    expect(columns.map((c) => c.id)).toEqual(['sprint-1', 'sprint-2', 'sprint-3', 'refined', 'backlog'])
  })

  it('marks a sprint without cards as having no deliveries', () => {
    expect(columns[1]).toMatchObject({ subtitle: 'Sin entregas', cards: [] })
  })

  it('orders past sprints by completion date and takes their dates from the list name', () => {
    expect(columns[0].cards.map((c) => c.code)).toEqual(['B02', 'B01'])
    expect(columns[0].subtitle).toBe('15–26 jun')
  })

  it('puts work in progress first in the current sprint', () => {
    expect(columns[2].current).toBe(true)
    expect(columns[2].cards.map((c) => c.code)).toEqual(['P01', 'P11', 'A01'])
  })
})

describe('epicColumns', () => {
  it('groups by epic, largest first, with pending work above the newest done', () => {
    const columns = epicColumns(cards)
    expect(columns.map((c) => c.title)).toEqual(['Giras', 'Plataforma'])
    expect(columns[0].cards.map((c) => c.code)).toEqual(['P01', 'P11', 'A01', 'B01', 'B02'])
    expect(columns[0].subtitle).toBe('3 de 5 terminadas')
  })
})

describe('latestDone and filterCards', () => {
  it('lists the newest finished cards first', () => {
    expect(latestDone(cards, 2).map((c) => c.code)).toEqual(['A01', 'B01'])
  })

  it('filters by layer and by the release label', () => {
    expect(filterCards(cards, new Set(['App']), false).map((c) => c.code)).toEqual(['A01', 'P20'])
    expect(filterCards(cards, new Set(['Backend', 'App']), true).map((c) => c.code)).toEqual(['P01'])
  })
})
