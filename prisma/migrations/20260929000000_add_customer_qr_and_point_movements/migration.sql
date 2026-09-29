-- AlterTable
ALTER TABLE "Business" ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "qrToken" TEXT;

-- CreateTable
CREATE TABLE "PointMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "day" TEXT,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_qrToken_key" ON "Customer"("qrToken");

-- CreateIndex
CREATE INDEX "PointMovement_customerId_createdAt_idx" ON "PointMovement"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointMovement_customerId_businessId_type_day_key" ON "PointMovement"("customerId", "businessId", "type", "day");

-- AddForeignKey
ALTER TABLE "PointMovement" ADD CONSTRAINT "PointMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointMovement" ADD CONSTRAINT "PointMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
