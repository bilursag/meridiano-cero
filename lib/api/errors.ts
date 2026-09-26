import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

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

const UNIQUE_FIELD_LABELS: Record<string, string> = {
  code: 'ese código',
  name: 'ese nombre',
  email: 'ese correo',
  clerkUserId: 'esa cuenta',
}

function uniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target
  const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : []
  const label = fields.map((field) => UNIQUE_FIELD_LABELS[field]).find(Boolean)
  return label ? `Ya existe un registro con ${label}.` : 'That value is already in use.'
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

/** True for failures that are bugs or outages rather than an expected rejection of the request. */
export function isUnexpectedError(error: unknown) {
  return !(error instanceof ApiError) && !isUniqueConstraintError(error)
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return apiErrorResponse(error)
  if (isUniqueConstraintError(error)) {
    return apiErrorResponse(new ApiError('VALIDATION_ERROR', uniqueConstraintMessage(error)))
  }
  console.error(error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } },
    { status: 500 }
  )
}
