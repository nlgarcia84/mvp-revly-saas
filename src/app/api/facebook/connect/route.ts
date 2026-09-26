import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// Inicia la conexión con una Página de Facebook (botón "Conectar con Facebook").
// Verifica sesión y propiedad del negocio, y redirige al OAuth de Facebook.
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
    const clientId = process.env.META_CLIENT_ID;
    if (!clientId) {
      console.error("[Facebook/Connect] Falta META_CLIENT_ID en .env.local");
      return NextResponse.redirect(
        `${appUrl}/business/${businessId}/settings?fb_error=${encodeURIComponent("La conexión con Facebook no está configurada (falta el App ID de Facebook)")}`,
      );
    }

    const redirectUri = `${appUrl}/api/facebook/callback`;

    // Permisos: perfil, listar/leer/gestionar publicaciones y comentarios, y
    // business_management (para páginas de un portfolio empresarial).
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: businessId,
      scope:
        "public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,business_management",
    });

    return NextResponse.redirect(
      `https://www.facebook.com/dialog/oauth?${oauthParams.toString()}`,
    );
  } catch (error) {
    console.error("[Facebook/Connect] Error:", error);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}
