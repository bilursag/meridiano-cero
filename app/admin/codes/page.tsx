'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, CopyIcon, PlusIcon, TicketIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
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
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { GlobalFilters } from '@/components/global-filters'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { roleLabels } from '@/lib/labels'
import type { TripRow } from '@/components/data-table'

type CodeRow = AccessCode & { trip: { id: string; name: string } }
type TripOption = { id: string; name: string }

const ROLE_OPTIONS: Role[] = ['PARENT', 'MONITOR', 'STUDENT']

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<CodeRow[] | null>(null)
  const [trips, setTrips] = useState<TripOption[]>([])
  const [allTrips, setAllTrips] = useState<TripRow[]>([])
  const [open, setOpen] = useState(false)
  const [tripId, setTripId] = useState('')
  const [role, setRole] = useState<Role>('PARENT')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  const load = useCallback(async () => {
    setError(null)
    const [codesRes, tripsRes] = await Promise.all([
      fetch('/api/v1/admin/codes'),
      fetch('/api/v1/trips'),
    ])
    if (codesRes.ok) {
      setCodes((await codesRes.json()).codes)
    } else {
      const data = await codesRes.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudieron cargar los códigos.')
    }
    if (tripsRes.ok) {
      const data = (await tripsRes.json()).trips as TripRow[]
      setTrips(data)
      setAllTrips(data)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  const roleLabelOptions = useMemo(() => ROLE_OPTIONS.map((r) => roleLabels[r]), [])
  const labelToRole = useMemo(() => new Map(ROLE_OPTIONS.map((r) => [roleLabels[r], r])), [])
  const groupOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.name))).sort(), [allTrips])
  const schoolOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.school.name))).sort(), [allTrips])
  const destinationOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.destination))).sort(), [allTrips])
  const executiveOptions = useMemo(
    () => Array.from(new Set(allTrips.map((t) => t.salesExecutive).filter((v): v is string => !!v))).sort(),
    [allTrips]
  )

  const matchingTripIds = useMemo(() => {
    return new Set(
      allTrips
        .filter((trip) => {
          const matchesGroup = groupFilter.length === 0 || groupFilter.includes(trip.name)
          const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(trip.school.name)
          const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(trip.destination)
          const matchesExecutive =
            executiveFilter.length === 0 || (!!trip.salesExecutive && executiveFilter.includes(trip.salesExecutive))
          return matchesGroup && matchesSchool && matchesDestination && matchesExecutive
        })
        .map((trip) => trip.id)
    )
  }, [allTrips, groupFilter, schoolFilter, destinationFilter, executiveFilter])

  const filteredCodes = useMemo(() => {
    const query = search.trim().toLowerCase()
    const roles = new Set(roleFilter.map((label) => labelToRole.get(label)).filter(Boolean))
    return (codes ?? []).filter((code) => {
      const matchesSearch = !query || code.code.toLowerCase().includes(query)
      const matchesRole = roles.size === 0 || roles.has(code.role)
      const matchesTrip = matchingTripIds.has(code.trip.id)
      return matchesSearch && matchesRole && matchesTrip
    })
  }, [codes, search, roleFilter, labelToRole, matchingTripIds])

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
      toast.success('Código generado.')
      setOpen(false)
      setTripId('')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo generar el código.')
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/v1/admin/codes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Código revocado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo revocar el código.')
    }
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
        subtitle="Códigos de acceso para apoderados, coordinadores y alumnos"
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
                  <Label>Grupo</Label>
                  <Select value={tripId} onValueChange={setTripId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un grupo" />
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
                      <SelectItem value="MONITOR">Coordinador</SelectItem>
                      <SelectItem value="STUDENT">Alumno</SelectItem>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <MultiSelectFilter
            options={roleLabelOptions}
            selected={roleFilter}
            onChange={setRoleFilter}
            placeholder="Rol"
            className="sm:w-40"
          />
          <GlobalFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar código…"
            groupOptions={groupOptions}
            groupFilter={groupFilter}
            onGroupFilterChange={setGroupFilter}
            schoolOptions={schoolOptions}
            schoolFilter={schoolFilter}
            onSchoolFilterChange={setSchoolFilter}
            destinationOptions={destinationOptions}
            destinationFilter={destinationFilter}
            onDestinationFilterChange={setDestinationFilter}
            executiveOptions={executiveOptions}
            executiveFilter={executiveFilter}
            onExecutiveFilterChange={setExecutiveFilter}
          />
        </div>

        <Card className="overflow-hidden">
          {error && !codes ? (
            <FetchError message={error} onRetry={load} />
          ) : !codes ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length ? (
                  filteredCodes.map((code) => (
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
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={TicketIcon}
                        title={codes.length ? 'Sin resultados para estos filtros.' : 'Sin códigos emitidos todavía.'}
                        description={codes.length ? 'Prueba con otros filtros.' : 'Genera el primer código de acceso.'}
                      />
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
