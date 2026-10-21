-- AlterTable
-- La columna nunca se creó por migraciones (base original con `prisma db push`).
ALTER TABLE "Business" DROP COLUMN IF EXISTS "verificationPin";
