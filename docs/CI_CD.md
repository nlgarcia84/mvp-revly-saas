# Pipeline de Revly

## Arquitectura

- `ci.yml`: valida pull requests a `main`, merge queue y ejecuciones manuales.
- `validate.yml`: workflow reutilizable con TypeScript, Jest, pruebas del pipeline y build sin secretos; otro job reproduce todas las migraciones en PostgreSQL 17 temporal y comprueba que el esquema coincide con Prisma.
- `production.yml`: vuelve a validar el commit de `main`, compila con configuración de Production, aplica migraciones, verifica el esquema, crea un deployment sin asignar dominios, ejecuta smoke checks, promueve y comprueba el dominio público.
- `vercel.json`: desactiva únicamente los deployments Git de `main`. Las ramas de feature conservan sus previews automáticas.

Producción usa una sola cola con `cancel-in-progress: false`: una nueva publicación no interrumpe una migración o promoción. Antes de migrar se comprueba que el commit sigue siendo la punta de `main`, para rechazar ejecuciones obsoletas. Los checks de PR no reciben secretos. No se usa `pull_request_target` para ejecutar código de contribuciones.

## Activación antes de mergear este cambio

Estos archivos preparan el pipeline; las configuraciones de GitHub, Vercel y Supabase no se crean al añadirlos al repositorio. Configurarlas antes del primer merge, porque ese merge desactiva la publicación Git de `main` y pasa a depender de Actions.

1. En GitHub, crear el environment `production`, restringido a la rama `main`, con un reviewer de publicación. Configurar los secretos y variables indicados abajo.
2. En Vercel, mantener `main` como Production Branch y seleccionar Node.js 22.x. Generar un token de despliegue y un secreto de **Protection Bypass for Automation**. No desactivar Deployment Protection.
3. Crear un proyecto Supabase exclusivo para Preview. Aplicarle las migraciones y preparar un negocio de prueba, configurar Auth, sus Redirect URLs, Storage y los buckets necesarios. La CI con PostgreSQL temporal verifica el esquema de Prisma; no reproduce Auth ni Storage de Supabase.
4. Sustituir las variables del scope Preview por las de prueba. No copiar Production a Preview. Definir `PREVIEW_SUPABASE_PROJECT_REF` con la referencia del proyecto de prueba. No configurar esa variable en Production.
5. Abrir el PR y comprobar CI y el build de Preview. En Settings → Rules → Rulesets de GitHub, proteger `main`: exigir PR, rama actualizada y el check agregado del job **CI passed** emitido por CI. Seleccionar el nombre exacto que aparezca tras la primera ejecución. Exigir también el check del proyecto Vercel que verifica la Preview; desactivar bypass y force pushes para la operación habitual. En un repositorio individual no exigir una aprobación de otro colaborador si no existe.
6. Mergear y revisar el primer workflow Production. El smoke público requiere que el negocio indicado exista en producción. No usar perfiles de clientes ni rutas con tokens en esa variable.

### GitHub environment `production`

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Variable | `VERCEL_ORG_ID` | ID del equipo/cuenta Vercel |
| Variable | `VERCEL_PROJECT_ID` | ID del proyecto Vercel |
| Variable | `PRODUCTION_URL` | Origen canónico HTTPS, por ejemplo `https://www.revly.es` |
| Variable | `SMOKE_PUBLIC_PATH` | Ruta de un negocio público existente, por ejemplo `/negocio-demo` |
| Secret | `VERCEL_TOKEN` | Token con acceso al proyecto |
| Secret | `MIGRATION_DATABASE_URL` | Conexión PostgreSQL directa o session pooler de Supabase para migraciones; no transaction pooler |
| Secret | `VERCEL_AUTOMATION_BYPASS_SECRET` | Protection Bypass for Automation del proyecto |

Valores verificados para Revly:

```text
VERCEL_ORG_ID=team_iJmUSCQQJICmYQgLo5UBbKok
VERCEL_PROJECT_ID=prj_Br1CstB6M7ARzKJmr3wnUHDy4WpJ
PRODUCTION_URL=https://www.revly.es
```

El proyecto Vercel es `mi-saas-mvp` en el equipo `nleyvagarciagmailcoms-projects`. Configurar `SMOKE_PUBLIC_PATH` con una ruta real de negocio antes de activar Production.

La conexión del plugin GitHub y la autenticación de GitHub CLI son independientes. Si la integración permite leer pero devuelve `403 Resource not accessible by integration` al escribir, autenticar la CLI con `gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow` y configurar Git con `gh auth setup-git`. Los secretos deben introducirse directamente en GitHub, nunca en el chat ni en archivos versionados.

El resto de las variables de la aplicación permanece en Vercel. `vercel pull` obtiene la configuración de Production para el build. No se imprimen ni se suben como artifacts. El token de Vercel se limita a los pasos de autenticación y nunca se pasa como argumento de proceso. La conexión de migraciones solo se inyecta como `DATABASE_URL` en el paso de Prisma y no sustituye la configuración runtime de Vercel. El runtime conserva su adaptación al transaction pooler. Las actions están fijadas por SHA y la CLI por versión exacta.

### Preview en Vercel

| Servicio | Configuración |
| --- | --- |
| Supabase | Proyecto de pruebas distinto al de producción; `NEXT_PUBLIC_SUPABASE_URL`, claves públicas y service role del mismo proyecto |
| PostgreSQL | `DATABASE_URL` del proyecto de pruebas |
| Identidad de Preview | `PREVIEW_SUPABASE_PROJECT_REF` del proyecto de pruebas, distinta de Production |
| Stripe | `sk_test_…`, `pk_test_…` y webhook de test registrado para el entorno |
| Resend | API key de pruebas y `EMAIL_FROM=Revly <onboarding@resend.dev>`; este remitente restringe el envío a la dirección permitida por Resend |
| WhatsApp | Sin `WHATSAPP_ACCESS_TOKEN` |
| Google/Meta | Aplicaciones, cuentas y negocios de pruebas, con callbacks del entorno registrados |
| URL de la app | `NEXT_PUBLIC_APP_URL` correspondiente al entorno; para OAuth conviene una rama de staging con dominio estable |

`check-preview-env.mjs` bloquea el build Preview si Auth y PostgreSQL no coinciden con la referencia configurada, Stripe usa claves live, Resend usa otro remitente o WhatsApp tiene token. La referencia debe pertenecer al proyecto de pruebas: el script no consulta la cuenta de Supabase ni puede detectar si un operador introduce deliberadamente la referencia de Production. Tampoco verifica a qué proyecto pertenecen las claves de Supabase ni los permisos de Google/Meta; revisar esas credenciales al activar el entorno.

Para cambios de esquema, aplicar primero las migraciones en la base de Preview. El pipeline nunca migra producción desde una PR y las previews Git no ejecutan migraciones. Si varias features necesitan esquemas incompatibles, usar bases/branches de datos separadas, sin compartir credenciales de producción.

## Migraciones y compatibilidad

En desarrollo crear migraciones con `prisma migrate dev`. En CI y producción usar `prisma migrate deploy`; no `db push`, `migrate reset` ni `migrate dev`.

Toda migración de producción debe ser compatible con la aplicación que sigue atendiendo tráfico y con la versión anterior recuperable. Añadir columnas/tablas primero; desplegar código compatible, migrar datos y retirar columnas antiguas en una publicación posterior. Revisar los SQL destructivos manualmente: reproducir una base vacía no demuestra compatibilidad ni estima bloqueos sobre datos reales.

El build ocurre antes de modificar producción. Si falla una migración, el pipeline se detiene sin promover. Una migración puede haber aplicado parcialmente cambios: revisar el estado antes de reintentar. El `db:check` posterior detecta diferencias soportadas por Prisma entre la base y `schema.prisma`; no valida políticas RLS, triggers u otros objetos que Prisma no modela.

## Verificación y recuperación

Los smoke checks exigen HTTP 200, HTML y cuerpo no vacío en `/` y `SMOKE_PUBLIC_PATH`, con timeout y reintentos. Rechazan redirecciones, incluido el login de Vercel. Envían el bypass en un header, sin seguir redirecciones ni imprimirlo. Son comprobaciones de disponibilidad; no sustituyen pruebas de registro, pagos o canje de puntos.

Si falla el deployment o su smoke previo, no se promueve al dominio. Si falla después de promover, el workflow queda fallido y requiere revisión. Consultar los logs de Actions y Vercel y recuperar el deployment anterior conocido desde Vercel. No se revierte automáticamente la base de datos; una reversión de código solo es válida mientras el esquema siga siendo compatible.

Para reintentar una publicación resuelta, ejecutar Production mediante `workflow_dispatch` en `main`. No relanzar commits antiguos para recuperar código: usar rollback de Vercel o un commit de reversión revisado. No editar migraciones ya aplicadas como parte de una recuperación rutinaria.

## Comprobaciones locales

```bash
nvm use
npm ci
npx prisma generate
npm run db:validate
npm run typecheck
npm run test:ci
npm run test:pipeline
npm run vercel-build
```

Para reproducir migraciones, usar exclusivamente una base PostgreSQL de pruebas vacía: configurar `DATABASE_URL`, ejecutar `npm run db:migrate:deploy` y después `npm run db:check`. No ejecutar esos comandos contra producción para validar un PR.

Referencias: [Git configuration](https://vercel.com/docs/project-configuration/git-configuration), [staged deployments](https://vercel.com/docs/cli/deploy), [Prisma 7 CLI](https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference), [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
