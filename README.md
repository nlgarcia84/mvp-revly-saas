# Revly — MVP

Ayuda a negocios locales a conseguir más reseñas en Google, gestionar clientes y fidelizarlos con un sistema de puntos y descuentos.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 6
- **Base de datos:** PostgreSQL via Prisma 7 + Supabase
- **Autenticación:** Supabase Auth (email/password)
- **Pagos:** Stripe
- **UI:** React 19
- **Emails:** Resend
- **Google APIs:** Places API, Business Profile API, OAuth 2.0

## Funcionalidades

### Para el negocio (dashboard)

| Funcionalidad | Descripción |
|---|---|
| **Registrar negocio** | Crear negocios con nombre, slug y enlace de Google Reviews |
| **Subir logo** | Imagen del negocio almacenada en Supabase Storage |
| **Código QR** | Genera QR que apunta al formulario público del negocio |
| **Importar clientes** | Añadir clientes manualmente o por lote (CSV) |
| **Enviar invitaciones** | Email automático para que el cliente deje reseña en Google |
| **Panel de reseñas** | Visualiza reseñas de Google (5 por Places API o todas si conecta Business Profile) |
| **Filtros de reseñas** | Por calificación (positivas/críticas) y por fecha (1m/3m/6m) |
| **Respuestas con IA** | Genera respuestas a reseñas críticas usando IA |
| **Conectar Google Business Profile** | OAuth para ver TODAS las reseñas (sin límite de 5) |
| **Sistema de puntos** | Los clientes acumulan puntos al registrarse (1 punto = 1 registro) |

### Para el cliente (público)

| Funcionalidad | Ruta |
|---|---|
| **Formulario de registro** | `/{slug}` — el cliente da sus datos y obtiene puntos |
| **Perfil del cliente** | `/{slug}/customer/{id}` — puntos acumulados, código de descuento con barcode |
| **Dejar reseña** | Email → enlace directo para valorar con estrellas y escribir feedback |

## Modelo de datos

```
User → Business → Customer
```

- **User:** cuenta con email y suscripción Stripe
- **Business:** negocio con nombre, slug, logo, enlace de Google, tokens de Business Profile
- **Customer:** cliente con email, teléfono, puntos, código de descuento, rating y feedback

## Sistema de puntos

Cada vez que un cliente rellena el formulario público (`/{slug}`):
- Si es **nuevo** → se crea con 1 punto y un código de descuento único
- Si ya **existe** (mismo email) → suma 1 punto adicional

Cada **5 puntos** = 10% de descuento canjeable en el negocio.

El cliente puede ver su progreso, código y barcode en su perfil público:
`/{slug}/customer/{customerId}`

## Reseñas de Google

- **Google Places API** (por defecto): devuelve las últimas 5 reseñas
- **Google Business Profile API** (opcional): si el negocio conecta su cuenta verificada vía OAuth, devuelve **todas** las reseñas
- Si Business Profile falla, cae automáticamente en Places API

## Rutas principales

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing page |
| `/dashboard` | Privada | Panel principal del usuario |
| `/business` | Privada | Lista de negocios |
| `/business/{id}` | Privada | Detalle del negocio (clientes, reseñas) |
| `/business/{id}/settings` | Privada | Configuración del negocio |
| `/{slug}` | Pública | Formulario de registro para clientes |
| `/{slug}/customer/{id}` | Pública | Perfil del cliente con puntos y barcode |
| `/api/review-confirm/{id}` | Pública | Flujo de confirmación de reseña |
| `/api/barcode/{code}` | Pública | Imagen PNG del código de barras |
| `/privacidad` | Pública | Política de privacidad |

## Scripts

```bash
npm run dev              # Iniciar servidor de desarrollo
npx prisma db push       # Sincronizar esquema con la BD
npx prisma generate      # Generar cliente Prisma
npx prisma studio        # Abrir explorador de BD
npm run build            # Compilar para producción
```

## Variables de entorno

```env
# Base de datos
DATABASE_URL=

# Supabase (Auth + Storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (pagos)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google APIs
GOOGLE_MAPS_API_KEY=          # Para Places API (reseñas)
GOOGLE_CLIENT_ID=             # Para Business Profile API (OAuth)
GOOGLE_CLIENT_SECRET=         # Para Business Profile API (OAuth)

# Emails
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=          # http://localhost:3000 en desarrollo

# IA
GROQ_API_KEY=                 # Para generar respuestas a reseñas
```
