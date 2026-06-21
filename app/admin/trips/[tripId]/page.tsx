'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CheckIcon, CopyIcon, PencilIcon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { AccessCode, Announcement, ItineraryItem, LocationPing, Role, Trip, TripStatus } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/date-range-picker'
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
import { itineraryStatusLabels, announcementTypeLabels, tripStatusLabels } from '@/lib/labels'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type TripDetail = Trip & { school: { name: string } }
type CodeRow = AccessCode & { trip: { id: string; name: string } }
type ParentRow = { id: string; name: string; email: string }

const STATUS_OPTIONS: TripStatus[] = ['IN_TRANSIT', 'IN_ACTIVITY', 'RESTING', 'EMERGENCY', 'FINISHED']
const roleLabels: Record<Role, string> = { PARENT: 'Apoderado', MONITOR: 'Monitor' }

const EMPTY_EDIT_FORM = { name: '', destination: '', totalDays: '', studentCount: '' }

export default function AdminTripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [ping, setPing] = useState<LocationPing | null>(null)
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [parents, setParents] = useState<ParentRow[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [addingRole, setAddingRole] = useState<Role | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>()
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [tripRes, itineraryRes, announcementsRes, locationRes, codesRes, rosterRes] = await Promise.all([
      fetch(`/api/v1/trips/${tripId}`),
      fetch(`/api/v1/trips/${tripId}/itinerary`),
      fetch(`/api/v1/trips/${tripId}/announcements`),
      fetch(`/api/v1/trips/${tripId}/location`),
      fetch(`/api/v1/admin/codes?tripId=${tripId}`),
      fetch(`/api/v1/trips/${tripId}/roster`),
    ])
    if (tripRes.ok) setTrip((await tripRes.json()).trip)
    if (itineraryRes.ok) setItinerary((await itineraryRes.json()).items)
    if (announcementsRes.ok) setAnnouncements((await announcementsRes.json()).announcements)
    if (locationRes.ok) setPing((await locationRes.json()).ping)
    if (codesRes.ok) setCodes((await codesRes.json()).codes)
    if (rosterRes.ok) setParents((await rosterRes.json()).parents)
  }, [tripId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleStatusChange(status: TripStatus) {
    if (!trip) return
    setUpdatingStatus(true)
    const res = await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setTrip((await res.json()).trip)
    setUpdatingStatus(false)
  }

  function openEditDialog() {
    if (!trip) return
    setEditForm({
      name: trip.name,
      destination: trip.destination,
      totalDays: String(trip.totalDays),
      studentCount: String(trip.studentCount),
    })
    setEditDateRange({ from: new Date(trip.startDate), to: new Date(trip.endDate) })
    setEditError(null)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editDateRange?.from || !editDateRange?.to) return
    setSavingEdit(true)
    setEditError(null)
    const res = await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        destination: editForm.destination,
        totalDays: Number(editForm.totalDays),
        studentCount: Number(editForm.studentCount),
        startDate: editDateRange.from.toISOString(),
        endDate: editDateRange.to.toISOString(),
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setTrip((await res.json()).trip)
      setEditOpen(false)
    } else {
      const data = await res.json().catch(() => null)
      setEditError(data?.error?.message ?? 'No se pudo guardar la gira.')
    }
  }

  async function handleAddCode(role: Role) {
    setAddingRole(role)
    const res = await fetch('/api/v1/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, role }),
    })
    setAddingRole(null)
    if (res.ok) void load()
  }

  async function handleRevokeCode(id: string) {
    const res = await fetch(`/api/v1/admin/codes/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  async function handleCopyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
  }

  if (!trip) {
    return (
      <>
        <SiteHeader title="Gira" />
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
        title={trip.name}
        subtitle={trip.school.name}
        right={
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="xs" onClick={openEditDialog}>
                <PencilIcon />
                Editar gira
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar gira</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-name">Nombre de la gira</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-destination">Destino</Label>
                    <Input
                      id="edit-destination"
                      value={editForm.destination}
                      onChange={(e) => setEditForm((p) => ({ ...p, destination: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-total-days">Días totales</Label>
                    <Input
                      id="edit-total-days"
                      type="number"
                      value={editForm.totalDays}
                      onChange={(e) => setEditForm((p) => ({ ...p, totalDays: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-student-count">N° de alumnos</Label>
                    <Input
                      id="edit-student-count"
                      type="number"
                      value={editForm.studentCount}
                      onChange={(e) => setEditForm((p) => ({ ...p, studentCount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fechas de la gira</Label>
                  <DateRangePicker value={editDateRange} onChange={setEditDateRange} />
                </div>
                {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editDateRange?.from || !editDateRange?.to}
                >
                  {savingEdit ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Estado</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <StatusBadge status={trip.status} />
              <Select
                value={trip.status}
                onValueChange={(value) => handleStatusChange(value as TripStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tripStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Destino</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{trip.destination}</p>
              <p className="text-sm text-muted-foreground">
                Día {trip.currentDay} de {trip.totalDays}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Alumnos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{trip.studentCount}</p>
              <p className="text-sm text-muted-foreground">{trip.school.name}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Ubicación actual</CardTitle>
          </CardHeader>
          {ping ? (
            <MapView lat={ping.lat} lng={ping.lng} height="360px" label={trip.name} />
          ) : (
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              Sin ubicación reportada todavía.
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Itinerario</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {itinerary.length ? (
                itinerary.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      {item.photoUrl ? (
                        <a href={item.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.photoUrl}
                            alt={item.title}
                            className="size-10 rounded-md border object-cover"
                          />
                        </a>
                      ) : null}
                      <div>
                        <p className="text-sm font-medium">
                          {item.time} · {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.location}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {itineraryStatusLabels[item.status]}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin ítems de itinerario.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comunicados</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {announcements.length ? (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{announcement.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {announcementTypeLabels[announcement.type]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{announcement.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin comunicados.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apoderados ({parents.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {parents.length ? (
              parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-medium">{parent.name}</span>
                  <span className="text-xs text-muted-foreground">{parent.email}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin apoderados registrados todavía.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Códigos y equipo</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCode('MONITOR')}
                disabled={addingRole !== null}
              >
                <UserPlusIcon />
                {addingRole === 'MONITOR' ? 'Agregando…' : 'Agregar monitor'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCode('PARENT')}
                disabled={addingRole !== null}
              >
                <UserPlusIcon />
                {addingRole === 'PARENT' ? 'Agregando…' : 'Agregar apoderado'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {codes.length ? (
              codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{roleLabels[code.role]}</Badge>
                    <span className="font-mono text-sm">{code.code}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyCode(code.id, code.code)}>
                      {copiedId === code.id ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                      <span className="sr-only">Copiar código</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRevokeCode(code.id)}>
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Revocar código</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin códigos para esta gira todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
