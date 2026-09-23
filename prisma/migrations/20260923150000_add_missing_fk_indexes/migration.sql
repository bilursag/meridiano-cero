-- AddIndex
CREATE INDEX "Trip_schoolId_idx" ON "Trip"("schoolId");

-- AddIndex
CREATE INDEX "Trip_programId_idx" ON "Trip"("programId");

-- AddIndex
CREATE INDEX "TripLeg_tripId_idx" ON "TripLeg"("tripId");

-- AddIndex
CREATE INDEX "ProgramItem_programId_idx" ON "ProgramItem"("programId");

-- AddIndex
CREATE INDEX "AccessCode_tripId_idx" ON "AccessCode"("tripId");

-- AddIndex
CREATE INDEX "TripMembership_tripId_idx" ON "TripMembership"("tripId");

-- AddIndex
CREATE INDEX "ItineraryItem_tripId_idx" ON "ItineraryItem"("tripId");

-- AddIndex
CREATE INDEX "Announcement_tripId_idx" ON "Announcement"("tripId");
