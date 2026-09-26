import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// Desconecta la Página de Facebook: limpia tokens e IDs del negocio.
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
        facebookPending: null,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/business/${businessId}/settings?fb_success=Desconectado de Facebook`,
    );
  } catch (error) {
    console.error("[Facebook/Disconnect] Error:", error);
    return NextResponse.redirect(new URL("/business", request.url));
  }
}
