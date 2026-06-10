import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body;

  if (type === 'user.created' || type === 'user.updated') {
    const email = data.email_addresses?.[0]?.email_address ?? '';
    const name = data.full_name ?? data.first_name ?? '';

    await prisma.user.upsert({
      where: { id: data.id },
      update: { email, name },
      create: { id: data.id, email, name },
    });
  }

  if (type === 'user.deleted') {
    await prisma.user.delete({ where: { id: data.id } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
