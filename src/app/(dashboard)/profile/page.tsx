import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// ──────────────────────────────────────────────
// ProfilePage (Server Component)
// ──────────────────────────────────────────────
// 1. Obtiene la sesión desde Supabase (cookie HTTP).
// 2. Usa el userId de la sesión para consultar los
//    datos del usuario en nuestra tabla User (Prisma).
// Separamos Supabase Auth (sesión) de nuestra BD
// (nombre, email) porque la tabla User puede tener
// datos adicionales que no están en Auth.
// ──────────────────────────────────────────────
const ProfilePage = async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const name = user?.name ?? '';
  const email = user?.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">
          Datos personales
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Tu información personal
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500">{name}</p>
            <p className="text-xs text-neutral-500">{email}</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-1">Nombre</p>
            <p className="text-sm font-medium text-neutral-500">{name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-1">
              Correo electrónico
            </p>
            <p className="text-sm font-medium text-neutral-500">{email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
