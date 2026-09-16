-- AlterTable: store Facebook pages pending selection after OAuth
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "facebookPending" JSONB;
