-- CreateTable
CREATE TABLE "ReviewAnalysis" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalReviewId" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "positiveAspects" JSONB NOT NULL,
    "negativeAspects" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAnalysis_businessId_source_externalReviewId_key" ON "ReviewAnalysis"("businessId", "source", "externalReviewId");

-- CreateIndex
CREATE INDEX "ReviewAnalysis_businessId_source_idx" ON "ReviewAnalysis"("businessId", "source");

-- AddForeignKey
ALTER TABLE "ReviewAnalysis" ADD CONSTRAINT "ReviewAnalysis_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
