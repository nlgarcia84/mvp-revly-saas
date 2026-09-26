import prisma from "@/lib/db";
import {
  getBusinessAccounts,
  getBusinessLocations,
} from "@/lib/google-business-profile";
import { NextResponse } from "next/server";

// Google nos llama aquí tras autorizar (o denegar) el acceso.
//   1. Intercambiamos el "code" por access + refresh token.
//   2. Obtenemos la cuenta y la ubicación de Business Profile.
//   3. Guardamos todo y volvemos a Settings.
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
      return NextResponse.redirect(`${settingsUrl}?bp_error=Acceso denegado`);
    }
    if (!code) {
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=No se recibió código de autorización`,
      );
    }
    if (!businessId) {
      return NextResponse.redirect(
        `${appUrl}/business?bp_error=ID de negocio no encontrado`,
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/google-business/callback`;

    // Intercambiamos el código por tokens.
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorStatus = tokenResponse.status;
      console.error(
        `[GoogleBusiness/Callback] Error intercambiando código | HTTP ${errorStatus}`,
      );
      return NextResponse.redirect(
        `${settingsUrl}?bp_error=Error al obtener tokens de Google (${errorStatus})`,
      );
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Primera cuenta de Business Profile.
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

    const accountId = accounts[0].name; // "accounts/123456789"
    const accountName = accounts[0].accountName ?? "";

    // Ubicaciones: usamos el comodín "-" para listar locales de todas las
    // cuentas a las que el usuario tiene acceso, no solo de la primera.
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

    // Preferimos la ubicación cuyo nombre coincida con el negocio.
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    let locationId = locations[0].name; // "accounts/.../locations/..."
    if (business) {
      const matchingLocation = locations.find((location: any) =>
        location.title?.toLowerCase().includes(business.name.toLowerCase()),
      );
      if (matchingLocation) locationId = matchingLocation.name;
    }

    // Guardamos tokens e IDs.
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

    return NextResponse.redirect(
      `${settingsUrl}?bp_success=Conectado correctamente a Google Business Profile (${accountName})`,
    );
  } catch (error) {
    console.error("[GoogleBusiness/Callback] Error:", error);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}
