// Caracteres permitidos en los códigos: sin vocales (evita palabras
// malsonantes) y sin 0/O/1/I/L (evita confundirlos al dictarlos).
const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Genera un código de descuento único con formato REVLY-XXXX.
export function generateDiscountCode(): string {
  let code = 'REVLY-';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)];
  }
  return code;
}
