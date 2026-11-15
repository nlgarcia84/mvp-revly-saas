'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPublicCustomer } from '@/actions/business';
import { requestCustomerEmailCode, verifyCustomerEmailCode } from '@/actions/public-customer-access';

export default function PublicCustomerAccess({ slug }: { slug: string }) {
  const router = useRouter();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const field = 'w-full rounded-md border border-stone-300 bg-white p-2 text-stone-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
  const button = 'rounded-md bg-stone-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900';
  async function submit(event: React.FormEvent<HTMLFormElement>, mode: 'register' | 'recover' | 'verify') {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      if (mode === 'verify') {
        const result = await verifyCustomerEmailCode(slug, challengeId!, String(data.get('code') ?? ''));
        if (result.success && 'customerId' in result) router.push(`/${encodeURIComponent(slug)}/customer/${encodeURIComponent(result.customerId)}`);
        else setMessage('error' in result ? result.error : 'No se pudo verificar el código.');
      } else {
        const email = String(data.get('email') ?? '');
        const result = mode === 'recover' ? await requestCustomerEmailCode(slug, email) : await addPublicCustomer({ slug, email,
          name: String(data.get('name') ?? ''), phone: String(data.get('phone') ?? ''),
          consent: data.get('consent') === 'on', whatsappOptIn: data.get('whatsappOptIn') === 'on' });
        if (result.success && 'challengeId' in result) { setChallengeId(result.challengeId); setMessage(result.message); }
        else setMessage('error' in result ? result.error : 'No se pudo tramitar la solicitud.');
      }
    } catch { setMessage('No se pudo completar la solicitud. Inténtalo más tarde.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <p role="status" aria-live="polite">{message}</p>
    {challengeId ? <form onSubmit={e => submit(e, 'verify')} className="space-y-3">
      <label className="block">Código recibido por email
        <input className={field} name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} />
      </label>
      <button className={button} disabled={busy}>Verificar y continuar</button>
      <button type="button" className="block underline" disabled={busy} onClick={() => { setChallengeId(null); setMessage(''); }}>Solicitar otro código o registrarme</button>
    </form> : <>
      <form onSubmit={e => submit(e, 'recover')} className="space-y-3">
        <h2 className="font-semibold">¿Ya tienes una cuenta?</h2>
        <label className="block">Email<input className={field} name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <button className={button} disabled={busy}>Recuperar mis puntos</button>
      </form>
      <form onSubmit={e => submit(e, 'register')} className="space-y-3 border-t border-stone-200 pt-5 dark:border-neutral-700">
        <h2 className="font-semibold">Empieza a acumular puntos</h2>
        <label className="block">Nombre<input className={field} name="name" required maxLength={100} autoComplete="name" /></label>
        <label className="block">Email<input className={field} name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        <label className="block">Teléfono (opcional)<input className={field} name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
        <label className="block text-sm"><input name="consent" type="checkbox" required /> Acepto la <a href="/privacidad" className="underline" target="_blank" rel="noopener noreferrer">política de privacidad</a> y las comunicaciones del negocio.</label>
        <label className="block text-sm"><input name="whatsappOptIn" type="checkbox" /> Quiero recibir avisos por WhatsApp.</label>
        <button className={button} disabled={busy}>Verificar mi email y empezar</button>
      </form>
    </>}
  </div>;
}
