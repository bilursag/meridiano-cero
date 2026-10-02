'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarRangeIcon, CopyIcon, MoreVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { ProgramDetailsDialog, type ProgramDetailsValues } from '@/components/program-details-dialog'
import { duplicateProgram, updateProgramDetails } from '@/lib/program-actions'

type ProgramRow = {
  id: string
  name: string
  description: string | null
  itemCount: number
  tripCount: number
}

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<ProgramRow | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/admin/programs')
    if (res.ok) {
      setPrograms((await res.json()).programs)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudieron cargar los programas.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  async function handleCreate(values: ProgramDetailsValues) {
    const res = await fetch('/api/v1/admin/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, description: values.description || undefined }),
    })
    if (res.ok) {
      toast.success('Programa creado.')
      setCreateOpen(false)
      void load()
      return { ok: true }
    }
    const data = await res.json().catch(() => null)
    return { ok: false, error: data?.error?.message ?? 'No se pudo crear el programa.' }
  }

  async function handleEdit(values: ProgramDetailsValues) {
    if (!editingProgram) return { ok: false }
    const result = await updateProgramDetails(editingProgram.id, values)
    if (!result.ok) return result
    toast.success('Programa actualizado.')
    setEditingProgram(null)
    void load()
    return { ok: true }
  }

  async function handleDuplicate(program: ProgramRow) {
    const result = await duplicateProgram(program.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Se creó "${program.name} (copia)". Cámbiale el nombre y ajusta sus actividades.`)
    router.push(`/admin/programs/${result.data.id}`)
  }

  async function handleDelete(program: ProgramRow) {
    if (!window.confirm(`¿Eliminar el programa "${program.name}"? Los grupos que ya lo aplicaron no se ven afectados.`)) {
      return
    }
    const res = await fetch(`/api/v1/admin/programs/${program.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Programa eliminado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar el programa.')
    }
  }

  return (
    <>
      <SiteHeader
        title="Programas"
        subtitle="Itinerarios reutilizables que se asignan a uno o más grupos"
        right={
          <Button size="xs" onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Nuevo programa
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {loadError && !programs ? (
          <FetchError message={loadError} onRetry={load} />
        ) : !programs ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Actividades</TableHead>
                  <TableHead>Grupos asignados</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.length ? (
                  programs.map((program) => (
                    <TableRow key={program.id} className="h-16">
                      <TableCell>
                        <Link href={`/admin/programs/${program.id}`} className="flex items-center gap-3 font-medium hover:underline">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                            <CalendarRangeIcon size={15} />
                          </div>
                          {program.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {program.description ?? '—'}
                      </TableCell>
                      <TableCell>{program.itemCount}</TableCell>
                      <TableCell>{program.tripCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                              <MoreVerticalIcon />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => setEditingProgram(program)}>
                              <PencilIcon className="size-4" />
                              Editar nombre
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDuplicate(program)}>
                              <CopyIcon className="size-4" />
                              Duplicar programa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onSelect={() => handleDelete(program)}
                            >
                              <Trash2Icon className="size-4" />
                              Eliminar programa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={CalendarRangeIcon}
                        title="Sin programas todavía."
                        description="Crea un programa reutilizable para poblar el itinerario de un grupo automáticamente."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <ProgramDetailsDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nuevo programa"
        submitLabel="Crear programa"
        submittingLabel="Creando…"
        onSubmit={handleCreate}
      />
      <ProgramDetailsDialog
        open={editingProgram !== null}
        onOpenChange={(open) => !open && setEditingProgram(null)}
        title="Editar programa"
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        initialValues={
          editingProgram ? { name: editingProgram.name, description: editingProgram.description ?? '' } : undefined
        }
        onSubmit={handleEdit}
      />
    </>
  )
}
