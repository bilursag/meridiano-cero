import type { Instrumentation } from 'next'

// Uncaught server errors (pages, server actions, uncaught route handler errors). API routes wrapped
// in withApiHandler catch their own errors and report them from there instead.
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  // Prisma only runs on Node; the dynamic import keeps it out of any edge bundle.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { reportError } = await import('@/lib/error-reporting')
  const { digest } = error as { digest?: string }
  await reportError(error, { source: 'server', path: request.path, digest })
}
