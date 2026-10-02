'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CalendarRangeIcon, CopyIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ActivityTemplate, ProgramItem } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { ActivityItemSheet, type ActivityItemEditing, type ActivityItemValues } from '@/components/activity-item-form'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/reui/sortable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { ProgramDetailsDialog, type ProgramDetailsValues } from '@/components/program-details-dialog'
import { duplicateProgram, updateProgramDetails } from '@/lib/program-actions'

type ProgramDetail = {
  id: string
  name: string
  description: string | null
  items: ProgramItem[]
}

// `time` is free text (e.g. "09:00"), not a validated time input — parse
// defensively and push anything unparseable to the end rather than let it
// throw off the sort.
function parseTimeMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return Number.POSITIVE_INFINITY
  return Number(match[1]) * 60 + Number(match[2])
}

export default function AdminProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([])
  const [itemOpen, setItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActivityItemEditing | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    const [programRes, activityTemplatesRes] = await Promise.all([
      fetch(`/api/v1/admin/programs/${programId}`),
      fetch('/api/v1/admin/activity-templates'),
    ])
    if (programRes.ok) setProgram((await programRes.json()).program)
    if (activityTemplatesRes.ok) setActivityTemplates((await activityTemplatesRes.json()).activityTemplates)
  }, [programId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  async function handleSaveDetails(values: ProgramDetailsValues) {
    const result = await updateProgramDetails(programId, values)
    if (!result.ok) return result
    toast.success('Programa actualizado.')
    setDetailsOpen(false)
    void load()
    return { ok: true }
  }

  async function handleDuplicate() {
    if (!program) return
    setDuplicating(true)
    const result = await duplicateProgram(programId)
    setDuplicating(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Se creó "${program.name} (copia)". Cámbiale el nombre y ajusta sus actividades.`)
    router.push(`/admin/programs/${result.data.id}`)
  }

  function openCreateItem() {
    setEditingItem(null)
    setItemOpen(true)
  }

  function openEditItem(item: ProgramItem) {
    setEditingItem({
      id: item.id,
      dayNumber: item.dayNumber,
      time: item.time,
      title: item.title,
      location: item.location,
      description: item.description,
      requirementsMessage: item.requirementsMessage,
    })
    setItemOpen(true)
  }

  async function handleSaveItem(values: ActivityItemValues, editingItemId: string | null) {
    const res = await fetch(
      editingItemId
        ? `/api/v1/admin/programs/${programId}/items/${editingItemId}`
        : `/api/v1/admin/programs/${programId}/items`,
      {
        method: editingItemId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }
    )
    if (res.ok) {
      void load()
      return { ok: true }
    }
    const data = await res.json().catch(() => null)
    return { ok: false, error: data?.error?.message ?? 'No se pudo guardar la actividad.' }
  }

  async function handleDeleteItem(itemId: string) {
    if (!window.confirm('¿Eliminar esta actividad del programa?')) return
    const res = await fetch(`/api/v1/admin/programs/${programId}/items/${itemId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Actividad eliminada.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar la actividad.')
    }
  }

  // `order` is a single sequence shared across the whole program (not scoped per
  // day), so a drag within one day's list must reuse that day's own original
  // order AND time values in their new sequence rather than renumbering
  // everything — otherwise it would collide with or shift items on other days.
  // Reusing the day's own time slots the same way means dragging an activity
  // to a new position also gives it the time that belonged to that slot, so
  // the displayed order and the clock times never disagree.
  function handleReorderDay(newDayItems: ProgramItem[]) {
    const orderSlots = newDayItems.map((item) => item.order).sort((a, b) => a - b)
    const timeSlots = newDayItems.map((item) => item.time).sort((a, b) => parseTimeMinutes(a) - parseTimeMinutes(b))
    const changed: { id: string; order: number; time: string }[] = []
    const reordered = newDayItems.map((item, idx) => {
      const order = orderSlots[idx]
      const time = timeSlots[idx]
      const isChanged = order !== item.order || time !== item.time
      if (isChanged) changed.push({ id: item.id, order, time })
      return isChanged ? { ...item, order, time } : item
    })
    if (changed.length === 0) return

    setProgram((prev) => {
      if (!prev) return prev
      const byId = new Map(reordered.map((item) => [item.id, item]))
      return { ...prev, items: prev.items.map((item) => byId.get(item.id) ?? item).sort((a, b) => a.order - b.order) }
    })

    void Promise.all(
      changed.map((c) =>
        fetch(`/api/v1/admin/programs/${programId}/items/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: c.order, time: c.time }),
        })
      )
    ).then((responses) => {
      if (responses.some((r) => !r.ok)) {
        toast.error('No se pudo guardar el nuevo orden.')
        void load()
      }
    })
  }

  if (!program) {
    return (
      <>
        <SiteHeader title="Programa" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  const groupedByDay = Object.entries(
    program.items.reduce<Record<number, ProgramItem[]>>((groups, item) => {
      ;(groups[item.dayNumber] ??= []).push(item)
      return groups
    }, {})
  ).sort(([a], [b]) => Number(a) - Number(b))

  return (
    <>
      <SiteHeader
        title={program.name}
        subtitle={program.description ?? 'Programa reutilizable'}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={() => setDetailsOpen(true)}>
              <PencilIcon />
              Editar nombre
            </Button>
            <Button variant="outline" size="xs" onClick={handleDuplicate} disabled={duplicating}>
              <CopyIcon />
              {duplicating ? 'Duplicando…' : 'Duplicar'}
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Actividades del programa</CardTitle>
            <Button variant="outline" size="sm" onClick={openCreateItem}>
              <PlusIcon />
              Agregar
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            {groupedByDay.length ? (
              groupedByDay.map(([day, items]) => (
                <div key={day} className="flex flex-col gap-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Día {day}
                  </p>
                  <Sortable
                    value={items}
                    onValueChange={handleReorderDay}
                    getItemValue={(item) => item.id}
                    className="flex w-full flex-col gap-3"
                  >
                    {items.map((item) => (
                      <SortableItem
                        key={item.id}
                        value={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          <SortableItemHandle className="mt-1 shrink-0 text-muted-foreground">
                            <GripVerticalIcon className="size-4" />
                          </SortableItemHandle>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {item.time}
                              </Badge>
                              <p className="text-sm font-medium">{item.title}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
                            {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
                            {item.requirementsMessage ? (
                              <p className="mt-1 text-xs text-muted-foreground">Requiere: {item.requirementsMessage}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                            <PencilIcon className="size-4" />
                            <span className="sr-only">Editar actividad</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Eliminar actividad</span>
                          </Button>
                        </div>
                      </SortableItem>
                    ))}
                  </Sortable>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarRangeIcon}
                title="Sin actividades todavía."
                description="Agrega la primera actividad de este programa."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <ActivityItemSheet
        open={itemOpen}
        onOpenChange={setItemOpen}
        activityTemplates={activityTemplates}
        editingItem={editingItem}
        existingItems={program?.items}
        onSubmit={handleSaveItem}
      />
      <ProgramDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Editar programa"
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        initialValues={{ name: program.name, description: program.description ?? '' }}
        onSubmit={handleSaveDetails}
      />
    </>
  )
}
