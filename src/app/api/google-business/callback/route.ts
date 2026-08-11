import prisma from "@/lib/db";
import {
  getBusinessAccounts,
  getBusinessLocations,
} from "@/lib/google-business-profile";
import { NextResponse } from "next/server";

// ─── Google nos llama aquí después de que el usuario ──
// autorice (o deniegue) el acceso en la pantalla de
// consentimiento de Google.
//
//   1. Recibimos un "code" que podemos cambiar por tokens
//   2. Intercambiamos el código por access + refresh token
//   3. Obtenemos la cuenta y ubicación de Business Profile
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
      return NextResponse.redirect(`${settingsUrl}?bp_error=Acceso denegado`);
    }

    if (!code) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=No se recibió código de autorización`,
      );
    }

    if (!businessId) {
      return NextResponse.redirect(
        `${APP_URL}/business?bp_error=ID de negocio no encontrado`,
      );
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
    const REDIRECT_URI = `${APP_URL}/api/google-business/callback`;

    // Intercambiamos el código por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errStatus = tokenRes.status;
      console.error(
        `[GoogleBusiness/Callback] Error intercambiando código | HTTP ${errStatus}`,
      );
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=Error al obtener tokens de Google (${errStatus})`,
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Obtenemos la primera cuenta de Business Profile
    const accountsResult = await getBusinessAccounts(accessToken);
    if (accountsResult.error) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=${encodeURIComponent(`Google Business Profile no está disponible para esta cuenta o región (cuentas). Detalle: ${accountsResult.error.slice(0, 500)}`)}`,
      );
    }

    const accounts = accountsResult.accounts;
    if (accounts.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=No se ha encontrado ningún Perfil de Empresa asociado a esta cuenta de Google. Usa una cuenta que sea propietaria o administradora del perfil, o añade este correo como usuario del perfil en Google Business Profile.`,
      );
    }

    const accountId = accounts[0].name; // viene como "accounts/123456789"
    const accountName = accounts[0].accountName ?? "";

    // Obtenemos ubicaciones de la cuenta (usamos el comodín "-"
    // para listar locales de todas las cuentas a las que el
    // usuario tiene acceso, y no solo de la primera cuenta)
    const locationsResult = await getBusinessLocations(accessToken, "-");
    if (locationsResult.error) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=${encodeURIComponent(`Google Business Profile no está disponible para esta cuenta o región (ubicaciones). Detalle: ${locationsResult.error.slice(0, 500)}`)}`,
      );
    }

    const locations = locationsResult.locations;
    if (locations.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=No se encontraron ubicaciones en tu cuenta de Business Profile`,
      );
    }

    // Buscamos la ubicación que coincida con el nombre del negocio
    // o usamos la primera si no hay coincidencia clara
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    let locationId = locations[0].name; // viene como "accounts/.../locations/..."
    if (business) {
      const match = locations.find((loc: any) =>
        loc.title?.toLowerCase().includes(business.name.toLowerCase()),
      );
      if (match) locationId = match.name;
    }

    // Guardamos los tokens y los IDs en la base de datos
    await prisma.business.update({
      where: { id: businessId },
      data: {
        googleBusinessAccessToken: accessToken,
        googleBusinessRefreshToken: refreshToken,
        googleBusinessTokenExpiry: expiresAt,
        googleBusinessAccountId: accountId,
        googleBusinessLocationId: locationId,
      },
    });

    // Redirigimos a Settings con mensaje de éxito
    return NextResponse.redirect(
      `${settingsUrl}?bp_success=Conectado correctamente a Google Business Profile (${accountName})`,
    );
  } catch (e) {
    console.error("[GoogleBusiness/Callback] Error:", e);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}
