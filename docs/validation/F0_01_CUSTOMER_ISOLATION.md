# F0-01 — Aislamiento de clientes y autorización pública

PR [#4](https://github.com/nlgarcia84/mvp-revly-saas/pull/4), rama `fix/f0-01-customer-status-ownership`, issue [#3](https://github.com/nlgarcia84/mvp-revly-saas/issues/3). Especificación: [Notion F0-01](https://app.notion.com/p/415877c55c2181f7a916c078e0337f03). Continuación del 2026-11-15 sobre `10f18eee0a30ec56431a8eec5339069e59965ad0`.

**El PR permanece en Draft y F0-01 no está completada: falta ejecutar y revisar la validación real de dos sesiones en Preview/staging.** Los resultados unitarios y CI no sustituyen esa aceptación.

## Problemas corregidos

- El PR ya limitaba `updateCustomerStatus` por cliente y `Business.userId`, validaba estados y devolvía solo éxito. Sus 27 tests se mantienen.
- El resumen mensual ya filtra también los canjes por propietario. Los borrados comprueban pertenencia en la escritura; selección mixta no elimina clientes ajenos.
- `findPublicCustomerByEmail` y `getPublicCustomer` ahora exigen una sesión pública verificada, del cliente y negocio exactos. Email, slug, ID, QR o sesión del propietario de otro negocio no constituyen esa identidad.
- `addPublicCustomer` ya no devuelve un cliente, crea puntos ni sobrescribe datos al recibir un email conocido. Guarda una solicitud temporal y aplica el alta/cambio **después de verificar posesión del correo**. Cambiar un cliente existente no vuelve a conceder el punto de bienvenida.
- La API de reseñas ya no lee ni modifica clientes con solo un ID. GET no hace consultas ni mutaciones; POST comprueba una capacidad de reseña antes de cualquier lectura de datos o escritura.
- El cliente no puede elegir un redirect arbitrario: solo se ofrece el enlace HTTPS de Google guardado por el negocio y validado contra una lista de hosts/rutas. Se rechazan credenciales, puertos, protocolos y redirectores de Google no admitidos.
- El HTML de la página no interpola datos de clientes/negocios ni credenciales. Usa `textContent`, CSP con nonce y cabeceras `no-store`/`no-referrer`. Nombres y variables de emails se escapan; las plantillas personalizadas admiten formato básico sin atributos activos.
- Email manual, programado y WhatsApp emiten enlaces con capacidades. El menú real del dashboard usa ahora `getWhatsAppLink`, con autorización en servidor.
- `getBusinessBySlug` devuelve una selección explícita de campos públicos, sin tokens OAuth ni cachés de terceros.

## Diseño y contratos públicos

Antes de implementarlo se presentaron OTP frente a enlace de un solo uso y el cierre seguro de enlaces históricos. Se eligió OTP para evitar credenciales de acceso al perfil en URLs y no alterar la sesión Supabase de propietarios. Supabase Auth sigue siendo la identidad del propietario; los clientes finales utilizan capacidades separadas. Se reutilizan PostgreSQL/Prisma, `crypto` de Node, Resend y cookies de Next; no se añade proveedor, dependencia de runtime ni secreto nuevo.

### Verificación de email y perfil

1. Registro y recuperación solicitan un OTP de **8 dígitos**, generado con `crypto.randomInt`. La respuesta solo contiene acuse genérico y un identificador aleatorio de solicitud; nunca email/ID de cliente, puntos, descuento o QR. La solicitud no consulta si el cliente existe: correos nuevos y conocidos reciben el mismo mensaje de verificación.
2. El desafío aleatorio tiene 256 bits, está ligado a email y `businessId`, caduca a los **10 minutos** y admite **5 intentos**. El código se guarda mediante `scrypt` con el ID de desafío como sal; no hay OTP en claro en la base. La comparación usa `timingSafeEqual`.
3. El contador de intentos se incrementa atómicamente antes de comparar. El consumo de un solo uso y la creación/actualización del cliente, movimiento inicial y capacidad se realizan en una transacción. Dos canjes concurrentes no emiten dos sesiones. Un fallo de base revierte el consumo.
4. Registro con email ya conocido: tras OTP se aplican únicamente nombre, teléfono y opt-in solicitados. Registro nuevo: crea un cliente y un movimiento de bienvenida. Recuperación de email sin perfil: no crea ni revela otro registro; puede volver al registro y solicitar un código nuevo.
5. La sesión es un token aleatorio de 256 bits, almacenado solo como SHA-256, con alcance `profile` y caducidad de **24 horas**. Cookie host-only HttpOnly/SameSite=Lax/Path=/, Secure y prefijo `__Host-` en producción/Preview. El nombre depende del slug para separar negocios en un mismo navegador. El token no se devuelve como dato de la Server Action.
6. En cada lectura se comprueban hash, alcance, vencimiento, cliente, negocio/slug y email actual. Un cambio de email invalida las capacidades antiguas. QR ausente de un registro antiguo solo se rellena después de verificar el email; la lectura del perfil no genera QR.

### Límites de abuso y retención

`PublicAccessRateLimit` usa upsert/incremento atómico en PostgreSQL, compartido entre lambdas: máximo **3 emails por dirección**, **60 por negocio** y **300 globales**, por ventana fija de 15 minutos. Los límites de dirección son globales entre negocios para evitar spam usando distintos slugs. Al alcanzarlos se mantiene el acuse genérico. No se confía en cabeceras IP controlables por el cliente. Los límites de ventana pueden duplicar el cupo alrededor de una frontera; no son una ventana deslizante.

El OTP fallido puede actualizar exclusivamente su contador de seguridad. Una autorización de perfil/reseña rechazada no modifica clientes, puntos ni envía notificaciones; los POST de reseña sin autorización tampoco consumen un contador de envío. Los registros caducados se limpian al procesar solicitudes válidas de código. No hay cron nuevo: en ausencia de tráfico la eliminación física puede demorarse, aunque la caducidad siempre se valida.

Los presupuestos compartidos impiden envío ilimitado, pero un atacante distribuido puede agotarlos y causar denegación temporal. Un control de red/CAPTCHA puede reforzarlos en el rollout; estos límites no se presentan como protección completa frente a DDoS. El fallo del proveedor de correo no revela existencia de cuentas ni deja un código utilizable. Los logs de email solo incluyen estado HTTP/mensaje genérico, nunca respuesta del proveedor, destinatario, OTP o enlace.

### Reseñas y compatibilidad

- Capacidad independiente de **256 bits**, hash SHA-256, alcance `review`, cliente y negocio exactos, **7 días desde emisión**. En emails programados para el día siguiente quedan aproximadamente 6 días al entregarse. Es reutilizable durante ese plazo para valorar/completar/corregir comentario, con máximo **10 envíos por token y ventana de 15 minutos**. No permite leer puntos, QR, descuento o editar perfil.
- La clave foránea compuesta `(customerId,businessId)` impide capacidades de un cliente con otro negocio. `ON UPDATE RESTRICT` exige revocar capacidades antes de transferir un cliente entre negocios; no existe una transferencia pública.
- El token viaja en el **fragmento** `#token=...`, no en la URL HTTP. La página lo mantiene solo en memoria y borra fragmento/parámetros del historial actual. No se guardan credenciales en localStorage ni se añaden a logs o respuestas JSON. Los proveedores de correo/WhatsApp y el destinatario reciben el enlace como parte necesaria de la invitación.
- GET es una página genérica sin datos del cliente y sin acceso a la base: es seguro ante previews/escáneres. La página envía `POST {action:'view',token}` para cargar el nombre público y enlace seguro del negocio; no devuelve email, valoración privada ni comentario almacenado.
- `POST {action:'submit',token,rating,feedback?}` valida origen si está presente, MIME JSON, límite real de cuerpo **12 KB** durante streaming, objeto estricto sin campos extra, nota entera 1–5 y comentario string de hasta 2000 caracteres. No se aceptan strings numéricos, null, arrays, objetos o fracciones como nota. La escritura vuelve a comprobar la capacidad y su caducidad en SQL.
- Las estrellas del email solo **preseleccionan** una nota. El usuario confirma con POST, puede añadir comentario y continuar a Google con cualquier valoración. No se guarda una reseña con un simple clic/GET ni se ocultan enlaces de Google según la nota.
- **Enlaces antiguos sin token:** no se pueden convertir en autorización de forma segura usando solo un ID. GET muestra una pantalla genérica que solicita una invitación nueva o volver al QR del negocio para verificar email. POST sin token devuelve 403. No se permite una ventana de compatibilidad insegura. Emails antiguos ya programados sin token deberán sustituirse/reemitirse desde el negocio; no se han cancelado ni cambiado mensajes reales.
- Plantillas personalizadas: conservan variables y formato básico (`p`, `br`, `strong`, `b`, `em`, `i`, `h1`, `h2` sin atributos). HTML/atributos arbitrarios se muestran escapados; las estrellas seguras se incluyen siempre.

## Persistencia y migración

Migración aditiva `20261115000000_public_customer_authorization`: `CustomerEmailChallenge`, `CustomerCapability`, `PublicAccessRateLimit`, índice único compuesto de `Customer` e índices de caducidad. Las tres tablas privadas tienen RLS sin políticas para roles de navegador; la app accede mediante Prisma del servidor. No se ha aplicado a producción ni se ha cambiado ningún secreto.

Prisma 7.8.0 valida y genera el cliente. La reproducción completa y diff del esquema han pasado en la CI del commit de implementación `1583d7b` (ver evidencia abajo). Antes de probar el Preview es necesario aplicar la migración **solo** al proyecto de prueba aislado mediante el procedimiento de `docs/CI_CD.md`; el build no aplica migraciones.

## Inventario de autorización privada conservada

| Superficie | Comprobación |
| --- | --- |
| `customers.ts`: alta/importación | Sesión de propietario y negocio con `id + userId` antes de operar |
| Listado/resumen | Cliente/negocio y propietario en los filtros; sin sesión no consulta datos |
| Estado/borrados | Pertenencia en la escritura; selección mixta no afecta a otros tenants |
| Escaneo | Negocio propio y QR dentro de ese negocio |
| `points.ts` | Cliente del propietario o negocio autorizado + cliente coincidente antes de transacción |
| `redeem.ts` | Negocio del propietario y código/cliente perteneciente al negocio antes de canjear |
| `send.ts` | Cliente con propietario antes de email, enlace de WhatsApp o emisión de capacidad |
| `business.ts` / dashboard | Negocios/recuentos/cascada filtrados por propietario |
| GET `/api/report/[businessId]` | 401 sin sesión, 404 de negocio ajeno antes de consultas a clientes |
| Perfil público | Cookie verificada y capacidad `profile` específica para cliente/negocio |
| Reseñas públicas | GET sin consultas; POST con capacidad `review` antes de leer o escribir |

Búsquedas de inventario: `rg -n 'customer\.|customers:|pointMovement\.|pointClaim\.' src` y `rg -n 'review-confirm|wa.me|buildReviewEmail|getWhatsAppLink' src`. `Customer` de Stripe es facturación y no este modelo. La protección del layout/proxy no sustituye la autorización de las Server Actions.

## Pruebas y comprobaciones

Los seis casos `OPEN SECURITY FINDINGS` se han convertido, sin eliminarlos, en regresiones de rechazo. Los 27 tests de estado y los demás de la primera auditoría se conservan.

Nueva suite `src/lib/__tests__/public-customer-access.test.ts`: **57 casos** del código real de acciones, intercambio OTP, cookies y handlers contra dobles que aplican los filtros sobre fixtures independientes; no devuelven siempre éxito. Incluye correo nuevo/conocido, edición diferida, alta con un único punto, OTP incorrecto/caducado/agotado/reutilizado, consumo concurrente, rollback, dos negocios con el mismo email, perfil ajeno, scopes incompatibles, email cambiado, token manipulado/ajeno/caducado, expiración entre autorización y escritura, GET inerte, validación estricta de POST, HTML/redirecciones, límites de envío y reutilización y fallos del correo. `review-notifications.test.ts` añade **2 casos** para el enlace seguro programado y ausencia de emisión sin destino configurado.

Comprobaciones con **Node 22.23.5** y variables ficticias de CI, sin `.env`, correo ni bases reales:

| Comprobación | Resultado local |
| --- | --- |
| `npx prisma generate` | Correcto |
| `npm run db:validate` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run test:ci` | **249/249**, 13 suites (190 previos + 59 nuevos) |
| `npm run test:pipeline` | **12/12**; promociones y notificaciones del test son dobles, no operaciones reales |
| `npm run vercel-build` | Correcto con variables ficticias; sin despliegue |
| `git diff --check` | Correcto |
| `node --check scripts/validation/f0-01-staging.mjs` | Correcto; no constituye ejecución de navegador |
| Replay PostgreSQL y schema diff local | No disponible: sin Docker/PostgreSQL local; debe acreditarlo CI |
| Staging con identidades reales | **No ejecutado**; procedimiento y ejecutor preparados abajo |

Turbopack y los smoke tests necesitan puertos locales: se ejecutan con aprobación fuera del sandbox. Las dependencias se copiaron de la instalación local; el `npm ci` limpio se verifica en GitHub. No se afirma una prueba PostgreSQL/RLS o navegador basándose en mocks.

## Validación preparada para Preview/staging

Se ha comprobado por lectura que existe el proyecto dedicado **`revly-preview`**, ref **`lhtthnrakoxhdeakkkxv`**. En la consulta inicial del 2026-11-15 tiene RLS en tablas de aplicación, un negocio de fixture y cero clientes; las tablas nuevas todavía no están aplicadas. No se ha modificado ese proyecto ni se han reutilizado datos/credenciales de producción.

Preparación pendiente del entorno:

1. Revisar Preview con los checks de aislamiento de `docs/CI_CD.md`; Auth/BD deben usar exclusivamente ese ref, Stripe test y notificaciones de prueba. `NEXT_PUBLIC_APP_URL` debe ser la URL de Preview para que los enlaces emitidos vuelvan a ese entorno.
2. Aplicar la nueva migración **en la base de prueba**, antes de la prueba funcional. Confirmar replay/diff, RLS y ausencia de políticas públicas en las tres tablas nuevas. No ejecutar comandos con una URL de producción.
3. Crear dos usuarios Supabase reales de prueba y sus filas `User`, dos negocios con propietarios distintos y slugs `f0-01-test-a-...` / `f0-01-test-b-...`, con GoogleLink HTTPS válido. Crear dos clientes de fixture mediante el dashboard de su propietario. Pueden usar un mismo buzón de prueba controlado (correos iguales entre negocios deben permanecer aislados). No emplear destinatarios de clientes reales. El emisor de test de Resend solo permite los destinatarios autorizados de esa cuenta; verificar la entrega antes de atribuir fallos a la app.
4. Para el preflight de solo lectura, proporcionar `STAGING_VERCEL_READ_TOKEN` (credencial existente, sin crear/cambiar secretos), `STAGING_DEPLOYMENT_ID` y `STAGING_DEPLOYMENT_SHA`. El ejecutor consulta la API de Vercel y comprueba proyecto, rama, SHA, URL inmutable y target distinto de Production antes de enviar contraseñas. Configurar fuera del repositorio `STAGING_BASE_URL` con la URL inmutable `.vercel.app`, `STAGING_SUPABASE_PROJECT_REF` y `STAGING_CONFIRM_ISOLATED` con el ref anterior. Por cada sufijo A/B: `STAGING_OWNER_<A|B>_EMAIL`, `_PASSWORD`, `STAGING_BUSINESS_<A|B>_ID`, `_SLUG`, `STAGING_CUSTOMER_<A|B>_ID`, `_EMAIL`. Usar credenciales de test mediante variables temporales, no pegarlas en el PR/chat. `STAGING_VERCEL_BYPASS` es opcional si Deployment Protection lo necesita; no crear ni cambiar secretos como parte de esta tarea.
5. En un checkout de prueba, instalar opcionalmente `playwright` sin cambiar manifiesto/lock (`npm install --no-save --package-lock=false playwright` y `npx playwright install chromium`), registrar la versión local usada y ejecutar `node scripts/validation/f0-01-staging.mjs`. La [biblioteca oficial](https://playwright.dev/docs/library) se usa solo para esta prueba supervisada, no es dependencia de la app.

El ejecutor abre **dos sesiones reales de propietario**, prueba informes propios 200 y ajenos 404 y abre **dos sesiones públicas independientes** que deben completar OTP por el buzón real, ver su tarjeta y ser redirigidas al intentar ver la del otro negocio. Los OTP se introducen por terminal con entrada oculta. Rechaza POST de reseña por ID sin capacidad. Se niega a usar dominios de producción, otros proyectos Auth y slugs sin prefijo de fixture; el bypass solo se envía al origen exacto de Preview. No crea usuarios, cambia contraseñas, captura trazas/HAR/screenshots ni registra cuerpos o credenciales.

Extensiones de revisión manual obligatorias antes de aceptar:

- Registro nuevo con OTP, un único punto inicial; repetir registro verificado sin punto adicional. Intentar editar por email conocido antes de verificar y comprobar que BD no cambió.
- Correo/WhatsApp desde cada dashboard: enlace nuevo con fragmento, GET sin mutaciones, nota+comentario guardados solo en el cliente autorizado y Google accesible con notas 1 y 5. Repetir con capacidad inválida, ajena, expirada y scope de perfil: rechazo sin cambios. Revisar expiración con fixtures de test, no alterando fechas de registros reales.
- Enlace histórico sin token y `?auto=1&rating=5&redirect=...`: ninguna escritura/redirección; recuperación o nueva invitación.
- Comparar registros de ambos clientes antes/después de ataques y comprobar ausencia de movimientos/notificaciones no autorizados. Verificar que roles anon/authenticated no leen tablas privadas con la Data API.

**Resultado actual:** ejecutor preparado y validado sintácticamente; no ejecutado contra Preview. Faltan migración en la base de prueba, las dos identidades/fixtures configuradas, acceso a sus buzones, preflight autenticado de Vercel y revisión supervisada. No se declara F0-01 completa.

## Compatibilidad y riesgos residuales de rollout

- Se necesitan las tablas nuevas antes de servir tráfico de esta versión; se falla cerrado si no están disponibles. No desplegar a producción desde este PR.
- Los enlaces antiguos no se pueden mantener autorizados. El negocio tendrá que reemitir invitaciones seguras; las invitaciones programadas antiguas no se han modificado. Revisar esta transición antes de promover nada.
- El perfil ya no se recupera por email/ID sin prueba: requiere OTP y vuelve a pedirlo al caducar o cambiar de dispositivo. Un mismo navegador puede mantener una sesión por negocio; entrar como otro cliente en el mismo negocio sustituye esa cookie.
- Capacidad de reseña es un bearer: quien reciba/reenvíe un enlace válido puede usarlo dentro de su alcance/plazo. No demuestra identidad civil y no concede acceso al perfil. Los tokens no se envían a Google ni en el Referer.
- QR/descuentos que alguien copiara antes de la corrección no se pueden hacer desconocidos retroactivamente. No se han rotado datos reales; decidir si hace falta reemitirlos antes del rollout, según exposición histórica.
- `getPublicCustomer`/`findPublicCustomerByEmail` conservan nombres y argumentos pero ahora pueden devolver null sin sesión; `addPublicCustomer` cambia deliberadamente a acuse/challengeId y la página consumidora se adapta. POST de reseña exige action y token; no se conserva el contrato inseguro.
- RLS remoto y dos sesiones reales siguen pendientes de validación. Los scopes y aislamiento están cubiertos por tests, no se atribuye a esos tests una certificación del entorno real.

## CI y estado de entrega

Histórico: `43096749988` permaneció queued sin jobs; `43097209724` terminó startup_failure sin jobs y con anotación de error inesperado de GitHub. No se identificó defecto del YAML. Las ejecuciones posteriores `43710459599` y `43710681554` de la primera auditoría pasaron todos los jobs sin cambiar workflows. Los 3 workflows permanecen intactos.

[CI 43714706497](https://github.com/nlgarcia84/mvp-revly-saas/actions/runs/43714706497), del commit de implementación `1583d7b5648337dcc462dc879b9e41e66f5d01ac`, ha terminado **completed / success** con los tres jobs correctos:

- `132813595689`: calidad — npm ci limpio, Prisma generate/validate, TypeScript, Jest, pipeline y build.
- `132813595487`: replay de migraciones en PostgreSQL efímero y `db:check`, incluidos nuevos índices, tablas, integridad compuesta y RLS del SQL de la migración. El diff Prisma no certifica por sí solo las políticas RLS del entorno remoto.
- `132813840841`: CI passed.

No confundir ese resultado con la CI del baseline `10f18eee`. El commit posterior de este informe solo añade evidencia documental; su check final se registra en el PR. Mantener Draft independientemente de CI hasta validar staging y superar revisión.

## Archivos de esta continuación

- `prisma/schema.prisma`; `prisma/migrations/20261115000000_public_customer_authorization/migration.sql`.
- `src/lib/customer-capabilities.ts`; `src/lib/public-customer-access.ts`; `src/actions/public-customer-access.ts`.
- `src/actions/customers.ts`; `src/actions/business.ts`; `src/actions/send.ts`.
- `src/app/[slug]/page.tsx`; `src/app/[slug]/customer/[customerId]/page.tsx`; `src/app/api/review-confirm/[customerId]/route.ts`.
- `src/components/public-customer-access.tsx`; `src/components/customers-table.tsx`; `src/components/customer-row-actions.tsx`.
- `src/lib/email.ts`; `src/lib/review-email.ts`; `src/lib/notifications.ts`.
- `src/actions/__tests__/customer-isolation.test.ts`; `src/lib/__tests__/public-customer-access.test.ts`; `src/lib/__tests__/review-notifications.test.ts`.
- `scripts/validation/f0-01-staging.mjs`; este informe.
