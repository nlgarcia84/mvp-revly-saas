-- AlterTable: add Instagram / Meta connection columns to Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "instagramAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "instagramTokenExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "instagramPageId" TEXT,
ADD COLUMN IF NOT EXISTS "instagramBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "instagramUsername" TEXT;