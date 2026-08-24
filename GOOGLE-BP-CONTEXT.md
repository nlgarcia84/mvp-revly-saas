# Contexto — Google Business Profile (toda las reseñas)

> Documento de contexto para retomar el trabajo en otra sesión.
> Fecha: 2026-08-24. Proyecto: Revly (`mi-saas-mvp`).

## Objetivo

Que la app traiga **todas** las reseñas de Google de un negocio, no solo 5.

- **Sin conexión a GBP**: se usa Google Places API → **solo 5 reseñas** (límite de Google).
- **Con conexión a GBP**: se usa Business Profile API → **todas** las reseñas (paginadas).

Flujo actual en `src/actions/google-reviews.ts` → `getBusinessGoogleReviews()`:
1. Intenta con Business Profile API si el negocio tiene tokens + `accountId` + `locationId`.
2. Si no, fallback a Places API (5 reseñas).

## Estado actual

| Item | Estado |
|---|---|
| OAuth con Google (scope `business.manage`) | ✅ Funciona (tokens obtenidos) |
| App en Google Cloud en modo **Prueba** | ✅ Requiere usuarios de prueba para autorizar |
| `redirect_uri` `http://localhost:3000/api/google-business/callback` | ✅ Registrada |
| `https://developers.google.com/oauthplayground` como redirect | ✅ Registrada (para OAuth Playground) |
| Business Profile API **habilitada** en la consola | ✅ Habilitada |
| **Aprobación de cuota de la API** | ⏳ **ENVIADA** el 2026-08-24. Caso de asistencia **`1-6681000041467`**. Revisión estimada: **7–10 días hábiles**. |
| Perfil de empresa para pruebas | ✅ `nleyvagarcia@gmail.com` — **VERIFICADO** el 2026-08-24 (Norman Leyva | Desenvolupador Web Fullstack, Calle Teodoro Llorente 8, ES, 2 reseñas). Listo para el formulario de acceso. |
| Usuarios de prueba en la consola | ✅ `nleyvagarcia@gmail.com` y `nleyvagarcia2@gmail.com` añadidos |
| Tokens de Google guardados en BD | ✅ En el negocio **Halal Fried Chicken** (test antiguo; puede quedar obsoleto) |
| `accountId` / `locationId` en BD | ❌ Pendientes (no se pueden pedir hasta que aprueben la cuota) |

## Bloqueo principal

Google NO ha concedido acceso a la Business Profile API. La llamada a
`mybusinessaccountmanagement.googleapis.com/v1/accounts` responde:

```
HTTP 429 — RESOURCE_EXHAUSTED
"Quota exceeded for quota metric 'Requests' ... quota_limit_value: 0"
```

Eso significa que el proyecto aún no está aprobado (cuota 0/min).

### Solución (acción manual del dueño del proyecto)

1. Completar el formulario oficial de acceso a la Business Profile API:
   https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform
2. Usar el OAuth Client ID:
   `751131765493-btjedv3khpmo8tbnmv6a1qam9781j4ic.apps.googleusercontent.com`
3. En el formulario, el email del perfil debe ser **`nleyvagarcia@gmail.com`** (el que tiene el Perfil de Empresa). La cuenta del proyecto (`nleyvagarcia2@gmail.com`) NO tiene perfil y da "perfil de empresa no encontrado".
4. Esperar el email de aprobación de Google (cuota sube a **300 QPM**).

> El formulario valida que el email tenga un Perfil de Empresa **verificado**.
> ✅ `nleyvagarcia@gmail.com` está verificado desde el 2026-08-24, así que ya se puede enviar el formulario.

## Cuentas de Google

| Cuenta | Rol |
|---|---|
| `nleyvagarcia2@gmail.com` | Cuenta del proyecto Google Cloud Console (client ID/secret). NO tiene Perfil de Empresa. |
| `nleyvagarcia@gmail.com` | Tiene el Perfil de Empresa (perfil personal fullstack, 2 reseñas) **pendiente de verificar**. Es la que se usará para las pruebas de la API. |
| `Halal Fried Chicken` (BD) | Negocio de test antiguo; tiene tokens guardados pero NO será el objetivo de las pruebas. |

## Credenciales relevantes

**NO commitear credenciales.** Viven en `.env.local` (y en Vercel para producción):

- `GOOGLE_CLIENT_ID=751131765493-btjedv3khpmo8tbnmv6a1qam9781j4ic.apps.googleusercontent.com` (público, aparece en la URL de OAuth)
- `GOOGLE_CLIENT_SECRET=GOCSPX-...` (secreto — solo en `.env.local` / Vercel)
- `GOOGLE_MAPS_API_KEY=AIza...` (Places API, no requiere OAuth — solo en `.env.local` / Vercel)

## Plan de pruebas (perfil de empresa)

**Objetivo de las pruebas:** usar el Perfil de Empresa de `nleyvagarcia@gmail.com`
(perfil personal fullstack, con 2 reseñas) para validar que la app trae TODAS las reseñas.

Pasos:
1. Esperar a que Google **verifique** el perfil de `nleyvagarcia@gmail.com` (video enviado).
2. Completar el **formulario de acceso** indicando ese gmail → aprobación de cuota (300 QPM).
3. Conectar OAuth autorizando con **`nleyvagarcia@gmail.com`** (dueña del perfil).
4. La app traerá las reseñas de ese perfil (todas, no solo 5).

**Nota:** la aprobación va ligada al **client_id del proyecto**, así que puede usarse un perfil
que no sea de Revly para probar. Para los negocios reales (p. ej. Halal Fried Chicken), cada
dueño conectará su propia cuenta y así se traerán las reseñas de cada negocio.

## Negocios en la BD

- **Halal Fried Chicken** — id `04b1a698-8010-4a34-8a12-9e0c3438d319`
  - Tiene guardados `googleBusinessAccessToken` + `googleBusinessRefreshToken` (+ expiry).
  - Fue el test antiguo de tokens; NO es el objetivo de las pruebas actuales.
  - Le faltan `googleBusinessAccountId` / `googleBusinessLocationId`.
- Otros negocios: Pizzeria Soria, Pizzas Argento, Phone Gallery (sin tokens de Google).

## Scripts

### `scripts/test-google-bp.ts`
Comprueba si el proyecto tiene acceso a la API. Interactivo: pide autorizar en el
navegador y pegar la URL de callback (el code es de un solo uso).
Resultado esperado: `200` con cuentas = acceso OK; `429` con quota 0 = no aprobado.

### `scripts/connect-google-bp.ts` (para cuando aprueben la cuota)
Completa la conexión usando el refresh token guardado:
1. Renueva el access token.
2. Lista cuentas → guarda `googleBusinessAccountId`.
3. Lista ubicaciones → guarda `googleBusinessLocationId` (busca por nombre del negocio).
4. Guarda todo en la BD y comprueba el total de reseñas.

Ejecutar con:
```
GOOGLE_BUSINESS_ID=04b1a698-8010-4a34-8a12-9e0c3438d319 \
  npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/connect-google-bp.ts
```

## Cómo verificar acceso manualmente (si hacen falta tokens nuevos)

OAuth Playground (no depende de redirects de la app):
1. https://developers.google.com/oauthplayground
2. Engranaje → "Use your own OAuth credentials" → pegar client ID/secret.
3. Scope: `https://www.googleapis.com/auth/business.manage` → Authorize → Exchange.
4. Copiar access token y llamar a `https://mybusinessaccountmanagement.googleapis.com/v1/accounts`.

## Archivos clave

- `src/lib/google-business-profile.ts` — llamadas a la API (accounts, locations, reviews v4, refresh).
- `src/lib/google-places.ts` — Places API (fallback 5 reseñas).
- `src/actions/google-reviews.ts` — lógica principal: GBP primero, Places como fallback.
- `src/app/api/google-business/connect/route.ts` — inicia OAuth.
- `src/app/api/google-business/callback/route.ts` — guarda tokens y IDs tras autorizar.

## Instrucciones paso a paso

### 1. Habilitar la Business Profile API

1. Google Cloud Console: https://console.cloud.google.com (proyecto del client ID).
2. **APIs y servicios → Biblioteca**.
3. Busca **"Business Profile API"**.
4. Si dice "Habilitar", púlsalo. (Nota: habilitarla NO equivale a obtener cuota; eso llega con el formulario del paso 4.)

### 2. Configurar la pantalla de consentimiento OAuth

1. **APIs y servicios → Pantalla de consentimiento de OAuth**.
2. **Estado de publicación**: en Prueba (para desarrollo). En modo Prueba Google **no exige verificación** de scopes restringidos.
3. **Usuarios de prueba**: añade AMBOS emails (obligatorio: en modo Prueba solo esas cuentas pueden dar permiso):
   - `nleyvagarcia@gmail.com` (la que tiene el Perfil de Empresa)
   - `nleyvagarcia2@gmail.com` (la del proyecto Cloud Console)
4. Si el scope `https://www.googleapis.com/auth/business.manage` aparece como **"Restricted"**, no importa mientras la app esté en Prueba.
5. Errores típicos:
   - `403 access_denied` al autorizar → la cuenta no está en **Usuarios de prueba**.
   - Pantalla "app no verificada" → pulsar **Avanzado → Ir a Revly (no seguro)**.

### 3. Registrar URIs de redireccionamiento

1. **APIs y servicios → Credenciales**.
2. Pulsa sobre tu **OAuth 2.0 Client ID** (Web application).
3. En **"URIs de redireccionamiento autorizadas"** añade:
   - `http://localhost:3000/api/google-business/callback` (callback de la app)
   - `https://developers.google.com/oauthplayground` (para el OAuth Playground)
4. **Guardar**.
5. Si no está registrada, Google da `redirect_uri_mismatch`.

### 4. Solicitar el acceso a la Business Profile API (CUOTA)

La parte más importante. Sin esto Google responde `429` con `quota_limit_value: 0`.

1. Abre el formulario oficial:
   https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform
2. Indica el OAuth Client ID:
   `751131765493-btjedv3khpmo8tbnmv6a1qam9781j4ic.apps.googleusercontent.com`
3. En el campo del email/perfil usa **`nleyvagarcia@gmail.com`** (la cuenta que tiene el Perfil de Empresa). Si usa el gmail del proyecto (`nleyvagarcia2@gmail.com`) da **"perfil de empresa no encontrado"**.
4. ⚠️ El formulario rechaza el email si el perfil está **pendiente de verificar**. El perfil de `nleyvagarcia@gmail.com` **ya está verificado** (2026-08-24) → se puede enviar ya.
5. ✅ **Enviado el 2026-08-24.** ID de caso: `1-6681000041467`. Google revisa en **7–10 días hábiles** y avisa por email. Cuando aprueben, la cuota sube a **300 QPM**.

### 5. Verificar si Google concedió acceso

Dos formas (no necesitan la cuenta del dueño; la aprobación es del proyecto):

**Opción A — Script `scripts/test-google-bp.ts`:**
```
npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/test-google-bp.ts
```
1. Abre la URL que imprime, autoriza con una cuenta que esté en Usuarios de prueba.
2. Copia la URL de callback completa y pégala en la terminal (el code es de un solo uso).

**Opción B — OAuth Playground (recomendada, sin redirects):**
1. Abre https://developers.google.com/oauthplayground
2. Engranaje ⚙️ → marca **"Use your own OAuth credentials"** → pega client ID y secret.
3. Paso 1: pega el scope `https://www.googleapis.com/auth/business.manage` → **Authorize APIs** → elige la cuenta de Google.
4. Paso 2: **Exchange authorization code for tokens**.
5. Copia el **access token** y llama a:
   ```
   https://mybusinessaccountmanagement.googleapis.com/v1/accounts
   ```
   con cabecera `Authorization: Bearer <token>`.

**Interpretación de la respuesta:**
- `200` con `"accounts": [...]` → acceso concedido.
- `200` con lista vacía → acceso concedido, pero esa cuenta no administra perfiles.
- `403 SERVICE_DISABLED` → API no habilitada en el proyecto.
- `429` con `quota_limit_value: 0` → **NO aprobado aún**; completar el paso 4.

### 6. Completar la conexión tras la aprobación

Cuando la cuota esté aprobada, conectar el perfil. La vía recomendada es el flujo normal de la app:

**Opción A — Botón "Conectar con Google" en la app:**
1. `npm run dev` → loguéate en Revly.
2. En Settings de un negocio de test → **Conectar con Google Business Profile**.
3. Autoriza con **`nleyvagarcia@gmail.com`** (la dueña del perfil).
4. El callback guarda tokens + `accountId` + `locationId` automáticamente.

**Opción B — Script `scripts/connect-google-bp.ts`** (si el refresh token ya está guardado en un negocio de la BD):
```
GOOGLE_BUSINESS_ID=04b1a698-8010-4a34-8a12-9e0c3438d319 \
  npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/connect-google-bp.ts
```
Renueva el access token → obtiene y guarda `googleBusinessAccountId` → obtiene y guarda `googleBusinessLocationId` → comprueba el total de reseñas disponibles. Nota: el refresh token debe pertenecer a `nleyvagarcia@gmail.com` para que las reseñas sean las de su perfil.

### 7. Comprobar que la app trae todas las reseñas

1. `npm run dev` → loguéate en Revly.
2. Abre el dashboard del negocio de test conectado.
3. El panel de reseñas debe mostrar **todas** las reseñas del perfil de `nleyvagarcia@gmail.com` (al menos sus 2, y las que añada), no solo 5.

**Fallback (siempre activo):** si el negocio no tiene tokens o la API falla, la app usa Places API → 5 reseñas (es un límite de Google, no un bug).

## Notas

- Modo Prueba: los refresh tokens caducan a los 7 días. En producción hay que publicar la app.
- En modo Prueba solo autorizan los usuarios listados en "Usuarios de prueba" de la consola.
- La aprobación de la API va ligada al proyecto/client_id, no a la cuenta de Google que autoriza.
- El formulario de acceso exige un Perfil de Empresa **verificado**. ✅ `nleyvagarcia@gmail.com` (Norman Leyva | Desenvolupador Web Fullstack) está verificado desde el 2026-08-24.
- No existe vía nativa de Google para traer TODAS las reseñas sin OAuth: Places API solo expone 5.
