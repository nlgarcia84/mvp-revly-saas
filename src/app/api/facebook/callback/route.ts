import prisma from "@/lib/db";
import {
  friendlyFacebookError,
  getBusinessOwnedPages,
  getUserFacebookPages,
  subscribePageToWebhooks,
} from "@/lib/facebook-graph";
import { NextResponse } from "next/server";

// ─── Facebook nos llama aquí tras autorizar (o negar) ─
// el acceso en la pantalla de consentimiento.
//
//   1. Recibimos un "code" que cambiamos por un token
//      short-lived de usuario (POST /oauth/access_token)
//   2. Lo cambiamos por un long-lived (60 días)
//   3. Listamos las páginas que administra el usuario. Si
//      hay una sola la conectamos; si hay varias, guardamos
//      la lista y el usuario elige en Settings
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

    // 3. Listamos las páginas que administra el usuario.
    //    Si /me/accounts viene vacío (típico en páginas
    //    que pertenecen a un portfolio empresarial),
    //    probamos por los businesses con business_management.
    let pages = await getUserFacebookPages(userToken);
    if (pages.length === 0) {
      pages = await getBusinessOwnedPages(userToken);
    }
    if (pages.length === 0) {
      console.error("[Facebook/Callback] El token no devolvió ninguna Página.");
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(
          "No se encontró ninguna Página de Facebook. Comprueba que la cuenta con la que autorizas administra la Página y que concediste acceso a las Páginas al autorizar.",
        )}`,
      );
    }

    // 4. Guardamos el token de usuario long-lived (necesario
    //    para obtener el token de la página) junto con la
    //    lista de páginas. Si administra varias, dejamos que
    //    el usuario elija en Settings; si solo hay una, la
    //    conectamos directamente.
    const pendingPayload = {
      token: userToken,
      expiry: expiry.toISOString(),
      at: new Date().toISOString(),
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username ?? null,
      })),
    };

    if (pages.length > 1) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          facebookPending: pendingPayload,
          facebookAccessToken: null,
          facebookTokenExpiry: null,
          facebookPageId: null,
          facebookPageName: null,
          facebookUsername: null,
          facebookCacheAt: null,
          facebookCache: null,
        },
      });
      return NextResponse.redirect(`${settingsUrl}?fb_select=1`);
    }

    const page = pages[0];
    await prisma.business.update({
      where: { id: businessId },
      data: {
        facebookAccessToken: page.access_token,
        facebookTokenExpiry: expiry,
        facebookPageId: page.id,
        facebookPageName: page.name,
        facebookUsername: page.username ?? null,
        facebookPending: null,
      },
    });

    // Suscribimos la página a los webhooks (comentarios en
    // tiempo real). No bloquea la conexión si falla.
    try {
      await subscribePageToWebhooks(page.access_token, page.id);
    } catch (e) {
      console.error("[Facebook/Callback] No se pudo suscribir a webhooks:", e);
    }

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