import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { sendCoordinatorMessage } from '@/lib/api/coordinator-messages'
import { COORDINATOR_MESSAGE_MAX } from '@/lib/push-messages'

const bodySchema = z.object({
  title: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(COORDINATOR_MESSAGE_MAX),
  // Without a trip, the message goes to the coordinators of every trip in the field.
  tripId: z.string().min(1).optional(),
})

/**
 * "Avisar al coordinador" in the panel: a push from the central team to the coordinators of one
 * trip, or of every trip in the field. Answers how far it reached, so the panel can say when no
 * coordinator has notifications on.
 */
export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', `Escribe un título (hasta 60 caracteres) y un mensaje (hasta ${COORDINATOR_MESSAGE_MAX}).`)
  }

  const user = await currentUser()
  const senderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.primaryEmailAddress?.emailAddress || 'el equipo central'

  const result = await sendCoordinatorMessage({ ...parsed.data, senderName })
  return NextResponse.json(result)
})
