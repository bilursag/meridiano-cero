'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type ProgramDetailsValues = { name: string; description: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  submittingLabel: string
  initialValues?: ProgramDetailsValues
  onSubmit: (values: ProgramDetailsValues) => Promise<{ ok: boolean; error?: string }>
}

/** Name + description form for a program, shared by "Nuevo programa" and "Editar programa". */
export function ProgramDetailsDialog({ open, onOpenChange, ...formProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so every opening starts from the current initialValues. */}
        {open ? <ProgramDetailsForm {...formProps} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ProgramDetailsForm({
  title,
  submitLabel,
  submittingLabel,
  initialValues,
  onSubmit,
}: Omit<Props, 'open' | 'onOpenChange'>) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await onSubmit({ name: name.trim(), description: description.trim() })
    setSubmitting(false)
    if (!result.ok) setError(result.error ?? 'No se pudo guardar el programa.')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="program-name">Nombre</Label>
        <Input id="program-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="BRC 107" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="program-description">Descripción (opcional)</Label>
        <Textarea id="program-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
