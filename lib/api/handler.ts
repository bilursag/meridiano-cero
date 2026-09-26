import { NextResponse } from 'next/server'
import { handleApiError, isUnexpectedError } from '@/lib/api/errors'
import { reportErrorInBackground } from '@/lib/error-reporting'

type RouteContext<Params> = { params: Promise<Params> }
type RouteHandler<Params> = (
  request: Request,
  context: RouteContext<Params>
) => Promise<NextResponse>

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
      return handleApiError(error)
    }
  }
}
