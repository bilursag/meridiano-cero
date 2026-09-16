'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  CalendarRangeIcon,
  CheckIcon,
  CopyIcon,
  GripVerticalIcon,
  MailPlusIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/reui/sortable'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import type { DateRange } from 'react-day-picker'
import type {
  AccessCode,
  ActivityTemplate,
  Announcement,
  ItineraryItem,
  LocationPing,
  Role,
  Trip,
  TripLeg,
  TripStatus,
} from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { ActivityItemSheet, type ActivityItemEditing, type ActivityItemValues } from '@/components/activity-item-form'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { itineraryStatusLabels, announcementTypeLabels, tripStatusLabels, roleLabels } from '@/lib/labels'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type TripDetail = Trip & { school: { name: string }; legs: TripLeg[] }
type CodeRow = AccessCode & { trip: { id: string; name: string } }
type ParentRow = { id: string; name: string; email: string }
type MonitorRow = { id: string; name: string; email: string }
type StudentRow = { id: string; name: string; email: string }
type ProgramOption = { id: string; name: string }

const STATUS_OPTIONS: TripStatus[] = ['IN_ACTIVITY', 'RESTING', 'FINISHED']

function dayDate(startDate: string | Date, dayNumber: number) {
  return addDays(new Date(startDate), dayNumber - 1)
}

// `time` is free text (e.g. "09:00"), not a validated time input — parse
// defensively and push anything unparseable to the end rather than let it
// throw off the sort.
function parseTimeMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return Number.POSITIVE_INFINITY
  return Number(match[1]) * 60 + Number(match[2])
}

const EMPTY_EDIT_FORM = { name: '', destination: '', studentCount: '', hotel: '' }
const EMPTY_MONITOR_FORM = { firstName: '', lastName: '', emailAddress: '' }

export default function AdminTripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const searchParams = useSearchParams()
  const autoEditTriggered = useRef(false)
  const [activeTab, setActiveTab] = useState('resumen')
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [ping, setPing] = useState<LocationPing | null>(null)
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [parents, setParents] = useState<ParentRow[]>([])
  const [monitors, setMonitors] = useState<MonitorRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [invitingStudent, setInvitingStudent] = useState(false)
  const [inviteStudentError, setInviteStudentError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [addingRole, setAddingRole] = useState<Role | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addMonitorOpen, setAddMonitorOpen] = useState(false)
  const [monitorForm, setMonitorForm] = useState(EMPTY_MONITOR_FORM)
  const [addingMonitor, setAddingMonitor] = useState(false)
  const [addMonitorError, setAddMonitorError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string | null } | null>(
    null
  )
  const [credentialsCopied, setCredentialsCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>()
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [itineraryOpen, setItineraryOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActivityItemEditing | null>(null)
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [applyProgramOpen, setApplyProgramOpen] = useState(false)
  const [applyProgramId, setApplyProgramId] = useState<string | null>(null)
  const [applyingProgram, setApplyingProgram] = useState(false)
  const [applyProgramError, setApplyProgramError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [
      tripRes,
      itineraryRes,
      announcementsRes,
      locationRes,
      codesRes,
      rosterRes,
      activityTemplatesRes,
      programsRes,
    ] = await Promise.all([
      fetch(`/api/v1/trips/${tripId}`),
      fetch(`/api/v1/trips/${tripId}/itinerary`),
      fetch(`/api/v1/trips/${tripId}/announcements`),
      fetch(`/api/v1/trips/${tripId}/location`),
      fetch(`/api/v1/admin/codes?tripId=${tripId}`),
      fetch(`/api/v1/trips/${tripId}/roster`),
      fetch('/api/v1/admin/activity-templates'),
      fetch('/api/v1/admin/programs'),
    ])
    if (tripRes.ok) setTrip((await tripRes.json()).trip)
    if (itineraryRes.ok) setItinerary((await itineraryRes.json()).items)
    if (announcementsRes.ok) setAnnouncements((await announcementsRes.json()).announcements)
    if (locationRes.ok) setPing((await locationRes.json()).ping)
    if (codesRes.ok) setCodes((await codesRes.json()).codes)
    if (rosterRes.ok) {
      const roster = await rosterRes.json()
      setParents(roster.parents)
      setMonitors(roster.monitors)
      setStudents(roster.students)
    }
    if (activityTemplatesRes.ok) setActivityTemplates((await activityTemplatesRes.json()).activityTemplates)
    if (programsRes.ok) setPrograms((await programsRes.json()).programs)
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
      studentCount: String(trip.studentCount),
      hotel: trip.hotel ?? '',
    })
    setEditDateRange({ from: new Date(trip.startDate), to: new Date(trip.endDate) })
    setEditError(null)
    setEditOpen(true)
  }

  useEffect(() => {
    if (!autoEditTriggered.current && trip && searchParams.get('edit') === '1') {
      autoEditTriggered.current = true
      openEditDialog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, searchParams])

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
        studentCount: Number(editForm.studentCount),
        hotel: editForm.hotel.trim() || null,
        startDate: editDateRange.from.toISOString(),
        endDate: editDateRange.to.toISOString(),
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setTrip((await res.json()).trip)
      setEditOpen(false)
      toast.success('Grupo actualizado.')
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo guardar el grupo.'
      setEditError(message)
      toast.error(message)
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
    if (res.ok) {
      toast.success('Código generado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo generar el código.')
    }
  }

  async function handleRevokeCode(id: string) {
    const res = await fetch(`/api/v1/admin/codes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Código revocado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo revocar el código.')
    }
  }

  async function handleCopyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
  }

  function openCreateItinerary() {
    setEditingItem(null)
    setItineraryOpen(true)
  }

  function openEditItinerary(item: ItineraryItem) {
    setEditingItem({
      id: item.id,
      dayNumber: item.dayNumber,
      time: item.time,
      title: item.title,
      location: item.location,
      description: item.description,
      requirementsMessage: item.requirementsMessage,
    })
    setItineraryOpen(true)
  }

  async function handleSaveItinerary(values: ActivityItemValues, editingItemId: string | null) {
    const res = await fetch(
      editingItemId
        ? `/api/v1/trips/${tripId}/itinerary/${editingItemId}`
        : `/api/v1/trips/${tripId}/itinerary`,
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
    return { ok: false, error: data?.error?.message ?? 'No se pudo guardar el ítem.' }
  }

  async function handleDeleteItinerary(itemId: string) {
    if (!window.confirm('¿Eliminar este ítem del itinerario?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/itinerary/${itemId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Ítem eliminado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar el ítem.')
    }
  }

  // `order` is a single sequence shared across the whole trip (not scoped per
  // day), so a drag within one day's list must reuse that day's own original
  // order AND time values in their new sequence rather than renumbering
  // everything — otherwise it would collide with or shift items on other days.
  // Reusing the day's own time slots the same way means dragging an activity
  // to a new position also gives it the time that belonged to that slot, so
  // the displayed order and the clock times never disagree.
  function handleReorderDay(newDayItems: ItineraryItem[]) {
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

    setItinerary((prev) => {
      const byId = new Map(reordered.map((item) => [item.id, item]))
      return prev.map((item) => byId.get(item.id) ?? item).sort((a, b) => a.order - b.order)
    })

    void Promise.all(
      changed.map((c) =>
        fetch(`/api/v1/trips/${tripId}/itinerary/${c.id}`, {
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

  function openApplyProgram() {
    setApplyProgramId(null)
    setApplyProgramError(null)
    setApplyProgramOpen(true)
  }

  async function handleApplyProgram() {
    if (!applyProgramId) return
    setApplyingProgram(true)
    setApplyProgramError(null)
    const res = await fetch(`/api/v1/admin/programs/${applyProgramId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    })
    setApplyingProgram(false)
    if (res.ok) {
      setApplyProgramOpen(false)
      toast.success('Programa aplicado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo aplicar el programa.'
      setApplyProgramError(message)
      toast.error(message)
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!window.confirm('¿Eliminar este comunicado?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Comunicado eliminado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar el comunicado.')
    }
  }

  async function handleRemoveParent(membershipId: string) {
    if (!window.confirm('¿Quitar a este apoderado del grupo?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/roster/${membershipId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Apoderado quitado del grupo.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo quitar al apoderado.')
    }
  }

  async function handleRemoveMonitor(membershipId: string) {
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

  async function handleRemoveStudent(membershipId: string) {
    if (!window.confirm('¿Quitar a este alumno del grupo?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/roster/${membershipId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Alumno quitado del grupo.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo quitar al alumno.')
    }
  }

  function openInviteStudent() {
    setStudentEmail('')
    setInviteStudentError(null)
    setInviteStudentOpen(true)
  }

  async function handleInviteStudent() {
    setInvitingStudent(true)
    setInviteStudentError(null)
    const res = await fetch(`/api/v1/trips/${tripId}/students/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress: studentEmail }),
    })
    setInvitingStudent(false)
    if (res.ok) {
      toast.success('Invitación enviada.')
      setStudentEmail('')
      setInviteStudentOpen(false)
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo enviar la invitación.'
      setInviteStudentError(message)
      toast.error(message)
    }
  }

  function openAddMonitor() {
    setMonitorForm(EMPTY_MONITOR_FORM)
    setAddMonitorError(null)
    setCreatedCredentials(null)
    setCredentialsCopied(false)
    setAddMonitorOpen(true)
  }

  async function handleAddMonitor() {
    setAddingMonitor(true)
    setAddMonitorError(null)
    const res = await fetch(`/api/v1/trips/${tripId}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monitorForm),
    })
    setAddingMonitor(false)
    if (res.ok) {
      const data = await res.json()
      setCreatedCredentials({ email: data.email, password: data.password })
      toast.success('Coordinador agregado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo agregar al coordinador.'
      setAddMonitorError(message)
      toast.error(message)
    }
  }

  async function handleCopyCredentials() {
    if (!createdCredentials?.password) return
    await navigator.clipboard.writeText(
      `Correo: ${createdCredentials.email}\nContraseña: ${createdCredentials.password}`
    )
    setCredentialsCopied(true)
    window.setTimeout(() => setCredentialsCopied(false), 1500)
  }

  if (!trip) {
    return (
      <>
        <SiteHeader title="Grupo" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  const pendingItineraryItems = itinerary.filter((item) => item.status !== 'COMPLETED')
  const currentActivity = pendingItineraryItems[0]
  const nextActivity = pendingItineraryItems[1]
  const completedActivityCount = itinerary.filter((item) => item.status === 'COMPLETED').length

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
                Editar grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar grupo</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-name">Nombre del grupo</Label>
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
                    <Label htmlFor="edit-student-count">N° de alumnos</Label>
                    <Input
                      id="edit-student-count"
                      type="number"
                      value={editForm.studentCount}
                      onChange={(e) => setEditForm((p) => ({ ...p, studentCount: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-hotel">Hotel</Label>
                    <Input
                      id="edit-hotel"
                      value={editForm.hotel}
                      onChange={(e) => setEditForm((p) => ({ ...p, hotel: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fechas del grupo</Label>
                  <DateRangePicker value={editDateRange} onChange={setEditDateRange} />
                  {editDateRange?.from && editDateRange?.to ? (
                    <p className="text-xs text-muted-foreground">
                      Duración: {differenceInCalendarDays(editDateRange.to, editDateRange.from) + 1} día
                      {differenceInCalendarDays(editDateRange.to, editDateRange.from) + 1 === 1 ? '' : 's'}
                    </p>
                  ) : null}
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="itinerario">Itinerario</TabsTrigger>
            <TabsTrigger value="comunicados">Comunicados</TabsTrigger>
            <TabsTrigger value="personas">Personas</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-4 flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 divide-x divide-border py-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={trip.status} />
              <Select
                value={trip.status}
                onValueChange={(value) => handleStatusChange(value as TripStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-40">
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
            </div>
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">Colegio</p>
              <p className="text-sm font-medium">{trip.school.name}</p>
            </div>
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium">{trip.destination}</p>
            </div>
            {trip.salesExecutive ? (
              <div className="pl-6">
                <p className="text-xs text-muted-foreground">Ejecutivo</p>
                <p className="text-sm font-medium">{trip.salesExecutive}</p>
              </div>
            ) : null}
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">Fechas</p>
              <p className="text-sm font-medium">
                {format(new Date(trip.startDate), 'd MMM', { locale: es })}–
                {format(new Date(trip.endDate), 'd MMM', { locale: es })} · Día {trip.currentDay} de{' '}
                {trip.totalDays}
              </p>
            </div>
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">Alumnos</p>
              <p className="text-sm font-medium">{trip.studentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Ubicación actual</CardTitle>
          </CardHeader>
          {ping ? (
            <MapView lat={ping.lat} lng={ping.lng} height="420px" label={trip.name} />
          ) : (
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              Sin ubicación reportada todavía.
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Actividad actual</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {currentActivity ? (
                <>
                  <p className="text-sm font-semibold">{currentActivity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Día {currentActivity.dayNumber} · {currentActivity.time} · {currentActivity.location}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin actividades pendientes.</p>
              )}
              {nextActivity ? (
                <p className="text-xs text-muted-foreground">
                  Próxima: {nextActivity.title} · {nextActivity.time}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {completedActivityCount}/{itinerary.length} actividades completadas
              </p>
              <p className="text-xs text-muted-foreground">
                {monitors.map((m) => m.name).join(', ') || 'Sin monitores asignados'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Último comunicado</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('comunicados')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {announcements[0] ? (
                <>
                  <p className="text-sm font-semibold">{announcements[0].title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{announcements[0].message}</p>
                  <p className="text-xs text-muted-foreground">
                    {announcements[0].authorName} ·{' '}
                    {format(new Date(announcements[0].createdAt), 'd MMM, HH:mm', { locale: es })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin comunicados todavía.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {trip.legs.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Ruta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {trip.legs.map((leg, index) => (
                <span key={leg.id} className="flex items-center gap-2">
                  <Badge variant="secondary">{leg.label}</Badge>
                  {index < trip.legs.length - 1 ? <span className="text-muted-foreground">→</span> : null}
                </span>
              ))}
            </CardContent>
          </Card>
        ) : null}
          </TabsContent>

          <TabsContent value="itinerario" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Itinerario</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog open={applyProgramOpen} onOpenChange={setApplyProgramOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={openApplyProgram}>
                      <CalendarRangeIcon />
                      Aplicar programa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aplicar programa</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Programa</Label>
                        <Combobox
                          options={programs.map((p) => ({ value: p.id, label: p.name }))}
                          value={applyProgramId}
                          onSelect={setApplyProgramId}
                          placeholder="Elegir un programa…"
                          emptyLabel="Sin programas disponibles."
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Agrega las actividades del programa al itinerario de este grupo, sin tocar los ítems
                        que ya existen.
                      </p>
                      {applyProgramError ? (
                        <p className="text-sm text-destructive">{applyProgramError}</p>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleApplyProgram} disabled={applyingProgram || !applyProgramId}>
                        {applyingProgram ? 'Aplicando…' : 'Aplicar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={openCreateItinerary}>
                  <PlusIcon />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {itinerary.length ? (
                Object.entries(
                  itinerary.reduce<Record<number, ItineraryItem[]>>((groups, item) => {
                    ;(groups[item.dayNumber] ??= []).push(item)
                    return groups
                  }, {})
                )
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, items]) => (
                    <div key={day} className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Día {day} · {format(dayDate(trip.startDate, Number(day)), 'EEEE d MMM', { locale: es })}
                      </p>
                      <Sortable
                        value={items}
                        onValueChange={handleReorderDay}
                        getItemValue={(item) => item.id}
                        className="flex flex-col gap-3"
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
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-[11px]">
                                    {item.time}
                                  </Badge>
                                  <p className="text-sm font-medium">{item.title}</p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {itineraryStatusLabels[item.status]}
                              </span>
                              <Button variant="ghost" size="icon" onClick={() => openEditItinerary(item)}>
                                <PencilIcon className="size-4" />
                                <span className="sr-only">Editar ítem</span>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteItinerary(item.id)}>
                                <Trash2Icon className="size-4" />
                                <span className="sr-only">Eliminar ítem</span>
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
                  title="Sin ítems de itinerario."
                  description="Agrega actividades a mano o aplica un programa."
                />
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="comunicados" className="mt-4">
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {announcementTypeLabels[announcement.type]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Eliminar comunicado</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{announcement.message}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={MessageSquareIcon}
                  title="Sin comunicados."
                  description="Los comunicados se publican automáticamente al avanzar una actividad."
                />
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="personas" className="mt-4 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Apoderados ({parents.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {parents.length ? (
              parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{parent.name}</span>
                    <span className="text-xs text-muted-foreground">{parent.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveParent(parent.id)}>
                    <UserMinusIcon className="size-4" />
                    <span className="sr-only">Quitar apoderado</span>
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UsersIcon}
                title="Sin apoderados registrados todavía."
                description="Se suman automáticamente al usar el código de acceso de apoderado."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Alumnos ({students.length})</CardTitle>
            <Dialog open={inviteStudentOpen} onOpenChange={setInviteStudentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openInviteStudent}>
                  <MailPlusIcon />
                  Invitar alumno
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invitar alumno a este grupo</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="student-email">Correo electrónico</Label>
                  <Input
                    id="student-email"
                    type="email"
                    placeholder="alumno@correo.cl"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se enviará una invitación por correo. Al registrarse con ese enlace, queda asociado a
                    este grupo con acceso de solo lectura (itinerario, ubicación y comunicados).
                  </p>
                  {inviteStudentError ? <p className="text-sm text-destructive">{inviteStudentError}</p> : null}
                </div>
                <DialogFooter>
                  <Button onClick={handleInviteStudent} disabled={invitingStudent || !studentEmail}>
                    {invitingStudent ? 'Enviando…' : 'Enviar invitación'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {students.length ? (
              students.map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{student.name}</span>
                    <span className="text-xs text-muted-foreground">{student.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)}>
                    <UserMinusIcon className="size-4" />
                    <span className="sr-only">Quitar alumno</span>
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UsersIcon}
                title="Sin alumnos invitados todavía."
                description="Invita a un alumno por correo para darle acceso de solo lectura a este grupo."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Coordinadores ({monitors.length})</CardTitle>
            <Dialog open={addMonitorOpen} onOpenChange={setAddMonitorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openAddMonitor}>
                  <UserPlusIcon />
                  Agregar coordinador
                </Button>
              </DialogTrigger>
              <DialogContent>
                {createdCredentials ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Coordinador agregado</DialogTitle>
                    </DialogHeader>
                    {createdCredentials.password ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          Comparte estas credenciales con el coordinador. La contraseña no se volverá a mostrar.
                        </p>
                        <div className="flex flex-col gap-1 rounded-md border bg-muted/50 p-3 font-mono text-sm">
                          <span>{createdCredentials.email}</span>
                          <span>{createdCredentials.password}</span>
                        </div>
                        <Button variant="outline" onClick={handleCopyCredentials}>
                          {credentialsCopied ? <CheckIcon /> : <CopyIcon />}
                          {credentialsCopied ? 'Copiado' : 'Copiar credenciales'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {createdCredentials.email} ya tenía una cuenta y quedó asociado a este grupo.
                      </p>
                    )}
                    <DialogFooter>
                      <Button onClick={() => setAddMonitorOpen(false)}>Listo</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Agregar coordinador a este grupo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="monitor-first-name">Nombre</Label>
                          <Input
                            id="monitor-first-name"
                            value={monitorForm.firstName}
                            onChange={(e) => setMonitorForm((p) => ({ ...p, firstName: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="monitor-last-name">Apellido</Label>
                          <Input
                            id="monitor-last-name"
                            value={monitorForm.lastName}
                            onChange={(e) => setMonitorForm((p) => ({ ...p, lastName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="monitor-email">Correo electrónico</Label>
                        <Input
                          id="monitor-email"
                          type="email"
                          placeholder="nombre@correo.cl"
                          value={monitorForm.emailAddress}
                          onChange={(e) => setMonitorForm((p) => ({ ...p, emailAddress: e.target.value }))}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se crea la cuenta al tiro con una contraseña generada. Si el correo ya tiene cuenta,
                        solo se asocia a este grupo.
                      </p>
                      {addMonitorError ? <p className="text-sm text-destructive">{addMonitorError}</p> : null}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAddMonitor}
                        disabled={
                          addingMonitor ||
                          !monitorForm.firstName.trim() ||
                          !monitorForm.lastName.trim() ||
                          !monitorForm.emailAddress.trim()
                        }
                      >
                        {addingMonitor ? 'Creando…' : 'Crear cuenta'}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {monitors.length ? (
              monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{monitor.name}</span>
                    <span className="text-xs text-muted-foreground">{monitor.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMonitor(monitor.id)}>
                    <UserMinusIcon className="size-4" />
                    <span className="sr-only">Quitar coordinador</span>
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UsersIcon}
                title="Sin coordinadores asignados todavía."
                description="Agrega un coordinador para que pueda gestionar este grupo desde la app."
              />
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
                {addingRole === 'MONITOR' ? 'Agregando…' : 'Agregar coordinador'}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCode('STUDENT')}
                disabled={addingRole !== null}
              >
                <UserPlusIcon />
                {addingRole === 'STUDENT' ? 'Agregando…' : 'Agregar alumno'}
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
              <p className="text-sm text-muted-foreground">Sin códigos para este grupo todavía.</p>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
      <ActivityItemSheet
        open={itineraryOpen}
        onOpenChange={setItineraryOpen}
        totalDays={trip.totalDays}
        activityTemplates={activityTemplates}
        editingItem={editingItem}
        existingItems={itinerary}
        onSubmit={handleSaveItinerary}
      />
    </>
  )
}
