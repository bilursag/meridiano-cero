'use client'

import { CheckCircle2, Circle, Clock3, MapPin } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ItineraryItem } from '@prisma/client'

function TimelineItem({ item, isLast }: { item: ItineraryItem; isLast: boolean }) {
  const done = item.status === 'COMPLETED'
  const active = item.status === 'IN_PROGRESS'

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        {done ? (
          <CheckCircle2 size={26} className="text-emerald-500 shrink-0" />
        ) : active ? (
          <div className="w-6 h-6 rounded-full bg-primary border-4 border-primary/20 animate-pulse shrink-0" />
        ) : (
          <Circle size={26} className="text-border shrink-0" />
        )}
        {!isLast && (
          <div className={`w-px flex-1 my-1 ${done ? 'timeline-connector-done' : 'bg-border'}`} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-8 ${done ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold flex items-center gap-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
            <Clock3 size={13} /> {item.time}
          </span>
          {active && (
            <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              EN CURSO
            </span>
          )}
        </div>
        <p className="font-semibold text-base text-foreground">{item.title}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin size={13} /> {item.location}
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
        {item.photoUrl ? (
          <a href={item.photoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.photoUrl}
              alt={item.title}
              className="h-20 w-20 rounded-md border object-cover"
            />
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default function ItineraryPage() {
  const { trip, itinerary } = useTripContext()
  if (!trip) return null

  const done = itinerary.filter((i) => i.status === 'COMPLETED').length
  const pct = Math.round((done / itinerary.length) * 100)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itinerario</h1>
        <p className="text-base text-muted-foreground mt-0.5">{trip.name} · Hoy</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progreso del día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-base mb-1.5">
                <span className="text-muted-foreground">{done} completadas</span>
                <span className="font-bold text-lg">{pct}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5 text-base">
              {[
                { label: 'Completadas', count: done, color: 'text-success' },
                {
                  label: 'En curso',
                  count: itinerary.filter((i) => i.status === 'IN_PROGRESS').length,
                  color: 'text-primary',
                },
                {
                  label: 'Pendientes',
                  count: itinerary.filter((i) => i.status === 'PENDING').length,
                  color: 'text-muted-foreground',
                },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {itinerary.map((item, i) => (
              <TimelineItem key={item.id} item={item} isLast={i === itinerary.length - 1} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
