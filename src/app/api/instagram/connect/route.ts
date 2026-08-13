import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// ─── Inicia la conexión con Instagram (Meta) ─────────
// Botón "Conectar con Instagram" en Settings.
//   1. Verifica que el usuario esté autenticado
//   2. Guarda el ID del negocio en la URL de callback
//   3. Redirige a Facebook Login (OAuth) para pedir
//      acceso a la página de Facebook vinculada y a los
//      comentarios de la cuenta de Instagram.
//
// Cuando el usuario autorice, Facebook llamará a nuestra
// ruta /api/instagram/callback con un código.
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

    const META_CLIENT_ID = process.env.META_CLIENT_ID;
    if (!META_CLIENT_ID) {
      console.error("[Instagram/Connect] Falta META_CLIENT_ID en .env.local");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/business/${businessId}/settings?ig_error=${encodeURIComponent("La conexión con Instagram no está configurada (falta META_CLIENT_ID)")}`,
      );
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const REDIRECT_URI = `${APP_URL}/api/instagram/callback`;

    // Permisos necesarios (Instagram Graph API):
    //  - instagram_business_basic: leer perfil y publicaciones de la cuenta
    //  - instagram_business_manage_comments: leer y responder comentarios
    //  - pages_show_list / pages_read_engagement: encontrar la página
    //    de Facebook vinculada y su cuenta de Instagram.
    const params = new URLSearchParams({
      client_id: META_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_manage_comments,pages_show_list,pages_read_engagement",
      state: businessId,
    });

    return NextResponse.redirect(
      `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
    );
  } catch (e) {
    console.error("[Instagram/Connect] Error:", e);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}