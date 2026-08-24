import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// ─── Inicia la conexión con una Página de Facebook ───
// Botón "Conectar con Facebook" en Settings.
//   1. Verifica que el usuario esté autenticado
//   2. Guarda el ID del negocio en el state
//   3. Redirige a facebook.com/dialog/oauth para pedir
//      acceso a las páginas que administra el usuario.
//
// Cuando el usuario autorice, Facebook llamará a nuestra
// ruta /api/facebook/callback con un código.
// ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? "";
    if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.redirect(new URL("/business", request.url));
    }

    // Verificamos que el negocio existe y pertenece al usuario
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.redirect(new URL("/business", request.url));
    }

    const FACEBOOK_CLIENT_ID = process.env.META_CLIENT_ID;
    if (!FACEBOOK_CLIENT_ID) {
      console.error("[Facebook/Connect] Falta META_CLIENT_ID en .env.local");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/business/${businessId}/settings?fb_error=${encodeURIComponent("La conexión con Facebook no está configurada (falta el App ID de Facebook)")}`,
      );
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const REDIRECT_URI = `${APP_URL}/api/facebook/callback`;

    // Permisos (Login with Facebook + Pages API):
    //  - email, public_profile: perfil del usuario
    //  - pages_show_list: listar las páginas que administra
    //  - pages_read_engagement: leer publicaciones y comentarios
    //  - pages_manage_posts: publicar contenido en la página
    //  - pages_manage_comments: responder comentarios
    const params = new URLSearchParams({
      client_id: FACEBOOK_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      state: businessId,
      scope:
        "email,public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_comments",
    });

    return NextResponse.redirect(
      `https://www.facebook.com/dialog/oauth?${params.toString()}`,
    );
  } catch (e) {
    console.error("[Facebook/Connect] Error:", e);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}