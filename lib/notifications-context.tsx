"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Notification } from "@prisma/client"

export type AdminNotification = Omit<Notification, "createdAt"> & { createdAt: string }

type NotificationsContextValue = {
  notifications: AdminNotification[]
  unreadCount: number
  /** Everything created after this instant is unread for the current admin. */
  seenAt: string | null
  markAllSeen: () => void
}

const POLL_INTERVAL_MS = 30_000

const NotificationsContext = React.createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [seenAt, setSeenAt] = React.useState<string | null>(null)
  // null until the first load, so alerts that already existed when the panel opened don't toast.
  const knownIds = React.useRef<Set<string> | null>(null)

  const load = React.useCallback(async () => {
    const res = await fetch("/api/v1/admin/notifications").catch(() => null)
    if (!res?.ok) return
    const data: { notifications: AdminNotification[]; unreadCount: number; seenAt: string } = await res.json()

    if (knownIds.current) {
      const newAlerts = data.notifications.filter(
        (n) => n.type === "TRIP_ALERT" && !knownIds.current!.has(n.id)
      )
      for (const alert of newAlerts) {
        toast.error(alert.title, {
          description: alert.body,
          duration: 10_000,
          action: alert.tripId
            ? { label: "Ver grupo", onClick: () => router.push(`/admin/trips/${alert.tripId}`) }
            : undefined,
        })
      }
    }
    knownIds.current = new Set(data.notifications.map((n) => n.id))

    setNotifications(data.notifications)
    setUnreadCount(data.unreadCount)
    setSeenAt(data.seenAt)
  }, [router])

  React.useEffect(() => {
    const initialId = window.setTimeout(() => void load(), 0)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, POLL_INTERVAL_MS)
    // Catch up right away when the admin comes back to the tab instead of waiting for the next tick.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [load])

  const markAllSeen = React.useCallback(() => {
    setUnreadCount(0)
    setSeenAt(new Date().toISOString())
    void fetch("/api/v1/admin/notifications/seen", { method: "POST" }).catch(() => {})
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, seenAt, markAllSeen }}>
      {children}
    </NotificationsContext.Provider>
  )
}

/** Returns null outside the admin panel, so shared components can render the bell only where it applies. */
export function useOptionalNotifications() {
  return React.useContext(NotificationsContext)
}
