-- Store Locator: información del local (dirección, mapa, fotos y horarios)
ALTER TABLE "Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "photos" JSONB;