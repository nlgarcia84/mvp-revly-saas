import prisma from "@/lib/db";
import {
  exchangeForLongLivedToken,
  friendlyMetaError,
  getInstagramUserProfile,
} from "@/lib/instagram-graph";
import { NextResponse } from "next/server";

// ─── Instagram nos llama aquí tras autorizar (o negar) ─
// el acceso en la pantalla de consentimiento.
//
//   1. Recibimos un "code" que cambiamos por un token corto
//      (POST a api.instagram.com/oauth/access_token)
//   2. Lo cambiamos por un long-lived token (60 días)
//   3. Obtenemos el username de la cuenta profesional
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

    const INSTAGRAM_CLIENT_ID = process.env.META_CLIENT_ID!;
    const INSTAGRAM_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
    const REDIRECT_URI = `${APP_URL}/api/instagram/callback`;

    if (!INSTAGRAM_CLIENT_ID || !INSTAGRAM_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent("La conexión con Instagram no está configurada (faltan el App ID y App Secret de Instagram)")}`,
      );
    }

    // 1. Cambiamos el código por un token corto (validez ~1 hora)
    const tokenParams = new URLSearchParams({
      client_id: INSTAGRAM_CLIENT_ID,
      client_secret: INSTAGRAM_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
    });
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[Instagram/Callback] Error cambiando código:", body);
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(friendlyMetaError(tokenRes.status, body))}`,
      );
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      user_id?: string;
    };
    if (!tokenData.access_token || !tokenData.user_id) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=Instagram no devolvió un token de acceso`,
      );
    }

    // 2. Cambiamos el token corto por uno long-lived (60 días)
    const { accessToken, expiresAt } = await exchangeForLongLivedToken(
      tokenData.access_token,
    );

    // 3. Obtenemos el username de la cuenta conectada
    const profile = await getInstagramUserProfile(accessToken, tokenData.user_id);
    if (!profile.username) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(
          "No se pudo obtener el usuario de Instagram. Comprueba que la cuenta sea profesional (Business o Creator).",
        )}`,
      );
    }

    // 4. Guardamos token, ID de cuenta e Instagram y username
    await prisma.business.update({
      where: { id: businessId },
      data: {
        instagramAccessToken: accessToken,
        instagramTokenExpiry: expiresAt,
        instagramBusinessAccountId: profile.id,
        instagramUsername: profile.username,
      },
    });

    // 5. Redirigimos a Settings con mensaje de éxito
    return NextResponse.redirect(
      `${settingsUrl}?ig_success=${encodeURIComponent(`Conectado correctamente a Instagram (@${profile.username})`)}`,
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