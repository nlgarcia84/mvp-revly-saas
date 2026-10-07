'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { parseOpeningHours } from '@/lib/store-hours';
import {
  computeAvailableSlots,
  isValidDate,
  isValidTimeString,
  parseReservationConfig,
  validateReservationConfig,
  type ReservationConfig,
  type ReservationStatus,
} from '@/lib/reservations';
import {
  notifyOwnerNewReservation,
  notifyReservationConfirmed,
} from '@/lib/notifications';

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

async function requireOwnedBusiness(businessId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  return business;
}

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2034'
  );
}

async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransactionConflict(error)) throw error;
    return fn();
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AvailabilityResult = {
  success: boolean;
  error?: string;
  slots?: string[];
  reason?: string;
};

export async function getPublicAvailability(
  slug: string,
  date: string,
  options?: { partySize?: number; tzOffsetMinutes?: number },
): Promise<AvailabilityResult> {
  try {
    const partySize = options?.partySize ?? 1;
    const tzOffsetMinutes = options?.tzOffsetMinutes ?? 0;

    if (!isValidDate(date)) {
      return { success: false, error: 'Fecha no válida' };
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        openingHours: true,
        reservationConfig: true,
      },
    });
    if (!business) return { success: false, error: 'Negocio no encontrado' };

    const config = parseReservationConfig(business.reservationConfig);
    if (!config.enabled) {
      return { success: false, error: 'Este negocio no acepta reservas online' };
    }
    if (partySize < 1 || partySize > config.maxPartySize) {
      return { success: false, error: 'Número de comensales no válido' };
    }

    const hours = parseOpeningHours(business.openingHours);

    const reservations = await prisma.reservation.findMany({
      where: { businessId: business.id, date },
      select: { time: true, partySize: true, status: true },
    });

    const { slots, reason } = computeAvailableSlots({
      hours,
      config,
      date,
      reservations,
      partySize,
      tzOffsetMinutes,
    });

    return { success: true, slots, reason };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo consultar la disponibilidad',
    };
  }
}

export type CreateReservationInput = {
  slug: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  date: string;
  time: string;
  partySize: number;
  tzOffsetMinutes?: number;
};

export type CreateReservationResult = {
  success: boolean;
  error?: string;
  reservation?: { id: string; date: string; time: string; partySize: number };
};

export async function createPublicReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  try {
    const name = (input.name || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const phone = (input.phone || '').trim();
    const notes = (input.notes || '').trim();
    const tzOffsetMinutes = input.tzOffsetMinutes ?? 0;

    if (name.length < 2 || name.length > 80) {
      return { success: false, error: 'Escribe tu nombre (mínimo 2 caracteres)' };
    }
    if (email.length > 120 || !EMAIL_PATTERN.test(email)) {
      return { success: false, error: 'Escribe un email válido' };
    }
    if (phone.length > 20) {
      return { success: false, error: 'El teléfono no puede superar los 20 caracteres' };
    }
    if (notes.length > 500) {
      return { success: false, error: 'Las notas no pueden superar los 500 caracteres' };
    }
    if (!isValidDate(input.date) || !isValidTimeString(input.time)) {
      return { success: false, error: 'Fecha u hora no válidas' };
    }
    if (!Number.isInteger(input.partySize) || input.partySize < 1) {
      return { success: false, error: 'Número de comensales no válido' };
    }

    const business = await prisma.business.findUnique({
      where: { slug: input.slug },
      select: { id: true, name: true, userId: true, openingHours: true, reservationConfig: true },
    });
    if (!business) return { success: false, error: 'Negocio no encontrado' };

    const config = parseReservationConfig(business.reservationConfig);
    if (!config.enabled) {
      return { success: false, error: 'Este negocio no acepta reservas online' };
    }
    if (input.partySize > config.maxPartySize) {
      return {
        success: false,
        error: `El máximo por reserva es de ${config.maxPartySize} comensales`,
      };
    }

    const hours = parseOpeningHours(business.openingHours);

    const attempt = async (tx: Prisma.TransactionClient) => {
      const reservations = await tx.reservation.findMany({
        where: { businessId: business.id, date: input.date },
        select: { time: true, partySize: true, status: true },
      });

      const { slots, reason } = computeAvailableSlots({
        hours,
        config,
        date: input.date,
        reservations,
        partySize: input.partySize,
        tzOffsetMinutes,
      });

      if (reason === 'past' || reason === 'too-far' || reason === 'closed') {
        throw new Error('La fecha seleccionada no está disponible');
      }
      if (!slots.includes(input.time)) {
        throw new Error('Ese horario ya no está disponible. Elige otro.');
      }

      return tx.reservation.create({
        data: {
          businessId: business.id,
          name,
          email,
          phone: phone || null,
          notes: notes || null,
          partySize: input.partySize,
          date: input.date,
          time: input.time,
          status: 'confirmed',
        },
        select: { id: true, date: true, time: true, partySize: true },
      });
    };

    const reservation = await withSerializableRetry(() =>
      prisma.$transaction((tx) => attempt(tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );

    const owner = await prisma.user.findUnique({
      where: { id: business.userId },
      select: { email: true },
    });

    try {
      await notifyReservationConfirmed({
        name,
        email,
        businessName: business.name,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
      });
    } catch (notifError) {
      console.error('Error notificando reserva al cliente:', notifError);
    }

    if (owner?.email) {
      try {
        await notifyOwnerNewReservation({
          ownerEmail: owner.email,
          businessName: business.name,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || null,
          date: reservation.date,
          time: reservation.time,
          partySize: reservation.partySize,
        });
      } catch (notifError) {
        console.error('Error notificando reserva al negocio:', notifError);
      }
    }

    return { success: true, reservation };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo crear la reserva',
    };
  }
}

export type ReservationListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  partySize: number;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  createdAt: Date;
};

export async function getReservations(
  businessId: string,
  fromDate: string,
): Promise<{ success: boolean; error?: string; reservations?: ReservationListItem[] }> {
  try {
    await requireOwnedBusiness(businessId);
    if (!isValidDate(fromDate)) {
      return { success: false, error: 'Fecha no válida' };
    }

    const reservations = await prisma.reservation.findMany({
      where: { businessId, date: { gte: fromDate } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        partySize: true,
        date: true,
        time: true,
        status: true,
        notes: true,
        createdAt: true,
      },
    });

    return { success: true, reservations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar las reservas',
    };
  }
}

export async function updateReservationStatus(
  businessId: string,
  reservationId: string,
  status: ReservationStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOwnedBusiness(businessId);
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      throw new Error('Estado no válido');
    }

    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, businessId },
      select: { id: true },
    });
    if (!reservation) throw new Error('Reserva no encontrada');

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar la reserva',
    };
  }
}

export async function updateReservationConfig(
  businessId: string,
  config: ReservationConfig,
): Promise<{ success: boolean; error?: string; config?: ReservationConfig }> {
  try {
    await requireOwnedBusiness(businessId);

    const parsed = parseReservationConfig(config);
    const errors = validateReservationConfig(parsed);
    if (errors.length > 0) throw new Error(errors[0]);

    await prisma.business.update({
      where: { id: businessId },
      data: { reservationConfig: parsed as Prisma.InputJsonValue },
    });

    return { success: true, config: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la configuración',
    };
  }
}
