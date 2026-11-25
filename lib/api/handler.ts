import { NextResponse } from 'next/server'
import { ApiError, handleApiError, isUnexpectedError } from '@/lib/api/errors'
import { reportErrorInBackground } from '@/lib/error-reporting'

type RouteContext<Params> = { params: Promise<Params> }
type RouteHandler<Params> = (
  request: Request,
  context: RouteContext<Params>
) => Promise<NextResponse>

/**
 * One log line per rejected payload, so a client sending the wrong shape (an app release, one
 * platform) shows in the Vercel logs with the fields at fault instead of passing unnoticed.
 */
function logValidationError(error: ApiError, request: Request) {
  const { pathname } = new URL(request.url)
  const fields = error.issues?.map((issue) => `${issue.path}: ${issue.message}`).join('; ')
  console.warn(`[422] ${request.method} ${pathname} — ${error.message}${fields ? ` — ${fields}` : ''}`)
}

/** Wraps a route handler so thrown ApiErrors (and unexpected errors) become the right HTTP response. */
export function withApiHandler<Params = Record<string, never>>(
  handler: RouteHandler<Params>
): RouteHandler<Params> {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Caught errors never reach instrumentation's onRequestError, so they are reported here.
      if (isUnexpectedError(error)) reportErrorInBackground(error, request)
      else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') logValidationError(error, request)
      return handleApiError(error)
    }
  }
}
