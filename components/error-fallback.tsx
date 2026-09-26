'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { HomeIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_REPORTED_MESSAGE_LENGTH = 2000

/** Sends a client-side crash to the admin feed. Errors with a digest were thrown on the server and are already reported there. */
export function reportClientError(error: Error & { digest?: string }) {
  if (error.digest) return
  fetch('/api/v1/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message.slice(0, MAX_REPORTED_MESSAGE_LENGTH),
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => {})
}

export function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error & { digest?: string }
  onRetry: () => void
}) {
  useEffect(() => {
    console.error(error)
    reportClientError(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <TriangleAlertIcon className="size-10 text-destructive" />
      <div className="flex max-w-sm flex-col gap-1">
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado y ya quedó registrado para el equipo. Puedes intentarlo de nuevo.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}>
          <RefreshCwIcon />
          Reintentar
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <HomeIcon />
            Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}
