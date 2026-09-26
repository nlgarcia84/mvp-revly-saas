import { NextResponse } from 'next/server';

// Recibe el formulario de contacto, envía el mensaje por email (Resend)
// y responde con un acuse de recibo al usuario.
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const wantsJsonResponse =
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('x-requested-with') === 'XMLHttpRequest';

  // Según el cliente (fetch o formulario HTML), devolvemos JSON o redirigimos.
  const errorResponse = (errorMessage: string, status: number) =>
    wantsJsonResponse
      ? NextResponse.json({ success: false, error: errorMessage }, { status })
      : NextResponse.redirect(new URL('/contacto?error=1', request.url));

  if (!name || !email || !message) {
    return errorResponse('Faltan campos obligatorios', 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return errorResponse('Falta la configuración de correo', 500);
  }

  try {
    const ticketId = `RVL-${Date.now().toString().slice(-6)}`;
    const messageHtml = message.replace(/\n/g, '<br />');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revly Support <support@revly.es>',
        to: ['revlyreviwes@gmail.com', 'hello@revly.es'],
        replyTo: email,
        subject: `Nuevo mensaje de contacto de ${name} [${ticketId}]`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Nuevo mensaje recibido</h2>
            <p><strong>Número de incidencia:</strong> ${ticketId}</p>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${messageHtml}</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error al enviar el correo de contacto:', errorBody);
      return errorResponse('No se pudo enviar el mensaje', 500);
    }

    const autoReply = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revly Support <support@revly.es>',
        to: [email],
        subject: 'Hemos recibido tu mensaje en Revly',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Gracias por contactar con Revly</h2>
            <p>Hola ${name},</p>
            <p>Hemos recibido tu mensaje y nuestro equipo se pondrá en contacto contigo a la brevedad posible.</p>
            <p><strong>Tu mensaje:</strong></p>
            <p>${messageHtml}</p>
            <p>Tu referencia de solicitud es <strong>${ticketId}</strong>.</p>
            <p>Gracias por confiar en Revly.</p>
          </div>
        `,
      }),
    });

    if (!autoReply.ok) {
      console.error('Error al enviar el auto-reply:', await autoReply.text());
    }

    return wantsJsonResponse
      ? NextResponse.json({ success: true, ticketId }, { status: 200 })
      : NextResponse.redirect(new URL('/contacto?success=1', request.url));
  } catch (error) {
    console.error('Error inesperado al enviar el correo de contacto:', error);
    return errorResponse('No se pudo enviar el mensaje', 500);
  }
}
