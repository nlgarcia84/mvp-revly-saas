# Instrucciones para agentes de OpenCode

## Proyecto
Revly — SaaS para gestión de negocios locales (reseñas Google, fidelización, puntos, descuentos).

## Stack
- Next.js 16 App Router + TypeScript + Prisma + Supabase
- Google Places API + Google Business Profile API + OAuth 2.0
- Resend (email), Stripe (pagos), qrcode (QR server-side)
- Despliegue: Vercel, push automático a `main` → producción

## Despliegue en Vercel (leer antes de tocar despliegue)
- `vercel-build` = `prisma generate && next build`. **No** aplica migraciones.
- **Nada que dependa de una variable de entorno puede ejecutarse al importar un módulo**, o el build revienta en "Collecting page data". Ver `getStripe()` en `src/lib/stripe.ts` como patrón correcto (cliente perezoso).
- Las variables de entorno estaban **solo en el scope `Production`**. Para que los previews compilen hay que replicarlas en `Preview`.
- Copiar Production → Preview: `vercel env pull /tmp/f.env --environment=production`, luego `vercel env add <NAME> preview "" --value <valor>` — **la rama debe pasarse como cadena vacía** (si no, pregunta por TTY y sale con código 0 sin añadir nada) y **hay que ejecutar desde la raíz del repo** (si no, no encuentra `.vercel/`). Excluir `NX_*`, `TURBO_*`, `VERCEL_*`.
- `npx prisma migrate dev` **está roto** (shadow DB falla al replicar `20260616223001_drift_catchup`, que usa SQL inválido). Usar `prisma migrate diff` + `migrate deploy`.
- El proyecto tiene **Deployment Protection**: los previews redirigen a `vercel.com/sso-api` y solo los ve la sesión del owner.
- Comprobar deployments: `vercel ls`, `vercel inspect <url> --wait`, `vercel inspect <id> --logs`.

## Rama principal
- `main` es la rama de producción. Cada `git push origin main` despliega automáticamente.
- Los features van en rama propia (`store-locator`, etc.) y se mergean a `main` con un PR: https://github.com/nlgarcia84/mvp-revly-saas/pulls

## Flujo de trabajo
1. Hacer cambios en archivos
2. `npx tsc --noEmit` para verificar compilación
3. `git add . && git commit -m "..." && git push origin main`
4. Verificar en producción

## Estructura clave
- `src/app/(dashboard)/business/[id]/page.tsx` — Dashboard principal del negocio
- `src/app/page.tsx` — Landing page
- `src/app/globals.css` — Estilos globales
- `src/actions/google-reviews.ts` — Actions de reseñas (server actions)
- `src/lib/google-business-profile.ts` — Cliente GBP API (`getBusinessReviews`, `getBusinessProfileData`, `replyToBusinessReview`)
- `src/lib/google-places.ts` — Cliente Places API (`fetchPlaceDetails`, `resolveShortUrl`, `extractPlaceId`, `resolveWithTextSearch`)
- `src/components/google-reviews-section.tsx` — Componente de reseñas con ResponseModal
- `src/actions/points.ts` — Sistema de puntos
- `src/actions/business.ts` — CRUD de negocios
- `src/actions/send.ts` — Envío de invitaciones
- `src/actions/redeem.ts` — Canje de descuento
- `src/lib/notifications.ts` — Notificaciones email
- `src/components/ui/landing-card.tsx` — Tarjetas de landing
- `src/lib/store-hours.ts` — Horarios del local (tipos, validación, `isCurrentlyOpen`)
- `src/actions/store-locator.ts` — Actions de dirección, geocodificación y fotos
- `src/components/store-locator-section.tsx` — Panel "Mi local" del dashboard
- `src/components/public-store-info.tsx` — Bloque "Dónde encontrarnos" en `/{slug}`

## Store Locator (rama `store-locator`, 2026-10-01)
- `Business`: `address`, `latitude`, `longitude`, `openingHours` (Json), `photos` (Json). Migración `20261001000000_add_store_locator`.
- **Convención de días: `0 = lunes` … `6 = domingo`.** NO es `Date.getDay()` de JS (que empieza en domingo). Traducir siempre con `jsDayToWeekDay(jsDay)` = `(jsDay + 6) % 7`.
- Horarios: máx. 2 franjas/día, modos `hours` / `variable` / `always`. Un día abierto sin franjas válidas se trata como cerrado al parsear.
- Fotos: bucket `business-photos` (público), máx. 8, 5 MB, PNG/JPEG/WebP. Creado con `scripts/setup-storage.ts`.
- Tests: `src/lib/__tests__/store-hours.test.ts`.
- Doc completa: `docs/STORE_LOCATOR.md`.

## Reseñas de Google
- **GBP API** (`getBusinessReviews`): URL con `readMask=reviewer,starRating,comment,createTime,name&sortOrder=NEWEST`, paginación con `nextPageToken`. Devuelve `reviewName` para poder responder.
- **Places API** (`fetchPlaceDetails`): URL con `reviews_sort=most_recent`. Máximo 5 reseñas. `reviewName` no disponible → botón "Ir a Google a responder".
- **Fallback**: si GBP no conectado o la API falla, se usa Places API automáticamente.

## Sistema de puntos
- `claimTicketPoint`: 1 punto/día, valida `customer.points < 10` (cap máximo 10)
- `addPointToCustomer`: `select` explícito de campos, notificación con error throwing
- `setCustomerPoints`: valida rango 0-10

## Notificaciones
- `notifyCustomerDiscount` y `notifyCustomerRegistered` lanzan error si `sendEmail` falla (sin fallo silencioso).

## Tema
- Light: paleta `stone` (no `neutral`) — `bg-stone-50`, `text-stone-600`, `border-stone-200`
- Dark: sin cambios respecto a `neutral`
- Componentes: `LandingCard` usa `stone` palette

## Cambios recientes
- Store Locator completo: dirección, mapa por iframe, hasta 8 fotos y horarios por día (rama `store-locator`)
- Cliente de Stripe perezoso (`getStripe()`): el build ya no depende de `STRIPE_SECRET_KEY`
- 20 variables de entorno replicadas de `Production` a `Preview` en Vercel (los previews no compilaban antes)
- `reviewName` disponible en reseñas GBP y Places (para responder)
- `readMask=reviewer,starRating,comment,createTime,name` en GBP API reviews
- `sortOrder=NEWEST` en GBP API
- `reviews_sort=most_recent` en Places API
- Ordenamiento client-side por `time` descendente como safety net
- Light theme con `stone` palette
- Cap máximo de puntos: 0-10
- Notificaciones con error throwing
