# F0-01 — Auditoría completa de accesos a clientes

Validación: 2026-11-15. Base auditada: `7d98a263a261fa63be094f8f2d7af36cb61e7243`, rama `fix/f0-01-customer-status-ownership`, PR [#4](https://github.com/nlgarcia84/mvp-revly-saas/pull/4), issue [#3](https://github.com/nlgarcia84/mvp-revly-saas/issues/3).

Fuente de aceptación: [Notion F0-01](https://app.notion.com/p/415877c55c2181f7a916c078e0337f03). El issue describe solo `updateCustomerStatus`; Notion y la petición de continuación exigen auditar todos los accesos. **F0-01 no satisface todavía su aceptación global. Mantener Draft.**

## Hallazgos y correcciones

1. `updateCustomerStatus` permitía modificar por ID sin pertenencia. El PR ya lo corrige mediante `updateMany` con `id` y `business.userId`; conserva los tres estados válidos y una respuesta mínima. Revisados los 27 tests existentes: cubren bien esa acción, pero no acreditan lecturas, borrados, puntos, canjes, informes ni entradas públicas.
2. **Fuga adicional corregida:** `getCustomerSummary(businessId)` filtraba `customer.groupBy` por propietario, pero `pointMovement.count` devolvía los canjes mensuales del negocio ajeno. Ahora ambos agregados filtran `business.userId`. Las fixtures tienen dos canjes para A y nueve para B; un propietario ajeno recibe cero en ambos sentidos.
3. **Refuerzo de borrados:** `deleteCustomer` y `deleteSelectedCustomers` pasan de lectura autorizada seguida de borrado por ID a un único `deleteMany` autorizado. `clearCustomers` y `clearCompletedCustomers` conservan la comprobación previa del negocio y añaden pertenencia a la escritura. Evita separar autorización y eliminación; el contador de selección refleja los registros realmente eliminados. No se ha demostrado un ataque de cambio de propietario concurrente; es endurecimiento, no una vulnerabilidad independiente confirmada.

## Inventario de superficies revisadas

Búsqueda reproducible: `rg -n 'customer\.|customers:|pointMovement\.|pointClaim\.|\$queryRaw|\$executeRaw' src`, seguida de lectura de módulos, consumidores y `src/proxy.ts`. Se revisaron consultas Prisma directas, relaciones, acciones exportadas y handlers; `customer` de Stripe corresponde a facturación, no al modelo `Customer`.

| Archivo / entradas | Autorización observada / resultado |
| --- | --- |
| `src/actions/customers.ts`: `addCustomer`, `addCustomerBatch` | `getUser` y negocio con `id + userId` antes de crear/importar; actualización existente limitada al email dentro del negocio autorizado. |
| `getCustomers` | Listado y total filtran conjuntamente negocio y propietario; sin sesión devuelve página vacía. |
| `getCustomerSummary` | Clientes y canjes ahora filtran propietario. Sin sesión devuelve ceros y no consulta. |
| `updateCustomerStatus` | Sesión, estados permitidos y escritura con pertenencia; 27 tests originales. |
| `deleteCustomer`, `deleteSelectedCustomers`, `clearCustomers`, `clearCompletedCustomers` | Escrituras con pertenencia; selección mixta no elimina clientes ajenos; sin sesión se rechaza. |
| `scanCustomerToken` | Primero negocio del usuario, después QR dentro de ese negocio; historial limitado a cliente/negocio autorizados. |
| `findPublicCustomerByEmail`, `getPublicCustomer` | **Bloqueo abierto:** sin identidad del solicitante. El slug limita el negocio consultado, pero es público y no demuestra autorización. |
| `src/actions/points.ts`: `addPointToCustomer`, `subtractPointFromCustomer`, `setCustomerPoints` | Lectura inicial con cliente y propietario. Solo después se ejecuta la transacción. |
| `addPointByEmployee`, núcleo privado `grantPoint` | Negocio del usuario y cliente dentro de ese negocio. No es posible exportar/invocar `grantPoint` como Server Action. |
| `src/actions/redeem.ts`: `redeemDiscountCodeInDashboard`, `redeemRewardByEmployee`, núcleo privado `redeemCore` | Primero negocio del usuario; código/cliente deben coincidir con el negocio. Se prueba también cliente B con negocio A autorizado. |
| `src/actions/send.ts`: `sendInvitation`, `sendBatchInvitations`, `getWhatsAppLink` | Lectura de cliente con propietario antes de email, actualización o generación de enlace; el lote reautoriza cada destinatario. |
| `src/actions/business.ts`: `getBusinesses`, `getBusinessForDashboard`, `getDashboardBusinessData`, `deleteBusiness` | Recuentos y eliminación en cascada tras filtrar el negocio por propietario. `deleteBusiness` comprueba pertenencia antes de borrar. |
| `addPublicCustomer` | **Bloqueo abierto:** alta pública deliberada, pero un email ya registrado permite sobrescribir nombre/teléfono/consentimiento WhatsApp sin identidad; devuelve el registro completo. |
| `src/app/(dashboard)/dashboard/page.tsx` | Sesión y filtro `userId` en negocios antes de contar clientes. |
| `src/app/(dashboard)/business/[id]` y componentes de clientes | Consumen las acciones anteriores; el layout protegido no sustituye la autorización de cada Server Action. |
| `src/app/api/report/[businessId]/route.ts` GET | 401 sin sesión, 404 para negocio ajeno antes de consultar clientes; estadísticas y detalle limitados al negocio autorizado. |
| `src/app/api/review-confirm/[customerId]/route.ts` GET/POST | **Bloqueo abierto:** lee y escribe por ID sin sesión ni prueba de posesión. Incluso GET cambia el estado y, con `auto=1`, la valoración. |
| `src/app/[slug]/page.tsx`, `[slug]/customer/[customerId]/page.tsx` | Exponen los flujos públicos indicados; el proxy solo exige sesión para `/dashboard`, `/business`, `/profile`. |
| `src/lib/review-email.ts`, `src/lib/notifications.ts`, enlaces de WhatsApp | Generan enlaces públicos de confirmación basados únicamente en ID. Deberán cambiar conjuntamente con la autorización pública. |
| `src/actions/reviews.ts` | Stub que rechaza siempre por falta de usuario; no accede a clientes. El cambio local previo de otro checkout se conserva intacto. |
| `src/lib/db.ts`, `prisma/schema.prisma`, migración de RLS | Prisma usa conexión PostgreSQL del servidor; la pertenencia es `Customer.businessId → Business.userId → identidad getUser`. La migración habilita RLS sin políticas de cliente para impedir acceso directo con roles de navegador; no sustituye filtros de autorización en Prisma. No se inspeccionó ni cambió el estado real de RLS remoto. |

Las escrituras de puntos, envío e importación conservan el patrón preexistente de comprobar pertenencia antes de una escritura por ID. No se ha encontrado un camino de entrada sin esa comprobación en esos flujos privados. Si en el futuro se admite transferir negocios/clientes concurrentemente, conviene revisar todas esas escrituras y efectos externos con esa nueva semántica.

## Bloqueos públicos reproducidos (pendientes de corregir)

Los seis casos del bloque `OPEN SECURITY FINDINGS` son **reproducciones de vulnerabilidades**, no tests de aceptación que demuestren seguridad:

- Slug + email permiten obtener ID, nombre, puntos y descuento de un cliente de B sin sesión.
- Slug + ID permiten obtener QR y descuento; si falta QR, la lectura también lo genera y guarda.
- El rechazo de un slug incorrecto funciona, pero conocer el slug correcto no acredita identidad.
- Registro con email conocido sobrescribe datos de un cliente existente de B sin sesión.
- GET de confirmación sobre ID de B modifica estado y valoración sin sesión.
- POST sobre ID de B modifica comentario sin sesión.

La restricción literal a propietario autenticado rompería registro, recuperación, tarjeta de fidelización y reseñas públicas. Se solicitó aclarar el modelo de acceso; mientras esté pendiente se conserva el comportamiento público y se registra como bloqueo. No se declara una excepción implícita a la aceptación de Notion.

Recomendación concreta: verificar posesión del email para recuperar/editar un perfil y emitir una capacidad opaca o un enlace firmado de alcance limitado para tarjeta y reseñas; validar esa capacidad en **cada** entrada, no solo en la página. No reutilizar un QR expuesto por consulta de email como prueba de identidad. El alta de un nuevo cliente debe devolver solo lo necesario y no permitir actualizar uno existente sin verificación. Probar dos tenants y ausencia/capacidad inválida en acciones y handlers. Confirmar también la política de expiración y de compatibilidad de enlaces ya enviados. No se han añadido secretos ni se han cambiado estos contratos sin definir el acceso esperado.

## Cobertura y resultados

`src/actions/__tests__/customer-isolation.test.ts` añade 64 casos a los 27 existentes. Invoca código real de acciones y rutas, sustituyendo Auth, Prisma, email y notificaciones; usa dos propietarios, tres negocios (dos de A), selección mixta y contadores distintos. Los mocks aplican predicados a las fixtures y verifican ausencia de mutaciones/consultas posteriores al rechazo. Los seis casos de hallazgos públicos pasan porque reproducen el defecto, no porque esté resuelto.

Resultados definitivos y limitaciones de ejecución se registran al final de este documento. No se usaron sesiones reales ni conexiones a bases remotas. No se aplicaron migraciones ni se modificaron secretos o datos reales.

## GitHub Actions

Consultado el 2026-11-15 para el head original `7d98a263a261fa63be094f8f2d7af36cb61e7243`:

| Ejecución | Disparador | Estado exacto | Jobs |
| --- | --- | --- | --- |
| [43096749988](https://github.com/nlgarcia84/mvp-revly-saas/actions/runs/43096749988) | `pull_request`, intento 1 | `queued`, `conclusion: null` | 0 |
| [43097209724](https://github.com/nlgarcia84/mvp-revly-saas/actions/runs/43097209724) | `workflow_dispatch`, intento 1 | `completed`, `conclusion: startup_failure` | 0 |

La segunda tiene una anotación en la página pública: “An unexpected error has occurred and we've been automatically notified.” Recomienda reintento, consultar estado del servicio y soporte con request ID `D318:2B5E0F:1EF047:47D04A:6AF4D37F`. La API de check-runs de su check suite `116710463388` devuelve cero. No hay jobs ni logs de tests que indiquen fallo del código.

Se han leído y parseado los tres YAML. `ci.yml` escucha PR a main, merge_group y dispatch, y llama localmente a `validate.yml`; este declara `workflow_call`, jobs de calidad/migraciones y agregación final. Ambos usan `contents: read`, suficiente para sus operaciones observadas. Los SHAs de actions están fijados. No se ha identificado un defecto de configuración que explique el startup failure; **workflows sin modificar**.

El conector GitHub informa permisos `admin`, `maintain`, `push`, `pull`, `triage` sobre el repositorio. La autenticación local de `gh` está inválida. La API REST pública de `actions/permissions` devuelve 401; el conector no expone esa configuración. Por tanto no están verificadas políticas efectivas de Actions, facturación/cuotas ni disponibilidad de runners. No se puede atribuir el problema a ninguna de ellas con la evidencia disponible.

Siguiente acción del propietario: consultar Settings → Actions y la anotación autenticada; revisar estado/cuotas y reintentar CI de la rama. Si persiste el mismo fallo previo a jobs, abrir soporte con ambos run IDs y el request ID. Un reintento sin jobs no es evidencia de pruebas superadas. CI sigue bloqueada en GitHub con causa interna no determinada más allá de su anotación.

## Decisión de entrega

- Mantener PR #4 en Draft y F0-01 sin completar.
- Resolver el acceso público antes de afirmar aislamiento global.
- Exigir CI satisfactoria y verificar el flujo real en Preview/staging aislado con dos tenants, sin tocar producción.
- Las pruebas unitarias no certifican PostgreSQL/RLS ni navegador. No se ejecutan migraciones en una base real como sustituto de CI.

## Resultados locales definitivos

Runtime: Node.js **22.23.5**, checksum verificado contra SHASUMS256 oficial, instalado temporalmente fuera del repositorio. Variables ficticias de `.github/workflows/validate.yml` (PostgreSQL localhost y Supabase `ci.example.supabase.co`); checkout sin archivos `.env`. Dependencias copiadas de la instalación local existente, sin cambiar manifiesto ni lockfile; no se afirma haber repetido `npm ci` limpio.

| Comprobación | Resultado |
| --- | --- |
| `npx prisma generate` | Correcto, Prisma 7.8.0; también ejecutado por `vercel-build` con Node 22 |
| `npm run db:validate` | Correcto con Node 22 |
| `npm run typecheck` | Correcto con Node 22 |
| `npm run test:ci` | **190/190**, 11 suites; 27 originales + 64 nuevos + 99 previos |
| `npm run test:pipeline` | **12/12** con Node 22; el texto de promoción corresponde al doble de API del test, no a un despliegue |
| `npm run vercel-build` | Correcto con Node 22; compila, valida tipos y genera 32 páginas estáticas |
| Parseo de workflows con `js-yaml` | Los tres YAML se parsean correctamente; disparadores y permisos inspeccionados |
| `git diff --check` | Correcto |
| Mutación temporal: quitar el nuevo filtro de propietario del contador de canjes | **2 fallos** (A→B y B→A), 62 pasan; fuente restaurada mediante `finally` |
| Replay de migraciones / `db:check` | No ejecutado: no hay Docker, psql ni pg_ctl locales disponibles; no se sustituye por acceso a una base real |
| Navegador / Preview con dos sesiones | No ejecutado; pendiente para aceptación |

Los primeros intentos detectaron límites del entorno: Turbopack no permite un `node_modules` enlazado fuera de su raíz (resuelto copiando dependencias), y el sandbox impide los puertos internos de Turbopack y los servidores de pruebas de smoke (repetidos con aprobación fuera del sandbox, correctos). No fueron fallos funcionales ni motivaron cambios de producto. Las primeras comprobaciones con Node 26 también pasaron, pero los resultados anteriores corresponden al runtime 22 del proyecto.
