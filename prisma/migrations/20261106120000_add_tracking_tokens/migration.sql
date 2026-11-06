-- CreateTable
CREATE TABLE "TrackingToken" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackingToken_tokenHash_key" ON "TrackingToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TrackingToken_tripId_clerkUserId_idx" ON "TrackingToken"("tripId", "clerkUserId");

-- AddForeignKey
ALTER TABLE "TrackingToken" ADD CONSTRAINT "TrackingToken_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
