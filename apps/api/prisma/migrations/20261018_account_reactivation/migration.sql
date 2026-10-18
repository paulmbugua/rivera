CREATE TABLE "AccountReactivationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountReactivationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountReactivationToken_tokenHash_key" ON "AccountReactivationToken"("tokenHash");
CREATE INDEX "AccountReactivationToken_userId_idx" ON "AccountReactivationToken"("userId");
CREATE INDEX "AccountReactivationToken_expiresAt_idx" ON "AccountReactivationToken"("expiresAt");

ALTER TABLE "AccountReactivationToken" ADD CONSTRAINT "AccountReactivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
