'use client';

import { useRef, useState } from 'react';
import { Paperclip, Send, Upload, X } from 'lucide-react';
import BackButton from '@/components/back-button';

type FilePreview = { file: File; preview: string };
type Status = 'idle' | 'success' | 'error';

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const ACCEPTED_LABEL = 'JPG, PNG, WebP, GIF o PDF';

export default function IncidentPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [ticketId, setTicketId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list)
      .filter((f) => f.type && ACCEPTED.includes(f.type) && f.size <= MAX_SIZE)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !description) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const encoded = await Promise.all(
        files.map(
          (fp) =>
            new Promise<{ filename: string; content: string; type: string }>(
              (resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve({
                    filename: fp.file.name,
                    content: base64,
                    type: fp.file.type,
                  });
                };
                reader.readAsDataURL(fp.file);
              },
            ),
        ),
      );

      const body = new FormData();
      body.set('name', name);
      body.set('email', email);
      body.set('description', description);
      body.set('files', JSON.stringify(encoded));

      const res = await fetch('/api/incident', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error');

      setStatus('success');
      setTicketId(data.ticketId);
      setName('');
      setEmail('');
      setDescription('');
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/contacto" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reportar incidencia
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            Describe el problema que has encontrado y, si es posible, adjunta
            capturas de pantalla o archivos que nos ayuden a resolverlo.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {status === 'success' && (
            <div
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-live="polite"
            >
              Incidencia enviada correctamente. Tu referencia es{' '}
              <strong>{ticketId}</strong>.
            </div>
          )}

          {status === 'error' && (
            <div
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
              aria-live="assertive"
            >
              No se ha podido enviar la incidencia. Inténtalo de nuevo.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="incident-name"
                className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Nombre
              </label>
              <input
                id="incident-name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                required
              />
            </div>

            <div>
              <label
                htmlFor="incident-email"
                className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Email
              </label>
              <input
                id="incident-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                required
              />
            </div>

            <div>
              <label
                htmlFor="incident-description"
                className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Descripción del problema
              </label>
              <textarea
                id="incident-description"
                rows={5}
                placeholder="Describe qué ha ocurrido con el mayor detalle posible..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Archivos adjuntos{' '}
                <span className="font-normal text-neutral-400">
                  (opcional, máx. 5)
                </span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-neutral-950 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800'
                    : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600'
                }`}
              >
                <Upload className="h-5 w-5 text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Arrastra archivos aquí o{' '}
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">
                    selecciona
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  {ACCEPTED_LABEL} — 10 MB máximo por archivo
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {files.map((fp, i) => (
                    <div
                      key={i}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      {fp.file.type === 'application/pdf' ? (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500">
                          PDF
                        </div>
                      ) : (
                        <img
                          src={fp.preview}
                          alt={fp.file.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={`Eliminar ${fp.file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 py-0.5 text-[9px] text-white">
                        {fp.file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name || !email || !description}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-[18px] py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:border-white"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Enviando...' : 'Enviar incidencia'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
