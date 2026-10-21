-- CreateTable: Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
-- PostgreSQL no admite "ADD CONSTRAINT IF NOT EXISTS" (error de sintaxis 42601).
-- Se comprueba primero en pg_constraint para poder reaplicar la migración.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_userId_fkey'
    ) THEN
        ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: add columns to Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "emailTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug");

-- AlterTable: add columns to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "invitedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastInvitedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rating" INTEGER,
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'qr',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

-- Customer: change column constraints
-- "name" pasa a ser opcional. "phone" sigue siendo obligatorio, pero solo se
-- endurece si no hay valores NULL pendientes (si los hay, la migración no
-- debe abortar y dejar la base a medias).
ALTER TABLE "Customer" ALTER COLUMN "name" DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Customer" WHERE "phone" IS NULL) THEN
        ALTER TABLE "Customer" ALTER COLUMN "phone" SET NOT NULL;
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_businessId_key" ON "Customer"("email", "businessId");
