# Contexto — Google Business Profile (toda las reseñas)

> Documento de contexto para retomar el trabajo en otra sesión.
> Fecha: 2026-08-24. Proyecto: Revly (`mi-saas-mvp`).
> Actualizado: 2026-09-06 — Google **RECHAZÓ** la solicitud de acceso (caso `1-6681000041467`).
> Motivo: el perfil no lleva 60+ días verificado (ver sección "Rechazo del formulario").
>
> **Actualizado: 2026-09-11 — PROYECTO NUEVO + CUENTA CORPORATIVA.**
> - Se creó un **proyecto Google Cloud nuevo** (`979369701975`) con la cuenta
>   **`revlyadmin@gmail.com`** como Owner (más los 2 devs como Owner). El proyecto
>   antiguo (`751131765493`) queda **descartado**.
> - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_MAPS_API_KEY` en
>   `.env.local` y Vercel **Production** apuntan ya al proyecto nuevo.
> - Scope `business.manage` añadido en **Google Auth Platform → Acceso a datos**;
>   **Audiencia** en estado **Testing** con usuarios de prueba
>   (`revlyadmin@gmail.com`, `nleyvagarcia@gmail.com`, `nleyvagarcia2@gmail.com`).
> - ⚠️ **Seguimos SIN Perfil de Empresa**: el bloqueo de los 60 días sigue vigente
>   y el formulario de cuota debe reenviarse con el **nuevo** `client_id`.
> - **Prueba de acceso (2026-09-11, OAuth Playground):** OAuth + scope `business.manage`
>   **OK**, pero `GET mybusinessaccountmanagement.googleapis.com/v1/accounts` devuelve
>   **`429 RESOURCE_EXHAUSTED` con `quota_limit_value: 0`** para
>   `projects/979369701975` → el proyecto nuevo **aún no está aprobado** (esperado).
>   El `429` (y no `403 SERVICE_DISABLED`) confirma que la API **sí está habilitada**;
>   solo falta la cuota.
>
> **Actualizado: 2026-09-11 (2) — RESPUESTAS, IA, PLANES Y META.**
> - **Responder reseñas de Google desde el dashboard:** implementado.
>   `replyToBusinessReview()` (`src/lib/google-business-profile.ts`) + action
>   `replyToGoogleReview()` (`src/actions/google-reviews.ts`). El modal de IA muestra
>   **"Publicar en Google"** solo si la reseña viene de Business Profile API (tiene
>   `reviewName`); si viene de Places, muestra un aviso. **No funciona hasta que Google
>   apruebe la cuota.**
> - **IA de respuestas:** el modelo Groq `llama-3.3-70b-versatile` fue **retirado**; ahora
>   se usa `qwen/qwen3.8-27b` (`src/actions/generate-response.ts`). En Vercel Production
>   `GROQ_API_KEY` estaba **vacía** → corregida.
> - **Plan por defecto:** `basico` ahora tiene **sin límite práctico de negocios**
>   (`maxBusinesses: 999`) y la feature `ai-responses` (`src/lib/subscription.ts`).
>   Se normaliza `free` → `basico` para evitar lookups indefinidos.
> - **Meta / Instagram-Facebook:** el flujo de Instagram usa ahora credenciales propias
>   `META_INSTAGRAM_CLIENT_ID` / `META_INSTAGRAM_CLIENT_SECRET` (fallback a
>   `META_CLIENT_ID` / `META_CLIENT_SECRET`). ⚠️ La app de Meta (`1586509406537232`) no
>   valida (`code 101`) y el token de IG da `API access blocked` (`code 200`) →
>   **pendiente revisar/restaurar en Meta**. En Vercel, `META_CLIENT_ID`/`SECRET` tenían un
>   `\n` final (corregido).
> - **Places API:** no requiere OAuth ni usuarios de prueba (solo la API key de servidor).
>   El login de la app es **email+contraseña** o **Facebook** (no hay login con Google).

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
| Proyecto Google Cloud | ✅ **Nuevo** (`979369701975`), Owner `revlyadmin@gmail.com` + 2 devs. El antiguo (`751131765493`) queda descartado. |
| App en Google Cloud en modo **Prueba** | ✅ Requiere usuarios de prueba para autorizar |
| `redirect_uri` `http://localhost:3000/api/google-business/callback` | ✅ Registrada |
| `https://developers.google.com/oauthplayground` como redirect | ✅ Registrada (para OAuth Playground) |
| Scope `business.manage` | ✅ Añadido en Google Auth Platform → Acceso a datos |
| Business Profile API **habilitada** en la consola | ✅ Habilitada en el proyecto nuevo (el `429`, no `403`, lo confirma). Incluye My Business Account Management, My Business Business Information y Places API. |
| **Aprobación de cuota de la API** | ❌ El **2026-09-11** la prueba contra el proyecto nuevo (`979369701975`) dio `429 quota_limit_value: 0` → **no aprobado**. El rechazo previo (2026-09-06, caso `1-6681000041467`) fue del proyecto antiguo. Reenviar el formulario con el **nuevo** `client_id` cuando haya perfil elegible. |
| Perfil de empresa para pruebas | ❌ **NO hay Perfil de Empresa verificado.** El de `nleyvagarcia@gmail.com` está actualmente **sin verificar**. Sin un listing verificado 60+ días con dominio propio no se aprueba la cuota. |
| Sitio web en el perfil | ⚠️ Depende del perfil elegido: `normanleyva.dev` (developer) o `revly.es` (si se crea un GBP de Revly). La URL del formulario debe coincidir EXACTAMENTE con la del GBP. |
| Usuarios de prueba en la consola | ✅ `revlyadmin@gmail.com`, `nleyvagarcia@gmail.com` y `nleyvagarcia2@gmail.com` añadidos |
| Tokens de Google guardados en BD | ✅ En el negocio **Halal Fried Chicken** (test antiguo; puede quedar obsoleto) |
| `accountId` / `locationId` en BD | ❌ Pendientes (no se pueden pedir hasta que aprueben la cuota) |

## Bloqueo principal

Google NO ha concedido acceso a la Business Profile API. La llamada a
`mybusinessaccountmanagement.googleapis.com/v1/accounts` responde:

```
HTTP 429 — RESOURCE_EXHAUSTED
"Quota exceeded for quota metric 'Requests' ... quota_limit_value: 0"
consumer: projects/979369701975
```

Eso significa que el proyecto (`979369701975`) aún no está aprobado (cuota 0/min).
Comprobado el **2026-09-11** vía OAuth Playground (OAuth y scope correctos).

## Rechazo del formulario (2026-09-06)

Google respondió al formulario de acceso con un **rechazo** (caso `1-6681000041467`).
El email de rechazo indica que "los criterios de elegibilidad no se cumplen totalmente" y
exige que la solicitud cumpla, como mínimo:

1. **Listing verificado con 60+ días de antigüedad.** El email que presenta la solicitud
   debe ser **Owner o Manager** de un listing que lleve **verificado al menos 60 días**.
2. **Web funcional en dominio propio.** El listing debe mostrar una web operativa en su
   propio dominio único, y la **URL enviada en el formulario debe coincidir EXACTAMENTE**
   con la que aparece en el Google Business Profile.

**Diagnóstico del rechazo:**
- El perfil de `nleyvagarcia@gmail.com` se verificó el **2026-08-24** → al enviar el
  formulario llevaba **~13 días** verificado (no 60). Es el motivo principal del rechazo.
- **Error de URL:** se envió `revly.es` en el formulario, pero el GBP de ese perfil muestra
  `normanleyva.dev` (perfil personal de developer). La URL debe ser la que muestra el GBP.

> ⚠️ **CORRECCIÓN (2026-09-11):** el plan de abajo quedó **invalidado**. El Perfil de
> `nleyvagarcia@gmail.com` **no está verificado** actualmente, así que no hay perfil elegible
> y **no** debe reenviarse el formulario hasta tener uno verificado 60+ días. Ver
> "Plan de desbloqueo" más abajo. Se conserva como histórico.

**Decisión tomada (2026-09-06): esperar al perfil de developer.**
- ❌ **Descartado** el perfil de un cliente con 60+ días: no tiene web/dominio propio, y
  Google exige web funcional en dominio único enlazada al GBP. Crear un sitio solo para el
  trámite no es recomendable ni cumple el espíritu de la política.
- ✅ **Plan:** reenviar con el perfil de `nleyvagarcia@gmail.com` (Norman Leyva | Desenvolupador
  Web Fullstack) cuando cumpla **60+ días verificado** (~**2026-10-23**).
  Su GBP ya apunta a `normanleyva.dev` (dominio propio) → presentar **exactamente esa URL**.

**Plan para reenviar (NO se puede acelerar el plazo):**
1. Confirmar que el campo "Sitio web" del GBP de `nleyvagarcia@gmail.com` muestra
   **`normanleyva.dev`** y que la web es funcional (HTTPS, sin errores).
2. Esperar a que el perfil lleve **60+ días verificado** (~**2026-10-23**).
3. Reenviar el formulario con el email `nleyvagarcia@gmail.com`, client_id del proyecto y
   la URL **`normanleyva.dev`** (la misma del GBP — nunca `revly.es`).

### Solución (acción manual del dueño del proyecto)

1. Completar el formulario oficial de acceso a la Business Profile API:
   https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform
2. Usar el OAuth Client ID:
   `979369701975-esv995mgk7ii97tk1beaib0f9jtuv57c.apps.googleusercontent.com`
3. En el formulario, el email del perfil debe ser **`nleyvagarcia@gmail.com`** (el que tiene el Perfil de Empresa). La cuenta del proyecto (`nleyvagarcia2@gmail.com`) NO tiene perfil y da "perfil de empresa no encontrado".
4. ⚠️ Reenviar solo cuando el perfil lleve **60+ días verificado** (~**2026-10-23**) y con la
   URL del formulario **idéntica** a la del GBP (`normanleyva.dev`). Reenviar antes = rechazo repetido.
5. Esperar el email de aprobación de Google (cuota sube a **300 QPM**).

> El formulario valida que el email tenga un Perfil de Empresa **verificado desde hace 60+ días**
> y que la URL enviada coincida con la del GBP.
> ⚠️ `nleyvagarcia@gmail.com` **no está verificado** actualmente → **no reenviar** hasta tener
> un perfil verificado 60+ días (ver "Plan de desbloqueo").

## Cuentas de Google

| Cuenta | Rol |
|---|---|
| `revlyadmin@gmail.com` | **Owner del proyecto Google Cloud nuevo** (`979369701975`), creado 2026-09-11. Cuenta corporativa para centralizar. NO tiene Perfil de Empresa. |
| `nleyvagarcia@gmail.com` | Owner del proyecto. Tiene un Perfil de Empresa (perfil personal fullstack, 2 reseñas), pero **actualmente NO verificado** → no cumple el requisito de 60+ días. |
| `nleyvagarcia2@gmail.com` | Owner del proyecto. NO tiene Perfil de Empresa. |
| `Halal Fried Chicken` (BD) | Negocio de test antiguo; tiene tokens guardados pero NO será el objetivo de las pruebas. |

## Credenciales relevantes

**NO commitear credenciales.** Viven en `.env.local` (y en Vercel para producción):

- `GOOGLE_CLIENT_ID=979369701975-esv995mgk7ii97tk1beaib0f9jtuv57c.apps.googleusercontent.com` (público, aparece en la URL de OAuth)
- `GOOGLE_CLIENT_SECRET=GOCSPX-...` (secreto — solo en `.env.local` / Vercel)
- `GOOGLE_MAPS_API_KEY=AIza...` (Places API, no requiere OAuth — solo en `.env.local` / Vercel)

## Plan de pruebas (perfil de empresa)

**Objetivo de las pruebas:** desbloquear la cuota del proyecto (`979369701975`) y validar
que la app trae TODAS las reseñas con un Perfil de Empresa.

Estado actual: el Perfil de `nleyvagarcia@gmail.com` **no está verificado**, así que hoy
no hay ningún perfil elegible. No se puede reenviar el formulario con garantías.

### Plan de desbloqueo (dos vías)

- **Vía 1 — Perfil propio de Revly:** crear un GBP real de Revly con web `revly.es`,
  **verificarlo** y esperar **60 días** desde la verificación. Luego enviar el formulario
  con `revlyadmin@gmail.com`, el nuevo `client_id` y la URL exacta `revly.es`.
- **Vía 2 — Perfil de tercero ya elegible:** usar un Perfil de Empresa **verificado 60+ días**
  con dominio propio (tuyo o de un cliente). La aprobación va ligada al `client_id`, así que
  ese perfil solo sirve para desbloquear la cuota; después cada negocio conecta su cuenta.

Pasos comunes:
1. Tener un Perfil verificado **60+ días** con web en dominio propio (URL exacta del GBP).
2. Enviar el **formulario de acceso** con el nuevo `client_id` → aprobación de cuota (300 QPM).
3. Conectar OAuth autorizando con la cuenta **dueña del perfil**.
4. La app traerá las reseñas de ese perfil (todas, no solo 5).

**Nota:** mientras no haya aprobación, la app usa Places API (5 reseñas). Para los negocios
reales, cada dueño conectará su propia cuenta una vez el proyecto esté aprobado.

## Negocios en la BD

- Actuales (2026-09-11): BCOFFEE (x2), Daniela, Happy Place, La Paradeta, Phone Gallery,
  Pizzeria Soria. **Ninguno** tiene Google Business Profile ni Instagram/Facebook conectados.
- **Halal Fried Chicken** fue **eliminado** el 2026-09-11 (era el test antiguo de tokens de
  Google e Instagram).

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

- `src/lib/google-business-profile.ts` — llamadas a la API (accounts, locations, reviews v4,
  refresh) y `replyToBusinessReview()` (publicar respuesta).
- `src/lib/google-places.ts` — Places API (fallback 5 reseñas).
- `src/actions/google-reviews.ts` — lógica principal: GBP primero, Places como fallback, y
  `replyToGoogleReview()`.
- `src/components/google-reviews-section.tsx` — panel de reseñas + modal de IA con
  "Publicar en Google" / "Ir a Google a responder".
- `src/actions/generate-response.ts` — IA de respuestas (Groq, modelo `qwen/qwen3.8-27b`).
- `src/app/api/google-business/connect/route.ts` — inicia OAuth.
- `src/app/api/google-business/callback/route.ts` — guarda tokens y IDs tras autorizar.
- `src/lib/instagram-graph.ts` — Instagram API (credenciales `META_INSTAGRAM_*`).
- `src/app/api/instagram/connect|callback/route.ts` — conexión de Instagram.

## Instrucciones paso a paso

### 1. Habilitar la Business Profile API

1. Google Cloud Console: https://console.cloud.google.com (proyecto del client ID).
2. **APIs y servicios → Biblioteca**.
3. Busca **"Business Profile API"**.
4. Si dice "Habilitar", púlsalo. (Nota: habilitarla NO equivale a obtener cuota; eso llega con el formulario del paso 4.)

### 2. Configurar la pantalla de consentimiento OAuth

1. **APIs y servicios → Pantalla de consentimiento de OAuth**.
2. **Estado de publicación**: en Prueba (para desarrollo). En modo Prueba Google **no exige verificación** de scopes restringidos.
3. **Usuarios de prueba** (obligatorio: en modo Prueba solo esas cuentas pueden dar permiso):
   - `revlyadmin@gmail.com` (Owner del proyecto Cloud nuevo)
   - `nleyvagarcia@gmail.com` (tenía el Perfil de Empresa; hoy sin verificar)
   - `nleyvagarcia2@gmail.com`
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
   `979369701975-esv995mgk7ii97tk1beaib0f9jtuv57c.apps.googleusercontent.com`
3. En el campo del email/perfil usa **`nleyvagarcia@gmail.com`** (la cuenta que tiene el Perfil de Empresa). Si usa el gmail del proyecto (`nleyvagarcia2@gmail.com`) da **"perfil de empresa no encontrado"**.
4. ⚠️ Requisitos de elegibilidad que Google exige (ver "Rechazo del formulario"):
   - El listing debe estar **verificado con 60+ días** de antigüedad.
   - El GBP debe mostrar una **web en dominio propio** y la URL enviada debe ser **exactamente esa**.
   - El email de la solicitud debe ser **Owner o Manager** del listing.
5. ❌ **Enviado el 2026-08-24 → RECHAZADO el 2026-09-06** (caso `1-6681000041467`, proyecto antiguo).
   El perfil llevaba ~13 días verificado (no 60). **No reenviar** hasta tener un perfil verificado
   60+ días (ver "Plan de desbloqueo"); usar el **nuevo** `client_id`.

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

## Despliegue en producción

- El código de la integración está **commiteado y desplegado en producción** (2026-08-24):
  - Commit: `2b29b14` → `origin/main` → Vercel (deploy Ready).
  - URL de producción: https://revly.es (responde `200`).
- La funcionalidad de **todas las reseñas** quedará operativa en producción en cuanto
  **Google apruebe el acceso a la API**. Estado: el primer envío fue **rechazado** (caso
  `1-6681000041467`, proyecto antiguo); reenviar el formulario con el **nuevo** `client_id`
  una vez exista un perfil verificado 60+ días con web propia (ver "Plan de desbloqueo").
- Al aprobarse, NO hace falta re-desplegar: solo conectar el perfil (paso 6). El código ya está en producción.
- **2026-09-11:** varios despliegues a producción con `vercel --prod` (alias `https://revly.es`)
  tras actualizar variables en Vercel: nuevo `GOOGLE_CLIENT_ID`/`SECRET`/`MAPS_API_KEY`,
  `GROQ_API_KEY` (estaba vacía), `META_CLIENT_ID`/`SECRET` (tenían `\n`), y los cambios de
  código (modelo IA, plan por defecto, responder reseñas, credenciales de Instagram).

## Notas

- Modo Prueba: los refresh tokens caducan a los 7 días. En producción hay que publicar la app.
- En modo Prueba solo autorizan los usuarios listados en "Usuarios de prueba" de la consola.
- La aprobación de la API va ligada al proyecto/client_id, no a la cuenta de Google que autoriza.
- El formulario de acceso exige un Perfil de Empresa **verificado con 60+ días** y con **web en dominio propio** (URL exacta). ⚠️ `nleyvagarcia@gmail.com` **no está verificado** actualmente → no hay perfil elegible (ver "Plan de desbloqueo").
- No existe vía nativa de Google para traer TODAS las reseñas sin OAuth: Places API solo expone 5.
- **Places API no usa OAuth**: funciona con la API key de servidor. Dar de alta un negocio
  **no** requiere añadir el email del cliente como usuario de prueba. Los testers de Google solo
  aplican al OAuth de **Google Business Profile**.
- El login de la app es **email+contraseña** (Supabase) o **Facebook**; no hay login con Google.
- Responder reseñas de Google desde el dashboard (`replyToGoogleReview`) **requiere** la cuota
  de la Business Profile API aprobada; hoy devuelve el error de cuota.
- La app de **Meta** está pendiente de arreglar (ver arriba): hasta entonces Instagram/Facebook
  no conectan. El flujo de Instagram usa `META_INSTAGRAM_CLIENT_ID`/`SECRET`.
