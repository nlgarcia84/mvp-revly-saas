# Smart Analytics — Google Reviews

Documentación técnica de la funcionalidad **Smart Analytics** para reseñas de Google en Revly.

> Última actualización: 2026-09-28.
> Ámbito: análisis de reseñas de Google mediante IA (sentimiento, categorías, conclusiones y propuestas), filtros por categoría y sección de conclusiones.

---

## 1. Qué es Smart Analytics

Smart Analytics analiza las reseñas de Google de un negocio mediante IA y, a partir de ese análisis, genera una visión agregada de la reputación. No sustituye a Google: Google sigue siendo la fuente de verdad; Revly solo guarda los **resultados del análisis**.

Cada reseña produce:

- **sentimiento** (`positive` / `neutral` / `negative`)
- **categorías** (ej. `servicio`, `comida`, `precio`, `personal`, `ambiente`)
- **aspectos positivos** (`positiveAspects`)
- **aspectos negativos** (`negativeAspects`)
- **resumen individual** (`summary`, en español)

A partir de los análisis individuales se construye la **analítica global**:

- total de reseñas analizadas
- distribución de sentimientos
- distribución de estrellas
- categorías principales
- fortalezas
- problemas recurrentes
- conclusión general
- propuestas de mejora

---

## 2. Arquitectura

```
Google Reviews (Places API / Business Profile API)
        │
        ▼
getBusinessGoogleReviews()          ── src/actions/google-reviews.ts
        │
        ▼
normalización                       ── normalizeReviews()  (estructura interna común)
        │
        ▼
¿existe ReviewAnalysis?             ── clave (businessId, source, externalReviewId)
   ├── Sí ──► reutilizar (0 llamadas IA)
   └── No ──► Groq / Qwen ──► parsear y validar JSON ──► guardar ReviewAnalysis
                                        │
                                        ▼
                              análisis global (determinista)
                                        │
                                        ▼
                                  Dashboard (UI)
```

El flujo vive en `getSmartAnalytics()` (`src/actions/review-analytics.ts`).

---

## 3. Fuentes de Google

Revly puede obtener reseñas de Google por dos vías:

| Fuente | Cómo | Límite |
|---|---|---|
| **Google Places API** | `src/lib/google-places.ts` (`fetchPlaceDetails`) | Solo devuelve unas pocas reseñas (típicamente 5). |
| **Google Business Profile API** | `src/lib/google-business-profile.ts` (`getBusinessReviews`) | Todas las reseñas, con paginación (`nextPageToken`). |

`getBusinessGoogleReviews()` intenta primero Business Profile (si el negocio está conectado vía OAuth) y, si no, hace fallback a Places.

El valor de `source` en cada reseña es:

- `"google-places"`
- `"google-business-profile"`

**Smart Analytics NO depende de que existan solo 5 reseñas.** El motor está diseñado para N reseñas (5, 50, 500, 5000…). No hay ningún `slice(0, 5)` ni límite artificial en la capa de análisis.

---

## 4. Identificación de una review

Cada reseña se identifica de forma determinista mediante dos campos:

- **`source`**: de qué API vino (`google-places` o `google-business-profile`).
- **`externalReviewId`**: identificador estable de la reseña.

Regla de derivación (`deriveExternalReviewId()`):

1. Si la reseña trae `reviewName` (nombre completo del recurso, disponible en Business Profile), se usa **`reviewName`** como identificador preferente.
2. Si no existe `reviewName` (caso Places), se usa un **fallback determinista**: hash FNV-1a de `source|authorName|time|rating`. El texto **nunca** es el identificador.

La restricción de unicidad es:

```
@@unique([businessId, source, externalReviewId])
```

Esto garantiza que una misma reseña no genere dos filas de análisis distintas y que, si vuelve a aparecer, se reutilice en lugar de duplicarse.

---

## 5. ReviewAnalysis

Modelo Prisma (`prisma/schema.prisma`):

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (uuid) | PK |
| `businessId` | String | FK → `Business` |
| `source` | String | `google-places` \| `google-business-profile` |
| `externalReviewId` | String | id estable de la reseña |
| `sentiment` | String | `positive` \| `neutral` \| `negative` |
| `categories` | Json | array de categorías |
| `positiveAspects` | Json | array de aspectos positivos |
| `negativeAspects` | Json | array de aspectos negativos |
| `summary` | String | resumen en español |
| `analyzedAt` | DateTime | `@default(now())` |
| `updatedAt` | DateTime | `@updatedAt` |

Índices:

- `@@unique([businessId, source, externalReviewId])`
- `@@index([businessId, source])`

**Importante:**

- `ReviewAnalysis` **NO es una copia** de las reseñas de Google. No guarda el texto de la reseña ni los datos del autor.
- **Google sigue siendo la fuente de verdad.**
- PostgreSQL (Supabase) almacena únicamente los **análisis derivados** que genera Revly.

---

## 6. IA

Revly usa **Groq API** con el modelo:

```
qwen/qwen3.8-27b
```

Endpoint: `https://api.groq.com/openai/v1/chat/completions`

Smart Analytics **reutiliza la infraestructura Groq existente** (no crea un cliente nuevo). La función base es `callGroq()` en `src/actions/generate-response.ts`, exportada para reutilizarla. `generateReviewResponse()` y `generateCommentResponse()` no se modificaron en su lógica.

El análisis individual pide a la IA un JSON estricto con esta forma:

```json
{
  "sentiment": "positive | neutral | negative",
  "categories": ["..."],
  "positiveAspects": ["..."],
  "negativeAspects": ["..."],
  "summary": "..."
}
```

**Validación del JSON** (`parseAnalysisJson()`): se eliminan los fences de markdown, se extrae el primer `{...}` válido, se parsea y se valida que `sentiment` esté en el enum, que los arrays sean arrays de strings y que `summary` sea texto. Si el JSON no es válido, la reseña se descarta de forma segura (no rompe el flujo).

---

## 7. Idempotencia y costes

Abrir el dashboard varias veces **no** vuelve a llamar a Groq para las mismas reseñas.

Ejemplo:

- **Primera carga**: 5 reseñas → 5 análisis (5 llamadas a Groq).
- **Segunda carga**: las mismas 5 reseñas → se reutilizan los 5 análisis → **0 llamadas nuevas**.
- **Aparece una nueva reseña**: 5 existentes + 1 nueva → **solo se analiza la nueva** (1 llamada).

La clave es `@@unique([businessId, source, externalReviewId])` + el paso previo que consulta qué `externalReviewId` ya existen y filtra las pendientes.

---

## 8. Escalabilidad

Diseñado para N reseñas (5, 50, 500, 5000…):

- No hay `slice` artificial de 5.
- El procesamiento usa **concurrencia limitada** (`mapWithConcurrency` con `CONCURRENCY = 5`), no `Promise.all` con miles de llamadas simultáneas.
- El motor (normalización + análisis + persistencia idempotente) está separado del trigger, por lo que puede moverse a un background job/queue sin reescribirlo.

**Limitación actual (conocida):** el primer análisis de un negocio con miles de reseñas se ejecuta de forma **síncrona** dentro del server action, por lo que la primera carga puede tardar. Esto es aceptable ahora; la cola es una mejora futura (ver §15).

---

## 9. Análisis global

El análisis global (`computeGlobalAnalytics()`) se construye **a partir de los `ReviewAnalysis` almacenados**, no se envían todas las reseñas completas a Groq de nuevo.

Calcula de forma determinista:

- **sentimiento**: distribución `positive` / `neutral` / `negative`.
- **estrellas**: distribución 1–5 (desde las reseñas normalizadas).
- **categorías**: top 6 por frecuencia.
- **fortalezas**: `positiveAspects` más frecuentes.
- **problemas recurrentes**: `negativeAspects` más frecuentes.
- **conclusión general**: texto determinista en español.
- **propuestas**: reglas deterministas (ver §10).

---

## 10. Conclusiones y propuestas

Sección **"CONCLUSIONES Y PROPUESTAS"** en el dashboard.

Actualmente:

- La **conclusión general** es **determinista** (construida a partir de sentimiento, categorías, fortalezas y problemas).
- Las **fortalezas** proceden de los análisis existentes (`positiveAspects`).
- Los **aspectos a mejorar** proceden de los problemas recurrentes (`negativeAspects`).
- Las **propuestas** se generan mediante **reglas deterministas basadas en keywords** (`PROPOSAL_RULES`), no realizan nuevas llamadas a Groq.

Ejemplos de reglas implementadas:

| Keyword detectada en el problema | Propuesta generada |
|---|---|
| `espera`, `tarda`, `demora`, `lento` | "Revisar los tiempos de espera y agilizar el servicio mencionado en las reseñas." |
| `frío`, `temperatura` | "Revisar la temperatura a la que se sirven los platos mencionados." |
| `combo`, `oferta`, `disponibilidad` | "Comprobar que la comunicación sobre combos y ofertas coincida con su disponibilidad real." |
| `recoger`, `en mesa` | "Revisar el flujo de servicio en mesa para evitar que el cliente tenga que recoger sus propios platos." |
| `precio`, `caro` | "Revisar la relación calidad-precio de los productos mencionados en las reseñas." |
| `atención`, `personal`, `trato` | "Revisar la atención al cliente del personal mencionado en las reseñas." |
| `calidad`, `sabor`, `preparación` | "Revisar la preparación y calidad de los platos mencionados." |
| `limpieza`, `higiene` | "Revisar la limpieza e higiene de las instalaciones." |

Si ninguna regla coincide, se usa un fallback atado al problema real: `Revisar el aspecto detectado: <problema>.`

---

## 11. Filtros

Las categorías detectadas por Smart Analytics también alimentan los **filtros de Google Reviews**.

Se pueden combinar:

- **categoría**
- **valoración** (estrellas)
- **fecha**

Detalles:

- El estado del filtro vive en `GoogleReviewsSection` y se comparte con `SmartAnalyticsSection`, de modo que las categorías de "Principales categorías" y las del filtro "Categoría" usan **el mismo sistema** (un chip clicable activa/desactiva el filtro).
- El filtrado se hace en cliente usando el índice `externalReviewId → categories` obtenido de `ReviewAnalysis` (sin llamadas nuevas a IA).
- El recuento de cada chip (`comida (5)`) es el número de reseñas que tienen esa categoría.
- Smart Analytics general sigue representando **todas** las reseñas; no reacciona al filtro.

---

## 12. Componentes y archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/review-analysis.ts` | Motor puro (sin I/O). Normalización, `deriveExternalReviewId`, prompt de IA, `parseAnalysisJson`, `computeGlobalAnalytics`, conclusiones/propuestas deterministas y `mapWithConcurrency`. |
| `src/actions/review-analytics.ts` | Server action `getSmartAnalytics()`. Auth + ownership, orquestación del análisis idempotente, persistencia en `ReviewAnalysis` y cálculo del global. Devuelve también `reviewCategories` (índice para filtros). |
| `src/components/smart-analytics-section.tsx` | UI de Smart Analytics (sentimiento, estrellas, categorías, conclusiones y propuestas). Recibe el estado del filtro y reporta el índice de categorías al padre. |
| `src/components/google-reviews-section.tsx` | Sección de reseñas de Google. Filtros (valoración/fecha/categoría), lista filtrada y renderiza `SmartAnalyticsSection`. |
| `src/actions/generate-response.ts` | Infraestructura Groq base (`callGroq`, modelo, API URL). Se exportó `callGroq` para reutilizarla. |
| `src/actions/google-reviews.ts` | `getBusinessGoogleReviews()` (Places/GBP) y ahora devuelve `source`. |
| `prisma/schema.prisma` | Modelo `ReviewAnalysis` + relación en `Business`. |
| `prisma/migrations/20260927000000_add_review_analysis/migration.sql` | Creación de la tabla `ReviewAnalysis` e índices. |

---

## 13. Seguridad

- **Supabase Auth**: toda operación exige sesión (`createClient()` + `auth.getUser()`).
- **Ownership**: `getSmartAnalytics()` valida que el `businessId` pertenezca al `userId` actual (`business.findFirst({ where: { id, userId } })`).
- **Aislamiento**: `ReviewAnalysis` siempre se consulta filtrando por `businessId`; un usuario nunca puede leer análisis de otro negocio.
- **`GROQ_API_KEY`**: se lee solo en servidor (`callGroq`), nunca se expone al cliente.

---

## 14. Qué NO debe hacerse en el futuro

### Reglas para futuros cambios

- No crear otra tabla `Review` para copiar las reseñas de Google.
- No crear otro cliente Groq (reutilizar `callGroq`).
- No analizar todas las reseñas en cada carga (mantener la idempotencia).
- No limitar Smart Analytics artificialmente a 5.
- No enviar miles de reseñas completas a Groq en un único prompt.
- No romper Google Business Profile / Places.
- No mezclar Facebook/Instagram con esta implementación sin una decisión arquitectónica explícita.
- No introducir Redis/colas sin una necesidad real.

---

## 15. Futuras mejoras

**Pendientes (NO implementadas):**

- Background jobs/queue para grandes volúmenes (mover el procesamiento síncrono actual).
- Análisis contextual por categoría.
- Priorización de problemas.
- Tendencias a lo largo del tiempo.
- Comparación entre periodos.
- Soporte futuro para Facebook/Instagram.
- Análisis estratégico más avanzado mediante IA.

**Implementado actualmente:** análisis individual con IA, analítica global determinista, conclusiones y propuestas, filtros por categoría combinables, idempotencia y escalabilidad controlada.

---

## Nota operativa

- **Migración**: `npx prisma migrate deploy` (nunca `prisma migrate reset` ni `prisma db push` contra producción).
- **Build en Vercel**: `vercel-build = prisma generate && next build` (Vercel **no** ejecuta migraciones automáticamente; aplicar manualmente si se añaden nuevas migraciones).
