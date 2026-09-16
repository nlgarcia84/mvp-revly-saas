import prisma from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

// ─── Webhook de Meta (Instagram + Páginas de Facebook) ─
// Meta llama a esta ruta cuando hay actividad en las
// cuentas conectadas (por ejemplo, comentarios nuevos).
//
//   GET  → verificación del endpoint (hub.challenge)
//   POST → notificación de eventos. Invalidamos la caché
//          del negocio correspondiente para que el
//          dashboard vuelva a pedir los datos a Meta en
//          la próxima apertura.
//
// Variables de entorno:
//   META_WEBHOOK_VERIFY_TOKEN → cadena que definimos en el
//     panel de Meta (Webhooks → Verify Token).
//   META_CLIENT_SECRET → se usa para validar la firma
//     X-Hub-Signature-256 de cada notificación.
// ─────────────────────────────────────────────────────

// ─── Verificación del endpoint ───────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── Valida la firma HMAC que envía Meta ─────────────
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type MetaWebhookEntry = { id?: string };
type MetaWebhookBody = { object?: string; entry?: MetaWebhookEntry[] };

// ─── Invalida la caché del negocio afectado ──────────
// El objeto "page" corresponde a Páginas de Facebook y
// "instagram" a la API de Instagram. Buscamos el negocio
// por el ID de la cuenta y borramos su caché.
async function handleMetaEvent(body: MetaWebhookBody) {
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    const accountId = entry?.id;
    if (!accountId) continue;

    if (body.object === "page") {
      await prisma.business.updateMany({
        where: { facebookPageId: accountId },
        data: { facebookCacheAt: null, facebookCache: null },
      });
    } else if (body.object === "instagram") {
      await prisma.business.updateMany({
        where: { instagramBusinessAccountId: accountId },
        data: { instagramCacheAt: null, instagramCache: null },
      });
    }
  }
}

// ─── Notificaciones de Meta ──────────────────────────
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.META_CLIENT_SECRET;
  const signature = request.headers.get("x-hub-signature-256");

  // Si hay App Secret configurado, exigimos una firma
  // válida para descartar peticiones falsas.
  if (secret && !verifySignature(rawBody, signature, secret)) {
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody) as MetaWebhookBody;
    await handleMetaEvent(body);
  } catch (e) {
    console.error("[Meta Webhook] Error procesando evento:", e);
  }

  // Meta espera siempre un 200 rápido; si no, reintenta.
  return NextResponse.json({ received: true }, { status: 200 });
}
