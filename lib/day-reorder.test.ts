import { describe, expect, it } from 'vitest'
import { arrayMove } from '@dnd-kit/sortable'
import { buildDayRows, planDayMove, type DayItem } from './day-reorder'

const item = (id: string, dayNumber: number, order: number, time: string): DayItem => ({ id, dayNumber, order, time })

// Day 1: a 09:00, b 19:00 · Day 2: c 11:30, d 15:30 · Day 3: e 10:00
const ITEMS = [item('a', 1, 0, '09:00'), item('b', 1, 1, '19:00'), item('c', 2, 2, '11:30'), item('d', 2, 3, '15:30'), item('e', 3, 4, '10:00')]

/** Simulates a drop: moves `id` to the position currently held by `overId`, as the sortable list does. */
function drop(items: DayItem[], dayCount: number, id: string, overId: string) {
  const rows = buildDayRows(items, dayCount)
  const moved = arrayMove(
    rows,
    rows.findIndex((row) => row.id === id),
    rows.findIndex((row) => row.id === overId)
  )
  return planDayMove(moved, id)
}

const layout = (items: DayItem[]) => items.map((i) => `${i.dayNumber}:${i.id}@${i.time}`).join(' ')

describe('buildDayRows', () => {
  it('lists every day of the trip, including empty ones, each followed by its items in order', () => {
    const rows = buildDayRows([item('x', 3, 0, '09:00')], 4)
    expect(rows.map((row) => row.id)).toEqual(['day-1', 'day-2', 'day-3', 'x', 'day-4'])
  })

  it('extends past dayCount when an item sits on a later day', () => {
    expect(buildDayRows([item('x', 3, 0, '09:00')], 2).map((row) => row.id)).toEqual(['day-1', 'day-2', 'day-3', 'x'])
  })
})

describe('planDayMove', () => {
  it('moves an activity into another day, keeping its time and placing it by time', () => {
    // Drop "a" (09:00, day 1) onto "d" (day 2): it lands after d, but sorts before c by time.
    const { items, changes } = drop(ITEMS, 3, 'a', 'd')

    expect(layout(items)).toBe('1:b@19:00 2:a@09:00 2:c@11:30 2:d@15:30 3:e@10:00')
    expect(items.map((i) => i.order)).toEqual([0, 1, 2, 3, 4])
    expect(changes).toEqual(
      expect.arrayContaining([
        { id: 'a', dayNumber: 2, order: 1, time: '09:00' },
        { id: 'b', dayNumber: 1, order: 0, time: '19:00' },
      ])
    )
    expect(changes.map((c) => c.id).sort()).toEqual(['a', 'b'])
  })

  it('moves an activity into an empty day by dropping it on that day header', () => {
    const { items } = drop(ITEMS, 4, 'e', 'day-4')

    expect(layout(items)).toBe('1:a@09:00 1:b@19:00 2:c@11:30 2:d@15:30 4:e@10:00')
  })

  it('moves an activity to an earlier day', () => {
    const { items } = drop(ITEMS, 3, 'e', 'b')

    // e (10:00) goes to day 1 and sorts between a (09:00) and b (19:00).
    expect(layout(items)).toBe('1:a@09:00 1:e@10:00 1:b@19:00 2:c@11:30 2:d@15:30')
  })

  it('treats a drop above the first header as day 1', () => {
    const { items } = drop(ITEMS, 3, 'c', 'day-1')

    expect(layout(items)).toBe('1:a@09:00 1:c@11:30 1:b@19:00 2:d@15:30 3:e@10:00')
  })

  it('keeps the existing within-day behaviour: the dragged activity takes the time of its new slot', () => {
    const { items, changes } = drop(ITEMS, 3, 'd', 'c')

    expect(layout(items)).toBe('1:a@09:00 1:b@19:00 2:d@11:30 2:c@15:30 3:e@10:00')
    // Only the two swapped activities change, and other days are untouched.
    expect(changes).toEqual(
      expect.arrayContaining([
        { id: 'd', dayNumber: 2, order: 2, time: '11:30' },
        { id: 'c', dayNumber: 2, order: 3, time: '15:30' },
      ])
    )
    expect(changes).toHaveLength(2)
  })

  it('reports no changes when an activity is dropped where it already was', () => {
    const rows = buildDayRows(ITEMS, 3)
    expect(planDayMove(rows, 'c').changes).toEqual([])
  })

  it('keeps unparseable times at the end of the destination day', () => {
    const items = [item('a', 1, 0, 'Por confirmar'), item('b', 2, 1, '08:00'), item('c', 2, 2, '20:00')]
    const { items: result } = drop(items, 2, 'a', 'b')

    expect(layout(result)).toBe('2:b@08:00 2:c@20:00 2:a@Por confirmar')
  })
})
