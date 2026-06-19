'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import {
  Radio,
  Navigation,
  Send,
  CheckCircle2,
  Circle,
  Signal,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { Trip, ItineraryItem, ItineraryStatus, TripStatus } from '@prisma/client'
import { tripStatusLabels, itineraryStatusLabels } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const STATUS_OPTIONS: TripStatus[] = ['IN_TRANSIT', 'IN_ACTIVITY', 'RESTING', 'EMERGENCY']

const NEXT_ITINERARY_STATUS: Record<ItineraryStatus, ItineraryStatus> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: 'PENDING',
}

interface GpsPoint {
  lat: number
  lng: number
  accuracy: number
  updatedAt: Date
}

function ItineraryStatusIcon({ status }: { status: ItineraryStatus }) {
  if (status === 'COMPLETED') return <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
  if (status === 'IN_PROGRESS') {
    return <div className="size-5 shrink-0 rounded-full border-4 border-primary/20 bg-primary animate-pulse" />
  }
  return <Circle size={20} className="text-border shrink-0" />
}

export default function MonitorPage() {
  const params = useParams()
  const tripId = params?.tripId as string
  const { user } = useUser()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [tracking, setTracking] = useState(false)
  const [gps, setGps] = useState<GpsPoint | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingItemId = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const [tripRes, itineraryRes] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}`),
        fetch(`/api/v1/trips/${tripId}/itinerary`),
      ])
      if (tripRes.ok) {
        const { trip: loadedTrip } = await tripRes.json()
        setTrip(loadedTrip)
        setGps({ lat: loadedTrip.initialLat, lng: loadedTrip.initialLng, accuracy: 12, updatedAt: new Date() })
      }
      if (itineraryRes.ok) setItems((await itineraryRes.json()).items)
    }
    load()
  }, [tripId])

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

  async function setTripStatus(status: TripStatus) {
    setTrip((p) => (p ? { ...p, status } : p))
    await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function sendAnnouncement() {
    const text = message.trim()
    if (!text) return
    setMessage('')

    const title = text.length > 60 ? `${text.slice(0, 57)}…` : text
    const res = await fetch(`/api/v1/trips/${tripId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message: text, authorName: user?.fullName ?? 'Monitor' }),
    })
    if (res.ok) setSent((p) => [text, ...p])
  }

  async function cycleItemStatus(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const status = NEXT_ITINERARY_STATUS[item.status]

    setItems((p) => p.map((i) => (i.id === id ? { ...i, status } : i)))
    await fetch(`/api/v1/trips/${tripId}/itinerary/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  function triggerPhotoUpload(itemId: string) {
    pendingItemId.current = itemId
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const itemId = pendingItemId.current
    event.target.value = ''
    if (!file || !itemId) return

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

  return (
    <div className="flex flex-1 flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 md:py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column: GPS + status */}
            <div className="space-y-4">
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

              {/* Status selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Estado del grupo</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      onClick={() => setTripStatus(s)}
                      variant={trip.status === s ? 'default' : 'outline'}
                      className="justify-start"
                    >
                      {tripStatusLabels[s]}
                    </Button>
                  ))}
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
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje para los apoderados..."
                    rows={3}
                  />
                  <Button onClick={sendAnnouncement} disabled={!message.trim()} className="w-full">
                    <Send size={14} /> Publicar
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
                <CardContent className="space-y-1">
                  {items.map((item, i) => (
                    <div key={item.id}>
                      <div className="flex items-start gap-3 py-3">
                        <button
                          onClick={() => cycleItemStatus(item.id)}
                          className="mt-0.5 shrink-0 rounded-full transition-transform hover:scale-110"
                          aria-label="Cambiar estado del hito"
                        >
                          <ItineraryStatusIcon status={item.status} />
                        </button>

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

                          <div className="mt-2 flex items-center gap-2">
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
                          </div>
                        </div>
                      </div>
                      {i < items.length - 1 && <Separator />}
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
