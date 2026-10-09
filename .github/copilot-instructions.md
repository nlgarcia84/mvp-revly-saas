# Instrucciones de Copilot para Revly

## Contexto del proyecto

- Revly es un SaaS para negocios locales.
- Usa Next.js 16 con App Router, React 19 y TypeScript 6.
- Usa Prisma 7 con PostgreSQL sobre Supabase.
- La autenticación usa Supabase Auth.
- Integra Google Business Profile, Google Places, Stripe, Resend, Instagram y Facebook.
- Las pruebas se ejecutan con Jest y Testing Library.

## Reglas comunes

- Inspecciona el código existente, sus tipos y sus pruebas antes de modificarlo.
- Respeta la arquitectura y los patrones ya utilizados en `src/app`, `src/actions`, `src/components`, `src/lib` y `prisma`.
- Realiza cambios pequeños, enfocados y completos; no hagas refactors generales sin necesidad.
- No introduzcas dependencias nuevas si las existentes resuelven la tarea.
- No modifiques archivos ajenos al alcance ni sobrescribas cambios del usuario.
- Valida los cambios con la comprobación más pequeña que cubra el comportamiento afectado.
- Comunica los comandos ejecutados, sus resultados y los riesgos pendientes.

## Seguridad y datos

- Valida entradas no confiables en el servidor.
- Comprueba autenticación y autorización en cada acción o ruta privada.
- Respeta el aislamiento entre usuarios y negocios; no confíes en IDs enviados por el cliente.
- No expongas tokens OAuth, claves API, cookies, credenciales ni datos personales en código o logs.
- Usa transacciones e idempotencia para puntos, canjes, webhooks, emails y trabajos reintentables.
- No ejecutes resets, migraciones destructivas ni cambios irreversibles en producción sin autorización explícita.

## Contratos entre capas

- Coordina cambios de UI, server actions, route handlers, servicios y Prisma.
- Si cambia `schema.prisma`, revisa las consultas, tipos generados, migraciones y despliegue.
- Mantén separados los componentes de presentación y la lógica de negocio.
- Respeta los límites entre Server Components y Client Components.
- Mantén estados de carga, vacío, éxito y error cuando una interfaz dependa de operaciones asíncronas.
