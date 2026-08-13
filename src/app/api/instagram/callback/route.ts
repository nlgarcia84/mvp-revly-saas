import prisma from "@/lib/db";
import {
  exchangeForLongLivedToken,
  friendlyMetaError,
} from "@/lib/instagram-graph";
import { NextResponse } from "next/server";

// ─── Facebook nos llama aquí tras autorizar (o negar) ──
// el acceso en la pantalla de consentimiento.
//
//   1. Recibimos un "code" que cambiamos por un token corto
//   2. Lo cambiamos por un long-lived token (60 días)
//   3. Buscamos la página de Facebook vinculada y su
//      cuenta profesional de Instagram
//   4. Guardamos todo en la base de datos
//   5. Redirigimos de vuelta a Settings
// ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const businessId = searchParams.get("state"); // lo enviamos desde connect

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const settingsUrl = businessId
      ? `${APP_URL}/business/${businessId}/settings`
      : `${APP_URL}/business`;

    // Si el usuario denegó el permiso, volvemos a Settings
    if (error) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=Acceso denegado a Instagram`,
      );
    }
    if (!code) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=No se recibió código de autorización`,
      );
    }
    if (!businessId) {
      return NextResponse.redirect(
        `${APP_URL}/business?ig_error=ID de negocio no encontrado`,
      );
    }

    const META_CLIENT_ID = process.env.META_CLIENT_ID!;
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
    const REDIRECT_URI = `${APP_URL}/api/instagram/callback`;

    if (!META_CLIENT_ID || !META_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent("La conexión con Instagram no está configurada (faltan META_CLIENT_ID y META_CLIENT_SECRET)")}`,
      );
    }

    // 1. Cambiamos el código por un token (validez ~2 horas)
    const tokenParams = new URLSearchParams({
      client_id: META_CLIENT_ID,
      client_secret: META_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`,
    );

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[Instagram/Callback] Error cambiando código:", body);
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(friendlyMetaError(tokenRes.status, body))}`,
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=Meta no devolvió un token de acceso`,
      );
    }

    // 2. Cambiamos el token corto por uno long-lived (60 días)
    const { accessToken, expiresAt } = await exchangeForLongLivedToken(
      tokenData.access_token,
    );

    // 3. Buscamos las páginas de Facebook del usuario y su
    //    cuenta de Instagram asociada. La conexión va ligada
    //    a la página, por eso pedimos páginas_show_list.
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!pagesRes.ok) {
      const body = await pagesRes.text();
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(friendlyMetaError(pagesRes.status, body))}`,
      );
    }

    const pagesData = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        instagram_business_account?: { id?: string; username?: string };
      }>;
    };
    const pages = pagesData.data ?? [];

    // Buscamos la cuenta de Instagram asociada a cualquiera de
    // las páginas (priorizamos la que coincida con el negocio)
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    let match =
      pages.find(
        (p) =>
          p.name?.toLowerCase().includes(business?.name.toLowerCase() ?? "____"),
      ) ?? pages.find((p) => p.instagram_business_account);

    if (!match?.instagram_business_account?.id) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(
          "Ninguna de tus páginas de Facebook tiene una cuenta profesional de Instagram vinculada. Convierte tu Instagram a Business/Creator y vincúlalo a una página de Facebook (Configuración de Instagram → Cuenta profesional → Página vinculada).",
        )}`,
      );
    }

    const igAccount = match.instagram_business_account;

    // 4. Guardamos tokens, IDs de página/Instagram y usuario
    await prisma.business.update({
      where: { id: businessId },
      data: {
        instagramAccessToken: accessToken,
        instagramTokenExpiry: expiresAt,
        instagramPageId: match.id,
        instagramBusinessAccountId: igAccount.id,
        instagramUsername: igAccount.username ?? null,
      },
    });

    // 5. Redirigimos a Settings con mensaje de éxito
    return NextResponse.redirect(
      `${settingsUrl}?ig_success=${encodeURIComponent(`Conectado correctamente a Instagram (@${igAccount.username ?? "cuenta"})`)}`,
    );
  } catch (e) {
    console.error("[Instagram/Callback] Error:", e);
    const businessId = new URL(request.url).searchParams.get("state");
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.redirect(
      `${APP_URL}/business/${businessId ?? ""}/settings?ig_error=${encodeURIComponent(msg.slice(0, 400))}`,
    );
  }
}