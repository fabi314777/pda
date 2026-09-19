import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, EmptyState } from '../components/Feedback';
import { api } from '../services/api';
import { User, Calendar } from 'lucide-react';

interface Evento { id: number; accion: string; valor_anterior: string | null; valor_nuevo: string | null; motivo: string | null; fecha: string; usuario: string | null; pallet: string | null; }

export default function Historial() {
  const [codigo, setCodigo] = useState('');
  const [sku, setSku] = useState('');
  const [lote, setLote] = useState('');
  const [usuario, setUsuario] = useState('');
  const [rows, setRows] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  function buscar() {
    setLoading(true);
    api.get('/historial', { params: { codigo, sku, lote, usuario } }).then((res) => setRows(res.data)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(buscar, 300); return () => clearTimeout(t); }, [codigo, sku, lote, usuario]);

  return (
    <>
      <Header title="Historial" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código pallet" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
          <input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Lote" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuario" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          {loading ? <Loading /> : rows.length === 0 ? <EmptyState label="No se encontraron eventos con esos filtros" /> : (
            <div className="relative pl-5 space-y-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
              {rows.map((e) => (
                <div key={e.id} className="relative">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                  <p className="text-sm font-medium text-slate-700">
                    {e.accion.replaceAll('_', ' ')} {e.pallet && <span className="text-slate-400 font-normal">· {e.pallet}</span>}
                  </p>
                  {e.valor_anterior && e.valor_nuevo && (
                    <p className="text-xs text-slate-500">{e.valor_anterior} → {e.valor_nuevo}</p>
                  )}
                  {e.motivo && <p className="text-xs text-slate-500">Motivo: {e.motivo}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><User size={11} />{e.usuario || 'Sistema'}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} />{new Date(e.fecha).toLocaleString('es-VE')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
