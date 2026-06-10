import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/db';

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const name = clerkUser.fullName ?? clerkUser.firstName ?? '';

  const user = await prisma.user.upsert({
    where: { id: clerkUser.id },
    update: { email, name },
    create: { id: clerkUser.id, email, name },
  });

  return user;
}
