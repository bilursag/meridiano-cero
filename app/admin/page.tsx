'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Shield, Plus, ChevronRight, Activity, Users, School, LogOut, X } from 'lucide-react'
import { TRIPS } from '@/lib/mock-data'
import StatusBadge from '@/components/StatusBadge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const FORM_FIELDS = ['Nombre de la gira', 'Colegio', 'Destino', 'Fecha inicio', 'Fecha término', 'Código de acceso']

export default function AdminPage() {
  const trips = Object.values(TRIPS)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Shield size={18} className="text-primary" />
          <span className="font-bold text-sm">Administración</span>
          <Badge variant="secondary" className="text-xs">Meridiano Cero</Badge>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login"><LogOut size={15} /><span className="hidden sm:inline">Salir</span></Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { Icon: Activity, label: 'Giras activas', value: '1', color: 'text-success' },
            { Icon: Users, label: 'Monitores', value: '3', color: 'text-blue-600' },
            { Icon: School, label: 'Colegios', value: '1', color: 'text-violet-600' },
          ].map(({ Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trips list */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Giras</CardTitle>
                <CardDescription className="mt-0.5">Giras activas e historial</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                {showForm ? <X size={14} /> : <Plus size={14} />}
                {showForm ? 'Cancelar' : 'Nueva gira'}
              </Button>
            </CardHeader>

            {showForm && (
              <CardContent className="pt-0 pb-4">
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nueva gira</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FORM_FIELDS.map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{field}</Label>
                        <Input placeholder={field} />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full sm:w-auto">Crear gira</Button>
                </div>
                <Separator className="mt-4" />
              </CardContent>
            )}

            <CardContent className="pt-0">
              <div className="space-y-1">
                {trips.map((trip) => (
                  <div key={trip.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{trip.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{trip.school} · {trip.destination}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={trip.status} />
                        <span className="text-xs text-muted-foreground">Día {trip.currentDay}/{trip.totalDays}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/apoderado/${trip.id}`}><ChevronRight size={16} /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Access codes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Códigos activos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { code: 'BAR-2026', role: 'Apoderado' },
                  { code: 'MON-2026', role: 'Monitor' },
                ].map(({ code, role }) => (
                  <div key={code} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs font-bold text-primary">{code}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-xs text-muted-foreground">{role}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Accesos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {[
                  { label: 'Vista Apoderado', desc: 'BAR-2026', href: '/apoderado/bar-2026' },
                  { label: 'Vista Monitor', desc: 'MON-2026', href: '/monitor/bar-2026' },
                ].map(({ label, desc, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
