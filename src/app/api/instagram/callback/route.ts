import prisma from "@/lib/db";
import {
  exchangeForLongLivedToken,
  friendlyMetaError,
  getInstagramClientId,
  getInstagramClientSecret,
  getInstagramUserProfile,
} from "@/lib/instagram-graph";
import { NextResponse } from "next/server";

// Instagram nos llama aquí tras autorizar (o denegar) el acceso.
//   1. Cambiamos el "code" por un token corto.
//   2. Lo cambiamos por uno long-lived (60 días).
//   3. Obtenemos el username de la cuenta profesional.
//   4. Guardamos todo y volvemos a Settings.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const authError = searchParams.get("error");
    const businessId = searchParams.get("state");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const settingsUrl = businessId
      ? `${appUrl}/business/${businessId}/redes`
      : `${appUrl}/business`;

    if (authError) {
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
        `${appUrl}/business?ig_error=ID de negocio no encontrado`,
      );
    }

    const clientId = getInstagramClientId();
    const clientSecret = getInstagramClientSecret();
    const redirectUri = `${appUrl}/api/instagram/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent("La conexión con Instagram no está configurada (faltan el App ID y App Secret de Instagram)")}`,
      );
    }

    // 1. Código → token corto (~1 hora).
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString(),
      },
    );

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      console.error("[Instagram/Callback] Error cambiando código:", body);
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(friendlyMetaError(tokenResponse.status, body))}`,
      );
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      user_id?: string;
    };
    if (!tokenPayload.access_token || !tokenPayload.user_id) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=Instagram no devolvió un token de acceso`,
      );
    }

    // 2. Token corto → long-lived (60 días).
    // Si el intercambio falla, el token que Instagram acaba de devolver sigue
    // siendo válido, así que lo conservamos en vez de tirar la conexión: Meta
    // lo renueva con refresh_access_token (ya implementado en actions/instagram).
    let accessToken = tokenPayload.access_token;
    let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      const exchanged = await exchangeForLongLivedToken(accessToken);
      accessToken = exchanged.accessToken;
      expiresAt = exchanged.expiresAt;
    } catch (error) {
      console.error(
        "[Instagram/Callback] No se pudo hacer el long-lived exchange; se guarda el token inicial:",
        error,
      );
    }

    // 3. Username de la cuenta conectada. El ID de cuenta ya viene en la
    // respuesta del token, así que si /me falla guardamos la conexión igualmente
    // y dejamos el username vacío.
    let accountId = tokenPayload.user_id;
    let username = "";
    try {
      const profile = await getInstagramUserProfile(
        accessToken,
        tokenPayload.user_id,
      );
      accountId = profile.id || accountId;
      username = profile.username;
    } catch (error) {
      console.error(
        "[Instagram/Callback] No se pudo leer /me; se guarda la conexión sin username:",
        error,
      );
    }

    if (!accountId) {
      return NextResponse.redirect(
        `${settingsUrl}?ig_error=${encodeURIComponent(
          "No se pudo obtener el usuario de Instagram. Comprueba que la cuenta sea profesional (Business o Creator).",
        )}`,
      );
    }

    // 4. Guardamos token, ID de cuenta y username.
    await prisma.business.update({
      where: { id: businessId },
      data: {
        instagramAccessToken: accessToken,
        instagramTokenExpiry: expiresAt,
        instagramBusinessAccountId: accountId,
        instagramUsername: username || null,
      },
    });

    return NextResponse.redirect(
      `${settingsUrl}?ig_success=${encodeURIComponent(
        username
          ? `Conectado correctamente a Instagram (@${username})`
          : "Conectado correctamente a Instagram",
      )}`,
    );
  } catch (error) {
    console.error("[Instagram/Callback] Error:", error);
    const businessId = new URL(request.url).searchParams.get("state");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.redirect(
      `${appUrl}/business/${businessId ?? ""}/redes?ig_error=${encodeURIComponent(errorMessage.slice(0, 400))}`,
    );
  }
}
