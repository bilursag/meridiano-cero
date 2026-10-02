import { NextResponse } from 'next/server'
import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { generatePassword } from '@/lib/generate-password'

const bodySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  emailAddress: z.email(),
})

/** Admin creates a monitor account directly (or reuses an existing one) and links it to this trip. */
export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  await requireAdmin()
  const { tripId } = await params

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa nombre, apellido y un correo válido.')

  const client = await clerkClient()
  const existing = (await client.users.getUserList({ emailAddress: [parsed.data.emailAddress] })).data[0]

  let password: string | null = null
  const user =
    existing ??
    (await (async () => {
      password = generatePassword()
      return client.users.createUser({
        emailAddress: [parsed.data.emailAddress],
        password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        skipPasswordChecks: false,
      })
    })())

  await prisma.tripMembership.upsert({
    where: {
      clerkUserId_tripId_role: { clerkUserId: user.id, tripId, role: Role.MONITOR },
    },
    update: {},
    create: { clerkUserId: user.id, tripId, role: Role.MONITOR },
  })

  return NextResponse.json(
    { created: !existing, email: parsed.data.emailAddress, password },
    { status: 201 }
  )
})
