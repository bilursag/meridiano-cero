"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { NotificationType } from "@prisma/client"
import {
  BellIcon,
  BellOffIcon,
  RefreshCwIcon,
  ServerCrashIcon,
  TriangleAlertIcon,
  TrophyIcon,
  UserPlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { useOptionalNotifications, type AdminNotification } from "@/lib/notifications-context"

const ICON_BY_TYPE: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  TRIP_ALERT: { icon: TriangleAlertIcon, className: "text-destructive" },
  TRIP_ACHIEVEMENT: { icon: TrophyIcon, className: "text-amber-500" },
  MONITOR_JOINED: { icon: UserPlusIcon, className: "text-primary" },
  TRIP_STATUS_CHANGED: { icon: RefreshCwIcon, className: "text-muted-foreground" },
  SYSTEM_ERROR: { icon: ServerCrashIcon, className: "text-destructive" },
}

export function NotificationBell() {
  const context = useOptionalNotifications()
  // Captured when the popover opens, so items stay highlighted as new while it's open
  // even though opening it marks everything as seen.
  const [highlightAfter, setHighlightAfter] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)

  if (!context) return null
  const { notifications, unreadCount, seenAt, markAllSeen } = context

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) return
    setHighlightAfter(seenAt)
    if (unreadCount > 0) markAllSeen()
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Notificaciones</p>
        </div>
        {notifications.length === 0 ? (
          <EmptyState
            icon={BellOffIcon}
            title="Sin notificaciones"
            description="Aquí aparecerán las alertas, logros y cambios que reporten los coordinadores."
          />
        ) : (
          <ul className="max-h-[min(28rem,70vh)] divide-y overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isNew={highlightAfter !== null && notification.createdAt > highlightAfter}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  isNew,
  onNavigate,
}: {
  notification: AdminNotification
  isNew: boolean
  onNavigate: () => void
}) {
  const { icon: Icon, className } = ICON_BY_TYPE[notification.type]
  const content = (
    <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50", isNew && "bg-muted/40")}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium leading-snug">{notification.title}</p>
        <p className="text-sm text-muted-foreground">{notification.body}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
        </p>
      </div>
      {isNew ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Nueva" /> : null}
    </div>
  )

  return (
    <li>
      {notification.tripId ? (
        <Link href={`/admin/trips/${notification.tripId}`} onClick={onNavigate}>
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  )
}
