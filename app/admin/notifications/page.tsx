'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { format, isThisYear, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { BellOffIcon, ChevronRightIcon } from 'lucide-react'
import type { NotificationType } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { NotificationTypeIcon } from '@/components/notification-bell'
import { notificationTypeLabels } from '@/lib/labels'
import { notificationHref } from '@/lib/notification-links'
import { useOptionalNotifications, type AdminNotification } from '@/lib/notifications-context'
import { cn } from '@/lib/utils'

type TypeFilter = NotificationType | 'ALL'
type HistoryPage = { notifications: AdminNotification[]; nextCursor: string | null; seenAt: string }

function dayLabel(date: Date) {
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  const label = format(date, isThisYear(date) ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function groupByDay(notifications: AdminNotification[]) {
  const groups: { label: string; items: AdminNotification[] }[] = []
  for (const notification of notifications) {
    const label = dayLabel(new Date(notification.createdAt))
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(notification)
    else groups.push({ label, items: [notification] })
  }
  return groups
}

export default function AdminNotificationsPage() {
  const notificationsContext = useOptionalNotifications()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [notifications, setNotifications] = useState<AdminNotification[] | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  // Captured from the first load, so what was new on arrival stays highlighted after it's marked as seen.
  const [highlightAfter, setHighlightAfter] = useState<string | null>(null)
  const markedSeen = useRef(false)
  const markAllSeen = notificationsContext?.markAllSeen

  const fetchPage = useCallback(async (type: TypeFilter, cursor?: string): Promise<HistoryPage | null> => {
    const params = new URLSearchParams()
    if (type !== 'ALL') params.set('type', type)
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`/api/v1/admin/notifications/history?${params}`).catch(() => null)
    if (!res?.ok || !res.headers.get('content-type')?.includes('application/json')) return null
    return res.json()
  }, [])

  const load = useCallback(
    async (type: TypeFilter) => {
      setLoadError(null)
      setNotifications(null)
      const page = await fetchPage(type)
      if (!page) {
        setLoadError('No se pudieron cargar las notificaciones.')
        return
      }
      setNotifications(page.notifications)
      setNextCursor(page.nextCursor)
      if (!markedSeen.current) {
        markedSeen.current = true
        setHighlightAfter(page.seenAt)
        if (page.notifications.some((n) => n.createdAt > page.seenAt)) markAllSeen?.()
      }
    },
    [fetchPage, markAllSeen]
  )

  useEffect(() => {
    const id = window.setTimeout(() => void load(typeFilter), 0)
    return () => window.clearTimeout(id)
  }, [load, typeFilter])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    const page = await fetchPage(typeFilter, nextCursor)
    setLoadingMore(false)
    if (!page) {
      setLoadError('No se pudieron cargar más notificaciones.')
      return
    }
    setNotifications((current) => [...(current ?? []), ...page.notifications])
    setNextCursor(page.nextCursor)
  }

  return (
    <>
      <SiteHeader title="Notificaciones" subtitle="Lo que ha pasado en terreno y en la plataforma" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {(Object.keys(notificationTypeLabels) as NotificationType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {notificationTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadError && !notifications ? (
          <FetchError message={loadError} onRetry={() => void load(typeFilter)} />
        ) : !notifications ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOffIcon}
              title={typeFilter === 'ALL' ? 'Sin notificaciones' : 'Sin notificaciones de este tipo'}
              description="Aquí aparecerán las alertas, logros y cambios que reporten los coordinadores, y los errores de la plataforma."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {groupByDay(notifications).map((group) => (
              <section key={group.label} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
                <Card className="gap-0 overflow-hidden py-0">
                  <ul className="divide-y">
                    {group.items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        isNew={highlightAfter !== null && notification.createdAt > highlightAfter}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
            {loadError ? <p className="text-center text-sm text-destructive">{loadError}</p> : null}
            {nextCursor ? (
              <Button variant="outline" className="self-center" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}

function NotificationItem({ notification, isNew }: { notification: AdminNotification; isNew: boolean }) {
  const href = notificationHref(notification)
  const content = (
    <div className={cn('flex items-start gap-3 px-4 py-3', href && 'transition-colors hover:bg-muted/50', isNew && 'bg-muted/40')}>
      <NotificationTypeIcon type={notification.type} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium leading-snug">{notification.title}</p>
        <p className="break-words text-sm text-muted-foreground">{notification.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        {isNew ? <span className="size-2 rounded-full bg-primary" aria-label="Nueva" /> : null}
        <time dateTime={notification.createdAt}>{format(new Date(notification.createdAt), 'HH:mm')}</time>
        {href ? <ChevronRightIcon className="size-4" /> : null}
      </div>
    </div>
  )

  return <li>{href ? <Link href={href}>{content}</Link> : content}</li>
}
