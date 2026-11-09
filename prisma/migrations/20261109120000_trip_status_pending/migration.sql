-- A new enum value can't be used in the transaction that adds it, so the default and the backfill
-- live in the next migration.
ALTER TYPE "TripStatus" ADD VALUE 'PENDING' BEFORE 'IN_TRANSIT';
