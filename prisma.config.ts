import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load project env files for Prisma CLI commands.
loadDotenv({ path: ".env.local" });
loadDotenv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",

  },
});
