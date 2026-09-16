'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, ShieldIcon, UserPlusIcon, UsersIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { GlobalFilters } from '@/components/global-filters'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { roleLabels } from '@/lib/labels'
import type { TripRow } from '@/components/data-table'

type Membership = { id: string; role: Role; tripId: string; tripName: string }
type UserRow = {
  clerkUserId: string
  name: string
  email: string
  imageUrl: string
  createdAt: string
  isAdmin: boolean
  memberships: Membership[]
}
type TripOption = { id: string; name: string }

const ROLE_OPTIONS: Role[] = ['PARENT', 'MONITOR', 'STUDENT']

function initialsFor(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null)
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null)

  const [assignOpen, setAssignOpen] = useState<UserRow | null>(null)
  const [trips, setTrips] = useState<TripOption[]>([])
  const [assignTripId, setAssignTripId] = useState('')
  const [assignRole, setAssignRole] = useState<Role>('PARENT')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const [allTrips, setAllTrips] = useState<TripRow[]>([])
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/trips')
      if (res.ok) setAllTrips((await res.json()).trips)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const schoolOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.school.name))).sort(), [allTrips])
  const destinationOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.destination))).sort(), [allTrips])
  const groupOptions = useMemo(() => Array.from(new Set(allTrips.map((t) => t.name))).sort(), [allTrips])
  const executiveOptions = useMemo(
    () => Array.from(new Set(allTrips.map((t) => t.salesExecutive).filter((v): v is string => !!v))).sort(),
    [allTrips]
  )
  const roleLabelOptions = useMemo(() => ROLE_OPTIONS.map((role) => roleLabels[role]), [])
  const labelToRole = useMemo(() => new Map(ROLE_OPTIONS.map((role) => [roleLabels[role], role])), [])

  function updateFilter(setter: (value: string[]) => void) {
    return (value: string[]) => {
      setOffset(0)
      setter(value)
    }
  }

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams({ offset: String(offset) })
    if (query) params.set('query', query)
    for (const label of roleFilter) {
      const role = labelToRole.get(label)
      if (role) params.append('role', role)
    }
    for (const school of schoolFilter) params.append('school', school)
    for (const destination of destinationFilter) params.append('destination', destination)
    for (const group of groupFilter) params.append('group', group)
    for (const executive of executiveFilter) params.append('executive', executive)
    const res = await fetch(`/api/v1/admin/users?${params}`)
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
      setTotalCount(data.totalCount)
      setLimit(data.limit)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudieron cargar los usuarios.')
    }
  }, [offset, query, roleFilter, schoolFilter, destinationFilter, groupFilter, executiveFilter, labelToRole])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    setQuery(search.trim())
  }

  async function handleRevokeAdmin(user: UserRow) {
    setTogglingAdminId(user.clerkUserId)
    const res = await fetch(`/api/v1/admin/team/${user.clerkUserId}`, { method: 'DELETE' })
    setTogglingAdminId(null)
    if (res.ok) {
      toast.success('Acceso de administrador revocado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo revocar el acceso.')
    }
  }

  async function handleRemoveMembership(membership: Membership) {
    if (!window.confirm(`¿Quitar de "${membership.tripName}"?`)) return
    setRemovingMembershipId(membership.id)
    const res = await fetch(`/api/v1/trips/${membership.tripId}/roster/${membership.id}`, { method: 'DELETE' })
    setRemovingMembershipId(null)
    if (res.ok) {
      toast.success('Rol quitado del grupo.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo quitar el rol.')
    }
  }

  async function openAssignDialog(user: UserRow) {
    setAssignOpen(user)
    setAssignTripId('')
    setAssignRole('PARENT')
    setAssignError(null)
    if (trips.length === 0) {
      const res = await fetch('/api/v1/trips')
      if (res.ok) setTrips((await res.json()).trips)
    }
  }

  async function handleAssign() {
    if (!assignOpen || !assignTripId) return
    setAssigning(true)
    setAssignError(null)
    const res = await fetch(`/api/v1/trips/${assignTripId}/roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkUserId: assignOpen.clerkUserId, role: assignRole }),
    })
    setAssigning(false)
    if (res.ok) {
      toast.success('Rol asociado al grupo.')
      setAssignOpen(null)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setAssignError(data?.error?.message ?? 'No se pudo asociar al grupo.')
    }
  }

  const page = Math.floor(offset / limit) + 1
  const pageCount = Math.max(Math.ceil(totalCount / limit), 1)

  return (
    <>
      <SiteHeader title="Usuarios" subtitle="Todas las cuentas registradas en la plataforma" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <MultiSelectFilter
            options={roleLabelOptions}
            selected={roleFilter}
            onChange={updateFilter(setRoleFilter)}
            placeholder="Rol"
            className="sm:w-40"
          />
          <GlobalFilters
            groupOptions={groupOptions}
            groupFilter={groupFilter}
            onGroupFilterChange={updateFilter(setGroupFilter)}
            schoolOptions={schoolOptions}
            schoolFilter={schoolFilter}
            onSchoolFilterChange={updateFilter(setSchoolFilter)}
            destinationOptions={destinationOptions}
            destinationFilter={destinationFilter}
            onDestinationFilterChange={updateFilter(setDestinationFilter)}
            executiveOptions={executiveOptions}
            executiveFilter={executiveFilter}
            onExecutiveFilterChange={updateFilter(setExecutiveFilter)}
          />
        </div>

        <Card className="overflow-hidden">
          {error && !users ? (
            <FetchError message={error} onRetry={load} />
          ) : !users ? (
            <CardContent className="flex flex-col gap-1 p-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length ? (
                  users.map((user) => (
                    <TableRow key={user.clerkUserId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.imageUrl} alt={user.name} />
                            <AvatarFallback>{initialsFor(user.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {user.isAdmin ? <Badge>Admin</Badge> : null}
                          {user.memberships.map((membership) => (
                            <Badge key={membership.id} variant="secondary" className="gap-1 pr-1">
                              {roleLabels[membership.role]} · {membership.tripName}
                              <button
                                type="button"
                                onClick={() => handleRemoveMembership(membership)}
                                disabled={removingMembershipId === membership.id}
                                className="rounded-full p-0.5 hover:bg-foreground/10"
                              >
                                <XIcon className="size-3" />
                                <span className="sr-only">Quitar</span>
                              </button>
                            </Badge>
                          ))}
                          {!user.isAdmin && user.memberships.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin rol asignado</span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {user.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeAdmin(user)}
                              disabled={togglingAdminId === user.clerkUserId}
                            >
                              <ShieldIcon />
                              Quitar admin
                            </Button>
                          ) : null}
                          <Dialog
                            open={assignOpen?.clerkUserId === user.clerkUserId}
                            onOpenChange={(open) => !open && setAssignOpen(null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openAssignDialog(user)}>
                                <UserPlusIcon />
                                Asociar a grupo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Asociar a un grupo</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <Label>Grupo</Label>
                                  <Select value={assignTripId} onValueChange={setAssignTripId}>
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
                                  <Select value={assignRole} onValueChange={(value) => setAssignRole(value as Role)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLE_OPTIONS.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {roleLabels[role]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
                              </div>
                              <DialogFooter>
                                <Button onClick={handleAssign} disabled={assigning || !assignTripId}>
                                  {assigning ? 'Asociando…' : 'Asociar'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <EmptyState
                        icon={UsersIcon}
                        title={query || roleFilter.length ? 'Sin resultados para estos filtros.' : 'Sin usuarios registrados todavía.'}
                        description={query || roleFilter.length ? 'Prueba con otros filtros.' : undefined}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {users && totalCount > limit ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {page} de {pageCount} · {totalCount} usuarios
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setOffset((o) => Math.max(o - limit, 0))}
                disabled={offset === 0}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setOffset((o) => o + limit)}
                disabled={offset + limit >= totalCount}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
