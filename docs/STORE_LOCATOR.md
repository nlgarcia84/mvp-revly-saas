# Store Locator — Arquitectura

> Última actualización: 2026-10-07.
> Ámbito: gestión de la información del local (dirección, mapa, fotos y horarios) desde el dashboard y su publicación en la página pública `/{slug}`.

---

## 1. Qué es

El Store Locator permite que un negocio gestione la información de su local desde la sección **"Mi local"** del dashboard y que los clientes la vean en su página pública.

**Principios de diseño:**

- **Google es la fuente de verdad de las reseñas**, pero **no** de los datos del local. La dirección, fotos y horarios los define el dueño en Revly.
- **Un negocio = un local.** No hay tabla separada de locales; los campos viven en `Business`.
- **JSON en vez de tabla relacional** para horarios y fotos: un negocio tiene un solo local, así que 7 filas por negocio serían ruido. El JSON se normaliza y valida en `src/lib/store-hours.ts` antes de usarse.
- **Lectura de Google, escritura en local.** Hoy no hay write-back a Google (ver §11).

---

## 2. Datos que gestiona

| Dato | Tipo | Dónde | Quién lo escribe |
|---|---|---|---|
| Dirección | texto | `Business.address` | Dueño (dashboard) |
| Coordenadas | `lat`/`lng` | `Business.latitude` / `longitude` | Geocodificación o geolocalización |
| Horarios | JSON estructurado | `Business.openingHours` | Dueño (dashboard) |
| Fotos | JSON de `{ url, path }` | `Business.photos` | Dueño (subida a Storage) |

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

- `mode`: `"hours"` (horario guardado) | `"variable"` (informativo, sin cálculo) | `"always"` (siempre abierto).
- `day`: **0 = lunes … 6 = domingo**. No es `Date.getDay()` de JS (que empieza en domingo). Traducir con `jsDayToWeekDay(jsDay) = (jsDay + 6) % 7`.
- `slots`: hasta 2 franjas por día. Una franja con `close <= open` se interpreta como cierre al día siguiente (bar de copas).

### Estructura de `photos`

```json
[
  { "url": "https://.../business-photos/<id>/123.jpg", "path": "<businessId>/123.jpg" }
]
```

Máximo 8 fotos. `path` es la clave de borrado en Storage.

---

## 3. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard /business/[id]                                    │
│                                                             │
│  StoreLocatorSection (cliente)                              │
│    ├── address, lat/lng, hours, photos  ← useState local    │
│    ├── handleSearchAddress()  ──► geocodeAddress()          │
│    ├── handleUseMyLocation()  ──► navigator.geolocation     │
│    ├── handleUpload/Delete()  ──► upload/deleteBusinessPhoto│
│    └── handleSave()           ──► updateStoreInfo()         │
│                                                             │
│  PublicStoreInfo (cliente, /{slug})                         │
│    └── lee Business.address/latitude/longitude/openingHours │
│        y photos vía getBusinessBySlug()                    │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Server actions (src/actions/store-locator.ts)               │
│   • requireOwnedBusiness() — auth + ownership               │
│   • updateStoreInfo()     — valida y escribe en Business    │
│   • geocodeAddress()      — Geocoding API de Google         │
│   • uploadBusinessPhoto() — sube a Storage + actualiza JSON │
│   • deleteBusinessPhoto() — borra de Storage + actualiza    │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Persistencia                                                │
│   • Supabase PostgreSQL (Prisma) — Business                 │
│   • Supabase Storage — bucket "business-photos" (público)   │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de guardado

1. El usuario rellena el formulario (estado local del componente).
2. Pulsa **Guardar** → `updateStoreInfo(businessId, { address, latitude, longitude, openingHours })`.
3. La action valida ownership, rangos de coordenadas y horarios.
4. Escribe en `Business` con `prisma.business.update`.
5. Devuelve `{ success, error, datos actualizados }`.
6. El componente muestra mensaje de éxito o error.

### Flujo de geocodificación

1. El usuario escribe una dirección (o pega un enlace de Maps) y pulsa **"Buscar en Google"**.
2. `geocodeAddress()`:
   - Si el texto contiene `@lat,lng` → `extractLatLng()` lo extrae sin llamar a la API.
   - Si no → Geocoding API de Google con `GOOGLE_MAPS_API_KEY`.
3. Devuelve `{ success, latitude, longitude, address }`.
4. El componente actualiza `address`, `latitude`, `longitude` en su estado local.
5. El usuario pulsa **Guardar** para persistir.

### Flujo de fotos

1. El usuario selecciona un archivo → `uploadBusinessPhoto(businessId, formData)`.
2. La action valida tipo (PNG/JPEG/WebP) y tamaño (máx. 5 MB).
3. Sube al bucket `business-photos` con path `<businessId>/<timestamp>.<ext>`.
4. Añade `{ url, path }` al array `Business.photos` (máx. 8).
5. Para borrar: `deleteBusinessPhoto(businessId, path)` quita del array y de Storage.

---

## 4. Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/store-hours.ts` | Tipos, validación, parseo defensivo y cálculo de horarios |
| `src/actions/store-locator.ts` | Server actions: guardar, geocodificar, subir/borrar fotos |
| `src/components/store-locator-section.tsx` | Panel "Mi local" del dashboard |
| `src/components/public-store-info.tsx` | Bloque público "Dónde encontrarnos" en `/{slug}` |
| `src/lib/__tests__/store-hours.test.ts` | Tests de la lógica de horarios |
| `scripts/setup-storage.ts` | Crea el bucket `business-photos` |

### Responsabilidades de `store-hours.ts`

| Función | Para qué |
|---|---|
| `parseOpeningHours(value)` | Normaliza JSON de BD o formulario a `OpeningHours` (null si no es usable) |
| `parseOpeningHoursOrDefault(value)` | Idem, con horario por defecto si no hay datos |
| `validateOpeningHours(value)` | Valida el horario del formulario → array de errores |
| `isCurrentlyOpen(hours, date?)` | ¿Está abierto ahora? (solo con `mode: "hours"`) |
| `hasStoreInfo(data)` | ¿Tiene algo publicable? (dirección, fotos u horarios) |
| `jsDayToWeekDay(jsDay)` | Convierte `getDay()` de JS (0=domingo) a la convención de la app (0=lunes) |
| `formatSlot` / `formatDay` | Formateo para la página pública |

---

## 5. Seguridad

- **Autenticación**: todas las actions exigen sesión (`createClient()` + `auth.getUser()`).
- **Ownership**: `requireOwnedBusiness()` valida que el `businessId` pertenece al `userId` actual (`business.findFirst({ where: { id, userId } })`).
- **Validación de coordenadas**: rangos latitud (-90..90) y longitud (-180..180). Ambas deben ir juntas.
- **Validación de horarios**: `validateOpeningHours()` comprueba 7 días, formato `HH:MM`, máx. 2 franjas y solapamientos.
- **Validación de fotos**: tipo MIME y tamaño en servidor (no confiar en el cliente).
- **Borrado de fotos**: el `path` debe empezar por `<businessId>/` (evita borrar fotos de otros negocios).

---

## 6. Storage

Bucket **`business-photos`** (público), creado con:

```bash
npx tsx --env-file=.env.local scripts/setup-storage.ts business-photos
```

Configuración: `public: true`, límite 5 MB, solo `image/png`, `image/jpeg`, `image-webp`.

---

## 7. Página pública `/{slug}`

`PublicStoreInfo` muestra el bloque **"Dónde encontrarnos"** solo si `hasStoreInfo()` es true. Incluye:

- Galería de fotos (hasta 8).
- Dirección y mapa (iframe de Google Maps, sin SDK).
- Horarios con el día actual resaltado.
- Badge de "Abierto ahora" / "Cerrado" (solo con `mode: "hours"`).

---

## 8. Tests

```bash
npx jest src/lib/__tests__/store-hours.test.ts
```

Cubre: parseo defensivo, validación, `isCurrentlyOpen` (franjas normales y overnight), `jsDayToWeekDay` y `hasStoreInfo`.

---

## 9. Despliegue

- La migración `20261001000000_add_store_locator` **ya está aplicada** en producción.
- `vercel-build` solo ejecuta `prisma generate && next build`. **No** despliega migraciones.
- Si se añaden campos nuevos en el futuro: `prisma migrate diff` + `migrate deploy` (nunca `migrate dev`, que está roto en este repo).

---

## 10. Decisiones de diseño

| Decisión | Por qué |
|---|---|
| JSON en vez de tabla `BusinessHours` | Un negocio tiene un solo local; 7 filas por negocio serían ruido |
| Coordenadas obligatoriamente juntas | El mapa necesita ambas; una sola no tiene sentido |
| `mode` separado de `days` | Permite "siempre abierto" y "horario variable" sin calcular |
| Fotos en JSON, no en tabla | El array es pequeño (máx. 8) y se lee/escribe de una vez |
| Validación en servidor | El cliente puede manipular el JSON; la BD siempre recibe datos válidos |

---

## 11. Limitaciones conocidas y futuras mejoras

**Limitaciones actuales:**

- **No hay write-back a Google.** Guardar en el dashboard solo escribe en la BD local. Los cambios no se reflejan en Google Business Profile.
- **No hay importación desde Google.** Los datos se introducen manualmente. No se pueden traer automáticamente desde el perfil de Google.
- **El mapa es un iframe estático.** No usa el SDK de Maps (evita facturación extra), pero no es interactivo más allá del embed.

**Mejoras futuras (NO implementadas):**

- Botón **"Importar desde Google"**: traer dirección, coordenadas y horarios desde Places/GBP API y pre-rellenar el formulario (sin guardar automáticamente).
- **Write-back a GBP**: `PATCH /v4/accounts/{accountId}/locations/{locationId}` con `writeMask=openingHours`. Requiere OAuth de Business Profile y ubicación verificada.
- Sincronización bidireccional con Google.
- Mapa interactivo con el SDK de Maps JavaScript.

---

## 12. Notas de implementación

- **Server actions y `"use server"`**: en estos archivos solo se pueden exportar funciones async. Por eso `BUSINESS_PHOTOS_BUCKET` es una constante **local** sin `export`.
- **`tsconfig.json` tiene `strict: false`**, así que los tipos de retorno de las actions usan `{ success: boolean; ...campos opcionales }` en lugar de un `throw`.
- **Migraciones**: `npx prisma migrate dev` **no funciona** en este repo (la shadow DB falla con la migración histórica `20260616223001_drift_catchup`). Usar `prisma migrate diff` + `migrate deploy`.
- **Convención de días**: `0 = lunes` en la app, `0 = domingo` en JS y en Google. Traducir siempre con `jsDayToWeekDay`.
