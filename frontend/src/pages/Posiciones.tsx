import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, EmptyState } from '../components/Feedback';
import { api } from '../services/api';
import { onDataChange } from '../services/bus';
import type { Position } from '../types';
import { Search } from 'lucide-react';

const ESTADO_STYLES: Record<string, string> = {
  LIBRE: 'border-[var(--color-success)]/30 bg-[var(--color-success-bg)]',
  OCUPADA: 'border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)]',
  RESERVADA: 'border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)]',
  BLOQUEADA: 'border-slate-300 bg-slate-100',
};
const DOT: Record<string, string> = {
  LIBRE: 'bg-[var(--color-success)]', OCUPADA: 'bg-[var(--color-danger)]',
  RESERVADA: 'bg-[var(--color-warning)]', BLOQUEADA: 'bg-slate-400',
};

export default function Posiciones() {
  const [rows, setRows] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('');
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');

  function cargar() {
    setLoading(true);
    api.get('/posiciones', { params: { sector, estado, search } }).then((res) => setRows(res.data)).finally(() => setLoading(false));
  }
  useEffect(cargar, [sector, estado, search]);
  useEffect(() => onDataChange(cargar), [sector, estado, search]);

  const sectores = Array.from(new Set(rows.map((r) => r.sector))).sort();
  const grouped: Record<string, Position[]> = {};
  rows.forEach((r) => { (grouped[r.sector] ||= []).push(r); });

  return (
    <>
      <Header title="Posiciones" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar posición..."
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none w-56" />
          </div>
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los sectores</option>
            {sectores.map((s) => <option key={s} value={s}>Sector {s}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            {['LIBRE', 'OCUPADA', 'RESERVADA', 'BLOQUEADA'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="flex items-center gap-3 text-xs text-slate-500 ml-auto">
            {Object.entries(DOT).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${v}`} />{k}</span>
            ))}
          </div>
        </div>

        {loading ? <Loading /> : rows.length === 0 ? <EmptyState label="No se encontraron posiciones" /> : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([sec, positions]) => (
              <div key={sec}>
                <p className="text-sm font-semibold text-slate-700 mb-3">Sector {sec}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {positions.map((p) => (
                    <div key={p.id} className={`rounded-xl border p-3 text-center ${ESTADO_STYLES[p.estado]}`}>
                      <p className="font-mono text-sm font-semibold text-slate-800">{p.codigo}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.estado}</p>
                      {p.pallet_actual && <p className="text-[10px] text-slate-500 mt-1 truncate">{p.pallet_actual}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
