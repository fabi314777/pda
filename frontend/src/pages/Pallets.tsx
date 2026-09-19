import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, EmptyState } from '../components/Feedback';
import { api } from '../services/api';
import { onDataChange } from '../services/bus';
import type { Pallet } from '../types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ESTADOS = ['', 'PENDIENTE', 'VALIDADO', 'ALMACENADO', 'EN_MOVIMIENTO', 'RECHAZADO', 'DESPACHADO'];

export default function Pallets() {
  const [rows, setRows] = useState<Pallet[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/pallets', { params: { search, estado, page, pageSize } })
        .then((res) => { setRows(res.data.data); setTotal(res.data.total); })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, estado, page]);

  useEffect(() => {
    const refrescar = () => api.get('/pallets', { params: { search, estado, page, pageSize } })
      .then((res) => { setRows(res.data.data); setTotal(res.data.total); });
    return onDataChange(refrescar);
  }, [search, estado, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Header title="Pallets" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar código, SKU, producto o lote..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </div>
          <select
            value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            {ESTADOS.map((e) => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? <Loading /> : rows.length === 0 ? <EmptyState label="No se encontraron pallets con esos filtros" /> : (
            <>
              <div className="overflow-x-auto">
<table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Código</th>
                    <th className="px-5 py-3 font-medium">SKU</th>
                    <th className="px-5 py-3 font-medium">Producto</th>
                    <th className="px-5 py-3 font-medium">Lote</th>
                    <th className="px-5 py-3 font-medium">Cantidad</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium">Posición</th>
                    <th className="px-5 py-3 font-medium">Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.codigo} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3"><Link to={`/pallets/${p.codigo}`} className="font-medium text-slate-700">{p.codigo}</Link></td>
                      <td className="px-5 py-3 text-slate-500">{p.sku}</td>
                      <td className="px-5 py-3 text-slate-500">{p.producto}</td>
                      <td className="px-5 py-3 text-slate-500">{p.lote || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{p.cantidad}</td>
                      <td className="px-5 py-3"><StatusBadge estado={p.estado} /></td>
                      <td className="px-5 py-3 text-slate-500">{p.posicion || '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(p.fecha_ingreso).toLocaleString('es-VE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
                <span>{total} pallet(s) encontrados</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  <span>Página {page} de {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
