# Guía para entender Revly desde cero

Esta guía explica el proyecto **sin dar por hecho que sabes programar**. La idea es
que entiendas **qué hace**, **por dónde pasa cada cosa** y **en qué orden leerlo**.
No hace falta memorizar nada: se trata de hacerse un mapa mental.

---

## 1. ¿Qué es Revly, en palabras simples?

Revly es una herramienta para **negocios pequeños** (una cafetería, una peluquería,
un gimnasio...). Les ayuda a tres cosas:

1. **Conseguir clientes y opiniones.** El negocio tiene una página pública con su
   enlace. Un cliente entra, deja sus datos y, si quiere, deja una reseña.
2. **Fidelizar con puntos.** Cada vez que un cliente rellena el formulario suma un
   punto. Con 5 puntos consigue un descuento. También puede canjear facturas.
3. **Cuidar su reputación en internet.** Revly trae las reseñas de Google y los
   comentarios de Instagram y Facebook, y ayuda a responderlos con inteligencia
   artificial.

Piensa en Revly como el **mostrador digital** del negocio: recoge clientes, guarda
puntos y atiende las opiniones.

---

## 2. La app como si fuera un edificio

Imagina que Revly es un edificio con varias plantas y oficinas. Cada carpeta del
proyecto es una zona del edificio:

| Zona del edificio | Carpeta en el proyecto | Qué hay ahí |
|---|---|---|
| Fachada y escaparate | `src/app/` | Las páginas que ve la gente (pantallas). |
| Oficinas internas | `src/actions/` | El trabajo de verdad: guardar, enviar, calcular. |
| Taller de herramientas | `src/lib/` | Conexiones con servicios externos (Google, Meta, Stripe...). |
| Muebles y decoración | `src/components/` | Botones, tarjetas, formularios reutilizables. |
| Almacén | `prisma/` | El modelo de datos: qué guardamos y cómo. |
| Documentación | `README.md`, `GOOGLE-BP-CONTEXT.md` | Manuales y estado del proyecto. |

Cuando alguien usa la app, el recorrido siempre es el mismo:

**Pantalla (`src/app`) → Trabajo (`src/actions`) → Herramienta (`src/lib`) → Almacén (`prisma`).**

Si entiendes ese recorrido, entiendes el proyecto.

---

## 3. El almacén: qué guardamos

El "almacén" es la base de datos. Guarda, a grandes rasgos:

- **Usuario:** quien usa Revly (dueño del negocio).
- **Negocio:** cada negocio que crea ese usuario. Tiene un enlace público propio.
- **Cliente:** los clientes que dejan sus datos a través del formulario público.
- **Factura:** números de factura que el negocio da de alta para que los clientes canjeen.
- **Suscripción:** el plan de pago del usuario.

Además, en el negocio se guardan "llaves" (tokens) para poder hablar con Google e
Instagram/Facebook en nombre del negocio. Es como guardar la contraseña de una
cerradura para poder abrirla más tarde sin que el cliente la escriba cada vez.

Todo esto se describe en `prisma/schema.prisma`. No hace falta entender la sintaxis:
solo mira los nombres y piensa "esto es un usuario, esto es un negocio, etc.".

---

## 4. Los recorridos principales (los "viajes" del usuario)

### Viaje A — El dueño se registra y entra
1. Entra en la página de registro y crea su cuenta.
2. Inicia sesión. La app comprueba quién es (esto se llama "autenticación") y le
   muestra su panel privado.
3. Todo lo que es privado vive bajo `(dashboard)`.

### Viaje B — El dueño crea un negocio
1. Rellena el nombre, el enlace de Google, etc.
2. La app le crea una **página pública** con una dirección parecida a
   `revly.es/nombre-del-negocio`.
3. Esa página pública es la que comparte con sus clientes.

### Viaje C — El cliente deja sus datos (el más importante)
1. El cliente abre el enlace público (`src/app/[slug]/`).
2. Rellena el formulario (nombre, email, teléfono) y lo envía.
3. La app guarda al cliente y le suma **1 punto**.
4. Si el cliente deja una reseña, la app la registra también.

### Viaje D — Puntos y descuento
1. Cada formulario relleno suma 1 punto.
2. Al llegar a 5 puntos, el cliente puede conseguir un **10% de descuento**.
3. La app le genera un **código único** (tipo `REVLY-A3X9`) y un **código de barras**
   que enseña en el móvil.

### Viaje E — Canje de factura
1. El negocio da de alta números de factura en su panel.
2. El cliente introduce el número de una factura y la "canjea" para ganar puntos.
3. Cada factura solo se puede usar **una vez**. El negocio tiene un **PIN de 4 dígitos**
   para confirmar el canje en caja.

### Viaje F — Reseñas de Google
- Si el negocio **no** ha conectado su cuenta de Google: la app usa una herramienta
  pública de Google que solo devuelve **5 reseñas**.
- Si el negocio **sí** conecta su cuenta de Google: la app puede traer **todas** las
  reseñas. Esto requiere que Google apruebe el acceso (es la parte que está pendiente).

### Viaje G — Instagram y Facebook
- El negocio conecta su cuenta de Instagram profesional y/o su página de Facebook.
- La app trae las publicaciones y sus comentarios.
- El dueño puede pedir a la **IA** que redacte una respuesta y publicarla sin salir
  de Revly. También puede publicar contenido en Facebook.

### Viaje H — Planes y pagos
- Hay tres planes: **Básico** (gratis), **Avanzado** (9€) y **Pro** (19€).
- Cada plan desbloquea funciones (por ejemplo, la IA está en los tres, pero otras
  cosas como los informes PDF solo están en Pro).
- Los pagos se gestionan con **Stripe**.

---

## 5. Los servicios externos, explicados fácil

Revly no lo hace todo solo: se apoya en otros servicios. Cada uno vive en `src/lib/`.

- **Supabase** → es el "portero": guarda las cuentas y comprueba quién entra.
- **Google Places** → un escaparate público de reseñas (solo da 5).
- **Google Business Profile** → la puerta "de servicio" a Google (da todas las reseñas,
  pero hay que pedir permiso a Google).
- **Instagram / Facebook (Meta)** → para leer y responder comentarios.
- **Groq** → el "redactor" con inteligencia artificial que escribe las respuestas.
- **Resend** → el "cartero" que envía los emails de invitación.
- **Stripe** → el "cajero" que cobra las suscripciones.
- **Vercel** → donde "vive" la app en internet (producción: `revly.es`).

---

## 6. Glosario de palabras que aparecen mucho

- **Servidor:** un ordenador que hace el trabajo "detrás del telón" (no se ve).
- **Cliente (en el código):** dos significados. A veces es el cliente del negocio
  (una persona), y a veces es el navegador del usuario. Según el contexto.
- **Página / Pantalla:** lo que se ve en el navegador.
- **Formulario:** los campos donde escribes datos.
- **Base de datos:** el almacén donde se guarda todo de forma ordenada.
- **Token / Llave:** un permiso temporal que se guarda para no pedir la contraseña
  cada vez que hablamos con otro servicio.
- **Migración:** un cambio en el almacén (por ejemplo, añadir una caja nueva).
- **Desplegar / Deploy:** publicar la app en internet para que la use la gente.
- **Caché:** una copia temporal de datos para no preguntar lo mismo mil veces.
  En Revly dura 3 minutos en redes sociales.
- **IA (Inteligencia Artificial):** aquí, un servicio que redacta respuestas.
- **OAuth:** la pantalla donde un servicio externo te pregunta "¿autorizas a Revly?".

---

## 7. En qué orden leer el proyecto (ruta recomendada)

1. `README.md` → qué es y cómo se arranca.
2. `GOOGLE-BP-CONTEXT.md` → estado real, decisiones y bloqueos.
3. `prisma/schema.prisma` → el almacén (solo los nombres).
4. `src/app/` → mira la estructura de carpetas y piensa en "páginas".
5. `src/app/[slug]/` → el formulario público del cliente.
6. `src/actions/customers.ts` → qué pasa cuando el cliente envía el formulario.
7. `src/actions/send.ts` → cómo se envía un email.
8. `src/lib/sentiment.ts` → cómo se decide si un comentario es negativo.
9. `src/actions/generate-response.ts` → cómo la IA escribe una respuesta.
10. `src/lib/google-places.ts` → la integración más sencilla (solo una llave).
11. `src/lib/stripe.ts` + `src/app/api/stripe/` → pagos.
12. `src/lib/instagram-graph.ts` y `src/lib/facebook-graph.ts` → redes sociales.
13. `src/lib/subscription.ts` → qué funciones tiene cada plan.

---

## 8. Cómo arrancar el proyecto en tu ordenador

No hace falta saber programar para levantarlo, solo seguir los pasos:

1. Instala **Node.js** (versión 20 o superior).
2. Descarga el proyecto y abre una terminal en esa carpeta.
3. Ejecuta `npm install` (descarga las piezas necesarias).
4. Copia el archivo `.env.local` (contiene las llaves de los servicios).
5. Ejecuta `npx prisma migrate deploy` (prepara el almacén).
6. Ejecuta `npm run dev` y abre `http://localhost:3000`.

Si algo falla, casi siempre es por una **llave que falta** en `.env.local`.

---

## 9. Reglas de oro para no perderse

- Cada función nueva sigue el mismo patrón: **pantalla → action → lib → almacén**.
- Si no entiendes un archivo, busca primero su nombre y pregúntate: "¿esto es una
  pantalla, un trabajo, una herramienta o un dato?".
- Los servicios externos casi siempre tienen su propio archivo en `src/lib/`.
- Lo privado vive en `(dashboard)`; lo público (clientes) vive en `[slug]`.
- Antes de tocar datos, mira `prisma/schema.prisma`: ahí está la verdad de qué se guarda.

---

Con esto ya puedes recorrer el proyecto sin miedo. Lo demás se aprende usándolo.
