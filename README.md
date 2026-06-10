# Reseñas MVP

Ayuda a negocios locales a conseguir más reseñas en Google y mejorar su reputación online mediante solicitudes automáticas y seguimiento básico.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 6
- **Base de datos:** PostgreSQL via Prisma 7 + Supabase
- **Autenticación:** Clerk
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
CLERK_API_KEY=          # Clerk API key
```

## Licencia

MIT
