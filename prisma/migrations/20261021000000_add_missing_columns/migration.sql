-- Columnas que sí existen en la base de datos de producción pero que ninguna
-- migración creaba (la base original se generó con `prisma db push`, no con
-- `migrate deploy`). Sin esta migración, una base de datos nueva o un entorno
-- de staging quedaría sin estos campos y la aplicación fallaría al consultarlos.
--
-- Todo es idempotente (IF NOT EXISTS) para que aplicarla sobre producción sea
-- un no-op: allí las columnas ya existen.

-- Google Business Profile (conexión OAuth)
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "googleBusinessAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleBusinessRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleBusinessTokenExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "googleBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "googleBusinessLocationId" TEXT;

-- Programa de puntos y descuentos
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "discountCode" TEXT;
