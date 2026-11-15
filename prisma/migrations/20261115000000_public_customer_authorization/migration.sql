CREATE UNIQUE INDEX IF NOT EXISTS "Customer_id_businessId_key" ON "Customer"("id", "businessId");
CREATE TABLE IF NOT EXISTS "CustomerEmailChallenge" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "registration" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "CustomerCapability" (
  "tokenHash" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerCapability_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE RESTRICT
);
CREATE TABLE IF NOT EXISTS "PublicAccessRateLimit" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "CustomerEmailChallenge_expiresAt_idx" ON "CustomerEmailChallenge"("expiresAt");
CREATE INDEX IF NOT EXISTS "CustomerCapability_expiresAt_idx" ON "CustomerCapability"("expiresAt");
CREATE INDEX IF NOT EXISTS "PublicAccessRateLimit_expiresAt_idx" ON "PublicAccessRateLimit"("expiresAt");
ALTER TABLE "CustomerEmailChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerCapability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAccessRateLimit" ENABLE ROW LEVEL SECURITY;
