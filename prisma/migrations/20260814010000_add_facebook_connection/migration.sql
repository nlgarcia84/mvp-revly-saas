-- AlterTable: add Facebook Page connection columns to Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "facebookAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "facebookTokenExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "facebookPageId" TEXT,
ADD COLUMN IF NOT EXISTS "facebookPageName" TEXT,
ADD COLUMN IF NOT EXISTS "facebookUsername" TEXT,
ADD COLUMN IF NOT EXISTS "facebookCacheAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "facebookCache" JSONB;
