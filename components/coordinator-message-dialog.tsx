'use client'

import { useState } from 'react'
import { MegaphoneIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { COORDINATOR_MESSAGE_MAX } from '@/lib/push-messages'

const TITLE_MAX = 60

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * "Avisar al coordinador": a push from the central team to the coordinators of one trip (with
 * `trip`) or of every trip in the field (without it). Only the push carries it, so the dialog says
 * plainly when no coordinator could get it.
 */
export function CoordinatorMessageDialog({ trip }: { trip?: { id: string; name: string } }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setTitle('')
      setMessage('')
      setError(null)
    }
  }

  async function handleSend() {
    setSending(true)
    setError(null)
    const res = await fetch('/api/v1/admin/coordinator-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, ...(trip ? { tripId: trip.id } : {}) }),
    }).catch(() => null)
    setSending(false)

    const data = await res?.json().catch(() => null)
    if (!res?.ok) {
      setError(data?.error?.message ?? 'No se pudo enviar el aviso. Intenta de nuevo.')
      return
    }

    const { trips, coordinators, devices } = data as { trips: number; coordinators: number; devices: number }
    setOpen(false)
    if (devices === 0) {
      toast.warning(
        coordinators === 0
          ? 'El aviso quedó registrado, pero no hay coordinadores en esta gira.'
          : 'El aviso quedó registrado, pero ningún coordinador tiene las notificaciones activadas en MeridianoGo.'
      )
      return
    }
    const where = trip ? '' : ` en ${plural(trips, 'gira', 'giras')}`
    toast.success(
      `Aviso enviado a ${plural(coordinators, 'coordinador', 'coordinadores')}${where} (${plural(devices, 'teléfono', 'teléfonos')}).`
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs">
          <MegaphoneIcon />
          {trip ? 'Avisar al coordinador' : 'Avisar a todos los coordinadores'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{trip ? 'Avisar al coordinador' : 'Avisar a todos los coordinadores'}</DialogTitle>
          <DialogDescription>
            {trip
              ? `Llega como notificación al teléfono de los coordinadores de ${trip.name}. Los apoderados no lo ven.`
              : 'Llega como notificación al teléfono de los coordinadores de todas las giras en curso (En ruta, En actividad o Descansando). Los apoderados no lo ven.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coordinator-message-title">Título</Label>
            <Input
              id="coordinator-message-title"
              placeholder="Cambio de horario"
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="coordinator-message-text">Mensaje</Label>
            <Textarea
              id="coordinator-message-text"
              rows={5}
              maxLength={COORDINATOR_MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">
              {message.length}/{COORDINATOR_MESSAGE_MAX}
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
            {sending ? 'Enviando…' : 'Enviar aviso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
