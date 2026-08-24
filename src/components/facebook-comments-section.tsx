'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBusinessFacebookData,
  getFacebookConnectionStatus,
  replyToFacebookComment,
  type FacebookSectionData,
} from '@/actions/facebook';
import {
  generateCommentResponse,
} from '@/actions/generate-response';
import { isIslamophobic, isLikelyNegative } from '@/lib/sentiment';
import { nCard } from '@/components/ui/card';

type Post = FacebookSectionData['posts'][number];
type Comment = NonNullable<Post['comments']>[number];

type FlatItem = {
  comment: Comment;
  post: Post;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const FbLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.021 1.792-4.688 4.532-4.688 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const Avatar = ({ username, className = '' }: { username: string; className?: string }) => (
  <div
    className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-sky-500 text-white text-xs font-semibold select-none ${className}`}
  >
    {(username.trim()[0] || '?').toUpperCase()}
  </div>
);

type Filter = 'all' | 'critical' | 'pending';

const FacebookCommentsSection = ({
  businessId,
  features,
}: {
  businessId: string;
  features?: string[];
}) => {
  const [data, setData] = useState<FacebookSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [hideIslamophobic, setHideIslamophobic] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBusinessFacebookData(businessId);
      setData(result);
      if (!result) {
        const status = await getFacebookConnectionStatus(businessId);
        setConnected(status.connected);
      } else {
        setConnected(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo<FlatItem[]>(() => {
    if (!data) return [];
    const flat: FlatItem[] = [];
    data.posts.forEach((post) => {
      (post.comments ?? []).forEach((comment) => {
        flat.push({ comment, post });
      });
    });
    return flat.sort(
      (a, b) =>
        new Date(b.comment.timestamp).getTime() -
        new Date(a.comment.timestamp).getTime(),
    );
  }, [data]);

  const filtered = useMemo(
    () =>
      items.filter(({ comment }) => {
        if (hideIslamophobic && isIslamophobic(comment.text)) return false;
        if (filter === 'critical') return isLikelyNegative(comment.text);
        if (filter === 'pending') return comment.replies.length === 0;
        return true;
      }),
    [items, filter, hideIslamophobic],
  );

  const islamophobicCount = useMemo(
    () => items.filter(({ comment }) => isIslamophobic(comment.text)).length,
    [items],
  );

  // Agrupa los comentarios por publicación, ordenando los
  // posts del más reciente al más antiguo.
  const groups = useMemo(() => {
    const map = new Map<string, { post: Post; comments: FlatItem[] }>();
    for (const item of filtered) {
      const existing = map.get(item.post.id);
      if (existing) {
        existing.comments.push(item);
      } else {
        map.set(item.post.id, { post: item.post, comments: [item] });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.post.created_time).getTime() -
        new Date(a.post.created_time).getTime(),
    );
  }, [filtered]);

  const selected = useMemo(
    () => filtered.find(({ comment }) => comment.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  // Selección por defecto cuando cambia la lista
  useEffect(() => {
    if (filtered[0] && !filtered.some(({ comment }) => comment.id === selectedId)) {
      setSelectedId(filtered[0].comment.id);
      setDraft('');
      setResult(null);
    }
  }, [filtered, selectedId]);

  const resetComposer = () => {
    setDraft('');
    setResult(null);
    setGenerating(false);
    setPublishing(false);
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    setResult(null);
    try {
      const text = await generateCommentResponse(
        selected.comment.text,
        data?.username ? `@${data.username}` : 'el negocio',
        isLikelyNegative(selected.comment.text),
      );
      setDraft(text);
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : 'Error al generar respuesta',
      });
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!selected || !draft.trim()) return;
    setPublishing(true);
    setResult(null);
    try {
      await replyToFacebookComment(businessId, selected.comment.id, draft);
      setResult({ ok: true, msg: 'Respuesta publicada en Facebook' });
      setDraft('');
      setTimeout(load, 1200);
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : 'Error al publicar',
      });
    }
    setPublishing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setResult({ ok: true, msg: 'Respuesta copiada al portapapeles' });
  };

  if (loading) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <p className="text-sm text-neutral-400">
          Cargando comentarios de Facebook...
        </p>
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
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data || connected === false) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <FbLogo className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-medium text-blue-600 uppercase tracking-wider">
              Comentarios de Facebook
            </h2>
          </div>
          <p className="text-sm text-neutral-400">
            {connected === false
              ? 'Conecta tu Página de Facebook para ver los comentarios de tus publicaciones y responderlos con IA.'
              : 'No hay publicaciones recientes para mostrar. Conecta Facebook en Configuración.'}
          </p>
          <a
            href={`/business/${businessId}/settings`}
            className="text-xs font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity"
          >
            Ir a Configuración
          </a>
        </div>
      </div>
    );
  }

  const counts = {
    all: items.length,
    critical: items.filter(({ comment }) => isLikelyNegative(comment.text)).length,
    pending: items.filter(({ comment }) => comment.replies.length === 0).length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `Todos (${counts.all})` },
    { key: 'pending', label: `Sin responder (${counts.pending})` },
    { key: 'critical', label: `Críticos (${counts.critical})` },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <FbLogo className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Bandeja de Facebook
            </h2>
            {data.username && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 normal-case tracking-normal">
                @{data.username}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {data.totalComments} comentario{data.totalComments !== 1 ? 's' : ''}{' '}
            en tus publicaciones. Responde directamente desde aquí.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors w-fit cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
              filter === f.key
                ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setHideIslamophobic((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
            hideIslamophobic
              ? 'border-neutral-200 dark:border-neutral-700 text-neutral-400'
              : 'border-red-300 dark:border-red-800 text-red-500'
          }`}
          title={
            hideIslamophobic
              ? 'Los comentarios islamófobos están ocultos'
              : 'Mostrando también comentarios islamófobos'
          }
        >
          {hideIslamophobic
            ? `Islamofobia oculta${islamophobicCount > 0 ? ` (${islamophobicCount})` : ''}`
            : 'Mostrando islamofobia'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={`${nCard} p-8 text-center`}>
          <p className="text-sm text-neutral-400">
            {filter === 'all'
              ? 'No hay comentarios todavía. Cuando alguien comente en tus publicaciones, aparecerá aquí.'
              : filter === 'pending'
                ? 'No hay comentarios sin responder. ¡Todo al día!'
                : 'No hay comentarios críticos. ¡Buen trabajo!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
          {/* ── Lista de comentarios agrupada por publicación ── */}
          <div
            ref={listRef}
            className={`${nCard} p-2 flex flex-col gap-3 max-h-[640px] overflow-y-auto lg:sticky lg:top-4`}
          >
            {groups.map(({ post, comments }: { post: Post; comments: FlatItem[] }) => (
              <div key={post.id} className="flex flex-col gap-1">
                {/* Cabecera del post */}
                <div className="flex items-center gap-2 px-2 pt-1 pb-1.5">
                  {post.full_picture && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.full_picture}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-neutral-100 dark:bg-neutral-800"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-neutral-400">
                      {fmtDate(post.created_time)} · {comments.length}{' '}
                      {comments.length !== 1 ? 'comentarios' : 'comentario'}
                    </span>
                    {post.message && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-1 mt-0.5">
                        {post.message}
                      </p>
                    )}
                  </div>
                  {post.permalink_url && (
                    <a
                      href={post.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors shrink-0"
                      title="Abrir publicación"
                    >
                      Abrir ↗
                    </a>
                  )}
                </div>

                {/* Comentarios de este post */}
                <div className="flex flex-col gap-1">
                  {comments.map(({ comment }) => {
                    const negative = isLikelyNegative(comment.text);
                    const replied = comment.replies.length > 0;
                    const active = selected?.comment.id === comment.id;
                    return (
                      <button
                        key={comment.id}
                        onClick={() => {
                          setSelectedId(comment.id);
                          resetComposer();
                        }}
                        className={`w-full text-left flex gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-neutral-800 shadow-sm'
                            : 'hover:bg-white/60 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <Avatar username={comment.username} />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-neutral-950 dark:text-neutral-100 truncate">
                              {comment.username}
                            </span>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {fmtDate(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug line-clamp-2">
                            {comment.text}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isIslamophobic(comment.text)
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                                  : negative
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isIslamophobic(comment.text)
                                ? 'Islamofobia'
                                : negative
                                  ? 'Crítico'
                                  : 'Positivo'}
                            </span>
                            {replied && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                Respondido
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Panel de detalle y respuesta ── */}
          {selected && (
            <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
              {/* Contexto de la publicación */}
              <div className="flex items-start gap-3">
                {selected.post.full_picture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.post.full_picture}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0 bg-neutral-100 dark:bg-neutral-800"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Publicación
                    </span>
                    <span className="text-xs text-neutral-400">
                      {fmtDate(selected.post.created_time)}
                    </span>
                  </div>
                  {selected.post.message && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-2 mt-1">
                      {selected.post.message}
                    </p>
                  )}
                  {selected.post.permalink_url && (
                    <a
                      href={selected.post.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors"
                    >
                      Ver publicación →
                    </a>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800" />

              {/* Comentario */}
              <div className="flex gap-3">
                <Avatar username={selected.comment.username} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">
                      {selected.comment.username}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {fmtDate(selected.comment.timestamp)}
                    </span>
                    {isLikelyNegative(selected.comment.text) && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        Crítico
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed mt-1.5">
                    {selected.comment.text}
                  </p>

                  {/* Réplicas */}
                  {selected.comment.replies.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
                      {selected.comment.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-neutral-500">
                              {reply.username}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {fmtDate(reply.timestamp)}
                            </span>
                            {reply.username === data.username && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Tu respuesta
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-0.5">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800" />

              {/* Composer */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {selected.comment.replies.length > 0
                      ? 'Añadir otra respuesta'
                      : 'Responder con IA'}
                  </h3>
                  {features?.includes('ai-responses') ? (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {generating ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          Generando...
                        </span>
                      ) : (
                        '🤖 Generar respuesta'
                      )}
                    </button>
                  ) : (
                    <a
                      href="/pricing"
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      IA disponible en Avanzado
                    </a>
                  )}
                </div>

                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-blue-500 resize-y leading-relaxed"
                />

                {result && (
                  <p
                    className={`text-xs ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {result.msg}
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePublish}
                      disabled={publishing || !draft.trim()}
                      className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {publishing ? 'Publicando...' : 'Publicar respuesta'}
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={!draft.trim()}
                      className="text-xs font-medium px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                  {selected.post.permalink_url && (
                    <a
                      href={selected.post.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Abrir en Facebook
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacebookCommentsSection;