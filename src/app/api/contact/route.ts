import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const wantsJson = request.headers.get('accept')?.includes('application/json') || request.headers.get('x-requested-with') === 'XMLHttpRequest';

  if (!name || !email || !message) {
    if (wantsJson) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (wantsJson) {
      return NextResponse.json({ success: false, error: 'Falta la configuración de correo' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }

  try {
    const ticketId = `RVL-${Date.now().toString().slice(-6)}`;
    const escapedMessage = message.replace(/\n/g, '<br />');

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
            <p>${escapedMessage}</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al enviar el correo de contacto:', errorText);
      if (wantsJson) {
        return NextResponse.json({ success: false, error: 'No se pudo enviar el mensaje' }, { status: 500 });
      }
      return NextResponse.redirect(new URL('/contacto?error=1', request.url));
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
            <p>${escapedMessage}</p>
            <p>Tu referencia de solicitud es <strong>${ticketId}</strong>.</p>
            <p>Gracias por confiar en Revly.</p>
          </div>
        `,
      }),
    });

    if (!autoReply.ok) {
      const errorText = await autoReply.text();
      console.error('Error al enviar el auto-reply:', errorText);
    }

    if (wantsJson) {
      return NextResponse.json({ success: true, ticketId }, { status: 200 });
    }

    return NextResponse.redirect(new URL('/contacto?success=1', request.url));
  } catch (error) {
    console.error('Error inesperado al enviar el correo de contacto:', error);
    if (wantsJson) {
      return NextResponse.json({ success: false, error: 'No se pudo enviar el mensaje' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }
}
