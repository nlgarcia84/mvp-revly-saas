import prisma from "@/lib/db";
import {
  friendlyFacebookError,
  getBusinessOwnedPages,
  getUserFacebookPages,
  subscribePageToWebhooks,
} from "@/lib/facebook-graph";
import { NextResponse } from "next/server";

// Facebook nos llama aquí tras autorizar (o denegar) el acceso.
//   1. Cambiamos el "code" por un token short-lived de usuario.
//   2. Lo cambiamos por uno long-lived (60 días).
//   3. Listamos las páginas que administra el usuario.
//   4. Guardamos todo y volvemos a Settings.
const GRAPH_HOST = "https://graph.facebook.com/v21.0";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const authError = searchParams.get("error");
    const businessId = searchParams.get("state");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const settingsUrl = businessId
      ? `${appUrl}/business/${businessId}/settings`
      : `${appUrl}/business`;

    if (authError) {
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
        `${appUrl}/business?fb_error=ID de negocio no encontrado`,
      );
    }

    const clientId = process.env.META_CLIENT_ID!;
    const clientSecret = process.env.META_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/facebook/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent("La conexión con Facebook no está configurada (faltan el App ID y App Secret)")}`,
      );
    }

    // 1. Código → token short-lived de usuario.
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenResponse = await fetch(`${GRAPH_HOST}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenBody = await tokenResponse.text();
    if (!tokenResponse.ok) {
      console.error("[Facebook/Callback] Error cambiando código:", tokenBody);
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(friendlyFacebookError(tokenResponse.status, tokenBody))}`,
      );
    }
    const shortLivedToken = (
      JSON.parse(tokenBody) as { access_token?: string }
    ).access_token;
    if (!shortLivedToken) {
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=Facebook no devolvió un token de acceso`,
      );
    }

    // 2. Token long-lived (60 días).
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortLivedToken,
    });
    const longLivedResponse = await fetch(
      `${GRAPH_HOST}/oauth/access_token?${longLivedParams.toString()}`,
    );
    const longLivedBody = await longLivedResponse.text();
    if (!longLivedResponse.ok) {
      console.error("[Facebook/Callback] Error long-lived:", longLivedBody);
      return NextResponse.redirect(
        `${settingsUrl}?fb_error=${encodeURIComponent(friendlyFacebookError(longLivedResponse.status, longLivedBody))}`,
      );
    }
    const longLivedPayload = JSON.parse(longLivedBody) as {
      access_token?: string;
      expires_in?: number;
    };
    const userToken = longLivedPayload.access_token ?? shortLivedToken;
    const expiresIn =
      longLivedPayload.expires_in ?? (longLivedPayload.access_token ? 60 * 86400 : 0);
    // Si no viene expires_in, el token de usuario puede ser indefinido:
    // guardamos una fecha lejana.
    const expiry =
      (longLivedPayload.access_token
        ? new Date(Date.now() + expiresIn * 1000)
        : null) ?? new Date(Date.now() + 400 * 86400 * 1000);

    // 3. Páginas que administra el usuario. Si /me/accounts viene vacío
    // (páginas de un portfolio empresarial), probamos con /me/businesses.
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

    // 4. Guardamos el token de usuario long-lived junto con la lista de páginas.
    // Si administra varias, el usuario elige en Settings; si hay una, la conectamos.
    const pendingPayload = {
      token: userToken,
      expiry: expiry.toISOString(),
      at: new Date().toISOString(),
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        username: page.username ?? null,
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

    // Suscribimos la página a los webhooks; si falla, no bloquea la conexión.
    try {
      await subscribePageToWebhooks(page.access_token, page.id);
    } catch (error) {
      console.error("[Facebook/Callback] No se pudo suscribir a webhooks:", error);
    }

    return NextResponse.redirect(
      `${settingsUrl}?fb_success=${encodeURIComponent(`Conectado correctamente a ${page.name}`)}`,
    );
  } catch (error) {
    console.error("[Facebook/Callback] Error:", error);
    const businessId = new URL(request.url).searchParams.get("state");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.redirect(
      `${appUrl}/business/${businessId ?? ""}/settings?fb_error=${encodeURIComponent(errorMessage.slice(0, 400))}`,
    );
  }
}
