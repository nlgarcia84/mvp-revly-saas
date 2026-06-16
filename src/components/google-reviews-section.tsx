'use client';

import { useEffect, useState } from 'react';
import { getBusinessGoogleReviews } from '@/actions/google-reviews';

type GoogleData = {
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

const GoogleReviewsSection = ({ businessId }: { businessId: string }) => {
  const [data, setData] = useState<GoogleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBusinessGoogleReviews(businessId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [businessId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-sm text-neutral-400">Cargando reseñas de Google...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-sm text-neutral-400">
          No hay reseñas de Google disponibles. Añade un enlace de Google Reviews en la configuración del negocio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Reseñas de Google
        </h2>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
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
        </div>

        {data.reviews.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.reviews.slice(0, 5).map((review, i) => (
              <div
                key={i}
                className="border-t border-neutral-100 dark:border-neutral-800 pt-3"
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
                  <span className="text-xs" style={{ color: '#f59e0b' }}>
                    {'★'.repeat(review.rating)}
                  </span>
                  <span className="text-xs text-neutral-400 ml-auto">
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
        )}
      </div>
    </div>
  );
};

export default GoogleReviewsSection;
