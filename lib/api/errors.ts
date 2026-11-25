import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { ZodError } from 'zod'

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'GONE'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  GONE: 410,
}

/** One field a request got wrong, e.g. `{ path: 'points.0.recordedAt', message: 'Invalid input: expected int, received number' }`. */
export type ValidationIssue = { path: string; message: string }

/** Enough to tell which fields failed without echoing a whole bad payload back. */
const MAX_ISSUES = 5

function summarizeIssues(error: ZodError): ValidationIssue[] {
  return error.issues.slice(0, MAX_ISSUES).map((issue) => ({
    path: issue.path.map(String).join('.') || '(cuerpo)',
    message: issue.message,
  }))
}

export class ApiError extends Error {
  code: ApiErrorCode
  /** For a VALIDATION_ERROR from a zod schema: the fields that failed, logged and sent back. */
  issues?: ValidationIssue[]
  constructor(code: ApiErrorCode, message: string, validation?: ZodError) {
    super(message)
    this.code = code
    if (validation) this.issues = summarizeIssues(validation)
  }
}

export function apiErrorResponse(error: ApiError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) } },
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
  return label ? `Ya existe un registro con ${label}.` : 'Ese valor ya está en uso.'
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
    { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado en el servidor.' } },
    { status: 500 }
  )
}
