import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// ─── Desconecta Instagram (Meta) ─────────────────────
// Botón "Desconectar" en Settings. Borra los tokens y
// los IDs de la base de datos. A partir de ese momento,
// la sección de Instagram dejará de cargar comentarios.
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

    // Limpiamos los campos de la conexión de Instagram
    await prisma.business.update({
      where: { id: businessId, userId },
      data: {
        instagramAccessToken: null,
        instagramTokenExpiry: null,
        instagramPageId: null,
        instagramBusinessAccountId: null,
        instagramUsername: null,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${APP_URL}/business/${businessId}/settings?ig_success=Desconectado de Instagram`,
    );
  } catch (e) {
    console.error("[Instagram/Disconnect] Error:", e);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}