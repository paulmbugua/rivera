CREATE TABLE "SavedCreator" (
  "businessId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedCreator_pkey" PRIMARY KEY ("businessId", "creatorId")
);

CREATE INDEX "SavedCreator_creatorId_idx" ON "SavedCreator"("creatorId");
CREATE INDEX "SavedCreator_businessId_createdAt_idx" ON "SavedCreator"("businessId", "createdAt");

ALTER TABLE "SavedCreator"
  ADD CONSTRAINT "SavedCreator_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedCreator"
  ADD CONSTRAINT "SavedCreator_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
