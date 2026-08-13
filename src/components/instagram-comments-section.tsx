'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getBusinessInstagramData,
  getInstagramConnectionStatus,
  replyToInstagramComment,
  type InstagramSectionData,
} from '@/actions/instagram';
import {
  generateCommentResponse,
} from '@/actions/generate-response';
import { isLikelyNegative } from '@/lib/sentiment';
import { nCard } from '@/components/ui/card';

type CommentWithPost = {
  comment: NonNullable<
    InstagramSectionData['posts'][number]['comments'][number]
  >;
  post: InstagramSectionData['posts'][number];
  postIndex: number;
  commentIndex: number;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const IgLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="12"
      cy="12"
      r="4.5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
  </svg>
);

// ─── Modal de respuesta con IA ───────────────────────
const ResponseModal = ({
  text,
  businessId,
  commentId,
  commentText,
  postPermalink,
  onClose,
  onPublished,
}: {
  text: string;
  businessId: string;
  commentId: string;
  commentText: string;
  postPermalink: string;
  onClose: () => void;
  onPublished: () => void;
}) => {
  const [displayed, setDisplayed] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

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
    setResult({ ok: true, msg: 'Respuesta copiada al portapapeles' });
  };

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);
    try {
      await replyToInstagramComment(businessId, commentId, text);
      setResult({ ok: true, msg: 'Respuesta publicada en Instagram' });
      onPublished();
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : 'Error al publicar',
      });
    }
    setPublishing(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Respuesta con IA</h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 text-lg leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
          <p className="text-xs text-neutral-400 mb-4 line-clamp-2">
            Comentario: “{commentText}”
          </p>
          <div
            className={`${nCard} p-4 mb-4 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto`}
          >
            {displayed}
            {displayed.length < text.length && (
              <span className="inline-block w-0.5 h-4 bg-neutral-950 dark:bg-neutral-100 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopy}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity"
            >
              Copiar respuesta
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {publishing ? 'Publicando...' : 'Publicar en Instagram'}
            </button>
            <a
              href={postPermalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Abrir en Instagram
            </a>
          </div>
          {result && (
            <p
              className={`text-xs mt-3 ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {result.msg}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

const InstagramCommentsSection = ({
  businessId,
  features,
}: {
  businessId: string;
  features?: string[];
}) => {
  const [data, setData] = useState<InstagramSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState('');
  const [modal, setModal] = useState<{
    text: string;
    commentId: string;
    commentText: string;
    postPermalink: string;
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBusinessInstagramData(businessId);
      setData(result);
      if (!result) {
        const status = await getInstagramConnectionStatus(businessId);
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

  const handleGenerate = async (item: CommentWithPost) => {
    const key = `${item.comment.id}`;
    setGenerating(key);
    setGenerateError('');
    try {
      const text = await generateCommentResponse(
        item.comment.text,
        data?.username ? `@${data.username}` : 'el negocio',
        isLikelyNegative(item.comment.text),
      );
      setModal({
        text,
        commentId: item.comment.id,
        commentText: item.comment.text,
        postPermalink: item.post.permalink,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al generar respuesta';
      setGenerateError(msg);
    }
    setGenerating(null);
  };

  const handlePublished = () => {
    // Recargamos para que la respuesta (reply) aparezca en la lista
    setTimeout(load, 1200);
  };

  if (loading) {
    return (
      <div className={`${nCard} p-5 sm:p-6`}>
        <p className="text-sm text-neutral-400">
          Cargando comentarios de Instagram...
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
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
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
            <IgLogo className="w-5 h-5 text-neutral-500" />
            <h2 className="text-sm font-medium text-blue-600 uppercase tracking-wider">
              Comentarios de Instagram
            </h2>
          </div>
          <p className="text-sm text-neutral-400">
            {connected === false
              ? 'Conecta tu cuenta profesional de Instagram para ver los comentarios de tus publicaciones y responderlos con IA.'
              : 'No hay publicaciones recientes para mostrar. Conecta Instagram en Configuración.'}
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

  const total = data.totalComments;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IgLogo className="w-5 h-5 text-neutral-950 dark:text-neutral-100" />
          <h2 className="text-sm font-medium text-blue-600 uppercase tracking-wider">
            Comentarios de Instagram
            {data.username && (
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 normal-case tracking-normal">
                @{data.username}
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

      <p className="text-xs text-neutral-400">
        {total} comentario{total !== 1 ? 's' : ''} en tus últimas publicaciones.
      </p>

      {generateError && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800">
          {generateError}
        </div>
      )}

      {data.posts.length === 0 ? (
        <div className={`${nCard} p-6`}>
          <p className="text-sm text-neutral-400 text-center py-4">
            No hay publicaciones recientes con comentarios.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.posts.map((post, postIndex) =>
            post.comments.length === 0 ? null : (
              <div key={post.id} className={`${nCard} p-5 flex flex-col gap-3`}>
                <div className="flex items-start gap-3">
                  {post.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-neutral-100 dark:bg-neutral-800"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400">
                      {fmtDate(post.timestamp)}
                    </p>
                    {post.caption && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-2 mt-0.5">
                        {post.caption}
                      </p>
                    )}
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors"
                    >
                      Ver publicación →
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {post.comments.map((comment, commentIndex) => {
                    const negative = isLikelyNegative(comment.text);
                    const key = `${postIndex}-${commentIndex}`;
                    return (
                      <div
                        key={comment.id}
                        className={`border-l-2 pl-3 py-1 ${negative ? 'border-red-300 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700'}`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">
                            @{comment.username}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {fmtDate(comment.timestamp)}
                          </span>
                          {negative && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              Crítico
                            </span>
                          )}
                          {features?.includes('ai-responses') ? (
                            <button
                              onClick={() =>
                                handleGenerate({ comment, post, postIndex, commentIndex })
                              }
                              disabled={generating === key}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors disabled:opacity-50"
                            >
                              <span className="sm:hidden">IA</span>
                              <span className="hidden sm:inline">
                                {generating === key
                                  ? 'Generando...'
                                  : 'Responder con IA'}
                              </span>
                            </button>
                          ) : (
                            <a
                              href="/pricing"
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                              <span className="sm:hidden">IA</span>
                              <span className="hidden sm:inline">
                                IA disponible en Avanzado
                              </span>
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-0.5">
                          {comment.text}
                        </p>
                        {comment.replies.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-1.5 pl-3 border-l border-neutral-100 dark:border-neutral-800">
                            {comment.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-neutral-500">
                                    @{reply.username}
                                  </span>
                                  <span className="text-[10px] text-neutral-400">
                                    {fmtDate(reply.timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                  {reply.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {modal && (
        <ResponseModal
          text={modal.text}
          businessId={businessId}
          commentId={modal.commentId}
          commentText={modal.commentText}
          postPermalink={modal.postPermalink}
          onClose={() => setModal(null)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
};

export default InstagramCommentsSection;