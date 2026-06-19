'use client'

import { useEffect } from 'react'
import { Info, AlertTriangle, Trophy, Clock, type LucideIcon } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AnnouncementType } from '@prisma/client'
import { announcementTypeLabels } from '@/lib/labels'

const typeConfig: Record<AnnouncementType, { Icon: LucideIcon; badgeClass: string; iconClass: string }> = {
  INFO: { Icon: Info, badgeClass: 'type-badge-info', iconClass: 'text-blue-600' },
  ALERT: { Icon: AlertTriangle, badgeClass: 'type-badge-alerta', iconClass: 'text-amber-600' },
  ACHIEVEMENT: { Icon: Trophy, badgeClass: 'type-badge-logro', iconClass: 'text-emerald-600' },
}

function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AnnouncementsPage() {
  const { trip, announcements, markAllRead } = useTripContext()

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  if (!trip) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunicados</h1>
        <p className="text-base text-muted-foreground mt-0.5">{trip.name}</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {announcements.map((ann) => {
          const { Icon, badgeClass, iconClass } = typeConfig[ann.type]
          return (
            <Card key={ann.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon size={21} className={iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base leading-snug">{ann.title}</p>
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${badgeClass}`}>
                        {announcementTypeLabels[ann.type]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{ann.authorName}</p>
                  </div>
                </div>
                <p className="text-base text-foreground leading-relaxed">{ann.message}</p>
                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={13} />
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
