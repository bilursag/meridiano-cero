'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MailPlusIcon, SearchIcon, ShieldIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { SiteHeader } from '@/components/site-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { GlobalFilters } from '@/components/global-filters'

type Person = { clerkUserId: string; name: string; email: string; imageUrl: string }
type Admin = Person & { createdAt: string; isCurrentUser: boolean }
type MonitorTrip = { membershipId: string; id: string; name: string; destination: string; salesExecutive: string | null; school: string }
type Monitor = Person & { trips: MonitorTrip[] }

function initialsFor(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AdminTeamPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'monitors' ? 'monitors' : 'admins'
  const [admins, setAdmins] = useState<Admin[] | null>(null)
  const [monitors, setMonitors] = useState<Monitor[] | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [adminSearch, setAdminSearch] = useState('')
  const [monitorSearch, setMonitorSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/admin/team')
    if (res.ok) {
      const data = await res.json()
      setAdmins(data.admins)
      setMonitors(data.monitors)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudo cargar el equipo.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleInvite() {
    setInviting(true)
    setInviteError(null)
    const res = await fetch('/api/v1/admin/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress: email }),
    })
    setInviting(false)
    if (res.ok) {
      toast.success('Invitación enviada.')
      setEmail('')
      setInviteOpen(false)
    } else {
      const data = await res.json().catch(() => null)
      setInviteError(data?.error?.message ?? 'No se pudo enviar la invitación.')
    }
  }

  async function handleRevoke(clerkUserId: string) {
    const res = await fetch(`/api/v1/admin/team/${clerkUserId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Acceso de administrador revocado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo revocar el acceso.')
    }
  }

  async function handleRemoveMonitorTrip(tripId: string, membershipId: string) {
    if (!window.confirm('¿Quitar a este coordinador del grupo?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/roster/${membershipId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Coordinador quitado del grupo.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo quitar al coordinador.')
    }
  }

  const filteredAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase()
    return (admins ?? []).filter(
      (admin) => !query || admin.name.toLowerCase().includes(query) || admin.email.toLowerCase().includes(query)
    )
  }, [admins, adminSearch])

  const groupOptions = useMemo(
    () => Array.from(new Set((monitors ?? []).flatMap((m) => m.trips.map((t) => t.name)))).sort(),
    [monitors]
  )
  const schoolOptions = useMemo(
    () => Array.from(new Set((monitors ?? []).flatMap((m) => m.trips.map((t) => t.school)))).sort(),
    [monitors]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set((monitors ?? []).flatMap((m) => m.trips.map((t) => t.destination)))).sort(),
    [monitors]
  )
  const executiveOptions = useMemo(
    () =>
      Array.from(
        new Set((monitors ?? []).flatMap((m) => m.trips.map((t) => t.salesExecutive).filter((v): v is string => !!v)))
      ).sort(),
    [monitors]
  )

  const filteredMonitors = useMemo(() => {
    const query = monitorSearch.trim().toLowerCase()
    return (monitors ?? []).filter((monitor) => {
      const matchesSearch =
        !query || monitor.name.toLowerCase().includes(query) || monitor.email.toLowerCase().includes(query)
      const matchesGroup = groupFilter.length === 0 || monitor.trips.some((t) => groupFilter.includes(t.name))
      const matchesSchool = schoolFilter.length === 0 || monitor.trips.some((t) => schoolFilter.includes(t.school))
      const matchesDestination =
        destinationFilter.length === 0 || monitor.trips.some((t) => destinationFilter.includes(t.destination))
      const matchesExecutive =
        executiveFilter.length === 0 || monitor.trips.some((t) => !!t.salesExecutive && executiveFilter.includes(t.salesExecutive))
      return matchesSearch && matchesGroup && matchesSchool && matchesDestination && matchesExecutive
    })
  }, [monitors, monitorSearch, groupFilter, schoolFilter, destinationFilter, executiveFilter])

  return (
    <>
      <SiteHeader
        title="Equipo"
        subtitle="Administradores y coordinadores de la plataforma"
        right={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <MailPlusIcon />
                Invitar administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar administrador</DialogTitle>
                <DialogDescription>
                  Se enviará una invitación por correo. Al registrarse con ese enlace, su acceso de
                  administrador se activa automáticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="nombre@colegio.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviting || !email}>
                  {inviting ? 'Enviando…' : 'Enviar invitación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {loadError && !admins ? (
          <FetchError message={loadError} onRetry={load} />
        ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
            <TabsTrigger value="monitors">Coordinadores</TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-4 flex flex-col gap-4">
            <div className="relative sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo…"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Card>
              <CardContent className="flex flex-col gap-1 p-2">
                {!admins ? (
                  <Skeleton className="h-32 w-full" />
                ) : filteredAdmins.length ? (
                  filteredAdmins.map((admin) => (
                    <div key={admin.clerkUserId} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={admin.imageUrl} alt={admin.name} />
                          <AvatarFallback>{initialsFor(admin.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {admin.name} {admin.isCurrentUser ? <Badge variant="outline" className="ml-1">Tú</Badge> : null}
                          </span>
                          <span className="text-xs text-muted-foreground">{admin.email}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={admin.isCurrentUser}
                        onClick={() => handleRevoke(admin.clerkUserId)}
                      >
                        <Trash2Icon className="size-4" />
                        <span className="sr-only">Revocar acceso</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={ShieldIcon}
                    title={admins.length ? 'Sin resultados para esta búsqueda.' : 'Sin administradores registrados.'}
                    description={admins.length ? 'Prueba con otro nombre o correo.' : 'Invita al primer administrador.'}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitors" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <GlobalFilters
                search={monitorSearch}
                onSearchChange={setMonitorSearch}
                searchPlaceholder="Buscar por nombre o correo…"
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
            <Card>
              <CardContent className="flex flex-col gap-1 p-2">
                {!monitors ? (
                  <Skeleton className="h-32 w-full" />
                ) : filteredMonitors.length ? (
                  filteredMonitors.map((monitor) => (
                    <div key={monitor.clerkUserId} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={monitor.imageUrl} alt={monitor.name} />
                          <AvatarFallback>{initialsFor(monitor.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{monitor.name}</span>
                          <span className="text-xs text-muted-foreground">{monitor.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {monitor.trips.map((trip) => (
                          <Badge key={trip.membershipId} variant="secondary" className="gap-1 pr-1">
                            {trip.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveMonitorTrip(trip.id, trip.membershipId)}
                              className="rounded-full p-0.5 hover:bg-foreground/10"
                            >
                              <XIcon className="size-3" />
                              <span className="sr-only">Quitar de este grupo</span>
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={UsersIcon}
                    title={monitors.length ? 'Sin resultados para estos filtros.' : 'Sin coordinadores asignados.'}
                    description={monitors.length ? 'Prueba con otros filtros.' : 'Asigna coordinadores desde un grupo.'}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </>
  )
}
