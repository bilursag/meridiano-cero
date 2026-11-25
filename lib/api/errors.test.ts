import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { ApiError, apiErrorResponse, handleApiError } from './errors'

function prismaUniqueError(target: string[] | string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.0',
    meta: { target },
  })
}

describe('ApiError / apiErrorResponse', () => {
  it.each([
    ['UNAUTHENTICATED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['VALIDATION_ERROR', 422],
    ['RATE_LIMITED', 429],
  ] as const)('maps %s to HTTP %d', async (code, status) => {
    const error = new ApiError(code, 'boom')
    const res = apiErrorResponse(error)
    expect(res.status).toBe(status)
    const body = await res.json()
    expect(body).toEqual({ error: { code, message: 'boom' } })
  })
})

describe('ApiError with a zod error', () => {
  it('sends back which fields failed, at most five', async () => {
    const schema = z.object({ points: z.array(z.object({ recordedAt: z.number().int() })) })
    const parsed = schema.safeParse({ points: Array.from({ length: 8 }, () => ({ recordedAt: 1.5 })) })
    if (parsed.success) throw new Error('expected a failure')

    const body = await apiErrorResponse(new ApiError('VALIDATION_ERROR', 'No válido.', parsed.error)).json()

    expect(body.error.message).toBe('No válido.')
    expect(body.error.issues).toHaveLength(5)
    expect(body.error.issues[0]).toEqual({ path: 'points.0.recordedAt', message: expect.stringContaining('int') })
  })

  it('names the whole body when it is not an object at all', async () => {
    const parsed = z.object({ code: z.string() }).safeParse(null)
    if (parsed.success) throw new Error('expected a failure')
    expect(new ApiError('VALIDATION_ERROR', 'x', parsed.error).issues?.[0].path).toBe('(cuerpo)')
  })
})

describe('handleApiError', () => {
  it('passes ApiError instances straight through to apiErrorResponse', async () => {
    const res = handleApiError(new ApiError('NOT_FOUND', 'No se encontró el programa.'))
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('No se encontró el programa.')
  })

  it('translates a P2002 unique constraint on a known field into a friendly Spanish message', async () => {
    const res = handleApiError(prismaUniqueError(['code']))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('Ya existe un registro con ese código.')
  })

  it('falls back to a generic message for a P2002 on an unmapped field', async () => {
    const res = handleApiError(prismaUniqueError(['someUnmappedField']))
    const body = await res.json()
    expect(body.error.message).toBe('Ese valor ya está en uso.')
  })

  it('handles a string target the same as an array target', async () => {
    const res = handleApiError(prismaUniqueError('email'))
    const body = await res.json()
    expect(body.error.message).toBe('Ya existe un registro con ese correo.')
  })

  it('returns a generic 500 and logs unexpected errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = handleApiError(new Error('something exploded'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
