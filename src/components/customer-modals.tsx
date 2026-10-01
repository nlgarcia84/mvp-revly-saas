'use client';

// ─── Modales de alta de clientes ─────────────────────
// "Añadir cliente" (uno a mano) e "Importar CSV" (varios a la
// vez). Se mantienen separados de la tabla para que esta no cargue
// con el estado de dos formularios que casi nunca están abiertos.
// ────────────────────────────────────────────────────

import { useState } from 'react';
import { addCustomerBatch } from '@/actions/customers';
import Button from '@/components/ui/button';

const overlay = 'fixed inset-0 bg-black/50 z-40';
const panel =
  'fixed inset-0 z-50 flex items-center justify-center p-4';
const box =
  'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6';
const inputClass =
  'w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400';

export const AddCustomerModal = ({
  businessId,
  onClose,
  onSaved,
}: {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addCustomerBatch(businessId, [{ ...form }]);
      setForm({ name: '', email: '', phone: '' });
      onClose();
      onSaved();
    } catch (err) {
      alert(
        'Error al añadir cliente: ' +
          (err instanceof Error ? err.message : 'desconocido'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={overlay} onClick={onClose} />
      <div className={panel}>
        <div className={box} onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-4">Añadir cliente</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre"
              className={inputClass}
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              required
              type="email"
              className={inputClass}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Teléfono"
              required
              className={inputClass}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export const ImportCsvModal = ({
  businessId,
  onClose,
  onSaved,
}: {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [result, setResult] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setResult('El CSV debe tener al menos 2 líneas (cabecera + datos)');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx =
      headers.indexOf('nombre') !== -1
        ? headers.indexOf('nombre')
        : headers.indexOf('name');
    const emailIdx =
      headers.indexOf('email') !== -1
        ? headers.indexOf('email')
        : headers.indexOf('correo') !== -1
          ? headers.indexOf('correo')
          : headers.indexOf('mail');
    const phoneIdx =
      headers.indexOf('telefono') !== -1
        ? headers.indexOf('telefono')
        : headers.indexOf('phone') !== -1
          ? headers.indexOf('phone')
          : headers.indexOf('teléfono') !== -1
            ? headers.indexOf('teléfono')
            : headers.indexOf('tlf');

    if (emailIdx === -1) {
      setResult('El CSV debe tener una columna "email"');
      return;
    }
    if (phoneIdx === -1) {
      setResult('El CSV debe tener una columna "teléfono" o "phone"');
      return;
    }

    const customerRows = lines
      .slice(1)
      .map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return {
          name: nameIdx >= 0 ? cols[nameIdx] : '',
          email: cols[emailIdx],
          phone: cols[phoneIdx],
        };
      })
      .filter((c) => c.email);

    try {
      const res = await addCustomerBatch(businessId, customerRows);
      setResult(
        `Importados ${res.created} cliente(s). ${res.errors} error(es).`,
      );
      e.target.value = '';
      onSaved();
    } catch (err) {
      setResult(
        'Error al importar: ' + (err instanceof Error ? err.message : 'desconocido'),
      );
    }
  };

  return (
    <>
      <div className={overlay} onClick={onClose} />
      <div className={panel}>
        <div className={box} onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-1">Importar CSV</h2>
          <p className="text-xs text-neutral-400 mb-4">
            Columnas: nombre, email, teléfono (separado por comas)
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="text-sm text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-neutral-200 dark:file:border-neutral-700 file:text-sm file:bg-white dark:file:bg-neutral-800 file:text-neutral-950 dark:file:text-neutral-100 hover:file:bg-neutral-100 dark:hover:file:bg-neutral-700 file:cursor-pointer"
          />
          {result && <p className="text-sm text-neutral-500 mt-3">{result}</p>}
          <div className="flex justify-end mt-4">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
