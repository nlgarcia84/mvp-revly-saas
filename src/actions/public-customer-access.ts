'use server';

import { exchangeEmailCode, requestEmailChallenge } from '@/lib/public-customer-access';

export async function requestCustomerEmailCode(slug: string, email: string) {
  try { return await requestEmailChallenge(slug, email); }
  catch { return { success: false as const, error: 'No se pudo tramitar la solicitud. Inténtalo más tarde.' }; }
}
export async function verifyCustomerEmailCode(slug: string, challengeId: string, code: string) {
  try { return await exchangeEmailCode(slug, challengeId, code); }
  catch { return { success: false as const, error: 'No se pudo verificar el código. Inténtalo más tarde.' }; }
}
