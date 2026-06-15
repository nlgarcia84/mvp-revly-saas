// ──────────────────────────────────────────────
// Jest Setup
// ──────────────────────────────────────────────
// Se ejecuta una vez al inicio de cada archivo de test.
// Importa los matchers personalizados de @testing-library/jest-dom:
//   - toBeInTheDocument()
//   - toHaveAttribute()
//   - toBeDisabled()
//   - toHaveTextContent()
//   - etc.
// Sin esto, todos esos matchers arrojarían "not a function".
// ──────────────────────────────────────────────

import '@testing-library/jest-dom';
