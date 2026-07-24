import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || !email || !message) {
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }

  try {
    const ticketId = `RVL-${Date.now().toString().slice(-6)}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revly Support <support@revly.es>',
        to: ['revlyreviwes@gmail.com'],
        replyTo: email,
        subject: `Nuevo mensaje de contacto de ${name} [${ticketId}]`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Nuevo mensaje recibido</h2>
            <p><strong>Número de incidencia:</strong> ${ticketId}</p>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${message.replace(/\n/g, '<br />')}</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al enviar el correo de contacto:', errorText);
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
            <p>${message.replace(/\n/g, '<br />')}</p>
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

    return NextResponse.redirect(new URL('/contacto?success=1', request.url));
  } catch (error) {
    console.error('Error inesperado al enviar el correo de contacto:', error);
    return NextResponse.redirect(new URL('/contacto?error=1', request.url));
  }
}
