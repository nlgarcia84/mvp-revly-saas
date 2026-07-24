import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function IncidentReporter() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold">¿Tienes una incidencia?</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
          Reporta cualquier problema y te atenderemos lo antes posible.
        </p>
      </div>
      <Link
        href="/incidencia"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:border-neutral-600"
      >
        Reportar
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
