'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBusinessGoogleReviews } from '@/actions/google-reviews';
import { nCard } from '@/components/ui/card';

type GoogleData = {
  placeId: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviews: {
    authorName: string;
    rating: number;
    text: string;
    time: number;
    profilePhotoUrl: string;
    relativeTimeDescription: string;
  }[];
};

type BadReview = {
  authorName: string;
  rating: number;
  text: string;
  businessName: string;
};

const seenKey = (businessId: string) => `gr_seen_${businessId}`;

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const ReviewToast = ({ review, onClose }: { review: BadReview; onClose: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100%-48px)] transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`${nCard} p-4 border-l-4 border-l-red-500`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Reseña crítica
              </p>
              <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-medium mt-1 truncate">{review.authorName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-semibold text-red-500">{review.rating}</span>
              <span className="text-xs" style={{ color: '#ef4444' }}>{'★'.repeat(review.rating)}</span>
              <span className="text-xs text-neutral-400 ml-1">{review.businessName}</span>
            </div>
            {review.text && (
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed line-clamp-2">
                {review.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleReviewsSection = ({ businessId, googleLink }: { businessId: string; googleLink?: string }) => {
  const [data, setData] = useState<GoogleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState<BadReview[]>([]);
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '1m' | '3m' | '6m'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBusinessGoogleReviews(businessId);
      setData(result);

      if (result?.reviews) {
        const seen = new Set<string>(
          JSON.parse(localStorage.getItem(seenKey(businessId)) ?? '[]'),
        );
        const newBad: BadReview[] = [];

        for (const r of result.reviews) {
          if (r.rating >= 4) continue;
          const hash = `${r.authorName}|${r.time}|${r.text}`;
          if (seen.has(hash)) continue;
          seen.add(hash);
          newBad.push({ authorName: r.authorName, rating: r.rating, text: r.text, businessName: result.name });
        }

        if (newBad.length > 0) {
          localStorage.setItem(seenKey(businessId), JSON.stringify(Array.from(seen)));
          setAlerts((prev) => [...prev, ...newBad]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now() / 1000;
  const filtered = data?.reviews.filter((r) => {
    if (ratingFilter === 'positive' && r.rating < 4) return false;
    if (ratingFilter === 'negative' && r.rating >= 4) return false;
    if (dateFilter === '1m' && now - r.time > 2_592_000) return false;
    if (dateFilter === '3m' && now - r.time > 7_776_000) return false;
    if (dateFilter === '6m' && now - r.time > 15_552_000) return false;
    return true;
  }) ?? [];

  if (loading) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <p className="text-sm text-neutral-400">Cargando reseñas de Google...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">{error}</p>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <p className="text-sm text-neutral-400">
          No hay reseñas de Google disponibles. Añade un enlace de Google Reviews en la configuración del negocio.
        </p>
      </div>
    );
  }

  return (
    <>
      {alerts.map((r, i) => (
        <ReviewToast key={i} review={r} onClose={() => setAlerts((prev) => prev.filter((_, j) => j !== i))} />
      ))}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
              Reseñas de Google
            </h2>
          </div>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
          >
            Actualizar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'positive', 'negative'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRatingFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                ratingFilter === f
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'positive' ? 'Positivas' : 'Críticas'}
            </button>
          ))}
          <span className="w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
          {(['all', '1m', '3m', '6m'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                dateFilter === f
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {f === 'all' ? 'Siempre' : f === '1m' ? '1 mes' : f === '3m' ? '3 meses' : '6 meses'}
            </button>
          ))}
        </div>

        <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{data.rating}</span>
                <span className="text-lg" style={{ color: '#f59e0b' }}>
                  {'★'.repeat(Math.round(data.rating))}
                </span>
                <span className="text-xs text-neutral-400">
                  ({data.userRatingsTotal} reseña{data.userRatingsTotal !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
            <span className="text-xs text-neutral-400">{filtered.length} mostradas</span>
          </div>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.slice(0, 10).map((review, i) => (
                <div
                  key={i}
                  className="border-t border-neutral-200 dark:border-neutral-800 pt-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {review.profilePhotoUrl && (
                      <img
                        src={review.profilePhotoUrl}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium">
                      {review.authorName}
                    </span>
                    <span className="text-xs" style={{ color: review.rating < 4 ? '#ef4444' : '#f59e0b' }}>
                      {'★'.repeat(review.rating)}
                    </span>
                    {review.rating < 4 && (
                      <>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Crítica</span>
                        <a
                          href={googleLink || `https://www.google.com/maps/place/?q=place_id:${data.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                          Responder
                        </a>
                      </>
                    )}
                    <span className="text-xs text-neutral-400 ml-auto hidden sm:inline">
                      {fmtDate(review.time)}
                    </span>
                    <span className="text-xs text-neutral-400 ml-1">
                      {review.relativeTimeDescription}
                    </span>
                  </div>
                  {review.text && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {review.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">No hay reseñas con estos filtros</p>
          )}
        </div>
      </div>
    </>
  );
};

export default GoogleReviewsSection;
