'use client'

import { useEffect } from 'react'
import { Info, AlertTriangle, Trophy, Clock } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AnnouncementType } from '@/lib/mock-data'

const typeConfig: Record<
  AnnouncementType,
  { Icon: React.ElementType; label: string; badgeClass: string; iconClass: string }
> = {
  info: {
    Icon: Info,
    label: 'Información',
    badgeClass: 'type-badge-info',
    iconClass: 'text-blue-600',
  },
  alerta: {
    Icon: AlertTriangle,
    label: 'Alerta',
    badgeClass: 'type-badge-alerta',
    iconClass: 'text-amber-600',
  },
  logro: {
    Icon: Trophy,
    label: 'Logro',
    badgeClass: 'type-badge-logro',
    iconClass: 'text-emerald-600',
  },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ComunicadosPage() {
  const { trip, announcements, markAllRead } = useTripContext()

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  if (!trip) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{trip.name}</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {announcements.map((ann) => {
          const { Icon, label, badgeClass, iconClass } = typeConfig[ann.type]
          return (
            <Card key={ann.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon size={17} className={iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm leading-snug">{ann.title}</p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeClass}`}>
                        {label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ann.author}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{ann.message}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={11} />
                  {formatDate(ann.createdAt)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
