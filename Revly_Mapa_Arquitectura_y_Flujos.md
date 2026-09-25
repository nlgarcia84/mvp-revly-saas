# 🧭 Mapa de arquitectura y flujos de Revly

> Guía para Daniela y Norman para entender cómo viaja el código de Revly cuando el usuario utiliza cada funcionalidad.

---

## 1. Mapa general de Revly

Revly es una aplicación **full-stack con Next.js + TypeScript**.

La arquitectura general que hemos identificado es:

```text
                         USUARIO
                            │
                            ▼
                  ┌──────────────────┐
                  │  Next.js / React │
                  │   UI / páginas   │
                  └────────┬─────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
          Server Action          API Route
          src/actions/           src/app/api/
                 │                   │
                 └─────────┬─────────┘
                           ▼
                    src/lib/
                  lógica / servicios
                           │
             ┌─────────────┼──────────────┐
             │             │              │
             ▼             ▼              ▼
          Prisma        Supabase       Servicios
             │             │          externos
             ▼             ▼
        PostgreSQL      Auth/Storage
```

---

# 2. Prisma → PostgreSQL

Una de las ideas fundamentales para entender Revly es que **el código normalmente no escribe SQL directamente**.

Por ejemplo:

```ts
await prisma.user.findUnique({
  where: { id: userId }
});
```

El flujo es:

```text
auth.ts
   │
   │ prisma.user.findUnique()
   ▼
PrismaClient
   │
   ▼
PrismaPg
   │
   ▼
pg.Pool
   │
   ▼
PostgreSQL
```

Prisma actúa como ORM/intermediario.

---

## 2.1 `src/lib/db.ts`

En Revly tenemos:

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const globalForPrisma =
  globalThis as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### ¿Qué hace?

1. Importa `PrismaClient`.
2. Importa el adaptador PostgreSQL `PrismaPg`.
3. Importa `pg`, el driver de PostgreSQL para Node.js.
4. Crea un `Pool` de conexiones.
5. Utiliza `DATABASE_URL` para saber dónde está PostgreSQL.
6. Configura SSL.
7. Conecta el pool con Prisma mediante `PrismaPg`.
8. Crea/reutiliza una instancia de `PrismaClient`.
9. Exporta `prisma` para que el resto de la aplicación pueda utilizarlo.

---

# 3. ¿De dónde sale `PrismaClient`?

Cuando vemos:

```ts
import { PrismaClient } from '@prisma/client';
```

**no estamos creando la clase `PrismaClient` nosotros.**

La clase pertenece al paquete de Prisma instalado en:

```text
node_modules/@prisma/client
```

Conceptualmente:

```text
package.json
      │
      │ npm install
      ▼
node_modules/
      │
      └── @prisma/client
               │
               └── PrismaClient
```

Después nuestro código hace:

```ts
const prisma = new PrismaClient({ adapter });
```

Es decir:

- `PrismaClient` → clase proporcionada por Prisma.
- `prisma` → instancia que creamos nosotros.

---

# 4. ¿Cómo sabe Prisma que existe `User`?

Prisma utiliza:

```text
prisma/schema.prisma
```

Por ejemplo:

```prisma
model User {
  id    String @id
  email String @unique
  name  String?
}
```

A partir de este esquema, Prisma genera un cliente que conoce modelos como:

```ts
prisma.user
prisma.business
prisma.customer
prisma.subscription
```

Por eso podemos hacer:

```ts
prisma.user.findUnique()
prisma.user.create()
prisma.user.update()
prisma.user.delete()
```

---

# 5. Flujo completo de una consulta

Cuando encontramos:

```ts
prisma.user.findUnique(...)
```

debemos imaginar:

```text
                 auth.ts
                    │
                    │ prisma.user.findUnique()
                    ▼
              PrismaClient
                    │
                    ▼
                 PrismaPg
                    │
                    ▼
                 pg.Pool
                    │
                    ▼
              PostgreSQL
                    │
                    │ resultado
                    ▼
                 Prisma
                    │
                    ▼
                auth.ts
```

---

# 6. Autenticación / Registro

## Registro

El usuario está en:

```text
/sign-up
```

Rellena:

```text
email
password
name
```

El flujo es:

```text
Usuario
   │
   ▼
Formulario React
   │
   ▼
signUp()
   │
   ├──────────────► Supabase Auth
   │                  │
   │                  └── crea usuario/autenticación
   │
   └──────────────► Prisma
                         │
                         ▼
                    PostgreSQL
                         │
                         └── User
                              Subscription
```

En `auth.ts` se utiliza:

```ts
supabase.auth.signUp(...)
```

para Supabase Auth.

Después:

```ts
prisma.user.create(...)
```

para guardar el usuario de negocio en PostgreSQL.

---

# 7. Login

El login utiliza Supabase Auth:

```text
Usuario
   │
   ▼
/sign-in
   │
   ▼
signIn()
   │
   ▼
Supabase Auth
   │
   ├── email
   ├── password
   │
   ▼
¿Credenciales correctas?
   │
   ├── NO → error
   │
   └── SÍ
         │
         ▼
       sesión
         │
         ▼
   /dashboard
```

En este flujo no es necesario utilizar Prisma para comprobar la contraseña.

---

# 8. Logout

```text
Botón "Cerrar sesión"
        │
        ▼
     signOut()
        │
        ▼
 Supabase Auth
        │
        ▼
invalida/destruye la sesión
        │
        ▼
 /sign-in
```

No necesita consultar PostgreSQL para cerrar la sesión.

---

# 9. Perfil del usuario

Para obtener el perfil:

```text
UI
 │
 ▼
getProfile()
 │
 ▼
Supabase
 │
 └── ¿Quién está autenticado?
          │
          ▼
        userId
          │
          ▼
       Prisma
          │
          ▼
     PostgreSQL
          │
          ▼
       User
```

La idea es:

- Supabase identifica al usuario.
- PostgreSQL contiene sus datos de negocio.

---

# 10. Empresa / Business

Cuando el usuario crea o modifica una empresa:

```text
Formulario
   │
   ▼
React
   │
   ▼
Server Action
   │
   ▼
business.ts
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

Conceptualmente:

```text
User
 │
 └──── Business
          │
          ├── nombre
          ├── dirección
          ├── slug
          ├── web
          └── ...
```

En un SaaS es fundamental controlar que cada usuario/empresa solo pueda acceder a sus propios datos.

---

# 11. Buscar una empresa

En Revly existe lógica de búsqueda de empresas.

El flujo conceptual puede ser:

```text
Usuario
   │
   │ introduce nombre + código postal
   ▼
Formulario
   │
   ▼
search-business
   │
   ▼
Google / servicio externo
   │
   ▼
Resultados
   │
   ▼
UI
```

Aquí no necesariamente interviene PostgreSQL.

Hay funcionalidades que siguen:

```text
UI → Action → PostgreSQL
```

y otras:

```text
UI → Action → API externa → UI
```

También pueden combinar ambas:

```text
UI
 ↓
Action
 ↓
API externa
 ↓
guardar resultado
 ↓
PostgreSQL
```

---

# 12. Google Reviews

Revly tiene integración con Google mediante archivos como:

```text
src/lib/google-places.ts
src/lib/google-business-profile.ts
```

## Google Places

El flujo conceptual:

```text
Revly
  │
  ▼
google-places.ts
  │
  ▼
Google Places API
  │
  ▼
Google
  │
  ▼
reseñas
  │
  ▼
Revly
```

Se utiliza, entre otras cosas, para obtener información de Google Places y las primeras reseñas.

---

# 13. Google Business Profile

Este flujo puede incluir OAuth:

```text
Usuario
   │
   ▼
"Conectar Google"
   │
   ▼
Revly
   │
   ▼
Google OAuth
   │
   ▼
Usuario autoriza
   │
   ▼
Google devuelve autorización
   │
   ▼
Revly
   │
   ▼
tokens / conexión
   │
   ▼
Google Business Profile API
   │
   ▼
Reviews
```

Aquí hay comunicación entre Revly y una API externa.

---

# 14. Reviews internas de Revly

Revly tiene lógica relacionada con reviews, por ejemplo:

```text
src/actions/reviews.ts
```

El patrón típico:

```text
Dashboard
   │
   ▼
Página Reviews
   │
   ▼
Server Action
reviews.ts
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
   │
   ▼
Review
   │
   ▼
resultado
   │
   ▼
UI
```

---

# 15. Análisis de sentimiento

Revly también tiene:

```text
src/lib/sentiment.ts
```

El flujo conceptual:

```text
Review
   │
   ▼
sentiment.ts
   │
   ▼
análisis
   │
   ▼
positivo / negativo / etc.
   │
   ▼
resultado
```

Si el resultado se almacena:

```text
PostgreSQL
   │
   ▼
Review
   │
   ▼
sentiment.ts
   │
   ▼
resultado
   │
   ▼
PostgreSQL
```

Esto demuestra que no todo en un SaaS es CRUD.

También hay:

- procesamiento
- integraciones
- análisis
- llamadas externas
- almacenamiento de resultados

---

# 16. Customers

Revly tiene lógica relacionada con clientes:

```text
src/actions/customers.ts
```

Flujo:

```text
UI
 │
 ▼
customers.ts
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
 │
 ▼
Customer
 │
 ▼
resultado
 │
 ▼
UI
```

Por ejemplo:

```ts
prisma.customer.findMany()
```

representaría conceptualmente:

```text
React
  ↓
Server Action
  ↓
Prisma
  ↓
SELECT
  ↓
PostgreSQL
  ↓
Customer[]
  ↓
React
```

---

# 17. Email

Revly utiliza Resend para enviar emails.

Tenemos lógica relacionada con:

```text
src/actions/send.ts
src/lib/send.ts
```

Flujo:

```text
Usuario
   │
   ▼
"Enviar"
   │
   ▼
Server Action
   │
   ▼
send.ts
   │
   ▼
Resend
   │
   ▼
Email
```

Aquí no necesariamente necesitamos PostgreSQL.

Es:

```text
Revly → Resend → Email
```

---

# 18. Stripe

Stripe es especialmente importante porque Revly es un SaaS.

Tenemos:

```text
src/lib/stripe.ts

/api/stripe/checkout
/api/stripe/portal
/api/webhooks/stripe
```

---

## 18.1 Checkout

Cuando una empresa quiere pagar:

```text
Usuario
   │
   ▼
Pricing
   │
   ▼
"Suscribirme"
   │
   ▼
/api/stripe/checkout
   │
   ▼
Stripe
   │
   ▼
Checkout
```

---

## 18.2 Webhook de Stripe

Después del pago:

```text
Stripe
   │
   │ webhook
   ▼
/api/webhooks/stripe
   │
   ▼
Revly
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

Conceptualmente:

```text
Stripe:
"Este cliente ha pagado"

        ↓

Webhook de Revly

        ↓

actualizar Subscription

        ↓

PostgreSQL
```

Este es un patrón fundamental en aplicaciones SaaS:

```text
Usuario → Stripe
Stripe → Webhook → Revly → BD
```

---

# 19. Stripe Customer Portal

Para gestionar una suscripción:

```text
Dashboard
   │
   ▼
"Gestionar suscripción"
   │
   ▼
/api/stripe/portal
   │
   ▼
Stripe
   │
   ▼
Stripe Customer Portal
```

---

# 20. Redeem / códigos

Revly tiene:

```text
src/actions/redeem.ts
```

Flujo conceptual:

```text
Usuario introduce código
       │
       ▼
redeem.ts
       │
       ▼
Prisma
       │
       ▼
PostgreSQL
       │
       ▼
¿Código válido?
       │
       ├── NO → error
       │
       └── SÍ → aplicar beneficio
```

---

# 21. Validación de URL

Revly tiene:

```text
src/actions/validate-url.ts
```

Flujo:

```text
Usuario introduce URL
       │
       ▼
validate-url.ts
       │
       ▼
validación
       │
       ▼
resultado
       │
       ▼
UI
```

No necesariamente necesita PostgreSQL.

---

# 22. Facebook

Revly tiene:

```text
src/lib/facebook-graph.ts
```

y rutas:

```text
src/app/api/facebook/*
```

Flujo:

```text
Usuario
   │
   ▼
"Conectar Facebook"
   │
   ▼
Revly
   │
   ▼
Facebook / Meta
   │
   ▼
OAuth / permisos
   │
   ▼
Facebook Graph API
   │
   ▼
datos
   │
   ▼
Revly
```

---

# 23. Instagram

Revly tiene:

```text
src/lib/instagram-graph.ts
```

y:

```text
src/app/api/instagram/*
```

Flujo:

```text
UI
 │
 ▼
API Instagram
 │
 ▼
Meta
 │
 ▼
Instagram Graph API
 │
 ▼
datos
 │
 ▼
Revly
```

---

# 24. Webhooks de Meta

Aquí el flujo puede empezar fuera de Revly:

```text
Meta
 │
 │ HTTP POST
 ▼
/api/.../webhook
 │
 ▼
Revly
 │
 ▼
procesar evento
 │
 ▼
Prisma / lógica
 │
 ▼
PostgreSQL
```

Esto significa que el usuario no necesariamente tiene que estar haciendo nada.

Un servicio externo puede llamar directamente a nuestro backend.

---

# 25. Barcode / QR

Revly tiene una ruta relacionada con:

```text
/api/barcode
```

Flujo conceptual:

```text
Usuario
   │
   ▼
Solicita código
   │
   ▼
API / barcode
   │
   ▼
genera código
   │
   ▼
respuesta
   │
   ▼
UI
```

Dependiendo de la implementación concreta, puede utilizar datos obtenidos desde PostgreSQL.

---

# 26. Review Confirm

Revly tiene:

```text
/api/review-confirm
```

Flujo conceptual:

```text
Cliente
   │
   ▼
enlace / acción
   │
   ▼
/api/review-confirm
   │
   ▼
validar información
   │
   ▼
BD / lógica
   │
   ▼
resultado
```

Es un ejemplo de endpoint HTTP.

---

# 27. Report

Revly tiene:

```text
/api/report
```

Flujo general:

```text
Dashboard
   │
   ▼
solicitud de informe
   │
   ▼
/api/report
   │
   ├── PostgreSQL
   ├── procesamiento
   └── datos
   │
   ▼
resultado
   │
   ▼
Dashboard
```

Los informes pueden ser importantes desde el punto de vista de escalabilidad si necesitan consultar grandes cantidades de información.

---

# 28. Dashboard

El dashboard no es una única funcionalidad.

Es un punto donde confluyen muchas funcionalidades:

```text
                     DASHBOARD
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Empresa        Reviews        Clientes
          │              │              │
          ▼              ▼              ▼
       Prisma         Prisma         Prisma
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    PostgreSQL
```

Y también puede recibir información de servicios externos:

```text
Google
   ↓
Reviews

Meta
   ↓
Social data

Stripe
   ↓
Subscription

PostgreSQL
   ↓
Datos internos
```

---

# 29. El patrón que debemos buscar como desarrolladores

Cada vez que queramos entender una funcionalidad de Revly, debemos seguir este orden:

## ① ¿Qué hace el usuario?

Ejemplo:

> "Pulsa Conectar Google."

## ② ¿Qué componente recibe el click?

Buscar:

```text
src/components/
src/app/
```

## ③ ¿A qué llama?

Puede llamar a:

```text
src/actions/
```

o:

```text
src/app/api/
```

## ④ ¿Qué hace esa función?

Preguntarnos:

```text
¿Lee PostgreSQL?
¿Escribe PostgreSQL?
¿Llama a Supabase?
¿Llama a Google?
¿Llama a Stripe?
¿Llama a Meta?
¿Llama a Resend?
¿Procesa datos?
```

## ⑤ Seguir la siguiente capa

Ejemplo:

```text
reviews.ts
     ↓
prisma.review.findMany()
     ↓
PrismaClient
     ↓
PrismaPg
     ↓
pg Pool
     ↓
PostgreSQL
```

## ⑥ ¿Cómo vuelve el resultado?

El flujo no termina en PostgreSQL.

Debe volver:

```text
PostgreSQL
   ↓
Prisma
   ↓
Server Action / API
   ↓
Next.js
   ↓
React
   ↓
Usuario
```

---

# 30. La película completa de una consulta

Por ejemplo, consultar reviews:

```text
👩 Usuario
   │
   │ abre "Reviews"
   ▼
🖥️ React / Next.js
   │
   │ llama
   ▼
⚙️ Server Action / API
   │
   ▼
📦 reviews.ts
   │
   │ prisma.review.findMany()
   ▼
🔷 PrismaClient
   │
   ▼
🔌 PrismaPg
   │
   ▼
🔌 pg Pool
   │
   ▼
🐘 PostgreSQL
   │
   │ devuelve registros
   ▼
🔌 pg
   │
   ▼
🔌 PrismaPg
   │
   ▼
🔷 Prisma
   │
   ▼
⚙️ Server Action
   │
   ▼
🖥️ Next.js
   │
   ▼
👩 Usuario ve las reviews
```

---

# 31. Ejemplo de Google

```text
👩 Usuario
   ↓
🖥️ Next.js
   ↓
⚙️ API / Server Action
   ↓
🌐 google-business-profile.ts
   ↓
🟢 Google API
   ↓
reseñas
   ↓
Revly
   ↓
🗄️ PostgreSQL (si se almacenan)
   ↓
🖥️ Dashboard
```

---

# 32. Ejemplo de Stripe

```text
👩 Usuario
   ↓
🖥️ Next.js
   ↓
/api/stripe/checkout
   ↓
💳 Stripe
   ↓
pago
   ↓
💳 Stripe
   │
   │ webhook
   ▼
/api/webhooks/stripe
   ↓
Prisma
   ↓
PostgreSQL
   ↓
Subscription actualizada
   ↓
Revly
```

---

# 33. Mapa mental definitivo de Revly

```text
                         REVLY
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
      UI/Next.js       Server Actions       API Routes
        │                  │                  │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                     src/lib/
                           │
             ┌─────────────┼──────────────┐
             │             │              │
             ▼             ▼              ▼
          Prisma        Supabase      APIs externas
             │             │              │
             │             │       ┌──────┼─────────┐
             │             │       │      │         │
             ▼             ▼       ▼      ▼         ▼
        PostgreSQL       Auth    Google  Meta     Stripe
```

---

# 34. Regla de oro

Cuando abramos cualquier funcionalidad de Revly, no debemos pensar:

> "¿Qué hace este archivo?"

Debemos pensar:

> **"¿Qué recorrido hace esta funcionalidad desde que el usuario pulsa el botón hasta que obtiene el resultado?"**

La plantilla que podemos utilizar es:

```text
FUNCIONALIDAD:
──────────────────────────────

1. Usuario:
   ¿Qué hace?

2. UI:
   ¿Qué componente/página lo recibe?

3. Entrada:
   ¿Qué datos recibe?

4. Server Action / API:
   ¿Qué función se ejecuta?

5. Lógica:
   ¿Qué hace internamente?

6. Base de datos:
   ¿Utiliza Prisma?
   ¿Qué modelo consulta/modifica?

7. Servicios externos:
   ¿Google?
   ¿Stripe?
   ¿Meta?
   ¿Supabase?
   ¿Resend?

8. Resultado:
   ¿Qué devuelve?

9. UI:
   ¿Cómo se muestra al usuario?

10. Escalabilidad:
    ¿Qué podría convertirse en bottleneck?
```

---

# 35. Importante sobre este documento

Este documento resume el **mapa técnico que hemos identificado hasta ahora** a partir de la estructura y archivos de Revly que hemos revisado.

No debe interpretarse como una auditoría línea por línea de todo el repositorio. Para construir el mapa definitivo de Revly, podemos revisar el código real funcionalidad por funcionalidad y sustituir los flujos conceptuales por los flujos exactos:

```text
Botón
  ↓
Componente
  ↓
Server Action / API
  ↓
Función
  ↓
Prisma / servicio externo
  ↓
PostgreSQL / API
  ↓
Respuesta
  ↓
Componente
  ↓
Usuario
```

Ese mapa será especialmente útil para analizar después **qué partes tocar, qué reutilizar y dónde pueden aparecer problemas de rendimiento o escalabilidad** en la siguiente fase del SaaS.
