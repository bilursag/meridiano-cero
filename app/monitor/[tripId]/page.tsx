'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import { Radio, Navigation, Send, Signal, Camera, Trash2, Loader2, CheckCircle } from 'lucide-react'
import type { AnnouncementTemplate, Trip, ItineraryItem, ItineraryStatus, TripStatus } from '@prisma/client'
import { itineraryStatusLabels, tripStatusLabels } from '@/lib/labels'
import StatusBadge from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type ActivityTransition = 'EN_RUTA' | 'EN_ACTIVIDAD' | 'TERMINADA'

const TRANSITION_OPTIONS: { value: ActivityTransition; label: string }[] = [
  { value: 'EN_RUTA', label: 'En ruta' },
  { value: 'EN_ACTIVIDAD', label: 'En actividad' },
  { value: 'TERMINADA', label: 'Terminada' },
]

const STATUS_BY_TRANSITION: Record<ActivityTransition, ItineraryStatus> = {
  EN_RUTA: 'PENDING',
  EN_ACTIVIDAD: 'IN_PROGRESS',
  TERMINADA: 'COMPLETED',
}

const TRANSITION_LABEL: Record<ActivityTransition, string> = {
  EN_RUTA: 'En ruta',
  EN_ACTIVIDAD: 'En actividad',
  TERMINADA: 'Terminada',
}

// The auto comunicado's text is generated here so the monitor never has to
// type or pick a message for a routine activity status change.
const MESSAGE_BY_TRANSITION: Record<ActivityTransition, (title: string) => string> = {
  EN_RUTA: (title) => `En ruta a: ${title}`,
  EN_ACTIVIDAD: (title) => `Actividad en curso: ${title}`,
  TERMINADA: (title) => `Actividad terminada: ${title}`,
}

// Trip-level status, changeable by the monitor with the same one-click +
// auto-comunicado pattern already used for itinerary items above.
const TRIP_STATUS_OPTIONS: TripStatus[] = ['IN_ACTIVITY', 'RESTING', 'FINISHED']

const TRIP_STATUS_MESSAGE: Record<TripStatus, string> = {
  IN_TRANSIT: 'El grupo está en tránsito.',
  IN_ACTIVITY: 'El grupo está en actividad.',
  RESTING: 'El grupo está descansando.',
  FINISHED: 'El grupo finalizó su itinerario.',
}

interface GpsPoint {
  lat: number
  lng: number
  accuracy: number
  updatedAt: Date
}

export default function MonitorPage() {
  const params = useParams()
  const tripId = params?.tripId as string
  const { user } = useUser()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [tracking, setTracking] = useState(true)
  const [gps, setGps] = useState<GpsPoint | null>(null)
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [sendingRequirementsId, setSendingRequirementsId] = useState<string | null>(null)
  const [applyingTransition, setApplyingTransition] = useState<{ itemId: string; transition: ActivityTransition } | null>(
    null
  )
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingItemId = useRef<string | null>(null)
  const pendingTransition = useRef<ActivityTransition | null>(null)

  const loadItinerary = useCallback(async () => {
    const res = await fetch(`/api/v1/trips/${tripId}/itinerary`)
    if (res.ok) setItems((await res.json()).items)
  }, [tripId])

  useEffect(() => {
    async function load() {
      const [tripRes, templatesRes] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}`),
        fetch('/api/v1/announcement-templates'),
      ])
      if (tripRes.ok) {
        const { trip: loadedTrip } = await tripRes.json()
        setTrip(loadedTrip)
        setGps({ lat: loadedTrip.initialLat, lng: loadedTrip.initialLng, accuracy: 12, updatedAt: new Date() })
      }
      if (templatesRes.ok) setTemplates((await templatesRes.json()).templates)
      await loadItinerary()
    }
    load()
  }, [tripId, loadItinerary])

  const updateGps = useCallback(() => {
    function commit(lat: number, lng: number, accuracy: number) {
      const point = { lat, lng, accuracy, updatedAt: new Date() }
      setGps(point)
      fetch(`/api/v1/trips/${tripId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, accuracy }),
      })
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => commit(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy)),
        () =>
          setGps((p) => {
            if (!p) return p
            commit(p.lat + (Math.random() - 0.5) * 0.001, p.lng + (Math.random() - 0.5) * 0.001, Math.round(10 + Math.random() * 15))
            return p
          })
      )
    } else {
      setGps((p) => {
        if (!p) return p
        commit(p.lat + (Math.random() - 0.5) * 0.001, p.lng + (Math.random() - 0.5) * 0.001, Math.round(10 + Math.random() * 15))
        return p
      })
    }
  }, [tripId])

  useEffect(() => {
    if (!tracking) return
    const initialId = window.setTimeout(updateGps, 0)
    const intervalId = window.setInterval(updateGps, 15000)
    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(intervalId)
    }
  }, [tracking, updateGps])

  async function applyTransition(item: ItineraryItem, transition: ActivityTransition, photoFile?: File) {
    setApplyingTransition({ itemId: item.id, transition })

    if (photoFile) {
      const photoForm = new FormData()
      photoForm.append('file', photoFile)
      const photoRes = await fetch(`/api/v1/trips/${tripId}/itinerary/${item.id}/photo`, {
        method: 'POST',
        body: photoForm,
      })
      if (!photoRes.ok) {
        setApplyingTransition(null)
        return
      }
    }

    const statusRes = await fetch(`/api/v1/trips/${tripId}/itinerary/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: STATUS_BY_TRANSITION[transition] }),
    })
    if (!statusRes.ok) {
      setApplyingTransition(null)
      return
    }

    const announcementForm = new FormData()
    announcementForm.append('title', TRANSITION_LABEL[transition])
    announcementForm.append('message', MESSAGE_BY_TRANSITION[transition](item.title))
    announcementForm.append('authorName', user?.fullName ?? 'Coordinador')
    announcementForm.append('type', 'INFO')
    if (photoFile) announcementForm.append('file', photoFile)

    await fetch(`/api/v1/trips/${tripId}/announcements`, {
      method: 'POST',
      body: announcementForm,
    })

    setApplyingTransition(null)
    void loadItinerary()
    // The buttons also move the group between "En ruta" and "En actividad".
    const tripRes = await fetch(`/api/v1/trips/${tripId}`)
    if (tripRes.ok) setTrip((await tripRes.json()).trip)
  }

  function handleTransitionClick(item: ItineraryItem, transition: ActivityTransition) {
    if (transition === 'EN_ACTIVIDAD') {
      pendingItemId.current = item.id
      pendingTransition.current = transition
      fileInputRef.current?.click()
      return
    }
    void applyTransition(item, transition)
  }

  async function handleTripStatusChange(newStatus: TripStatus) {
    if (!trip || newStatus === trip.status) return
    setUpdatingStatus(true)
    const statusRes = await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (statusRes.ok) {
      const { trip: updated } = await statusRes.json()
      setTrip(updated)
      await fetch(`/api/v1/trips/${tripId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Estado: ${tripStatusLabels[newStatus]}`,
          message: TRIP_STATUS_MESSAGE[newStatus],
          authorName: user?.fullName ?? 'Coordinador',
          type: 'INFO',
        }),
      })
    }
    setUpdatingStatus(false)
  }

  async function sendAnnouncement() {
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template) return

    setSending(true)
    const res = await fetch(`/api/v1/trips/${tripId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: template.title,
        message: template.message,
        authorName: user?.fullName ?? 'Coordinador',
        type: template.type,
      }),
    })
    setSending(false)
    if (res.ok) {
      setSent((p) => [template.message, ...p])
      setSelectedTemplateId(null)
    }
  }

  async function sendRequirements(item: ItineraryItem) {
    if (!item.requirementsMessage) return
    setSendingRequirementsId(item.id)
    const res = await fetch(`/api/v1/trips/${tripId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Requisitos: ${item.title}`,
        message: item.requirementsMessage,
        authorName: user?.fullName ?? 'Coordinador',
        type: 'INFO',
      }),
    })
    setSendingRequirementsId(null)
    if (res.ok) setSent((p) => [item.requirementsMessage as string, ...p])
  }

  function triggerPhotoUpload(itemId: string) {
    pendingItemId.current = itemId
    pendingTransition.current = null
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const itemId = pendingItemId.current
    const transition = pendingTransition.current
    event.target.value = ''
    pendingTransition.current = null
    if (!file || !itemId) return

    if (transition) {
      const item = items.find((i) => i.id === itemId)
      if (item) await applyTransition(item, transition, file)
      return
    }

    setUploadingId(itemId)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/trips/${tripId}/itinerary/${itemId}/photo`, {
      method: 'POST',
      body: formData,
    })
    if (res.ok) {
      const { item } = await res.json()
      setItems((p) => p.map((i) => (i.id === itemId ? item : i)))
    }
    setUploadingId(null)
  }

  async function removePhoto(itemId: string) {
    setUploadingId(itemId)
    const res = await fetch(`/api/v1/trips/${tripId}/itinerary/${itemId}/photo`, { method: 'DELETE' })
    if (res.ok) {
      const { item } = await res.json()
      setItems((p) => p.map((i) => (i.id === itemId ? item : i)))
    }
    setUploadingId(null)
  }

  if (!trip || !gps) return <div className="p-8 text-center text-muted-foreground">Cargando…</div>

  // The activity the monitor should be acting on right now: the first
  // itinerary item (already ordered by the API) that isn't done yet.
  const currentActivity = items.find((item) => item.status !== 'COMPLETED') ?? null

  return (
    <div className="flex flex-1 flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 md:py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column: GPS + status */}
            <div className="space-y-4">
              {/* Trip status */}
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">Estado del grupo</CardTitle>
                  <StatusBadge status={trip.status} />
                </CardHeader>
                <CardContent>
                  <Select
                    value={trip.status}
                    onValueChange={(value) => void handleTripStatusChange(value as TripStatus)}
                    disabled={updatingStatus || trip.status === 'FINISHED'}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tripStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cambiar el estado publica un comunicado automático a apoderados.
                  </p>
                </CardContent>
              </Card>

              {/* GPS Card */}
              <Card className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Navigation size={15} className="text-primary" />
                    Ubicación GPS
                  </CardTitle>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${tracking ? 'text-success' : 'text-muted-foreground'}`}>
                    <Signal size={12} className={tracking ? 'animate-pulse' : ''} />
                    {tracking ? 'Transmitiendo' : 'Inactivo'}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <MapView lat={gps.lat} lng={gps.lng} height="220px" zoom={14} label={trip.name} />
                  <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                    <div className="text-xs text-muted-foreground">
                      <p className="font-mono">
                        {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                      </p>
                      <p className="mt-0.5">Precisión: ~{gps.accuracy} m</p>
                    </div>
                    <Button
                      onClick={() => setTracking(!tracking)}
                      variant={tracking ? 'destructive' : 'default'}
                      size="sm"
                      className="shrink-0"
                    >
                      <Radio size={14} className={tracking ? 'animate-pulse' : ''} />
                      {tracking ? 'Detener' : 'Activar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Actividad actual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentActivity ? (
                    <>
                      <div>
                        <p className="text-sm font-semibold">{currentActivity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Día {currentActivity.dayNumber} · {currentActivity.time} · {currentActivity.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TRANSITION_OPTIONS.map((option) => {
                          const isTerminada = option.value === 'TERMINADA'
                          const isBusy =
                            applyingTransition?.itemId === currentActivity.id &&
                            applyingTransition.transition === option.value
                          return (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              disabled={applyingTransition !== null}
                              onClick={() => handleTransitionClick(currentActivity, option.value)}
                              className={
                                isTerminada
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }
                            >
                              {isBusy ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : option.value === 'EN_ACTIVIDAD' ? (
                                <Camera size={14} />
                              ) : isTerminada ? (
                                <CheckCircle size={14} />
                              ) : null}
                              {option.label}
                            </Button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin actividades pendientes por ahora.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column: announcements + checklist */}
            <div className="space-y-4">
              {/* Publish */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Publicar comunicado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templates.length ? (
                    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            selectedTemplateId === t.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <p className="font-medium">{t.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.message}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No hay mensajes predeterminados configurados. Pídele al administrador que agregue
                      algunos en Mensajes.
                    </p>
                  )}
                  <Button onClick={sendAnnouncement} disabled={!selectedTemplateId || sending} className="w-full">
                    <Send size={14} /> {sending ? 'Publicando…' : 'Publicar'}
                  </Button>
                  {sent.slice(0, 2).map((m, i) => (
                    <div key={i} className="alert-success rounded-lg border px-3 py-2">
                      <p className="alert-success-label text-xs font-medium">Publicado</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{m}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Itinerary checklist */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Control de hitos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    items.reduce<Record<number, ItineraryItem[]>>((groups, item) => {
                      ;(groups[item.dayNumber] ??= []).push(item)
                      return groups
                    }, {})
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, dayItems]) => (
                      <div key={day} className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Día {day}
                        </p>
                        {dayItems.map((item, i) => (
                          <div key={item.id}>
                            <div className="flex items-start gap-3 py-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-muted-foreground line-through' : ''}`}>
                                    {item.title}
                                  </p>
                                  <Badge variant="outline" className="shrink-0 text-[10px]">
                                    {itineraryStatusLabels[item.status]}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {item.time} · {item.location}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {TRANSITION_OPTIONS.map((option) => {
                                    const isTerminada = option.value === 'TERMINADA'
                                    const isBusy =
                                      applyingTransition?.itemId === item.id &&
                                      applyingTransition.transition === option.value
                                    return (
                                      <Button
                                        key={option.value}
                                        variant="outline"
                                        size="sm"
                                        disabled={applyingTransition !== null}
                                        onClick={() => handleTransitionClick(item, option.value)}
                                        className={
                                          isTerminada
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        }
                                      >
                                        {isBusy ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : option.value === 'EN_ACTIVIDAD' ? (
                                          <Camera size={14} />
                                        ) : isTerminada ? (
                                          <CheckCircle size={14} />
                                        ) : null}
                                        {option.label}
                                      </Button>
                                    )
                                  })}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {item.photoUrl ? (
                                    <div className="group relative">
                                      <a href={item.photoUrl} target="_blank" rel="noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={item.photoUrl}
                                          alt={item.title}
                                          className="size-14 rounded-md border object-cover"
                                        />
                                      </a>
                                      <button
                                        onClick={() => removePhoto(item.id)}
                                        disabled={uploadingId === item.id}
                                        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                        aria-label="Quitar foto"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => triggerPhotoUpload(item.id)}
                                      disabled={uploadingId === item.id}
                                    >
                                      {uploadingId === item.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Camera size={14} />
                                      )}
                                      Agregar foto
                                    </Button>
                                  )}
                                  {item.requirementsMessage ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => sendRequirements(item)}
                                      disabled={sendingRequirementsId === item.id}
                                    >
                                      <Send size={14} />
                                      {sendingRequirementsId === item.id ? 'Enviando…' : 'Enviar requisitos'}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {i < dayItems.length - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
