# Store Locator — información del local

Rama: `store-locator` · Commits: `e3c98cf` (feature), `fd0cb6b` (fix de Stripe)

Permite que un negocio gestione la información de su local (dirección, mapa, fotos
y horarios) y que los clientes la vean en su página pública `/{slug}`.

---

## 1. Qué puede hacer el negocio

Desde la sección **"Mi local"** del dashboard (`/business/[id]`):

- **Dirección**: escribirla a mano, pulsar **"Geocodificar"** (usa la Geocoding API
  de Google con `GOOGLE_MAPS_API_KEY`) o **"Mi ubicación"** (geolocation del
  navegador). También se puede pegar un enlace de Google Maps, del que se extraen
  las coordenadas con `extractLatLng`.
- **Mapa**: preview por iframe de Google Maps. Sin SDK ni facturación extra.
- **Fotos**: hasta **8** imágenes subidas por el propio negocio (PNG/JPEG/WebP,
  máx. 5 MB cada una).
- **Horarios**: por día, hasta **2 franjas** (`09:00–14:00` y `17:00–20:00`),
  con opción de marcar el día cerrado. Tres modos:
  - `hours` — el horario guardado.
  - `variable` — "varía según el día": no se calcula nada, solo informativo.
  - `always` — "siempre abierto": se muestra como badge, sin cálculo.

En la página pública `/{slug}` el bloque **"Dónde encontrarnos"** aparece **solo si
el negocio ha rellenado algo** (`hasStoreInfo`), con la galería de fotos, la
dirección, el mapa y los horarios. Marca el día actual y si está abierto ahora.

---

## 2. Modelo de datos

Campos nuevos en `Business` (`prisma/schema.prisma`):

| Campo | Tipo | Para qué |
|---|---|---|
| `address` | `String?` | Dirección en texto |
| `latitude` | `Float?` | Latitud para el mapa |
| `longitude` | `Float?` | Longitud para el mapa |
| `openingHours` | `Json?` | Horarios estructurados |
| `photos` | `Json?` | Lista de fotos `{ url, path }` |

Migración: `prisma/migrations/20261001000000_add_store_locator/migration.sql`

```sql
ALTER TABLE "Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "photos" JSONB;
```

**Por qué JSON y no una tabla `BusinessHours`**: un negocio tiene un solo local, así
que una tabla con 7 filas por negocio sería ruido. El JSON se normaliza y valida en
`src/lib/store-hours.ts` antes de usarse.

### Estructura de `openingHours`

```json
{
  "mode": "hours",
  "days": [
    { "day": 0, "closed": false, "slots": [{ "open": "09:00", "close": "14:00" }] },
    { "day": 5, "closed": true, "slots": [] }
  ]
}
```

> **`day: 0 = lunes … 6 = domingo`.** Ojo: `Date.getDay()` de JavaScript empieza en
> **domingo** (0 = domingo). Para convertir usa siempre `jsDayToWeekDay(jsDay)`,
> que devuelve `(jsDay + 6) % 7`. Este despiste ya costó dos bugs: el "día actual"
> resaltado salía desplazado, y el cálculo de "abierto ahora" daba falso los lunes.

---

## 3. Archivos

| Archivo | Rol |
|---|---|
| `src/lib/store-hours.ts` | Tipos, validación, parseo defensivo y cálculo de horarios |
| `src/actions/store-locator.ts` | Server actions: guardar, geocodificar, subir/borrar fotos |
| `src/components/store-locator-section.tsx` | Panel "Mi local" del dashboard |
| `src/components/public-store-info.tsx` | Bloque público de `/{slug}` |
| `src/lib/__tests__/store-hours.test.ts` | 32 tests de la lógica de horarios |
| `scripts/setup-storage.ts` | Crea el bucket `business-photos` |

### Server actions (`src/actions/store-locator.ts`)

- `updateStoreInfo` — guarda dirección, coordenadas y horarios. Valida ownership
  con Supabase Auth + `business.userId`.
- `geocodeAddress` — Geocoding API. Acepta texto o URL de Maps.
- `uploadBusinessPhoto` / `deleteBusinessPhoto` — bucket `business-photos`.

---

## 4. Storage

Bucket de Supabase **`business-photos`** (público), creado con:

```bash
npx tsx --env-file=.env.local scripts/setup-storage.ts business-photos
```

Configurado en el script: `public: true`, límite de 5 MB, y solo `image/png`,
`image/jpeg`, `image/webp`.

---

## 5. Despliegue

La migración **ya está aplicada** en la BD de producción: las tres variables
`DATABASE_URL` (`.env.local`, `.env.vercel`, `.env.vercel.prod`) apuntan al mismo
Supabase (`aws-1-eu-north-1.pooler.supabase.com`), y ahí `prisma migrate status`
responde "Database schema is up to date" con las 16 migraciones.

> **Ojo:** `vercel-build` solo ejecuta `prisma generate && next build`. **No**
> despliega migraciones. Si algún día se crea una BD nueva, hay que correr
> `npx prisma migrate deploy` a mano.

### Previews de Vercel

**Preview de esta rama:**
`https://mi-saas-mvp-git-store-locator-nleyvagarciagmailcoms-projects.vercel.app`

> El proyecto tiene **Deployment Protection** activado: al abrir la URL hay un
> redirect a `vercel.com/sso-api`. Funciona con la sesión de Vercel del owner, pero
> no es compartible con terceros. Para desactivarlo: Project → Settings →
> Deployment Protection.

---

## 6. Dos cosas que costaron tiempo (no repetir)

### a) Los previews de Vercel fallaban todos

Los dos previews que existían estaban en **Error**:

```
Collecting page data → Failed to collect page data for /api/stripe/checkout
Error: Neither apiKey nor config.authenticator provided
```

Causa: `src/lib/stripe.ts` hacía

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
```

**al importar el módulo**. Stripe lanza error si la clave viene vacía, y
"Collecting page data" importa las rutas de API durante el build → el build
reventaba.

Además, la causa de fondo era que **en Vercel las 20 variables de entorno estaban
solo en el scope `Production`; en `Preview` no había ninguna**. Por eso ningún
preview de ninguna rama había compilado jamás.

Arreglo (commit `fd0cb6b`): cliente perezoso.

```ts
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('Falta la variable de entorno STRIPE_SECRET_KEY');
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}
```

Actualizadas las 3 rutas que lo usan: `api/stripe/checkout`, `api/stripe/portal` y
`api/webhooks/stripe`.

**Regla general: nada que dependa de una variable de entorno debe ejecutarse al
importar un módulo.** Que se cree en el primer uso.

### b) Cómo copiar las variables de Production a Preview

`vercel env pull` descarga los valores descifrados; `vercel env add` los vuelve a
subir. Dos detalles que costaron intentos:

- **Hay que pasar la rama explícitamente como cadena vacía.** Si no, `vercel env
  add NAME preview` pregunta *"¿a qué rama Git?"* y sin TTY **aborta con exit 0 sin
  añadir nada** (parece que funciona, pero no añade la variable).
- **Hay que ejecutar desde la raíz del repo**, si no Vercel no encuentra el proyecto
  enlazado (`.vercel/`) y falla con *"Your codebase isn't linked to a project"*.

Script usado (`/tmp/copy-env-preview.mjs`):

```js
execFileSync("vercel",
  ["env", "add", name, "preview", "", "--value", value, "--force", "--yes"]);
```

Se excluyen del volcado las variables que inyecta Vercel/Turbopack solas: `NX_*`,
`TURBO_*`, `VERCEL_*`, `VERCEL_OIDC_TOKEN`.

---

## 7. Notas de implementación

- **Server actions y `"use server"`**: en estos archivos solo se pueden exportar
  funciones async. Por eso `BUSINESS_PHOTOS_BUCKET` es una constante **local** sin
  `export` (si se exporta, el build falla).
- **`tsconfig.json` tiene `strict: false`**, así que las uniones discriminadas no se
  estrechan bien y los tipos de retorno de las actions usan
  `{ success: boolean; ...campos opcionales }` en lugar de un `throw`.
- **Migraciones**: `npx prisma migrate dev` **no funciona** en este repo. Falla al
  recrear la shadow DB porque la migración histórica
  `20260616223001_drift_catchup` usa SQL inválido para PostgreSQL
  (`ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` → `syntax error at or near "NOT"`).
  El rodeo que se usó fue generar el SQL con `prisma migrate diff` y aplicarlo con
  `migrate deploy`. No hay que arreglar la migración vieja para continuar.
- **Tests**: `npx jest`. El único fallo es
  `src/components/__tests__/contact-form.test.tsx`, **preexistente y ajeno a este
  feature** (verificado con `git stash`).

---

## 8. Verificación hecha

```bash
npx tsc --noEmit          # limpio
npx jest                  # 75/76 (el 1 fallo es preexistente)
npm run build             # OK
env -u STRIPE_SECRET_KEY -u DATABASE_URL -u NEXT_PUBLIC_SUPABASE_URL npm run build
                          # OK — prueba de que el build ya no depende del entorno
```
