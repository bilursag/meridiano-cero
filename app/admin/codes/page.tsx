'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, CopyIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { AccessCode, Role } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type CodeRow = AccessCode & { trip: { id: string; name: string } }
type TripOption = { id: string; name: string }

const roleLabels: Record<Role, string> = { PARENT: 'Apoderado', MONITOR: 'Monitor' }

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<CodeRow[] | null>(null)
  const [trips, setTrips] = useState<TripOption[]>([])
  const [open, setOpen] = useState(false)
  const [tripId, setTripId] = useState('')
  const [role, setRole] = useState<Role>('PARENT')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [codesRes, tripsRes] = await Promise.all([
      fetch('/api/v1/admin/codes'),
      fetch('/api/v1/trips'),
    ])
    if (codesRes.ok) setCodes((await codesRes.json()).codes)
    if (tripsRes.ok) setTrips((await tripsRes.json()).trips)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleCreate() {
    if (!tripId) return
    setCreating(true)
    const res = await fetch('/api/v1/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, role }),
    })
    setCreating(false)
    if (res.ok) {
      setOpen(false)
      setTripId('')
      void load()
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/v1/admin/codes/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  async function handleCopy(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
  }

  return (
    <>
      <SiteHeader
        title="Códigos"
        subtitle="Códigos de acceso para apoderados y monitores"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <PlusIcon />
                Nuevo código
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo código de acceso</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Gira</Label>
                  <Select value={tripId} onValueChange={setTripId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una gira" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Rol</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARENT">Apoderado</SelectItem>
                      <SelectItem value="MONITOR">Monitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !tripId}>
                  {creating ? 'Generando…' : 'Generar código'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="overflow-hidden">
          {!codes ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Gira</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length ? (
                  codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono">{code.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[code.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/trips/${code.trip.id}`} className="hover:underline">
                          {code.trip.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(code.createdAt).toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(code.id, code.code)}>
                          {copiedId === code.id ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                          <span className="sr-only">Copiar código</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRevoke(code.id)}>
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Revocar código</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Sin códigos emitidos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
