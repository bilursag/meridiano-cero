import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import {
  IconChartBar,
  IconDashboard,
  IconMap,
  IconRoute,
  IconUsers,
} from '@tabler/icons-react'
import { Activity, Bell, CalendarDays, MapPin, Radio, School, ShieldCheck, Ticket } from 'lucide-react'
import type { TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { HeroGlobe } from '@/components/hero-globe'
import StatusBadge from '@/components/StatusBadge'

const MOCK_NAV = [
  { label: 'Dashboard', icon: IconDashboard, active: true },
  { label: 'Giras', icon: IconRoute, active: false },
  { label: 'Analítica', icon: IconChartBar, active: false },
  { label: 'Mapa operativo', icon: IconMap, active: false },
  { label: 'Equipo', icon: IconUsers, active: false },
]

const MOCK_STATS = [
  { icon: Activity, label: 'Giras activas', value: '24' },
  { icon: Ticket, label: 'Códigos', value: '86' },
  { icon: School, label: 'Colegios', value: '12' },
  { icon: Radio, label: 'Monitores', value: '31' },
]

const MOCK_TRIPS: { name: string; school: string; status: TripStatus; day: string }[] = [
  { name: 'Gira Patagonia 2026', school: 'Colegio San Gabriel', status: 'IN_TRANSIT', day: '2/5' },
  { name: 'Gira Atacama 2026', school: 'Colegio Andino', status: 'IN_ACTIVITY', day: '1/4' },
  { name: 'Gira Valparaíso 2026', school: 'Colegio del Mar', status: 'FINISHED', day: '5/5' },
]

const COVERAGE_ROUTES = [
  { start: { lat: -33.4489, lng: -70.6693, label: 'Santiago' }, end: { lat: 19.4326, lng: -99.1332, label: 'Ciudad de México' } },
  { start: { lat: -33.4489, lng: -70.6693, label: 'Santiago' }, end: { lat: 4.711, lng: -74.0721, label: 'Bogotá' } },
  { start: { lat: -33.4489, lng: -70.6693, label: 'Santiago' }, end: { lat: -12.0464, lng: -77.0428, label: 'Lima' } },
  { start: { lat: -33.4489, lng: -70.6693, label: 'Santiago' }, end: { lat: -34.6037, lng: -58.3816, label: 'Buenos Aires' } },
  { start: { lat: -33.4489, lng: -70.6693, label: 'Santiago' }, end: { lat: -23.5505, lng: -46.6333, label: 'São Paulo' } },
]

function LandingPage() {
  const features = [
    {
      icon: MapPin,
      title: 'Ubicación en vivo',
      text: 'El monitor comparte posición y estado del grupo en tiempo real.',
    },
    {
      icon: CalendarDays,
      title: 'Itinerario claro',
      text: 'Familias y equipo ven hitos, avances y actividades del día.',
    },
    {
      icon: Bell,
      title: 'Comunicados',
      text: 'Mensajes oficiales, alertas y logros quedan centralizados.',
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin size={17} />
            </span>
            Meridiano Cero
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Ingresar</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 px-4 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-5">
            Plataforma para giras escolares
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-6xl">
            Meridiano Cero
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Seguimiento operativo para colegios, monitores y apoderados: ubicación, itinerario,
            comunicados y acceso por rol desde una sola plataforma.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-in">Entrar al dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/redeem">Canjear código</Link>
            </Button>
          </div>
        </div>

        <div>
          <Badge variant="outline" className="mb-4">
            Cobertura en Latinoamérica
          </Badge>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <HeroGlobe routes={COVERAGE_ROUTES} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COVERAGE_ROUTES.map((route) => (
              <Badge key={route.end.label} variant="secondary" className="gap-1.5 font-normal">
                <span className="size-1.5 rounded-full bg-[#3b82f6]" />
                {route.start.label} → {route.end.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4">
              Panel de control
            </Badge>
            <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              Así se ve tu panel de seguimiento
            </h2>
            <p className="mt-3 text-muted-foreground">
              Itinerario, ubicación y comunicados centralizados en una sola vista, pensada para
              que cualquier integrante del equipo entienda el estado de la gira en segundos.
            </p>
          </div>
          <div className="mt-8 rounded-lg border bg-card p-3 shadow-sm">
            <div className="grid min-h-[430px] overflow-hidden rounded-md border bg-muted/30 md:grid-cols-[200px_1fr]">
              <aside className="hidden border-r bg-sidebar p-3 md:block">
                <div className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold text-sidebar-foreground">
                  <span className="flex size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    <MapPin size={13} />
                  </span>
                  Meridiano Cero
                </div>
                {MOCK_NAV.map(({ label, icon: Icon, active }) => (
                  <div
                    key={label}
                    className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </div>
                ))}
              </aside>
              <div className="flex flex-col">
                <div className="flex h-11 items-center gap-2 border-b bg-background px-4">
                  <span className="text-sm font-medium">Dashboard</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Administración de giras
                  </span>
                </div>
                <div className="grid gap-4 p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {MOCK_STATS.map(({ icon: Icon, label, value }) => (
                      <Card key={label}>
                        <CardContent className="p-3">
                          <div className="mb-2 flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                            <Icon size={14} />
                          </div>
                          <p className="text-lg font-semibold">{value}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="rounded-lg border bg-background">
                    <div className="flex items-center justify-between border-b px-3 py-2.5">
                      <p className="text-sm font-medium">Giras recientes</p>
                      <span className="text-xs text-muted-foreground">Ver todas</span>
                    </div>
                    <div className="divide-y">
                      {MOCK_TRIPS.map((trip) => (
                        <div key={trip.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{trip.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{trip.school}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <StatusBadge status={trip.status} />
                            <span className="hidden text-xs text-muted-foreground sm:inline">{trip.day}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:col-span-2 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-secondary">
                  <Icon size={19} />
                </div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3 border-t py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Acceso protegido por rol para administradores, monitores y apoderados.
          </span>
          <Link href="/sign-in" className="font-medium text-foreground hover:underline">
            Ir a la plataforma
          </Link>
        </div>
      </section>
    </main>
  )
}

export default async function RootPage() {
  const { userId } = await auth()
  if (!userId) return <LandingPage />

  const [admin, memberships] = await Promise.all([
    prisma.adminUser.findUnique({ where: { clerkUserId: userId } }),
    prisma.tripMembership.findMany({
      where: { clerkUserId: userId },
      include: { trip: { select: { name: true } } },
    }),
  ])

  if (admin) redirect('/admin')
  if (memberships.length === 0) redirect('/redeem')

  if (memberships.length === 1) {
    const [membership] = memberships
    redirect(membership.role === 'MONITOR' ? `/monitor/${membership.tripId}` : `/parent/${membership.tripId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-2">
        <h1 className="text-lg font-semibold text-center mb-4">Selecciona una gira</h1>
        {memberships.map((membership) => (
          <Link
            key={membership.id}
            href={membership.role === 'MONITOR' ? `/monitor/${membership.tripId}` : `/parent/${membership.tripId}`}
            className="block rounded-lg border border-border/50 px-4 py-3 hover:bg-accent transition-colors"
          >
            <p className="font-medium text-sm">{membership.trip.name}</p>
            <p className="text-xs text-muted-foreground">
              {membership.role === 'MONITOR' ? 'Monitor' : 'Apoderado'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
