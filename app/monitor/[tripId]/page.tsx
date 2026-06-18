'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Radio, Navigation, Send, CheckCircle2, Circle, Signal, MapPin, LogOut } from 'lucide-react'
import { TRIPS, ITINERARY, type TripStatus } from '@/lib/mock-data'
import StatusBadge from '@/components/StatusBadge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const STATUS_OPTIONS: TripStatus[] = ['En ruta', 'En actividad', 'Descansando', 'Emergencia']

interface GpsPoint { lat: number; lng: number; accuracy: number; updatedAt: Date }

export default function MonitorPage() {
  const params = useParams()
  const tripId = params?.tripId as string
  const trip = TRIPS[tripId]

  const [tracking, setTracking] = useState(false)
  const [tripStatus, setTripStatus] = useState<TripStatus>('En ruta')
  const [gps, setGps] = useState<GpsPoint>({
    lat: trip?.initialLat ?? -41.1335,
    lng: trip?.initialLng ?? -71.3103,
    accuracy: 12,
    updatedAt: new Date(),
  })
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [items, setItems] = useState(ITINERARY)

  const updateGps = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), updatedAt: new Date() }),
        () => setGps((p) => ({ lat: p.lat + (Math.random() - 0.5) * 0.001, lng: p.lng + (Math.random() - 0.5) * 0.001, accuracy: Math.round(10 + Math.random() * 15), updatedAt: new Date() }))
      )
    } else {
      setGps((p) => ({ lat: p.lat + (Math.random() - 0.5) * 0.001, lng: p.lng + (Math.random() - 0.5) * 0.001, accuracy: Math.round(10 + Math.random() * 15), updatedAt: new Date() }))
    }
  }, [])

  useEffect(() => {
    if (!tracking) return
    updateGps()
    const id = setInterval(updateGps, 15000)
    return () => clearInterval(id)
  }, [tracking, updateGps])

  function sendAnnouncement() {
    if (!message.trim()) return
    setSent((p) => [message.trim(), ...p])
    setMessage('')
  }

  function toggleItem(id: string) {
    setItems((p) => p.map((item) => item.id === id ? { ...item, status: item.status === 'completado' ? 'pendiente' : 'completado' } : item))
  }

  if (!trip) return <div className="p-8 text-center text-muted-foreground">Gira no encontrada.</div>

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <MapPin size={18} className="text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{trip.name}</p>
            <p className="text-xs text-muted-foreground">Panel Monitor</p>
          </div>
          <StatusBadge status={tripStatus} />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login"><LogOut size={15} /></Link>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: GPS + status */}
          <div className="space-y-4">
            {/* GPS Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
                <div className="px-4 py-3 border-t flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <p className="font-mono">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
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
                  <button
                    key={s}
                    onClick={() => setTripStatus(s)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all text-left ${
                      tripStatus === s ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {s}
                  </button>
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
                  <div key={i} className="alert-success border rounded-lg px-3 py-2">
                    <p className="text-xs font-medium alert-success-label">Publicado</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m}</p>
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
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-3 py-2.5 text-left rounded-md hover:bg-accent/50 transition-colors px-2"
                    >
                      {item.status === 'completado'
                        ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        : <Circle size={18} className="text-border shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.status === 'completado' ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.time} · {item.location}</p>
                      </div>
                    </button>
                    {i < items.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
