import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// ─── Desconecta la Página de Facebook ────────────────
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

    // Limpiamos los campos de la conexión de Facebook
    await prisma.business.update({
      where: { id: businessId, userId },
      data: {
        facebookAccessToken: null,
        facebookTokenExpiry: null,
        facebookPageId: null,
        facebookPageName: null,
        facebookUsername: null,
        facebookCacheAt: null,
        facebookCache: null,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${APP_URL}/business/${businessId}/settings?fb_success=Desconectado de Facebook`,
    );
  } catch (e) {
    console.error("[Facebook/Disconnect] Error:", e);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}