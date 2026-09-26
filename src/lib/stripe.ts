import Stripe from 'stripe';

// Cliente de Stripe (clave secreta desde el entorno).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export default stripe;
