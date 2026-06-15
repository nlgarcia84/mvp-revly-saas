// ──────────────────────────────────────────────
// Jest Configuration
// ──────────────────────────────────────────────
// Usa next/jest para heredar la configuración que Next.js necesita
// (transformación de JSX/TS, manejo de CSS, imágenes, etc.).
// ──────────────────────────────────────────────

import nextJest from 'next/jest.js';

// Crea una función que genera la config de Jest a partir de la raíz del proyecto
const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  // Archivos que se ejecutan después de que Jest instala el entorno de pruebas.
  // Aquí cargamos @testing-library/jest-dom para tener matchers como
  // toBeInTheDocument(), toHaveAttribute(), toBeDisabled(), etc.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // jsdom simula un navegador en Node.js para poder renderizar componentes React
  testEnvironment: 'jsdom',

  // Resuelve el alias @/ → src/ para que los imports como @/actions/auth
  // funcionen tanto en los componentes como en los mocks (jest.mock).
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// createJestConfig combina nuestra config personalizada con los defaults de Next.js
export default createJestConfig(customJestConfig);
