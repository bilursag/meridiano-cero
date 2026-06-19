'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlusIcon, SchoolIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type SchoolRow = {
  id: string
  name: string
  tripCount: number
  activeTripCount: number
  studentCount: number
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/admin/schools')
    if (res.ok) setSchools((await res.json()).schools)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const res = await fetch('/api/v1/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setCreating(false)
    if (res.ok) {
      setName('')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo crear el colegio.')
    }
  }

  return (
    <>
      <SiteHeader
        title="Colegios"
        subtitle="Cuentas institucionales en la plataforma"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <PlusIcon />
                Nuevo colegio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo colegio</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="school-name">Nombre</Label>
                <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Colegio San Ignacio" />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? 'Creando…' : 'Crear colegio'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {!schools ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : schools.length ? (
            schools.map((school) => (
              <Card key={school.id}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <SchoolIcon size={17} />
                  </div>
                  <CardTitle className="text-base">{school.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between text-sm">
                  <div>
                    <p className="font-semibold">{school.tripCount}</p>
                    <p className="text-muted-foreground">Giras totales</p>
                  </div>
                  <div>
                    <p className="font-semibold">{school.activeTripCount}</p>
                    <p className="text-muted-foreground">En terreno</p>
                  </div>
                  <div>
                    <p className="font-semibold">{school.studentCount}</p>
                    <p className="text-muted-foreground">Alumnos</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin colegios registrados.</p>
          )}
        </div>
      </div>
    </>
  )
}
