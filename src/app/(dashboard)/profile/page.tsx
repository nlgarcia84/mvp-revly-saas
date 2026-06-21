'use client';

import { useEffect, useState } from 'react';
import { updateProfileName, getProfile } from '@/actions/auth';
import { Card } from '@/components/ui/card';
import Button from '@/components/ui/button';
import BackButton from '@/components/back-button';

const ProfilePage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateProfileName(name);
      setMsg('Guardado');
    } catch (err: any) {
      setMsg(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton href="/dashboard" />
        <h1 className="text-xl sm:text-2xl font-semibold mt-1 mb-1">
          Datos personales
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Tu información personal
        </p>
      </div>

      <Card neumorphic>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center text-sm font-semibold">
            {(name || email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500">{name || 'Sin nombre'}</p>
            <p className="text-xs text-neutral-500">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">
              Nombre
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">
              Correo electrónico
            </label>
            <p className="text-sm text-neutral-500">{email}</p>
          </div>
          {msg && (
            <p className={`text-sm ${msg === 'Guardado' ? 'text-emerald-500' : 'text-red-500'}`}>
              {msg}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
