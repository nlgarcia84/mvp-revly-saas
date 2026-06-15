'use client';

import { useEffect, useState } from 'react';
import { getAllGoogleReviews } from '@/actions/google-reviews';

// Tipo que representa los datos que devuelve la server action getAllGoogleReviews
type GoogleData = {
  businessId: string;
  businessName: string;
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

// ──────────────────────────────────────────────
// GoogleReviewsSection
// ──────────────────────────────────────────────
// Componente que se monta en el dashboard y muestra
// las reseñas de Google de todos los negocios del usuario.
// Llama a la server action getAllGoogleReviews() al montarse
// y muestra el resultado en tarjetas agrupadas por negocio.
// ──────────────────────────────────────────────
const GoogleReviewsSection = () => {
  const [data, setData] = useState<GoogleData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Función que carga los datos desde la server action
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAllGoogleReviews();
      setData(result);
    } catch (e) {
      // Captura el error y lo muestra en la UI
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
    setLoading(false);
  };

  // Carga automática al montar el componente
  useEffect(() => {
    load();
  }, []);

  // Estado: cargando
  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-sm text-neutral-400">Cargando reseñas de Google...</p>
      </div>
    );
  }

  // Estado: error (API key faltante, Places API denegada, etc.)
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

  // Estado: sin datos (no hay negocios con googleLink o Places API no devolvió nada)
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-sm text-neutral-400">
          No hay reseñas de Google disponibles. Añade un enlace de Google Reviews en la configuración de tu negocio.
        </p>
      </div>
    );
  }

  // Estado: datos cargados — muestra tarjetas con las reseñas
  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado con botón de recarga manual */}
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

      {/* Una tarjeta por cada negocio */}
      {data.map((business) => (
        <div
          key={business.businessId}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-4"
        >
          {/* Cabecera del negocio: nombre, rating medio y total de reseñas */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{business.businessName}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold">{business.rating}</span>
                <span className="text-lg" style={{ color: '#f59e0b' }}>
                  {'★'.repeat(Math.round(business.rating))}
                </span>
                <span className="text-xs text-neutral-400">
                  ({business.userRatingsTotal} reseña{business.userRatingsTotal !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
          </div>

          {/* Hasta 5 reseñas individuales, ordenadas por las más recientes */}
          {business.reviews.length > 0 && (
            <div className="flex flex-col gap-3">
              {business.reviews.slice(0, 5).map((review, i) => (
                <div
                  key={i}
                  className="border-t border-neutral-100 dark:border-neutral-800 pt-3"
                >
                  {/* Autor, rating y fecha de la reseña */}
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
                  {/* Texto de la reseña */}
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
      ))}
    </div>
  );
};

export default GoogleReviewsSection;
