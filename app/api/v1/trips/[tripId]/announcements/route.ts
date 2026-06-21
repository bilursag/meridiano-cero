import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { AnnouncementType, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripRole } from '@/lib/api/require-role'

const MAX_FILE_SIZE = 8 * 1024 * 1024

const bodySchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  authorName: z.string().trim().min(1),
  type: z.enum(AnnouncementType).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripAccess(tripId)

    const announcements = await prisma.announcement.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripRole(tripId, [Role.MONITOR])

    const contentType = request.headers.get('content-type') ?? ''
    let data: z.infer<typeof bodySchema>
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const parsed = bodySchema.safeParse({
        title: formData.get('title'),
        message: formData.get('message'),
        authorName: formData.get('authorName'),
        type: formData.get('type') || undefined,
      })
      if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Title, message and authorName are required.')
      data = parsed.data

      const maybeFile = formData.get('file')
      if (maybeFile instanceof File && maybeFile.size > 0) {
        if (!maybeFile.type.startsWith('image/')) throw new ApiError('VALIDATION_ERROR', 'Only image files are allowed.')
        if (maybeFile.size > MAX_FILE_SIZE) throw new ApiError('VALIDATION_ERROR', 'The photo must be 8MB or smaller.')
        file = maybeFile
      }
    } else {
      const json = await request.json().catch(() => null)
      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Title, message and authorName are required.')
      data = parsed.data
    }

    let photoUrl: string | undefined
    if (file) {
      const extension = file.name.split('.').pop() || 'jpg'
      const blob = await put(`announcements/${tripId}-${Date.now()}.${extension}`, file, { access: 'public' })
      photoUrl = blob.url
    }

    const announcement = await prisma.announcement.create({
      data: { tripId, ...data, ...(photoUrl ? { photoUrl } : {}) },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
