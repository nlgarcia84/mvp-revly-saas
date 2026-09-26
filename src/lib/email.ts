// Envía un email transaccional con Resend. Si falta RESEND_API_KEY o no hay
// destinatario, no se envía nada (la app sigue igual).

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Revly <hola@revly.es>';

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | null | undefined;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      }),
    });

    if (!response.ok) {
      console.error('[Email] Error enviando email:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Email] Error:', error);
    return false;
  }
}
