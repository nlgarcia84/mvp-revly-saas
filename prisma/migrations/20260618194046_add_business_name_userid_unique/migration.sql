-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_name_userId_key" ON "Business"("name", "userId");
