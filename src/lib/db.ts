import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Pool de conexiones PostgreSQL. DATABASE_URL indica a qué base de datos
// conectarse; Supabase es el proveedor utilizado por este proyecto.
function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('Falta DATABASE_URL.');

  const url = new URL(value);
  // Supabase session pooler (5432) keeps one backend connection per
  // serverless instance. Use its transaction pooler for Vercel, where
  // instances are short-lived and can otherwise exhaust the 15-connection
  // session limit.
  if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
    url.port = '6543';
    url.searchParams.set('pgbouncer', 'true');
  }
  return url.toString();
}

const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
  // Vercel puede ejecutar varias instancias en paralelo. El pool por defecto
  // abre hasta 10 conexiones por instancia y agota el límite del pooler de
  // Supabase (15 conexiones en modo sesión).
  max: 1,
  idleTimeoutMillis: 1_000,
  connectionTimeoutMillis: 5_000,
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
