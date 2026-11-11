-- Application data is accessed through Prisma on the server. Supabase's
-- browser-facing anon/authenticated roles must not access these tables directly.
-- PostgreSQL owners retain access; Supabase Auth and Storage are unaffected.
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PointClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ReviewAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PointMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
