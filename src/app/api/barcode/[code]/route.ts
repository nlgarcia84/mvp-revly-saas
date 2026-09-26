import { NextResponse } from 'next/server';
import bwipjs from 'bwip-js';

// Genera una imagen PNG (Code128) del código de descuento.
// GET /api/barcode/REVLY-A3X9
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    // Validamos el formato esperado del código.
    if (!code || !code.startsWith('REVLY-') || code.length > 20) {
      return NextResponse.json({ error: 'Código no válido' }, { status: 400 });
    }

    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: code,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
      paddingwidth: 10,
      paddingheight: 5,
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Barcode] Error generando barcode:', error);
    return NextResponse.json(
      { error: 'Error al generar el código de barras' },
      { status: 500 },
    );
  }
}
