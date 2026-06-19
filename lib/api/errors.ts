import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
}

export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export function apiErrorResponse(error: ApiError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: STATUS_BY_CODE[error.code] }
  )
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return apiErrorResponse(error)
  console.error(error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } },
    { status: 500 }
  )
}
