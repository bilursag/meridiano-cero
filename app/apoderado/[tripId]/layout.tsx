import { TripProvider } from '@/lib/trip-context'
import NavBar from '@/components/NavBar'

export default async function ApoderadoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  return (
    <TripProvider tripId={tripId}>
      <NavBar />
      <main className="min-h-[calc(100vh-56px)] bg-background">{children}</main>
    </TripProvider>
  )
}
