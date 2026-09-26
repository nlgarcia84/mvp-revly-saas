import { NextResponse } from 'next/server';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

type FileEntry = { filename: string; content: string; type: string };

// Recibe una incidencia con adjuntos y la envía por email (Resend).
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const filesJson = String(formData.get('files') ?? '[]');

  if (!name || !email || !description) {
    return NextResponse.json(
      { success: false, error: 'Faltan campos obligatorios' },
      { status: 400 },
    );
  }

  let files: FileEntry[] = [];
  try {
    files = JSON.parse(filesJson);
    if (!Array.isArray(files)) files = [];
  } catch {
    files = [];
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { success: false, error: `Máximo ${MAX_FILES} archivos` },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Tipo no permitido: ${file.type}` },
        { status: 400 },
      );
    }
    // base64 ocupa ~4/3 del tamaño original; comprobamos aproximado.
    const estimatedSize = (file.content.length * 3) / 4;
    if (estimatedSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Archivo demasiado grande: ${file.filename}` },
        { status: 400 },
      );
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Falta la configuración de correo' },
      { status: 500 },
    );
  }

  try {
    const ticketId = `RVL-${Date.now().toString().slice(-6)}`;
    const descriptionHtml = description.replace(/\n/g, '<br />');

    const attachments = files.map((file) => ({
      filename: file.filename,
      content: file.content,
    }));

    const fileListHtml =
      files.length > 0
        ? `<p><strong>Archivos adjuntos:</strong> ${files.map((file) => file.filename).join(', ')}</p>`
        : '';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revly Support <support@revly.es>',
        to: ['support@revly.es', 'revlyreviwes@gmail.com'],
        replyTo: email,
        subject: `Nueva incidencia de ${name} [${ticketId}]`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Nueva incidencia recibida</h2>
            <p><strong>Número de incidencia:</strong> ${ticketId}</p>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Descripción:</strong></p>
            <p>${descriptionHtml}</p>
            ${fileListHtml}
          </div>
        `,
        attachments,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error al enviar incidencia:', errorBody);
      return NextResponse.json(
        { success: false, error: 'No se pudo enviar la incidencia' },
        { status: 500 },
      );
    }

    // Acuse de recibo al usuario.
    const autoReply = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revly Support <support@revly.es>',
        to: [email],
        subject: `Hemos recibido tu incidencia [${ticketId}]`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Incidencia registrada</h2>
            <p>Hola ${name},</p>
            <p>Hemos recibido tu incidencia y nuestro equipo la revisará lo antes posible.</p>
            <p><strong>Tu referencia:</strong> ${ticketId}</p>
            <p><strong>Tu descripción:</strong></p>
            <p>${descriptionHtml}</p>
            ${fileListHtml}
            <p>Gracias por confiar en Revly.</p>
          </div>
        `,
        attachments,
      }),
    });

    if (!autoReply.ok) {
      console.error('Error al enviar auto-reply:', await autoReply.text());
    }

    return NextResponse.json({ success: true, ticketId }, { status: 200 });
  } catch (error) {
    console.error('Error inesperado al enviar incidencia:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo enviar la incidencia' },
      { status: 500 },
    );
  }
}
