import prisma from "@/lib/db";
import {
  friendlyFacebookError,
  getUserFacebookPages,
} from "@/lib/facebook-graph";
import { NextResponse } from "next/server";

// ─── Facebook nos llama aquí tras autorizar (o negar) ─
// el acceso en la pantalla de consentimiento.
//
//   1. Recibimos un "code" que cambiamos por un token
//      short-lived de usuario (POST /oauth/access_token)
//   2. Lo cambiamos por un long-lived (60 días)
//   3. Listamos las páginas que administra el usuario y
//      guardamos la primera como página del negocio
//   4. Redirigimos de vuelta a Settings
// ─────────────────────────────────────────────────────
const GRAPH_HOST = "https://graph.facebook.com/v21.0";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const businessId = searchParams.get("state");

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const settingsUrl = businessId
      ? `${APP_URL}/business/${businessId}/settings`
      : `${APP_URL}/business`;

    if (error) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=Acceso denegado a Facebook`,
      );
    }
    if (!code) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=No se recibió código de autorización`,
      );
    }
    if (!businessId) {
      return NextResponse.redirect(
        `${APP_URL}/business?fb_error=ID de negocio no encontrado`,
      );
    }

    const CLIENT_ID = process.env.META_CLIENT_ID!;
    const CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
    const REDIRECT_URI = `${APP_URL}/api/facebook/callback`;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent("La conexión con Facebook no está configurada (faltan el App ID y App Secret)")}`,
      );
    }

    // 1. Cambiamos el código por un token short-lived de usuario
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    });
    const tokenRes = await fetch(`${GRAPH_HOST}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error("[Facebook/Callback] Error cambiando código:", tokenBody);
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(friendlyFacebookError(tokenRes.status, tokenBody))}`,
      );
    }
    const shortLived = (JSON.parse(tokenBody) as { access_token?: string })
      .access_token;
    if (!shortLived) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=Facebook no devolvió un token de acceso`,
      );
    }

    // 2. Token long-lived (60 días)
    const longParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      fb_exchange_token: shortLived,
    });
    const longRes = await fetch(
      `${GRAPH_HOST}/oauth/access_token?${longParams.toString()}`,
    );
    const longBody = await longRes.text();
    if (!longRes.ok) {
      console.error("[Facebook/Callback] Error long-lived:", longBody);
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(friendlyFacebookError(longRes.status, longBody))}`,
      );
    }
    const longData = JSON.parse(longBody) as {
      access_token?: string;
      expires_in?: number;
    };
    const userToken = longData.access_token ?? shortLived;
    const expiresIn =
      longData.expires_in ?? (longData.access_token ? 60 * 86400 : 0);
    // Si no viene expires_in el token larga duración de usuario
    // puede ser indefinido; guardamos una fecha lejana.
    const expiry =
      (longData.access_token ? new Date(Date.now() + expiresIn * 1000) : null) ??
      new Date(Date.now() + 400 * 86400 * 1000);

    // 3. Listamos las páginas que administra el usuario
    const pages = await getUserFacebookPages(userToken);
    if (pages.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(
          "No se encontró ninguna Página de Facebook vinculada a tu cuenta. Administra al menos una página y vuelve a intentarlo.",
        )}`,
      );
    }

    // Usamos la primera página (la más probable que administre
    // el negocio). El token de página no caduca salvo que se
    // revoque, pero usamos la fecha del token de usuario.
    const page = pages[0];

    // 4. Guardamos página y token en la base de datos
    await prisma.business.update({
      where: { id: businessId },
      data: {
        facebookAccessToken: page.access_token,
        facebookTokenExpiry: expiry,
        facebookPageId: page.id,
        facebookPageName: page.name,
        facebookUsername: page.username ?? null,
      },
    });

    // 5. Redirigimos a Settings con mensaje de éxito
    return NextResponse.redirect(
      `${settingsUrl}?fb_success=${encodeURIComponent(`Conectado correctamente a ${page.name}`)}`,
    );
  } catch (e) {
    console.error("[Facebook/Callback] Error:", e);
    const businessId = new URL(request.url).searchParams.get("state");
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.redirect(
      `${APP_URL}/business/${businessId ?? ""}/settings?fb_error=${encodeURIComponent(msg.slice(0, 400))}`,
    );
  }
}