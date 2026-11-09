import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { deleteAccount } from '@/lib/api/account-deletion'

/** "Eliminar cuenta" in the app: deletes the signed-in user's account (see deleteAccount). */
export const DELETE = withApiHandler(async () => {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new ApiError('UNAUTHENTICATED', 'Debes iniciar sesión.')

  await deleteAccount(clerkUserId)
  return new NextResponse(null, { status: 204 })
})
