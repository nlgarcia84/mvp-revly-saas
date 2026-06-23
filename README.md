# Revly — MVP

Ayuda a negocios locales a conseguir más reseñas en Google, gestionar clientes y fidelizarlos con un sistema de puntos y descuentos canjeables en caja mediante QR + PIN.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 6
- **Base de datos:** PostgreSQL via Prisma 7 + Supabase
- **Autenticación:** Supabase Auth (email/password)
- **Pagos:** Stripe
- **UI:** React 19
- **Emails:** Resend
- **Google APIs:** Places API, Business Profile API, OAuth 2.0
- **QR:** qrcode (generación server-side SVG)

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
| **Facturas para sumar puntos** | Dar de alta números de factura únicos; el cliente los canjea por +1 punto |
| **PIN de caja** | PIN de 4 dígitos que el empleado usa para verificar descuentos |

### Para el cliente (público)

| Funcionalidad | Ruta | Descripción |
|---|---|---|
| **Formulario de registro** | `/{slug}` | El cliente da sus datos y obtiene puntos. Si ya existe, redirige a su perfil |
| **Perfil del cliente** | `/{slug}/customer/{id}` | Puntos acumulados, QR con código de descuento, canje de factura |
| **Canje de descuento** | QR → empleado escanea | El empleado escanea el QR, introduce PIN y canjea 5 puntos = 10% OFF |

## Modelo de datos

```
User → Business → Customer
               → Invoice
```

### Modelos

**User:** Cuenta con email y suscripción Stripe.

**Business:** Negocio con nombre, slug, logo, enlace de Google, tokens de Business Profile.
- `verificationPin` — PIN de 4 dígitos para canje en caja
- `invoiceFormat` — Ejemplo del formato de factura (ej: "FACT-001")

**Customer:** Cliente con email, teléfono, puntos, código de descuento, rating y feedback.
- `points` (Int, default 1) — Puntos acumulados
- `discountCode` (String?) — Código único formato REVLY-XXXX. **Cambia cada vez que se canjea**

**Invoice:** Factura dada de alta por el negocio.
- `number` + `businessId` — Unique constraint (mismo número no puede repetirse en el mismo negocio)
- `customerId` (nullable) — Se asigna cuando el cliente la canjea
- `usedAt` (nullable) — Fecha de canje

## Sistema de puntos

### Cómo se ganan puntos

1. **Registro vía QR** — Cada vez que el cliente rellena el formulario público (`/{slug}`):
   - Si es **nuevo** → se crea con 1 punto y un código de descuento único (REVLY-XXXX)
   - Si ya **existe** (mismo email) → suma 1 punto adicional (sin duplicar cliente)
2. **Factura de compra** — Desde su perfil público, el cliente introduce el número de factura
   - El negocio da de alta los números de factura en su dashboard (botón "Facturas")
   - Cada factura solo puede usarse **una vez**
   - Si es válida → +1 punto

### Canje de descuento (en caja)

Cada **5 puntos** = **10% de descuento**. El canje se hace en caja mediante:

```
Cliente                          Cajero
   │                                │
   ├── Abre su perfil ──────────────┤
   │   (revly.es/{slug}/customer/id) │
   │                                │
   ├── Muestra el QR ───────────────┤
   │                                ├── Abre cámara del móvil
   │                                ├── Escanea el QR
   │                                ├── Se abre revly.es/{slug}/verificar/{code}
   │                                ├── Introduce PIN de 4 dígitos
   │                                ├── Pulsa "Verificar y canjear"
   │                                ├── ✅ Válido
   │                                └── Aplica 10% en TPV
```

**Seguridad antifraude:**
- El QR codifica una URL con el código de descuento
- Al canjear, el código **cambia** por uno nuevo (el anterior queda inválido)
- Una captura de pantalla del QR antiguo **ya no sirve** (el código fue reemplazado)
- El PIN lo protege: solo el empleado que lo conoce puede canjear
- Los números de factura son únicos y los controla el negocio: no se puede inventar uno

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
| `/business/{id}` | Privada | Detalle del negocio (clientes, reseñas, facturas) |
| `/business/{id}/settings` | Privada | Configuración (logo, slug, PIN, Google BP, formato factura) |
| `/{slug}` | Pública | Formulario de registro para clientes (con búsqueda por email) |
| `/{slug}/customer/{id}` | Pública | Perfil del cliente: puntos, QR descuento, canje de factura |
| `/{slug}/verificar/{code}` | Pública | Verificación de descuento para empleados (con PIN) |
| `/api/review-confirm/{id}` | Pública | Flujo de confirmación de reseña |
| `/api/barcode/{code}` | Pública | Imagen PNG del código de barras |
| `/api/google-business/connect` | Pública | OAuth para conectar Google Business Profile |
| `/api/google-business/callback` | Pública | Callback OAuth de Google |
| `/api/google-business/disconnect` | Pública | Desconectar Google Business Profile |
| `/privacidad` | Pública | Política de privacidad |

## Server Actions

| Fichero | Acciones | Descripción |
|---|---|---|
| `src/actions/redeem.ts` | `checkDiscountCode`, `redeemDiscountCode`, `updateVerificationPin`, `getBusinessVerificationInfo` | Canje en caja con PIN + código descuento |
| `src/actions/invoices.ts` | `addInvoices`, `getInvoices`, `claimInvoice`, `deleteInvoice` | Gestión de facturas para sumar puntos |
| `src/actions/customers.ts` | `addCustomer`, `getCustomers`, `updateCustomerStatus`, `addCustomerBatch`, `deleteCustomer`, `clearCustomers`, `clearCompletedCustomers`, `findPublicCustomerByEmail`, `getPublicCustomer`, `deleteSelectedCustomers` | CRUD de clientes |
| `src/actions/business.ts` | `createBusiness`, `getBusinesses`, `getBusinessBySlug`, `addPublicCustomer`, `updateBusiness`, `deleteBusiness`, `uploadBusinessImage` | CRUD de negocios |

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
