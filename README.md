# Revly — MVP

Ayuda a negocios locales a conseguir más reseñas en Google, gestionar clientes y fidelizarlos con un sistema de puntos y descuentos canjeables desde el dashboard.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 6
- **Base de datos:** PostgreSQL via Prisma 7 + Supabase
- **Autenticación:** Supabase Auth (email/password, con **verificación de email** al crear cuenta)
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
| **Sistema de puntos** | 1 punto al registrarse + 1 punto al día canjeando el código del ticket del kiosko |
| **Canje de descuento** | El dueño teclea el código del cliente en el dashboard; descuenta 5 puntos y genera un código nuevo |
| **Formato del ticket** | Ejemplo del número de ticket del kiosko (placeholder que ve el cliente) |

### Para el cliente (público)

| Funcionalidad | Ruta | Descripción |
|---|---|---|
| **Formulario de registro** | `/{slug}` | El cliente da sus datos y obtiene 1 punto. Si ya existe, redirige a su perfil |
| **Perfil del cliente** | `/{slug}/customer/{id}` | Puntos, código de descuento y suma de puntos con el ticket del kiosko |
| **Canje de descuento** | Dashboard | El dueño teclea el código del cliente; se descuentan 5 puntos = 10% OFF |

## Modelo de datos

```
User → Business → Customer
               → PointClaim
```

### Modelos

**User:** Cuenta con email y suscripción Stripe.

**Business:** Negocio con nombre, slug, logo, enlace de Google, tokens de Business Profile.
- `ticketFormat` — Ejemplo del número de ticket del kiosko (ej: "A-001")

**Customer:** Cliente con email, teléfono, puntos, código de descuento, rating y feedback.
- `points` (Int, default 1) — Empieza en 1 al registrarse; sube con el ticket del kiosko
- `discountCode` (String?) — Código único formato REVLY-XXXX. **Cambia cada vez que se canjea**

**PointClaim:** Registro de un punto ganado con el ticket del kiosko.
- `ticketCode` + `businessId` — Un mismo ticket solo vale una vez al día
- `customerId` — Cliente que lo canjeó
- `claimedAt` — Fecha; limita a 1 punto por cliente y día

## Sistema de puntos

### Cómo se ganan puntos

1. **Registro vía QR** — La primera vez que el cliente rellena el formulario público (`/{slug}`)
   se crea con **1 punto** y un código de descuento único (REVLY-XXXX). Si vuelve a
   rellenarlo con el mismo email, **no vuelve a sumar** (solo actualiza sus datos).
2. **Ticket del kiosko** — Desde su perfil público, el cliente introduce el número de su
   ticket y suma **1 punto**.
   - Solo puede sumar **1 punto al día**.
   - Un mismo ticket solo vale una vez al día por negocio.

### Canje de descuento (en caja)

Cada **5 puntos** = **10% de descuento**. El canje se hace desde el **dashboard**:

```
Cliente                          Empresario
   │                                │
   ├── Abre su perfil ──────────────┤
   │   (revly.es/{slug}/customer/id) │
   │                                │
   ├── Muestra o dicta su código ───┤
   │   (REVLY-A3X9)                 ├── Abre el dashboard del negocio
   │                                ├── Escribe el código en "Canjear descuento"
   │                                ├── ✅ Válido
   │                                ├── Se descuentan 5 puntos y se genera un código nuevo
   │                                └── Aplica el 10% en el TPV
```

**Seguridad antifraude:**
- El canje requiere estar **autenticado** en el dashboard (solo el dueño).
- Al canjear, el código **cambia** por uno nuevo (el anterior queda inválido).
- Una captura del código antiguo **ya no sirve**.
- El ticket del kiosko limita a **1 punto por cliente y día**.

## Reseñas de Google

- **Google Places API** (por defecto): devuelve las últimas 5 reseñas
- **Google Business Profile API** (opcional): si el negocio conecta su cuenta verificada vía OAuth, devuelve **todas** las reseñas
- Si Business Profile falla, cae automáticamente en Places API

### Google Business Profile — Detalles de implementación

**OAuth:** se solicita el scope `https://www.googleapis.com/auth/business.manage` con `access_type=offline` y `prompt=consent` para obtener refresh token.

**IDs almacenados en BD (`Business`):**
| Campo | Formato | Ejemplo |
|---|---|---|
| `googleBusinessAccountId` | Resource name completo | `accounts/123456789` |
| `googleBusinessLocationId` | Resource name completo | `accounts/123456789/locations/987654321` |

Google devuelve los resource names con los prefijos `accounts/` y `locations/` incluidos. Para evitar duplicación, las URLs de la API se construyen inyectando estos valores directamente en el path, **sin añadir prefijos estáticos adicionales**:

| Operación | API | URL |
|---|---|---|
| Listar ubicaciones | `mybusinessbusinessinformation.googleapis.com/v1` | `/v1/${accountId}/locations` |
| Obtener ubicación | `mybusinessbusinessinformation.googleapis.com/v1` | `/v1/${locationId}` |
| Listar reseñas | `mybusiness.googleapis.com/v4` | `/v4/${locationId}/reviews` |

**Ejemplo concreto de URL final para reseñas:**
```
https://mybusiness.googleapis.com/v4/accounts/123456789/locations/987654321/reviews?pageSize=50
```

**Paginación:** se itera con `nextPageToken` hasta obtener todas las páginas. Si la API devuelve error (4xx/5xx), se lanza una excepción con el HTTP status y la respuesta de Google. Durante la fase de diagnóstico no hay fallback silencioso a Places API cuando Business Profile está conectado.

## Rutas principales

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing page |
| `/dashboard` | Privada | Panel principal del usuario |
| `/business` | Privada | Lista de negocios |
| `/business/{id}` | Privada | Detalle del negocio (clientes, reseñas, canje de descuento) |
| `/business/{id}/settings` | Privada | Configuración (logo, slug, Google BP, formato del ticket) |
| `/{slug}` | Pública | Formulario de registro para clientes (con búsqueda por email) |
| `/{slug}/customer/{id}` | Pública | Perfil del cliente: puntos, código de descuento y ticket |
| `/api/review-confirm/{id}` | Pública | Flujo de confirmación de reseña |
| `/api/google-business/connect` | Pública | OAuth para conectar Google Business Profile |
| `/api/google-business/callback` | Pública | Callback OAuth de Google |
| `/api/google-business/disconnect` | Pública | Desconectar Google Business Profile |
| `/privacidad` | Pública | Política de privacidad |

## Server Actions

| Fichero | Acciones | Descripción |
|---|---|---|
| `src/actions/redeem.ts` | `redeemDiscountCodeInDashboard` | Canje del descuento desde el dashboard |
| `src/actions/points.ts` | `claimTicketPoint` | Suma 1 punto con el ticket del kiosko (1/día) |
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
EMAIL_FROM=                   # (opcional) remitente, ej: "Revly <hola@revly.es>"

# App
NEXT_PUBLIC_APP_URL=          # http://localhost:3000 en desarrollo

# IA
GROQ_API_KEY=                 # Para generar respuestas a reseñas

# Meta — Facebook Pages + Instagram (OAuth)
META_CLIENT_ID=               # App ID de Facebook (Facebook Login / Pages)
META_CLIENT_SECRET=           # App Secret de Facebook
META_INSTAGRAM_CLIENT_ID=     # Instagram App ID (Instagram API with Instagram Login)
META_INSTAGRAM_CLIENT_SECRET= # Instagram App Secret (Instagram API with Instagram Login)
META_WEBHOOK_VERIFY_TOKEN=    # Token que definimos en Meta para verificar /api/webhooks/meta

# WhatsApp (Cloud API de Meta) — notificaciones al cliente (opcional)
WHATSAPP_PHONE_NUMBER_ID=     # ID del número de WhatsApp Business (Cloud API)
WHATSAPP_ACCESS_TOKEN=        # Token de acceso de la app de Meta con WhatsApp
WHATSAPP_TEMPLATE_WELCOME=    # (opcional) nombre de la plantilla de bienvenida
WHATSAPP_TEMPLATE_POINTS=     # (opcional) nombre de la plantilla de puntos
```

## Meta (Facebook + Instagram)

La integración permite leer publicaciones y comentarios, responderlos con IA y publicar en la Página.

- **Facebook:** OAuth con `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement` y `business_management`. Este último es necesario para que `/me/accounts` devuelva páginas que pertenecen a un portfolio empresarial (si no, se usa el fallback `/me/businesses` → `owned_pages`).
- **Instagram:** usa `META_INSTAGRAM_CLIENT_ID`/`SECRET` (Instagram Login), con los permisos `instagram_business_basic` e `instagram_business_manage_comments`. La cuenta debe ser profesional (Business/Creator).
- **Redirect URIs** que hay que registrar en el panel de Meta:
  - `https://www.revly.es/api/facebook/callback`
  - `https://www.revly.es/api/instagram/callback`
  - (y sus equivalentes en `http://localhost:3000` para desarrollo)
- **Webhook:** `https://www.revly.es/api/webhooks/meta` (verificación con `META_WEBHOOK_VERIFY_TOKEN`, campos `feed` para Page y `comments` para Instagram). Invalida la caché para refrescar el dashboard.

## Notificaciones al cliente (email + WhatsApp)

Avisa al cliente por **email y WhatsApp** al **registrarse** y cada vez que
**suma un punto** con el ticket del kiosko.

- **Código:** `src/lib/notifications.ts` (`notifyCustomerRegistered`,
  `notifyCustomerPoints`). Cada evento envía por los dos canales; si uno no está
  configurado, el otro sigue funcionando.
- **Email:** `src/lib/email.ts` (Resend), remitente `Revly <hola@revly.es>`
  (configurable con `EMAIL_FROM`).
- **WhatsApp:** `src/lib/whatsapp.ts` (Cloud API).
- **Dónde se dispara:** `addPublicCustomer` (bienvenida) y `claimTicketPoint` (puntos).
- **Plantillas a crear en Meta** (WhatsApp Manager → Plantillas), categoría *Utility*,
  idioma `es`, con 3 variables `{{1}} {{2}} {{3}}` en el cuerpo:
  - `revly_registro` → "¡Hola {{1}}! Te has registrado en {{2}}. Ya tienes {{3}} punto(s). Cada 5 puntos, 10% de descuento."
  - `revly_puntos` → "¡Hola {{1}}! Has sumado un punto en {{2}}. Ahora tienes {{3}} punto(s)."
- **Variables de entorno:** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
  (y opcionalmente `WHATSAPP_TEMPLATE_WELCOME` / `WHATSAPP_TEMPLATE_POINTS` si usas
  otros nombres).

> Nota: los mensajes iniciados por el negocio requieren **plantilla aprobada** por Meta.
> Con la API no se pueden enviar textos libres salvo dentro de la ventana de 24 h
> (cuando el cliente escribe primero).

## Pagos con Stripe — pruebas en local

Para probar el flujo de pago completo (incluyendo webhooks) en desarrollo local necesitas **Stripe CLI**.

### 1. Instalar Stripe CLI

```powershell
winget install Stripe.StripeCli
```

Cierra y vuelve a abrir PowerShell.

### 2. Autenticarse

```powershell
stripe login
```

Abre el navegador, autoriza tu cuenta de Stripe y listo.

### 3. Arrancar webhook forwarding (terminal aparte)

Con `npm run dev` ya corriendo, en otra terminal:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Este comando imprime un `whsec_...`. Cópialo y ponlo en `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Tarjeta de prueba

Usa siempre esta tarjeta en modo test:

| Campo | Valor |
|---|---|
| Número | `4242 4242 4242 4242` |
| Fecha | Cualquiera futura |
| CVC | Cualquiera (3 dígitos) |

### 5. Variables en producción (Vercel)

Cuando despliegues, añade en Vercel Dashboard > Settings > Environment Variables:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` (el de producción, no el del CLI)
- `NEXT_PUBLIC_APP_URL` = `https://www.revly.es`

El código ya usa `process.env.NEXT_PUBLIC_APP_URL` dinámicamente, sin necesidad de cambios entre entornos.
