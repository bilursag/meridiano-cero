import { TripProvider } from '@/lib/trip-context'
import { TripShell } from '@/components/trip-shell'

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  return (
    <TripProvider tripId={tripId}>
      <TripShell role="parent">{children}</TripShell>
    </TripProvider>
  )
}
