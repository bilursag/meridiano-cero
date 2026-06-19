'use client'

import { useCallback, useEffect, useState } from 'react'
import { MailPlusIcon, Trash2Icon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Person = { clerkUserId: string; name: string; email: string; imageUrl: string }
type Admin = Person & { createdAt: string; isCurrentUser: boolean }
type Monitor = Person & { trips: { id: string; name: string }[] }

function initialsFor(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null)
  const [monitors, setMonitors] = useState<Monitor[] | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/admin/team')
    if (res.ok) {
      const data = await res.json()
      setAdmins(data.admins)
      setMonitors(data.monitors)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleInvite() {
    setInviting(true)
    setInviteError(null)
    const res = await fetch('/api/v1/admin/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress: email }),
    })
    setInviting(false)
    if (res.ok) {
      setEmail('')
      setInviteOpen(false)
    } else {
      const data = await res.json().catch(() => null)
      setInviteError(data?.error?.message ?? 'No se pudo enviar la invitación.')
    }
  }

  async function handleRevoke(clerkUserId: string) {
    const res = await fetch(`/api/v1/admin/team/${clerkUserId}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  return (
    <>
      <SiteHeader
        title="Equipo"
        subtitle="Administradores y monitores de la plataforma"
        right={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <MailPlusIcon />
                Invitar administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar administrador</DialogTitle>
                <DialogDescription>
                  Se enviará una invitación por correo. La persona invitada debe registrarse y luego
                  ingresar el código de administrador en /redeem para activar su acceso.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="nombre@colegio.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviting || !email}>
                  {inviting ? 'Enviando…' : 'Enviar invitación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Tabs defaultValue="admins">
          <TabsList>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
            <TabsTrigger value="monitors">Monitores</TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-4">
            <Card>
              <CardContent className="flex flex-col gap-1 p-2">
                {!admins ? (
                  <Skeleton className="h-32 w-full" />
                ) : admins.length ? (
                  admins.map((admin) => (
                    <div key={admin.clerkUserId} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={admin.imageUrl} alt={admin.name} />
                          <AvatarFallback>{initialsFor(admin.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {admin.name} {admin.isCurrentUser ? <Badge variant="outline" className="ml-1">Tú</Badge> : null}
                          </span>
                          <span className="text-xs text-muted-foreground">{admin.email}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={admin.isCurrentUser}
                        onClick={() => handleRevoke(admin.clerkUserId)}
                      >
                        <Trash2Icon className="size-4" />
                        <span className="sr-only">Revocar acceso</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">Sin administradores registrados.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitors" className="mt-4">
            <Card>
              <CardContent className="flex flex-col gap-1 p-2">
                {!monitors ? (
                  <Skeleton className="h-32 w-full" />
                ) : monitors.length ? (
                  monitors.map((monitor) => (
                    <div key={monitor.clerkUserId} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={monitor.imageUrl} alt={monitor.name} />
                          <AvatarFallback>{initialsFor(monitor.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{monitor.name}</span>
                          <span className="text-xs text-muted-foreground">{monitor.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {monitor.trips.map((trip) => (
                          <Badge key={trip.id} variant="secondary">
                            {trip.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">Sin monitores asignados.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
