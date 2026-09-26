// Envía notificaciones por WhatsApp usando la Cloud API de Meta.
// Requiere WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN (y plantillas
// aprobadas en Meta). Si no están configurados, no se envía nada y la app
// sigue funcionando igual.

const GRAPH_VERSION = 'v21.0';

// Nombres de las plantillas (configurables por entorno).
export const WHATSAPP_TEMPLATE_WELCOME =
  process.env.WHATSAPP_TEMPLATE_WELCOME || 'revly_registro';
export const WHATSAPP_TEMPLATE_POINTS =
  process.env.WHATSAPP_TEMPLATE_POINTS || 'revly_puntos';

// Deja el teléfono en formato internacional, solo dígitos.
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 9) return null;
  return digits;
}

// Envía una plantilla de WhatsApp con parámetros en el cuerpo.
export async function sendWhatsAppTemplate({
  to,
  templateName,
  bodyParams,
  languageCode = 'es',
}: {
  to: string | null | undefined;
  templateName: string;
  bodyParams: string[];
  languageCode?: string;
}): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phone = normalizePhone(to);

  // Si WhatsApp no está configurado o no hay teléfono válido, no hacemos nada.
  if (!phoneNumberId || !accessToken || !phone) return false;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: bodyParams.map((text) => ({ type: 'text', text })),
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      console.error(
        '[WhatsApp] Error enviando plantilla:',
        await response.text(),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return false;
  }
}
