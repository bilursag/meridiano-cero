-- New trips start as "Pendiente" until the coordinator starts the trip.
ALTER TABLE "Trip" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Existing trips that still hold the old default ("En ruta") but never started: no activity left
-- PENDING and no location received since the trip's start date. Trips already in the field
-- (they transmit) keep their status.
UPDATE "Trip" t
SET "status" = 'PENDING'
WHERE t."status" = 'IN_TRANSIT'
  AND NOT EXISTS (
    SELECT 1 FROM "ItineraryItem" i WHERE i."tripId" = t."id" AND i."status" <> 'PENDING'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "LocationPing" p WHERE p."tripId" = t."id" AND p."createdAt" >= t."startDate"
  );
