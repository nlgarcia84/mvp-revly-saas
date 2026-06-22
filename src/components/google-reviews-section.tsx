'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBusinessGoogleReviews, getBusinessProfileStatus } from '@/actions/google-reviews';
import { generateReviewResponse } from '@/actions/generate-response';
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
              <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors shrink-0 cursor-pointer">
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

const ResponseModal = ({ text, authorName, placeId, googleLink, onClose }: { text: string; authorName: string; placeId: string; googleLink?: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Respuesta para {authorName}</h3>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 text-lg leading-none cursor-pointer">&times;</button>
          </div>
          <div className={`${nCard} p-4 mb-4 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto`}>
            {displayed}
            {displayed.length < text.length && (
              <span className="inline-block w-0.5 h-4 bg-neutral-950 dark:bg-neutral-100 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity"
            >
              {copied ? 'Copiado' : 'Copiar respuesta'}
            </button>
            <a
              href={googleLink || `https://www.google.com/maps/place/?q=place_id:${placeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ir a Google a responder
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

const GoogleReviewsSection = ({ businessId, googleLink }: { businessId: string; googleLink?: string }) => {
  const [data, setData] = useState<GoogleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bpConnected, setBpConnected] = useState(false);
  const [alerts, setAlerts] = useState<BadReview[]>([]);
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '1m' | '3m' | '6m'>('all');
  const [generating, setGenerating] = useState<string | null>(null);
  const [responseModal, setResponseModal] = useState<{ text: string; authorName: string; placeId: string } | null>(null);
  const [generateError, setGenerateError] = useState('');

  const handleGenerate = async (review: { authorName: string; text: string; rating: number }, placeId: string) => {
    const key = `${review.authorName}|${review.text.slice(0, 20)}`;
    setGenerating(key);
    setGenerateError('');
    try {
      const response = await generateReviewResponse(review.text, data?.name ?? '', review.rating);
      setResponseModal({ text: response, authorName: review.authorName, placeId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al generar respuesta';
      setGenerateError(msg);
    }
    setGenerating(null);
  };

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

  // Comprueba si el negocio tiene Business Profile conectado
  useEffect(() => {
    getBusinessProfileStatus(businessId)
      .then((status) => setBpConnected(status.connected))
      .catch(() => setBpConnected(false));
  }, [businessId]);

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
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              Reseñas de Google
              {bpConnected && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 normal-case tracking-normal">
                  Todas
                </span>
              )}
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
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
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
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                dateFilter === f
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {f === 'all' ? 'Siempre' : f === '1m' ? '1 mes' : f === '3m' ? '3 meses' : '6 meses'}
            </button>
          ))}
        </div>

        {generateError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800">
            {generateError}
          </div>
        )}

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
            <span className="text-xs text-neutral-400">
              {filtered.length} {bpConnected ? 'mostradas' : 'mostradas (máx. 5 sin conectar)'}
            </span>
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
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Crítica</span>
                    )}
                    <button
                      onClick={() => handleGenerate(review, data.placeId)}
                      disabled={generating === `${review.authorName}|${review.text.slice(0, 20)}`}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors disabled:opacity-50"
                    >
                      {generating === `${review.authorName}|${review.text.slice(0, 20)}` ? 'Generando...' : 'Generar respuesta con IA'}
                    </button>
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
              <a
                href={googleLink || `https://www.google.com/maps/place/?q=place_id:${data.placeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors text-center pt-2"
              >
                Ver todas las reseñas en Google →
              </a>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">No hay reseñas con estos filtros</p>
          )}
        </div>
      </div>

      {responseModal && (
        <ResponseModal
          text={responseModal.text}
          authorName={responseModal.authorName}
          placeId={responseModal.placeId}
          googleLink={googleLink}
          onClose={() => setResponseModal(null)}
        />
      )}
    </>
  );
};

export default GoogleReviewsSection;
