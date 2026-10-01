import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/parent(.*)',
  '/monitor(.*)',
  '/admin(.*)',
  '/redeem(.*)',
  '/api/v1(.*)',
])

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect()
  },
  {
    // Production Clerk is served through /__clerk on app.meridianocero.cl (NEXT_PUBLIC_CLERK_PROXY_URL,
    // set only in Production), so its Frontend API needs no clerk.<domain> DNS record. Setting that
    // variable disables Clerk's vercel.app auto-proxy, hence the explicit flag.
    frontendApiProxy: { enabled: Boolean(process.env.NEXT_PUBLIC_CLERK_PROXY_URL) },
  }
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk's own frontend-API proxy routes (serves clerk-js same-origin)
    '/__clerk/(.*)',
  ],
}
