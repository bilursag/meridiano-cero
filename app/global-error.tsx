'use client'

import { ErrorFallback } from '@/components/error-fallback'
import './globals.css'

// Replaces the root layout when it crashes, so it brings its own <html>, <body> and styles.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background">
        <title>Algo salió mal · Meridiano Cero</title>
        <ErrorFallback error={error} onRetry={unstable_retry} />
      </body>
    </html>
  )
}
