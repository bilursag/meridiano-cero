import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
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

describe('handleApiError', () => {
  it('passes ApiError instances straight through to apiErrorResponse', async () => {
    const res = handleApiError(new ApiError('NOT_FOUND', 'Program not found.'))
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('Program not found.')
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
    expect(body.error.message).toBe('That value is already in use.')
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
