import { prisma } from '@/lib/db'
import { notifyInBackground } from '@/lib/notifications'

export type ErrorSource = 'server' | 'client'

const TITLE_BY_SOURCE: Record<ErrorSource, string> = {
  server: 'Error en el servidor',
  client: 'Error en el navegador',
}

// A broken page hit by many users should surface once, not flood the bell.
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000
const MAX_MESSAGE_LENGTH = 300

function describeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const oneLine = message.replace(/\s+/g, ' ').trim() || 'Error sin mensaje'
  return oneLine.length > MAX_MESSAGE_LENGTH ? `${oneLine.slice(0, MAX_MESSAGE_LENGTH)}…` : oneLine
}

/**
 * Records an unexpected error as a SYSTEM_ERROR notification for admins. Never throws: reporting
 * must not turn one failure into two. The digest ties it to the matching line in the Vercel logs.
 */
export async function reportError(
  error: unknown,
  { source, path, digest }: { source: ErrorSource; path: string; digest?: string }
) {
  try {
    const route = path.split('?')[0] || '/'
    const reference = digest ? ` (ref. ${digest})` : ''
    const title = TITLE_BY_SOURCE[source]
    const body = `${route}: ${describeError(error)}`

    const duplicate = await prisma.notification.findFirst({
      where: {
        type: 'SYSTEM_ERROR',
        title,
        body: { startsWith: body },
        createdAt: { gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      select: { id: true },
    })
    if (duplicate) return

    await prisma.notification.create({
      data: { type: 'SYSTEM_ERROR', title, body: `${body}${reference}` },
    })
  } catch (reportingError) {
    console.error('[error-reporting]', reportingError)
  }
}

/** For request handlers: records the error after the response is sent. */
export function reportErrorInBackground(error: unknown, request: Request) {
  const path = new URL(request.url).pathname
  notifyInBackground(() => reportError(error, { source: 'server', path }))
}
