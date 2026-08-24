// @ts-nocheck
import { isLikelyNegative, isIslamophobic } from '../src/lib/sentiment';

const cases: Array<[string, boolean, boolean]> = [
  // [texto, esperado negativo, esperado islamofobia]
  ['Waalikom salam warahmato lah', false, false],
  ['Esta bueno hermano', false, false],
  ['@mohammed_mr93 de momento no tenemos pensando expa...', false, false],
  ['@_t_e_k_i_l_a_ gracias', false, false],
  ['El pollo está buenísimo, en especial los muslos', false, false],
  ['Sin duda iría a comer a ese lugar', false, false],
  ['👏👏👏👏', false, false],
  ['estáis enfermos', true, false],
  ['El servicio es una estafa, no me devuelven el dinero', true, false],
  ['No lo recomiendo, la comida llegó fría', true, false],
  ['Quemado y sin sabor, no vale la pena', true, false],
  ['No estaba bueno el pollo', true, false],
  ['Horrible atención', true, false],
  ['Haram, no torno mai més', true, false],
  ['terrible service, worst ever', true, false],
  // Islamofobia
  ['Vuelve a tu país, moro', true, true],
  ['Fuera los moros de aquí', true, true],
  ['Tu supuesto profeta era un pedófilo', true, true],
  ['Vuestra religión es un invento, terrorista', true, true],
  ['No al burkini en la piscina', true, true],
  ['Alhamdulillah hermanos', false, false],
  ['Inshallah volveremos', false, false],
];

let fail = 0;
for (const [text, expNeg, expIso] of cases) {
  const neg = isLikelyNegative(text);
  const iso = isIslamophobic(text);
  const ok = neg === expNeg && iso === expIso;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'FAIL'} neg=${neg} iso=${iso} "${text}"`);
}
console.log(`\n${fail === 0 ? 'TODO OK' : `${fail} fallos`}`);
process.exit(fail === 0 ? 0 : 1);