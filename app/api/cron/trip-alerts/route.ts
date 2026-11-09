import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { runTripAlerts } from '@/lib/api/trip-alerts'
import { finishEndedTrips } from '@/lib/api/trip-lifecycle'

// Called by Vercel Cron every 10 minutes (vercel.json): closes ended trips, then raises alerts. Vercel sends `Authorization: Bearer
// $CRON_SECRET`; without the secret configured the job refuses to run rather than being public.
export const GET = withApiHandler(async (request) => {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    throw new ApiError('UNAUTHENTICATED', 'No autorizado.')
  }

  // Close the trips whose dates are over first, so they are not checked for alerts below.
  const finished = await finishEndedTrips()
  const { checked, alerts } = await runTripAlerts()
  return NextResponse.json({
    finished,
    checked,
    created: alerts.length,
    alerts: alerts.map(({ type, tripId }) => ({ type, tripId })),
  })
})
