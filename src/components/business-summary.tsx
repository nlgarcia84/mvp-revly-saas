'use client';

// ─── Resumen del negocio ─────────────────────────────
// Pantalla de entrada de /business/[id]: los números que importan
// de un vistazo, una checklist de puesta en marcha y accesos
// directos a cada sección. Orienta en lugar de amontonar.
//
// Los contadores salen de getCustomerSummary (un groupBy + un count),
// no de traerse la tabla de clientes entera.
// ────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomerSummary } from '@/actions/customers';
import { getBusinessProfileStatus } from '@/actions/google-reviews';
import { getFacebookConnectionStatus } from '@/actions/facebook';
import { getInstagramConnectionStatus } from '@/actions/instagram';
import { Card } from '@/components/ui/card';
import { useBusiness } from '@/components/business-context';

const Kpi = ({ value, label }: { value: number; label: string }) => (
  <Card className="p-4 sm:p-5 text-center">
    <p className="text-2xl font-bold tabular-nums">{value}</p>
    <p className="text-[11px] text-neutral-400 mt-1">{label}</p>
  </Card>
);

type ChecklistItem = {
  label: string;
  hint: string;
  done: boolean;
  href: string;
};

const ChecklistRow = ({ item }: { item: ChecklistItem }) => (
  <Link
    href={item.href}
    className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#111]"
  >
    <span
      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
        item.done
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
      }`}
    >
      {item.done ? '✓' : '·'}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium">{item.label}</span>
      <span className="block text-xs text-neutral-400 mt-0.5">{item.hint}</span>
    </span>
  </Link>
);

const BusinessSummary = () => {
  const { id, business } = useBusiness();
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    invited: 0,
    completed: 0,
    redeemedThisMonth: 0,
  });
  const [setup, setSetup] = useState({
    google: false,
    instagram: false,
    facebook: false,
    address: false,
    hours: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, google, ig, fb] = await Promise.all([
        getCustomerSummary(id),
        getBusinessProfileStatus(id).catch(() => null),
        getInstagramConnectionStatus(id).catch(() => null),
        getFacebookConnectionStatus(id).catch(() => null),
      ]);
      if (cancelled) return;
      setSummary(s);
      setSetup({
        google: google?.connected ?? false,
        instagram: ig?.connected ?? false,
        facebook: fb?.connected ?? false,
        address: Boolean(business?.address),
        hours: Boolean(business?.openingHours),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, business?.address, business?.openingHours]);

  const checklist: ChecklistItem[] = [
    {
      label: 'Conecta Google Business Profile',
      hint: 'Para ver todas tus reseñas, no solo las 5 últimas.',
      done: setup.google,
      href: `/business/${id}/redes`,
    },
    {
      label: 'Conecta Instagram',
      hint: 'Responde comentarios desde el dashboard con ayuda de IA.',
      done: setup.instagram,
      href: `/business/${id}/redes`,
    },
    {
      label: 'Conecta tu Página de Facebook',
      hint: 'Comentarios y publicaciones sin salir de Revly.',
      done: setup.facebook,
      href: `/business/${id}/redes`,
    },
    {
      label: 'Añade la dirección de tu local',
      hint: 'Para que tus clientes te encuentren en el mapa.',
      done: setup.address,
      href: `/business/${id}/local`,
    },
    {
      label: 'Define los horarios de apertura',
      hint: 'Se muestran en tu página pública de fidelización.',
      done: setup.hours,
      href: `/business/${id}/local`,
    },
  ];

  const pendingCount = checklist.filter((c) => !c.done).length;

  return (
    <div className="flex flex-col gap-6 stagger">
      {/* KPIs */}
      <section aria-label="Métricas del negocio">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi value={summary.total} label="Clientes" />
          <Kpi value={summary.invited} label="Invitados" />
          <Kpi value={summary.completed} label="Reseñas completadas" />
          <Kpi value={summary.redeemedThisMonth} label="Descuentos canjeados (mes)" />
        </div>
      </section>

      {/* Checklist de puesta en marcha */}
      <section
        aria-label="Puesta en marcha"
        className="dashboard-card overflow-hidden rounded-xl"
      >
        <div className="border-b border-[#1b1b1b] px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2 className="text-sm font-semibold">Pon en marcha tu negocio</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {pendingCount === 0
              ? 'Todo listo. Ya puedes empezar a fidelizar.'
              : `${pendingCount} paso${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} para sacarle partido a Revly.`}
          </p>
        </div>
        <div className="py-2">
          {checklist.map((item) => (
            <ChecklistRow key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Accesos directos */}
      <section aria-label="Accesos directos">
        <h2 className="text-sm font-semibold mb-3">Secciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              href: `/business/${id}/clientes`,
              title: 'Clientes',
              desc: 'Escanea el QR, canjea descuentos y gestiona tu base.',
            },
            {
              href: `/business/${id}/reputacion`,
              title: 'Reputación',
              desc: 'Reseñas de Google y propuestas de mejora con IA.',
            },
            {
              href: `/business/${id}/redes`,
              title: 'Redes sociales',
              desc: 'Bandeja de comentarios de Instagram y Facebook.',
            },
            {
              href: `/business/${id}/local`,
              title: 'Mi local',
              desc: 'Dirección, mapa, fotos y horarios de apertura.',
            },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="dashboard-card rounded-xl p-4 transition-transform hover:-translate-y-0.5 sm:p-5"
            >
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {s.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BusinessSummary;
