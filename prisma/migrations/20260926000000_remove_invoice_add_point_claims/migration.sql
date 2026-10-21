-- DropTable: Invoice
-- La tabla "Invoice" y la columna "Business"."invoiceFormat" nunca llegaron a
-- crearse por migraciones (la base original se generó con `prisma db push`),
-- así que en una base nueva no existen. Se eliminan solo si están presentes.
DO $$
BEGIN
    IF to_regclass('"Invoice"') IS NOT NULL THEN
        ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_businessId_fkey";
        ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_customerId_fkey";
        DROP TABLE "Invoice";
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Business" DROP COLUMN IF EXISTS "invoiceFormat",
ADD COLUMN     IF NOT EXISTS "ticketFormat" TEXT;

-- CreateTable
CREATE TABLE "PointClaim" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointClaim_customerId_claimedAt_idx" ON "PointClaim"("customerId", "claimedAt");

-- CreateIndex
CREATE INDEX "PointClaim_businessId_ticketCode_claimedAt_idx" ON "PointClaim"("businessId", "ticketCode", "claimedAt");

-- AddForeignKey
ALTER TABLE "PointClaim" ADD CONSTRAINT "PointClaim_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointClaim" ADD CONSTRAINT "PointClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
