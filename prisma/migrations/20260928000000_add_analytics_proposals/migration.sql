-- AlterTable: store Smart Analytics global AI proposals on Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "analyticsProposals" JSONB;
