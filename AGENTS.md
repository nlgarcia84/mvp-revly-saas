# Instrucciones para agentes de OpenCode

## Proyecto
Revly — SaaS para gestión de negocios locales (reseñas Google, fidelización, puntos, descuentos).

## Stack
- Next.js 16 App Router + TypeScript + Prisma + Supabase
- Google Places API + Google Business Profile API + OAuth 2.0
- Resend (email), Stripe (pagos), qrcode (QR server-side)
- Despliegue: Vercel, push automático a `main` → producción

## Rama principal
- `main` es la rama de producción. Cada `git push origin main` despliega automáticamente.

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
- `reviewName` disponible en reseñas GBP y Places (para responder)
- `readMask=reviewer,starRating,comment,createTime,name` en GBP API reviews
- `sortOrder=NEWEST` en GBP API
- `reviews_sort=most_recent` en Places API
- Ordenamiento client-side por `time` descendente como safety net
- Light theme con `stone` palette
- Cap máximo de puntos: 0-10
- Notificaciones con error throwing
