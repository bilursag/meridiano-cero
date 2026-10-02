import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { duplicateProgram } from '@/lib/api/programs'

export const POST = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const program = await duplicateProgram(id)

  return NextResponse.json({ program }, { status: 201 })
})
