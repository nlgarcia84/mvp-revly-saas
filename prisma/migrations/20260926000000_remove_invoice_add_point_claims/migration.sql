-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "invoiceFormat",
ADD COLUMN     "ticketFormat" TEXT;

-- DropTable
DROP TABLE "Invoice";

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
