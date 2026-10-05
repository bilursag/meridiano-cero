-- "En ruta" becomes its own activity status (it used to fall back to PENDING), and the
-- coordinator's single activity button remembers whether the requirements were already sent.
ALTER TYPE "ItineraryStatus" ADD VALUE 'IN_TRANSIT' BEFORE 'IN_PROGRESS';

ALTER TABLE "ItineraryItem" ADD COLUMN "requirementsSentAt" TIMESTAMP(3);
