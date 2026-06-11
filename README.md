# Reseñas MVP

Ayuda a negocios locales a conseguir más reseñas en Google y mejorar su reputación online mediante solicitudes automáticas y seguimiento básico.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 6
- **Base de datos:** PostgreSQL via Prisma 7 + Supabase
- **Autenticación:** Supabase Auth (email/password)
- **Pagos:** Stripe
- **UI:** React 19

## Modelos

```
User → Business → Customer
```

Cada usuario puede registrar múltiples negocios, y cada negocio tiene clientes a los cuales enviar solicitudes de reseña.

## Scripts

```bash
npm run dev         # Iniciar servidor de desarrollo
npx prisma db push  # Sincronizar esquema con la BD
npx prisma generate # Generar cliente Prisma
npx prisma studio   # Abrir explorador de BD
```

## Variables de entorno

```env
DATABASE_URL=           # PostgreSQL connection string
STRIPE_SECRET_KEY=      # Stripe secret key
NEXT_PUBLIC_SUPABASE_URL=   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anonymous key
```

## Server vs Client Components

| Necesitas | Usa |
|---|---|
| Leer datos y mostrarlos | **Server Component** (`async`, sin `'use client'`) |
| Escribir datos (formularios) | **Server Action** (función `'use server'`) |
| Interactividad (modales, tabs, inputs, `useState`) | **Client Component** (`'use client'` + hooks) |

**Server Component** es la opción por defecto: cero JS extra, carga directa sin waterfall, más rápido. Usa **Client Component** solo cuando necesites hooks (`useState`, `useEffect`, `onClick`, `onChange`).

Ejemplos en este proyecto:
- `perfil`, `dashboard` → server (solo muestran datos desde Prisma)
- `business` → client (modal + formulario con `useState`)
- `auth` → server actions (`signIn`, `signUp`)

## Licencia

MIT
