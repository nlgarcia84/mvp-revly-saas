import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Pool de conexiones PostgreSQL. DATABASE_URL indica a qué base de datos
// conectarse; Supabase es el proveedor utilizado por este proyecto.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

// Prisma usa este adaptador para ejecutar sus consultas a través del driver
// oficial de PostgreSQL (`pg`).
const adapter = new PrismaPg(pool);

// En desarrollo, Next.js puede recargar los módulos varias veces. Guardar el
// cliente en globalThis evita crear demasiadas conexiones a la base de datos.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Se crea un único cliente Prisma y se reutiliza en toda la aplicación.
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// En producción no se guarda en globalThis porque el entorno gestiona el
// ciclo de vida del proceso de forma diferente.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// El resto de la aplicación importa este cliente para consultar PostgreSQL
// mediante Prisma, por ejemplo: prisma.business.findMany(...).
export default prisma;
