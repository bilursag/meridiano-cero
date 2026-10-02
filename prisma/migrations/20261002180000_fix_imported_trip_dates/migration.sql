-- Trips created by the Excel importer were stored at 00:00 UTC, which is 21:00 or 20:00 of the
-- previous day in Chile, so the panel, the parent view and the app showed them one day early.
-- Trips created in the panel are stored at Chile midnight (03:00 or 04:00 UTC) and are left alone.
-- This moves the UTC-midnight dates to Chile midnight of the same calendar date, matching the
-- fixed importer. Columns are TIMESTAMP(3) holding UTC.
UPDATE "Trip"
SET "startDate" = ("startDate"::date::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC'
WHERE "startDate" = date_trunc('day', "startDate");

UPDATE "Trip"
SET "endDate" = ("endDate"::date::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC'
WHERE "endDate" = date_trunc('day', "endDate");
