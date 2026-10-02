'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CalendarRangeIcon, CopyIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ActivityTemplate, ProgramItem } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { ActivityItemSheet, type ActivityItemEditing, type ActivityItemValues } from '@/components/activity-item-form'
import { DaySortableList } from '@/components/day-sortable-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { ProgramDetailsDialog, type ProgramDetailsValues } from '@/components/program-details-dialog'
import { duplicateProgram, updateProgramDetails } from '@/lib/program-actions'
import type { DayItemChange } from '@/lib/day-reorder'

type ProgramDetail = {
  id: string
  name: string
  description: string | null
  items: ProgramItem[]
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

  // Drag-and-drop within a day or across days; lib/day-reorder.ts decides the new day, order and
  // time of each activity, and the whole move is saved in one request.
  function handleMoveItems(nextItems: ProgramItem[], changes: DayItemChange[]) {
    setProgram((prev) => (prev ? { ...prev, items: nextItems } : prev))
    void fetch(`/api/v1/admin/programs/${programId}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: changes }),
    }).then((res) => {
      if (!res.ok) {
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
          <CardContent className="flex flex-col gap-4">
            {program.items.length ? (
              <DaySortableList
                items={program.items}
                dayCount={1}
                renderDayLabel={(day) => `Día ${day}`}
                onMove={handleMoveItems}
                renderItem={(item) => (
                  <div className="flex items-start justify-between gap-3">
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
                  </div>
                )}
              />
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
