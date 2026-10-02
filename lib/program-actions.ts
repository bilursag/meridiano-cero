import type { ProgramDetailsValues } from '@/components/program-details-dialog'

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return (data?.error?.message as string | undefined) ?? fallback
}

export async function updateProgramDetails(programId: string, values: ProgramDetailsValues): Promise<Result> {
  const res = await fetch(`/api/v1/admin/programs/${programId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // An emptied description clears it (null) rather than failing validation.
    body: JSON.stringify({ name: values.name, description: values.description || null }),
  })
  if (res.ok) return { ok: true, data: undefined }
  return { ok: false, error: await errorMessage(res, 'No se pudo guardar el programa.') }
}

export async function duplicateProgram(programId: string): Promise<Result<{ id: string }>> {
  const res = await fetch(`/api/v1/admin/programs/${programId}/duplicate`, { method: 'POST' })
  if (res.ok) return { ok: true, data: (await res.json()).program }
  return { ok: false, error: await errorMessage(res, 'No se pudo duplicar el programa.') }
}
