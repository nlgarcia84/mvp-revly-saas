'use server';

import prisma from '@/lib/db';

/**
 * Crea un negocio nuevo asociado al usuario autenticado.
 */
export const createBusiness = async (data: {
  name: string;
  googleLink?: string;
}) => {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) throw new Error('No autenticado');

  // ──────────────────────────────────────────────
  // PRISMA (.business.create):
  //   Inserta un registro en la tabla Business
  //   con los datos del formulario + userId
  // ──────────────────────────────────────────────
  const business = await prisma
    .business                       // tabla Business
    .create({                       // INSERT INTO business
      data: {
        name: data.name,            // nombre del negocio
        googleLink: data.googleLink ?? null, // enlace de Google Reviews (opcional)
        userId,                     // propietario del negocio
      },
    });

  return business;
};

/**
 * Obtiene todos los negocios del usuario autenticado,
 * incluyendo el conteo de clientes de cada uno.
 */
export const getBusinesses = async () => {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) return [];

  // ──────────────────────────────────────────────
  // PRISMA (.business.findMany):
  //   SELECT * FROM Business WHERE userId = ?
  //   Con INCLUDE para contar clientes relacionados
  //   (equivale a un JOIN + COUNT)
  // ──────────────────────────────────────────────
  return prisma
    .business                       // tabla Business
    .findMany({                     // SELECT
      where: {                      // WHERE
        userId,                     // userId = usuario actual
      },
      include: {                    // JOIN (incluir datos relacionados)
        _count: {                   // COUNT(*)
          select: {
            customers: true,        // cuenta los Customer asociados a este Business
          },
        },
      },
    });
};
