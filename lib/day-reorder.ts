/**
 * Drag-and-drop planning for day-grouped activity lists (a trip itinerary or a program).
 *
 * The UI renders one flat sortable list in which each "Día N" header is a drop target, so an
 * activity can be dragged into any day, including an empty one. After a drop, the day an
 * activity belongs to is the nearest header above it.
 */

export type DayItem = { id: string; dayNumber: number; order: number; time: string }

export type DayRow<T extends DayItem> = { kind: 'day'; id: string; day: number } | { kind: 'item'; id: string; item: T }

export type DayItemChange = { id: string; dayNumber: number; order: number; time: string }

// `time` is free text (e.g. "09:00"), not a validated time input — parse defensively and push
// anything unparseable to the end rather than let it throw off the sort.
export function parseTimeMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return Number.POSITIVE_INFINITY
  return Number(match[1]) * 60 + Number(match[2])
}

export const dayRowId = (day: number) => `day-${day}`

/** Headers for days 1..dayCount (or up to the last used day, if later), each followed by its items. */
export function buildDayRows<T extends DayItem>(items: T[], dayCount: number): DayRow<T>[] {
  const lastDay = Math.max(dayCount, ...items.map((item) => item.dayNumber), 1)
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const rows: DayRow<T>[] = []
  for (let day = 1; day <= lastDay; day++) {
    rows.push({ kind: 'day', id: dayRowId(day), day })
    for (const item of sorted) if (item.dayNumber === day) rows.push({ kind: 'item', id: item.id, item })
  }
  return rows
}

/**
 * Turns the rows as they look after a drop into the new item list plus the minimal set of changes
 * to save.
 *
 * - Within the same day: the existing behaviour. `order` is one sequence shared by the whole list,
 *   so the day reuses its own order and time slots in the new sequence (the dragged activity takes
 *   the time of the slot it lands in), and nothing on other days changes.
 * - Into another day: the activity keeps its own time and is placed among that day's activities by
 *   time, wherever exactly it was dropped. Orders are then renumbered so the shared sequence stays
 *   day by day.
 */
export function planDayMove<T extends DayItem>(
  rows: DayRow<T>[],
  movedId: string
): { items: T[]; changes: DayItemChange[] } {
  const byDay = new Map<number, T[]>()
  let currentDay = 1
  let moved: { item: T; newDay: number } | null = null
  for (const row of rows) {
    if (row.kind === 'day') {
      currentDay = row.day
      continue
    }
    const list = byDay.get(currentDay) ?? []
    list.push(row.item)
    byDay.set(currentDay, list)
    if (row.id === movedId) moved = { item: row.item, newDay: currentDay }
  }

  const allItems = rows.flatMap((row) => (row.kind === 'item' ? [row.item] : []))
  if (!moved) return { items: allItems, changes: [] }

  const updated = new Map<string, T>()

  if (moved.newDay === moved.item.dayNumber) {
    const dayItems = byDay.get(moved.newDay) ?? []
    const orderSlots = dayItems.map((item) => item.order).sort((a, b) => a - b)
    const timeSlots = dayItems.map((item) => item.time).sort((a, b) => parseTimeMinutes(a) - parseTimeMinutes(b))
    dayItems.forEach((item, index) => {
      const order = orderSlots[index]
      const time = timeSlots[index]
      if (order !== item.order || time !== item.time) updated.set(item.id, { ...item, order, time })
    })
  } else {
    const days = [...byDay.keys()].sort((a, b) => a - b)
    let nextOrder = 0
    for (const day of days) {
      const dayItems = (byDay.get(day) ?? []).map((item) => (item.id === moved.item.id ? { ...item, dayNumber: day } : item))
      if (day === moved.newDay) {
        // Stable by previous order, so activities at the same time keep their relative position.
        dayItems.sort((a, b) => parseTimeMinutes(a.time) - parseTimeMinutes(b.time) || a.order - b.order)
      } else {
        dayItems.sort((a, b) => a.order - b.order)
      }
      for (const item of dayItems) {
        const original = allItems.find((candidate) => candidate.id === item.id)!
        const order = nextOrder++
        if (order !== original.order || item.dayNumber !== original.dayNumber) updated.set(item.id, { ...item, order })
      }
    }
  }

  const items = allItems.map((item) => updated.get(item.id) ?? item).sort((a, b) => a.order - b.order)
  const changes = [...updated.values()].map(({ id, dayNumber, order, time }) => ({ id, dayNumber, order, time }))
  return { items, changes }
}
