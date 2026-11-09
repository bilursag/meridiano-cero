import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { deleteAccount } from '@/lib/api/account-deletion'

/**
 * "Eliminar cuenta" in the app: deletes the signed-in user's account (see deleteAccount). Answers
 * JSON rather than 204, since the app treats any answer without JSON as a failed request.
 */
export const DELETE = withApiHandler(async () => {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new ApiError('UNAUTHENTICATED', 'Debes iniciar sesión.')

  await deleteAccount(clerkUserId)
  return NextResponse.json({ deleted: true })
})
