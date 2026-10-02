'use client'

import { useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { GripVerticalIcon } from 'lucide-react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/reui/sortable'
import { buildDayRows, planDayMove, type DayItem, type DayItemChange, type DayRow } from '@/lib/day-reorder'
import { cn } from '@/lib/utils'

type Props<T extends DayItem> = {
  items: T[]
  /** Days to show even when empty, so activities can be dragged into them. */
  dayCount: number
  renderDayLabel: (day: number) => React.ReactNode
  /** Row content after the drag handle (text, badges, action buttons). */
  renderItem: (item: T) => React.ReactNode
  /** Called after a drop with the new list (for an optimistic update) and the changes to save. */
  onMove: (items: T[], changes: DayItemChange[]) => void
}

/**
 * Activities grouped by day in a single sortable list: each "Día N" header is a fixed drop target,
 * so an activity can be dragged within its day or into any other day (see lib/day-reorder.ts).
 */
export function DaySortableList<T extends DayItem>({ items, dayCount, renderDayLabel, renderItem, onMove }: Props<T>) {
  const rows = useMemo(() => buildDayRows(items, dayCount), [items, dayCount])
  const emptyDays = useMemo(() => {
    const used = new Set(items.map((item) => item.dayNumber))
    return new Set(rows.flatMap((row) => (row.kind === 'day' && !used.has(row.day) ? [row.day] : [])))
  }, [items, rows])

  function handleMove({ activeIndex, overIndex }: { activeIndex: number; overIndex: number }) {
    const moved = rows[activeIndex]
    if (moved.kind !== 'item') return
    const { items: next, changes } = planDayMove(arrayMove(rows, activeIndex, overIndex), moved.id)
    if (changes.length) onMove(next, changes)
  }

  return (
    <Sortable
      value={rows}
      getItemValue={(row: DayRow<T>) => row.id}
      onValueChange={() => {}}
      onMove={handleMove}
      className="flex flex-col gap-3"
    >
      {rows.map((row, index) =>
        row.kind === 'day' ? (
          <SortableItem
            key={row.id}
            value={row.id}
            disabled={{ draggable: true }}
            className={cn('flex flex-col gap-2', index > 0 && 'pt-3')}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {renderDayLabel(row.day)}
            </p>
            {emptyDays.has(row.day) ? (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                Sin actividades. Arrastra una aquí.
              </p>
            ) : null}
          </SortableItem>
        ) : (
          <SortableItem
            key={row.id}
            value={row.id}
            className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <SortableItemHandle className="mt-1 shrink-0 text-muted-foreground">
              <GripVerticalIcon className="size-4" />
              <span className="sr-only">Arrastrar para mover</span>
            </SortableItemHandle>
            <div className="min-w-0 flex-1">{renderItem(row.item)}</div>
          </SortableItem>
        )
      )}
    </Sortable>
  )
}
