import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, EmptyState, ErrorBanner } from '../components/Feedback';
import { api, apiErrorMessage } from '../services/api';
import { onDataChange, emitDataChange } from '../services/bus';
import { MapPin, CheckCircle2, ScanLine } from 'lucide-react';
import { CameraScanner } from '../components/CameraScanner';

interface PalletVal { codigo: string; sku: string; producto: string; cantidad: number; }
interface Disponible { id: number; codigo: string; sector: string; rack: string; nivel: string; }

export default function AsignarPosicion() {
  const [pendientes, setPendientes] = useState<PalletVal[]>([]);
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [seleccionado, setSeleccionado] = useState<PalletVal | null>(null);
  const [posicion, setPosicion] = useState<Disponible | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');

  async function asignarDirecto(codigoPallet: string, codigoPosicion: string) {
    setError('');
    try {
      await api.post('/posiciones/asignar', { codigoPallet, codigoPosicion });
      setSeleccionado(null); setPosicion(null);
      emitDataChange();
      cargar();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  function handleScanPosicion(codigo: string) {
    setShowCamera(false);
    setScanBuffer('');
    if (!seleccionado) { setError('Primero selecciona el pallet a asignar.'); return; }
    asignarDirecto(seleccionado.codigo, codigo.trim());
  }

  function handleScanInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (scanBuffer.trim()) handleScanPosicion(scanBuffer);
  }

  function cargar() {
    setLoading(true);
    Promise.all([
      api.get('/pallets', { params: { estado: 'VALIDADO', pageSize: 100 } }),
      api.get('/posiciones/disponibles'),
    ]).then(([a, b]) => {
      setPendientes(a.data.data.filter((p: any) => !p.posicion));
      setDisponibles(b.data);
    }).finally(() => setLoading(false));
  }
  useEffect(cargar, []);
  useEffect(() => onDataChange(cargar), []);

  async function confirmar() {
    if (!seleccionado || !posicion) return;
    setError('');
    try {
      await api.post('/posiciones/asignar', { codigoPallet: seleccionado.codigo, codigoPosicion: posicion.codigo });
      setSeleccionado(null); setPosicion(null);
      emitDataChange();
      cargar();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <Header title="Asignar posición" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">1. Selecciona el pallet validado</p>
            {loading ? <Loading /> : pendientes.length === 0 ? <EmptyState label="No hay pallets validados esperando posición" /> : (
              <div className="space-y-2">
                {pendientes.map((p) => (
                  <button
                    key={p.codigo} onClick={() => setSeleccionado(p)}
                    className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex justify-between items-center transition-colors ${
                      seleccionado?.codigo === p.codigo ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span><span className="font-medium">{p.codigo}</span> · {p.producto}</span>
                    <span className="text-xs text-slate-400">{p.cantidad} un.</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">2. Selecciona una posición libre — o escanéala</p>

            <div className="flex gap-2 mb-4">
              <form onSubmit={handleScanInputSubmit} className="flex-1 min-w-0 flex gap-2">
                <input
                  value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)}
                  placeholder="Escanear código de posición (QR)..."
                  disabled={!seleccionado}
                  className="flex-1 border-2 border-dashed border-slate-300 focus:border-[var(--color-accent)] rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
                />
              </form>
              <button
                onClick={() => setShowCamera(true)} disabled={!seleccionado}
                className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <ScanLine size={15} /> Cámara
              </button>
            </div>
            {!seleccionado && <p className="text-xs text-slate-400 mb-3">Selecciona primero un pallet para poder escanear o elegir la posición.</p>}

            {disponibles.length === 0 ? <EmptyState label="No hay posiciones libres" /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {disponibles.map((p) => (
                  <button
                    key={p.id} onClick={() => setPosicion(p)}
                    className={`rounded-lg border px-2 py-3 text-center text-sm font-mono transition-colors ${
                      posicion?.codigo === p.codigo ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.codigo}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showCamera && <CameraScanner onResult={handleScanPosicion} onClose={() => setShowCamera(false)} />}

        {seleccionado && posicion && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={18} className="text-[var(--color-accent)]" />
              <span>Asignar <span className="font-semibold">{seleccionado.codigo}</span> ({seleccionado.producto}) a la posición <span className="font-semibold">{posicion.codigo}</span></span>
            </div>
            <button onClick={confirmar} className="flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90">
              <CheckCircle2 size={16} /> Confirmar asignación
            </button>
          </div>
        )}
      </div>
    </>
  );
}
