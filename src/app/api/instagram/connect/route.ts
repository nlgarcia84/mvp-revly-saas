import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstagramClientId } from "@/lib/instagram-graph";
import prisma from "@/lib/db";

// Inicia la conexión con Instagram (Business Login). Verifica sesión y
// propiedad del negocio, y redirige al OAuth de Instagram.
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "";
    if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.redirect(new URL("/business", request.url));
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.redirect(new URL("/business", request.url));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const clientId = getInstagramClientId();
    if (!clientId) {
      console.error(
        "[Instagram/Connect] Falta META_INSTAGRAM_CLIENT_ID / META_CLIENT_ID en .env.local",
      );
      return NextResponse.redirect(
        `${appUrl}/business/${businessId}/settings?ig_error=${encodeURIComponent("La conexión con Instagram no está configurada (falta el App ID de Instagram)")}`,
      );
    }

    const redirectUri = `${appUrl}/api/instagram/callback`;

    // Permisos: leer perfil/publicaciones y leer/responder comentarios.
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_manage_comments",
      state: businessId,
      enable_fb_login: "0",
    });

    return NextResponse.redirect(
      `https://www.instagram.com/oauth/authorize?${oauthParams.toString()}`,
    );
  } catch (error) {
    console.error("[Instagram/Connect] Error:", error);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}
