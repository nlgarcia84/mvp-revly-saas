import { NextResponse } from 'next/server';
import bwipjs from 'bwip-js';

// ─── Genera un barcode para el código de descuento ──
// URL: GET /api/barcode/REVLY-A3X9
// Devuelve una imagen PNG con el código de barras (Code128).
// El cliente carga esta imagen en su perfil:
//   <img src="/api/barcode/REVLY-A3X9" alt="Código de descuento" />
// ─────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    // Validamos que el código tenga el formato esperado
    if (!code || !code.startsWith('REVLY-') || code.length > 20) {
      return NextResponse.json(
        { error: 'Código no válido' },
        { status: 400 },
      );
    }

    // Generamos la imagen del barcode con bwip-js
    const png = await bwipjs.toBuffer({
      bcid: 'code128',         // tipo de barcode
      text: code,              // texto a codificar
      scale: 3,                // escala (3× más grande)
      height: 12,              // altura en mm
      includetext: true,       // mostrar el texto debajo
      textxalign: 'center',    // centrar el texto
      paddingwidth: 10,        // padding lateral
      paddingheight: 5,        // padding superior/inferior
    });

    // Devolvemos la imagen PNG (convertir Buffer a Uint8Array para compatibilidad TS)
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // cache 24h
      },
    });
  } catch (e) {
    console.error('[Barcode] Error generando barcode:', e);
    return NextResponse.json(
      { error: 'Error al generar el código de barras' },
      { status: 500 },
    );
  }
}
