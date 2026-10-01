import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

// Cliente de Stripe con inicialización perezosa: se crea en el primer uso
// en lugar de al importar el módulo, para que el build de Next.js no
// falle cuando el entorno todavía no tiene STRIPE_SECRET_KEY.
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Falta la variable de entorno STRIPE_SECRET_KEY');
    }
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
