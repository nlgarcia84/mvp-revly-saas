'use client';

import { useState, useEffect } from 'react';
import { createBusiness, getBusinesses } from '@/actions/business';

interface Business {
  id: string;
  name: string;
  googleLink: string | null;
  _count: { customers: number };
}

export default function BusinessPage() {
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', googleLink: '' });

  async function load() {
    setBusinesses(await getBusinesses());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createBusiness(form);
    setForm({ name: '', googleLink: '' });
    setOpen(false);
    await load();
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

      {businesses.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
            Todavía no tienes negocios registrados
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {businesses.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{b.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 12 }}>
                  {b._count.customers} clientes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
