import prisma from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Webhook de Meta (Instagram + Páginas de Facebook). Meta llama aquí cuando
// hay actividad (p. ej. comentarios nuevos).
//   GET  → verificación del endpoint (hub.challenge)
//   POST → notificación de eventos; invalidamos la caché del negocio para
//          que el dashboard vuelva a pedir los datos en la próxima apertura.
// Variables: META_WEBHOOK_VERIFY_TOKEN (verificación) y META_CLIENT_SECRET
// (validar la firma X-Hub-Signature-256).

// Verificación del endpoint.
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

// Valida la firma HMAC que envía Meta.
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

type MetaWebhookEntry = { id?: string };
type MetaWebhookBody = { object?: string; entry?: MetaWebhookEntry[] };

// Invalida la caché del negocio afectado. El objeto "page" es de Páginas de
// Facebook e "instagram" de la API de Instagram; buscamos por el ID de cuenta.
async function handleMetaEvent(payload: MetaWebhookBody) {
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    const accountId = entry?.id;
    if (!accountId) continue;

    if (payload.object === "page") {
      await prisma.business.updateMany({
        where: { facebookPageId: accountId },
        data: { facebookCacheAt: null, facebookCache: null },
      });
    } else if (payload.object === "instagram") {
      await prisma.business.updateMany({
        where: { instagramBusinessAccountId: accountId },
        data: { instagramCacheAt: null, instagramCache: null },
      });
    }
  }
}

// Notificaciones de Meta.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.META_CLIENT_SECRET;
  const signature = request.headers.get("x-hub-signature-256");

  // Si hay App Secret configurado, exigimos una firma válida.
  if (secret && !verifySignature(rawBody, signature, secret)) {
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const payload = JSON.parse(rawBody) as MetaWebhookBody;
    await handleMetaEvent(payload);
  } catch (error) {
    console.error("[Meta Webhook] Error procesando evento:", error);
  }

  // Meta espera siempre un 200 rápido; si no, reintenta.
  return NextResponse.json({ received: true }, { status: 200 });
}
