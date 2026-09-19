import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, EmptyState, ErrorBanner } from '../components/Feedback';
import { api, apiErrorMessage } from '../services/api';
import { onDataChange, emitDataChange } from '../services/bus';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface Mov { id: number; fecha: string; motivo: string | null; pallet: string; usuario: string; posicion_anterior: string | null; posicion_nueva: string; }

export default function Movimientos() {
  const [historial, setHistorial] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [codigoPallet, setCodigoPallet] = useState('');
  const [posicionActual, setPosicionActual] = useState<string | null>(null);
  const [codigoPosicionNueva, setCodigoPosicionNueva] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  function cargarHistorial() {
    setLoading(true);
    api.get('/movimientos').then((res) => setHistorial(res.data)).finally(() => setLoading(false));
  }
  useEffect(cargarHistorial, []);
  useEffect(() => onDataChange(cargarHistorial), []);

  async function buscarPallet() {
    setError(''); setOk(''); setPosicionActual(null);
    if (!codigoPallet) return;
    try {
      const res = await api.get(`/pallets/${codigoPallet}`);
      setPosicionActual(res.data.pallet.posicion);
    } catch {
      setError('Pallet no encontrado');
    }
  }

  async function mover() {
    setError(''); setOk('');
    try {
      await api.post('/movimientos', { codigoPallet, codigoPosicionNueva, motivo: motivo || undefined });
      setOk('Movimiento registrado correctamente.');
      setCodigoPallet(''); setPosicionActual(null); setCodigoPosicionNueva(''); setMotivo('');
      emitDataChange();
      cargarHistorial();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <Header title="Movimientos" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-xl space-y-4">
          <p className="text-sm font-semibold text-slate-700">Mover pallet a otra posición</p>
          {error && <ErrorBanner message={error} />}
          {ok && <div className="flex items-center gap-2 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg px-3 py-2 text-sm"><CheckCircle2 size={15} /> {ok}</div>}

          <div className="flex gap-2">
            <input
              value={codigoPallet} onChange={(e) => setCodigoPallet(e.target.value)} onBlur={buscarPallet}
              placeholder="Código del pallet (ej: PAL-00003)"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button onClick={buscarPallet} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Buscar</button>
          </div>

          {posicionActual !== null && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-mono bg-slate-100 px-2 py-1 rounded">{posicionActual || 'Sin posición'}</span>
              <ArrowRight size={15} className="text-slate-400" />
              <input
                value={codigoPosicionNueva} onChange={(e) => setCodigoPosicionNueva(e.target.value)}
                placeholder="Nueva posición (ej: B-01-02)"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none font-mono"
              />
            </div>
          )}

          <input
            value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del movimiento (opcional)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={mover} disabled={!codigoPallet || !codigoPosicionNueva}
            className="w-full bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Confirmar movimiento
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Historial de movimientos</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? <Loading /> : historial.length === 0 ? <EmptyState label="Aún no se han registrado movimientos" /> : (
              <div className="overflow-x-auto">
<table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Pallet</th>
                    <th className="px-5 py-3 font-medium">Posición anterior</th>
                    <th className="px-5 py-3 font-medium">Posición nueva</th>
                    <th className="px-5 py-3 font-medium">Motivo</th>
                    <th className="px-5 py-3 font-medium">Usuario</th>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-700">{m.pallet}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono">{m.posicion_anterior || '—'}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono">{m.posicion_nueva}</td>
                      <td className="px-5 py-3 text-slate-500">{m.motivo || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{m.usuario}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(m.fecha).toLocaleString('es-VE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
