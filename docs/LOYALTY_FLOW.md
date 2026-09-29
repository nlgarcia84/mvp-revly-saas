# Loyalty / Fidelización — Flujo actual

Documentación técnica del sistema de **Fidelización / Loyalty** de Revly (QR personal del cliente, escaneo por empleado, puntos y recompensas).

> Última actualización: 2026-09-30.
> Ámbito: registro de clientes, QR personal, escaneo por empleado, puntos, recompensa y canje.

---

## 1. Visión general

El programa de fidelización funciona así, en lenguaje sencillo:

- El **QR del negocio** sirve para **captar/registrar clientes** (no suma puntos).
- Cada cliente registrado tiene un **QR personal**, distinto del QR del negocio.
- El QR personal sirve **solo para identificar al cliente** (no contiene puntos ni datos).
- El **empleado autenticado** escanea ese QR en caja.
- Revly **valida** el cliente y que pertenezca al negocio del empleado.
- El empleado puede **añadir +1 punto**.
- El cliente **solo puede recibir 1 punto al día**.
- Al llegar a **5 puntos** obtiene una **recompensa** (actualmente **10 % de descuento**).
- El **canje resta 5 puntos** y genera un **nuevo código de descuento** (`REVLY-XXXX`).

### Diagrama de flujo

```
QR negocio
   │
   ▼
/{slug}  (página pública)
   │
   ▼
Registro ──► Customer creado (points=1, discountCode, qrToken)
               │
               ▼
        movimiento "welcome" +1

                ── (tiempo después) ──

Cliente muestra su QR personal
   │
   ▼
Empleado: "Escanear cliente" (cámara)
   │
   ▼
scanCustomerToken  ──► valida usuario + negocio + qrToken
   │
   ▼
Muestra cliente + puntos + "recompensa disponible" si aplica
   │
   ├── [Añadir punto]  ──► grantPoint  (+1, límite 1/día)
   │
   └── [Canjear recompensa]  ──► redeemCore  (-5, código nuevo)
```

---

## 2. Diferencia entre los QR

Revly tiene **dos QR distintos** con propósitos distintos. No se deben confundir.

### QR del negocio

- **Para qué sirve:** captar / registrar clientes nuevos.
- **Qué contiene:** la URL pública del negocio (`https://revly.es/{slug}`).
- **Qué página abre:** la página pública `/{slug}`, donde el cliente se registra.
- **NO se utiliza para sumar puntos.** Solo para captación/registro.

Componente: `src/components/business-qr.tsx` (`BusinessQR`).

### QR del cliente

- Es **único por cliente** (un token distinto por cada cliente registrado).
- Contiene **únicamente un token** (`qrToken`), un identificador opaco.
- **No contiene** puntos, nombre, email, teléfono ni ningún dato personal.
- Se utiliza para **identificar al cliente** en caja, para sumar puntos o canjear.

Componente: `src/components/customer-qr.tsx` (`CustomerQR`).

### Tabla comparativa

| | QR del negocio | QR del cliente |
|---|---|---|
| Función | Registrar/captar clientes | Identificar al cliente |
| Contenido | URL pública (`/{slug}`) | Solo `qrToken` (token opaco) |
| ¿Contiene datos personales? | No | No |
| ¿Contiene puntos? | No | No |
| ¿Quién lo escanea? | El cliente (con su móvil) | El empleado (en caja) |
| Página destino | `/{slug}` (registro) | Sin página pública propia (se resuelve en servidor) |
| Componente | `BusinessQR` | `CustomerQR` |

---

## 3. Registro del cliente

Qué ocurre cuando un cliente se registra:

```text
QR negocio
   ↓
Página pública /{slug}
   ↓
Formulario de registro
   ↓
Customer (nuevo)
   ↓
points = 1
discountCode = REVLY-XXXX
qrToken = <token aleatorio>
   ↓
movimiento "welcome" (+1)
```

Detalles técnicos:

- La página pública es `src/app/[slug]/page.tsx` (`PublicBusinessPage`).
- El alta la ejecuta el server action `addPublicCustomer` en `src/actions/business.ts`.
- Se crea el `Customer` con:
  - `points: 1` (punto de bienvenida).
  - `discountCode` generado (`generateDiscountCode()` → `REVLY-XXXX`).
  - `qrToken` generado (`generateQrToken()`).
- Se registra el movimiento **`welcome`** (`points: +1`, `day: null`) en `PointMovement`.
- Se envía el email de bienvenida (`notifyCustomerRegistered`) y se programa la petición de reseña (`scheduleReviewRequest`).

**Cliente ya existente:** si el email ya existe para ese negocio (restricción única `[email, businessId]`), `addPublicCustomer` **no** vuelve a sumar puntos; solo actualiza nombre/teléfono/opt-in.

El alta manual/CSV desde el dashboard (`addCustomer` y `addCustomerBatch` en `src/actions/customers.ts`) sigue el mismo patrón: crea el cliente con `points: 1` y registra el movimiento `welcome`.

---

## 4. QR del cliente (visualización)

La página del cliente `/{slug}/customer/{customerId}` muestra:

- puntos actuales
- progreso hacia el descuento (cada 5 puntos)
- código de descuento (`REVLY-XXXX`)
- **"Tu QR de cliente"** (`CustomerQR`)

Datos que expone la página vía `getPublicCustomer` (`src/actions/customers.ts`):

- `id`, `name`, `points`, `discountCode`, `businessName`, `ticketFormat`, `qrToken`.

**Backfill de `qrToken`:** si un cliente antiguo no tiene token (columna añadida después), `getPublicCustomer` lo genera y lo persiste la primera vez que el cliente abre su página.

El componente `CustomerQR`:

- Genera el QR a partir del `qrToken` usando la librería `qrcode`.
- Codifica **solo el token** (sin URL, sin datos).
- Incluye botón de **ampliar** (pantalla completa, para escanear desde otro móvil) y **descarga PNG**.

---

## 5. Escaneo por el empleado

El empleado (dueño del negocio, autenticado) abre el dashboard del negocio y usa **"Escanear cliente"**.

Componente: `src/components/scan-customer.tsx` (`ScanCustomer`).

- Usa la **cámara** del dispositivo (`getUserMedia` + `jsqr`) para leer el QR.
- Incluye un **fallback manual** (pegar el código del QR) por si no hay cámara.
- El token leído se normaliza con `extractQrToken()` (acepta el token en bruto o una URL `…/qr/<token>`).

Identificación en servidor: `scanCustomerToken` (`src/actions/customers.ts`):

1. Exige sesión (`auth.getUser()`).
2. Verifica que el `businessId` pertenezca al usuario autenticado.
3. Verifica que el programa de puntos esté activo (`loyaltyEnabled`).
4. Busca el cliente por `qrToken` **y** `businessId`.
5. Devuelve: `id`, `name`, `points`, `discountCode`, `canEarnToday`, `rewardAvailable`, y las reglas (`pointsPerRedemption`, `pointsCap`, `discountPercent`).

Un QR de otro negocio **no se encuentra** (la búsqueda está acotada por `businessId` del negocio del empleado).

---

## 6. Añadir punto

Acción `addPointByEmployee` (`src/actions/points.ts`) → núcleo `grantPoint`.

`grantPoint` valida en servidor, en orden:

1. Usuario autenticado y propietario del negocio (se comprueba antes de llamar a `grantPoint`).
2. Cliente existente y perteneciente al negocio.
3. Programa activo (`loyaltyEnabled`).
4. No superar el máximo de puntos (`POINTS_CAP` = 10).
5. Límite de 1 punto al día (clave única en BD, ver §7).

Si todo es válido, en una **transacción**:

```text
PointMovement "earn" (+1, day = YYYY-MM-DD)
   +
Customer.points += 1
```

Al llegar a un **hito** (múltiplo de 5 puntos) se envía la notificación `notifyCustomerDiscount`.

> El botón "+1 punto" del dashboard usa `addPointToCustomer`, que llama al mismo núcleo `grantPoint`. Es la única autoridad de alta de puntos.

---

## 7. Límite de 1 punto al día

El límite diario se impone a nivel de **base de datos**, no solo en código:

- `PointMovement` tiene la clave única `@@unique([customerId, businessId, type, day])`.
- Los movimientos de tipo `earn` llevan `day = todayKey()` (fecha `YYYY-MM-DD` en UTC, de `src/lib/loyalty.ts`).
- Si el cliente ya sumó un punto hoy, la creación del movimiento `earn` falla con **P2002** (violación de unicidad).
- El error se captura y se devuelve el mensaje: **"Ya has sumado tu punto de hoy. Vuelve mañana."**

Esto evita **condiciones de carrera**: aunque dos empleados intenten añadir puntos a la vez, la base de datos solo admite un movimiento `earn` por cliente, negocio y día.

Los movimientos `welcome`, `redeem` y `adjust` llevan `day: null`, por lo que no están sujetos a esta restricción (los `NULL` no entran en conflicto en el índice único).

---

## 8. Recompensa

Reglas (centralizadas en `src/lib/loyalty.ts`):

| Constante | Valor | Significado |
|---|---|---|
| `POINTS_PER_REDEMPTION` | 5 | Puntos necesarios para canjear |
| `POINTS_CAP` | 10 | Máximo de puntos acumulables sin canjear |
| `DISCOUNT_PERCENT` | 10 | Descuento aplicado al canjear |

- Al alcanzar 5 puntos, `rewardAvailable = true`.
- La recompensa actual es un **10 % de descuento**.
- La configuración por negocio (porcentaje distinto, cantidad fija, producto gratis, recompensa personalizada) **no está implementada**; las constantes están centralizadas para facilitarlo en el futuro.

---

## 9. Canje de la recompensa

Cuando el cliente tiene al menos 5 puntos, el empleado ve **"Recompensa disponible"** y puede pulsar **"Canjear recompensa"**.

Dos acciones llevan al canje:

- `redeemRewardByEmployee` (`src/actions/redeem.ts`) — desde el escaneo QR.
- `redeemDiscountCodeInDashboard` (`src/actions/redeem.ts`) — tecleando el código `REVLY-XXXX` en el dashboard.

Ambas llaman al núcleo `redeemCore`, que en una **transacción**:

```text
updateMany:  points >= 5  ──►  points -= 5  +  discountCode = NUEVO
   (si count != 1, no hay puntos suficientes)

PointMovement "redeem" (-5, day = null)
```

Resultado del canje:

- Se restan **5 puntos**.
- Se **regenera el código de descuento** (el anterior queda inválido).
- Se registra el movimiento `redeem` (`-5`) en el historial.
- Se devuelve el nuevo código y los puntos restantes.

**Canje único garantizado:** el `updateMany` con condición `points >= 5` es atómico. Si dos canjes ocurren a la vez, solo uno consigue rebajar los puntos; el segundo recibe "sin puntos suficientes".

> El empleado aplica el descuento **manualmente en caja**. No hay integración con TPV, datáfono ni Stripe.

---

## 10. Historial de puntos (`PointMovement`)

`PointMovement` es el **libro de movimientos**. Registra cada cambio de puntos y no se borra.

Tipos de movimiento actuales:

| `type` | `points` | `day` | Cuándo se crea |
|---|---|---|---|
| `welcome` | +1 | `null` | Al crear el cliente (punto inicial). |
| `earn` | +1 | `YYYY-MM-DD` | Al añadir un punto por QR/empleado. |
| `redeem` | -5 | `null` | Al canjear la recompensa. |
| `adjust` | delta (positivo o negativo) | `null` | Correcciones manuales (`setCustomerPoints`, `subtractPointFromCustomer`). |

Con esto se cumple el invariante:

```text
Customer.points == suma(PointMovement.points)
```

### Correcciones manuales

- `subtractPointFromCustomer`: resta 1 punto y registra `adjust` (`-1`) **solo si realmente resta** (puntos > 0).
- `setCustomerPoints`: fija un valor (0–`POINTS_CAP`) y registra `adjust` con el **delta** si `delta !== 0`.

---

## 11. Seguridad y validaciones

- **Autenticación:** toda acción del empleado exige sesión (`createClient()` + `auth.getUser()`).
- **Ownership:** se comprueba que el `businessId` pertenezca al `userId` actual (`business.findFirst({ where: { id, userId } })`). El `businessId` nunca se confía del cliente.
- **Aislamiento entre negocios:** el `qrToken` se busca siempre acotado por `businessId`, por lo que un QR de otro negocio no resuelve.
- **Puntos no manipulables desde frontend:** el frontend solo envía identificadores (`customerId`, `businessId`, `token`); todo el cálculo y la validación ocurren en servidor.
- **Límite diario:** clave única en BD (ver §7).
- **Canje único:** `updateMany` condicional atómico (ver §9).
- **Límite máximo:** `POINTS_CAP` (10) antes de sumar.
- **Programa activo:** `Business.loyaltyEnabled` (por defecto `true`). Si está en `false`, no se puede sumar ni canjear.

---

## 12. Modelo de datos

Resumen de los campos relevantes (ver `prisma/schema.prisma`):

### `Customer`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (uuid) | PK |
| `businessId` | String | FK → `Business` |
| `email` | String | Único junto con `businessId` (`@@unique([email, businessId])`) |
| `points` | Int | Puntos actuales (denormalizados). `@default(1)` |
| `discountCode` | String? | Código `REVLY-XXXX` |
| `qrToken` | String? | Token opaco del QR personal, `@unique` |
| `phone`, `whatsappOptIn`, `source`, `status`, etc. | — | Datos del cliente (no de puntos) |

### `Business`

| Campo | Tipo | Descripción |
|---|---|---|
| `loyaltyEnabled` | Boolean | Programa de puntos activo/inactivo. `@default(true)` |

### `PointMovement`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (uuid) | PK |
| `type` | String | `welcome` \| `earn` \| `redeem` \| `adjust` |
| `points` | Int | Firmado: `+1` al ganar, `-5` al canjear |
| `day` | String? | `YYYY-MM-DD` (solo en `earn`) |
| `businessId` | String | FK → `Business` |
| `customerId` | String | FK → `Customer` |
| `createdAt` | DateTime | `@default(now())` |

Índices:

- `@@index([customerId, createdAt])`
- `@@unique([customerId, businessId, type, day])` ← límite de 1 punto/día

### `PointClaim` (legado de tickets)

- La tabla y el modelo **siguen existiendo** y conservan sus datos históricos.
- **Ya no se escribe en ella.** El sistema de tickets fue retirado (ver §14).

---

## 13. Archivos relevantes

| Archivo | Responsabilidad |
|---|---|
| `prisma/schema.prisma` | Modelos `Customer` (`qrToken`, `points`, `discountCode`), `Business.loyaltyEnabled`, `PointMovement`, `PointClaim`. |
| `prisma/migrations/20260929000000_add_customer_qr_and_point_movements/migration.sql` | Migración que añade `loyaltyEnabled`, `qrToken` y la tabla `PointMovement`. |
| `src/lib/loyalty.ts` | Constantes y reglas: `POINTS_CAP`, `POINTS_PER_REDEMPTION`, `DISCOUNT_PERCENT`, `todayKey()`. |
| `src/lib/qr-token.ts` | `generateQrToken()` (token aleatorio opaco) y `extractQrToken()`. |
| `src/lib/discount-code.ts` | `generateDiscountCode()` → `REVLY-XXXX`. |
| `src/lib/notifications.ts` | `notifyCustomerRegistered` y `notifyCustomerDiscount` (email/WhatsApp en hitos). |
| `src/actions/business.ts` | `addPublicCustomer` (registro público + movimiento `welcome`). |
| `src/actions/customers.ts` | `addCustomer`, `addCustomerBatch`, `getPublicCustomer` (backfill de `qrToken`), `scanCustomerToken`. |
| `src/actions/points.ts` | `addPointByEmployee`, `addPointToCustomer`, `grantPoint`, `subtractPointFromCustomer`, `setCustomerPoints`. |
| `src/actions/redeem.ts` | `redeemRewardByEmployee`, `redeemDiscountCodeInDashboard`, `redeemCore`. |
| `src/components/business-qr.tsx` | QR del negocio (registro). |
| `src/components/customer-qr.tsx` | QR personal del cliente. |
| `src/components/scan-customer.tsx` | Escaneo por el empleado (cámara + fallback manual). |
| `src/app/[slug]/page.tsx` | Página pública de registro/captación. |
| `src/app/[slug]/customer/[customerId]/page.tsx` | Página del cliente (puntos, progreso, código y QR). |
| `src/app/(dashboard)/business/[id]/page.tsx` | Dashboard: "Escanear cliente", canje, +1/−1 punto, corregir puntos. |

---

## 14. Sistema de tickets (estado actual)

El antiguo sistema de "introducir número de ticket" para sumar puntos **ya no está activo**:

- La acción `claimTicketPoint` fue **eliminada** (era una Server Action pública sin autenticación).
- El formulario de ticket en la página del cliente fue **retirado de la UI**.
- El modelo `PointClaim` y sus datos históricos **se conservan**, pero ya no se escribe en él.
- El límite de 1 punto/día ahora es común a cualquier alta de puntos (una sola autoridad: `PointMovement`).

---

## 15. No implementado actualmente

- **Configuración de recompensa por negocio:** porcentaje distinto, cantidad fija, producto gratis o recompensa personalizada. Solo existen las constantes centralizadas (`src/lib/loyalty.ts`).
- **Toggle de "programa activo" en la UI:** el campo `Business.loyaltyEnabled` existe en la base de datos, pero no hay interfaz para activarlo/desactivarlo desde Settings.
- **Roles de empleado:** solo el dueño del negocio (usuario autenticado) puede sumar/canjear puntos. No hay roles multi-empleado con permisos separados.
- **Integración con TPV, datáfono o Stripe:** el descuento se aplica manualmente en caja.
- **QR de reseñas:** no existe un QR propio de Google Reviews; el sistema de reseñas usa enlaces por email (`/api/review-confirm/{customerId}`), sin cambios en este flujo.
- **Historial visible en UI:** los movimientos (`PointMovement`) se almacenan, pero no hay pantalla que los liste para el negocio/cliente.

---

## 16. Reglas rápidas para desarrolladores

- Sumar punto: pasar siempre por `grantPoint` (única autoridad). No hacer `points: { increment: 1 }` directo.
- Canjear: pasar siempre por `redeemCore` (única autoridad). No decrementar puntos a mano.
- Correcciones: usar `setCustomerPoints` / `subtractPointFromCustomer` (registran `adjust`).
- No confiar en el `businessId` enviado por el cliente; derivarlo de la sesión.
- No reintroducir un alta de puntos sin autenticación.
- Migraciones: `npx prisma migrate deploy` (nunca `prisma migrate reset` ni `prisma db push` contra producción).

---

## Nota operativa

- **Migración**: `npx prisma migrate deploy` (nunca `prisma migrate reset` ni `prisma db push` contra producción).
- **Build en Vercel**: `vercel-build = prisma generate && next build` (Vercel **no** ejecuta migraciones automáticamente; aplicar manualmente si se añaden nuevas migraciones).
