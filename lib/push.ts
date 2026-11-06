import type { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { PushContent } from '@/lib/push-messages'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
/** Expo takes at most 100 messages per request. */
const CHUNK = 100

type ExpoTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } }

/**
 * Sends one notification to every phone of these users through Expo's push service (which relays
 * to APNs and FCM). Tokens Expo reports as no longer registered (app uninstalled, notifications
 * turned off for good) are deleted. Never throws for a delivery problem: callers run it after the
 * response with notifyInBackground.
 */
export async function pushToUsers(clerkUserIds: string[], content: PushContent) {
  if (!clerkUserIds.length) return { sent: 0 }
  const devices = await prisma.pushDevice.findMany({
    where: { clerkUserId: { in: [...new Set(clerkUserIds)] } },
    select: { token: true },
  })
  if (!devices.length) return { sent: 0 }

  const messages = devices.map(({ token }) => ({
    to: token,
    title: content.title,
    body: content.body,
    data: content.target,
    sound: 'default',
    // Android: the channel the app creates; iOS: group a trip's notifications together.
    channelId: 'default',
    threadId: content.target.tripId,
  }))

  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' }
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`

  const unregistered: string[] = []
  let sent = 0
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK)
    const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk) })
    if (!res.ok) {
      console.error('[push] Expo answered', res.status, await res.text().catch(() => ''))
      continue
    }
    const { data } = (await res.json()) as { data: ExpoTicket[] }
    data.forEach((ticket, index) => {
      if (ticket.status === 'ok') sent += 1
      else if (ticket.details?.error === 'DeviceNotRegistered') unregistered.push(chunk[index].to)
      else console.error('[push] ticket error', ticket.message)
    })
  }

  if (unregistered.length) await prisma.pushDevice.deleteMany({ where: { token: { in: unregistered } } })
  return { sent }
}

/** The members of a trip with these roles, optionally leaving out one person (the author). */
export async function tripMemberIds(tripId: string, roles: Role[], exceptClerkUserId?: string) {
  const memberships = await prisma.tripMembership.findMany({
    where: { tripId, role: { in: roles }, ...(exceptClerkUserId ? { clerkUserId: { not: exceptClerkUserId } } : {}) },
    select: { clerkUserId: true },
  })
  return memberships.map((membership) => membership.clerkUserId)
}
