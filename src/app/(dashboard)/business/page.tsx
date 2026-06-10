'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', googleLink: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Crear negocio:', form);
    setForm({ name: '', googleLink: '' });
    setOpen(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Negocios</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestiona tus negocios y sus enlaces de reseña</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          + Nuevo negocio
        </button>
      </div>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setOpen(false)}>
          <div className="card" style={{ width: 420, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Crear negocio</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Nombre del negocio</label>
                <input
                  className="input"
                  placeholder="Ej: Cafetería El Centro"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Enlace de Google Reviews</label>
                <input
                  className="input"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={form.googleLink}
                  onChange={e => setForm({ ...form, googleLink: e.target.value })}
                />
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Enlace para que los clientes dejen su reseña en Google
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
          Todavía no tienes negocios registrados
        </p>
      </div>
    </div>
  );
}
