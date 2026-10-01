'use client';

// ─── Mensajes de las rutas de OAuth ──────────────────
// Al conectar o desconectar Google Business Profile, Instagram o
// Facebook, la API de Meta/Google redirige de vuelta al dashboard
// con un mensaje en la URL (?ig_success=…, ?fb_error=…). Este hook
// lo lee una vez al montar y limpia la barra de direcciones para
// que no se reenvíe al recargar la página.
// ────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

const OAUTH_KEYS = [
  'bp_success',
  'bp_error',
  'ig_success',
  'ig_error',
  'fb_success',
  'fb_error',
  'fb_select',
] as const;

export const useOAuthMessages = () => {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of OAUTH_KEYS) {
      const value = params.get(key);
      if (!value) continue;
      setMsg(
        key === 'fb_select'
          ? 'Elige la Página de Facebook que quieres conectar.'
          : value,
      );
      window.history.replaceState({}, '', window.location.pathname);
      break;
    }
  }, []);

  return msg;
};
