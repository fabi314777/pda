import { useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { api, apiErrorMessage } from '../services/api';
import { ScanLine, Keyboard, CheckCircle2, RotateCcw, X, AlertTriangle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CameraScanner } from '../components/CameraScanner';
import { emitDataChange } from '../services/bus';

interface ScannedData {
  codigo: string;
  sku: string;
  lote: string;
  cantidad: string;
  peso: string;
  vencimiento: string;
  metodo: 'QR' | 'BARCODE' | 'MANUAL';
}

const EMPTY: ScannedData = { codigo: '', sku: '', lote: '', cantidad: '', peso: '', vencimiento: '', metodo: 'MANUAL' };

// Parsea el contenido leído por un lector QR/código de barras.
// Soporta: cadena delimitada por ';' con orden codigo;sku;lote;cantidad;peso;vencimiento
// (formato recomendado para las etiquetas de bodega), o un GS1-128 básico con AIs
// (01)=GTIN/SKU (10)=Lote (17)=Vencimiento (30)=Cantidad, o si no matchea ningún
// formato conocido, se toma como el código del pallet y se completa manualmente.
function parseScan(raw: string): Partial<ScannedData> {
  const clean = raw.trim();
  if (clean.includes(';')) {
    const [codigo, sku, lote, cantidad, peso, vencimiento] = clean.split(';');
    return { codigo, sku, lote, cantidad, peso, vencimiento };
  }
  const gs1 = /\(01\)(\d+).*?(?:\(10\)([^\(]+))?.*?(?:\(17\)(\d{6}))?.*?(?:\(30\)(\d+))?/.exec(clean);
  if (gs1 && gs1[1]) {
    const venc = gs1[3] ? `20${gs1[3].slice(0, 2)}-${gs1[3].slice(2, 4)}-${gs1[3].slice(4, 6)}` : undefined;
    return { sku: gs1[1], lote: gs1[2], vencimiento: venc, cantidad: gs1[4] };
  }
  return { codigo: clean };
}

export default function IngresoPallet() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [buffer, setBuffer] = useState('');
  const [form, setForm] = useState<ScannedData>(EMPTY);
  const [step, setStep] = useState<'input' | 'review' | 'done'>('input');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCameraResult(text: string) {
    const parsed = parseScan(text);
    setForm({ ...EMPTY, ...parsed, metodo: 'QR' });
    setShowCamera(false);
    setStep('review');
  }

  useEffect(() => {
    if (mode === 'scan' && step === 'input') inputRef.current?.focus();
  }, [mode, step]);

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buffer.trim()) return;
    const parsed = parseScan(buffer);
    setForm({ ...EMPTY, ...parsed, metodo: buffer.includes(';') || buffer.includes('(01)') ? 'BARCODE' : 'QR' });
    setBuffer('');
    setStep('review');
  }

  function startManual() {
    setForm(EMPTY);
    setMode('manual');
    setStep('review');
  }

  async function confirmarIngreso() {
    setError('');
    if (!form.codigo || !form.sku || !form.cantidad) {
      setError('Código, SKU y cantidad son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pallets/ingreso', {
        codigo: form.codigo,
        sku: form.sku,
        lote: form.lote || undefined,
        cantidad: Number(form.cantidad),
        peso: form.peso ? Number(form.peso) : undefined,
        vencimiento: form.vencimiento || undefined,
        metodo: form.metodo,
      });
      emitDataChange();
      setStep('done');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setBuffer('');
    setError('');
    setMode('scan');
    setStep('input');
  }

  return (
    <>
      <Header title="Ingreso de pallets" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 max-w-2xl">
        {step === 'input' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mx-auto">
              <ScanLine size={30} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Escanear pallet</h2>
              <p className="text-sm text-slate-500 mt-1">
                Usa un lector de código de barras / QR conectado por USB (funciona como teclado),
                o ingresa el código manualmente si no tienes lector disponible.
              </p>
            </div>

            <form onSubmit={handleScanSubmit} className="max-w-sm mx-auto">
              <input
                ref={inputRef}
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                placeholder="Esperando lectura del escáner..."
                autoFocus
                className="w-full text-center border-2 border-dashed border-slate-300 focus:border-[var(--color-accent)] rounded-lg px-4 py-4 text-sm outline-none"
              />
              <button type="submit" className="mt-3 w-full bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
                Procesar lectura
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-slate-400 max-w-sm mx-auto">
              <div className="flex-1 h-px bg-slate-200" /> o <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCamera(true)}
                className="inline-flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Camera size={16} /> Usar cámara
              </button>
              <button
                onClick={startManual}
                className="inline-flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Keyboard size={16} /> Ingreso manual
              </button>
            </div>
          </div>
        )}

        {showCamera && <CameraScanner onResult={handleCameraResult} onClose={() => setShowCamera(false)} />}

        {step === 'review' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                {mode === 'scan' ? 'Pallet detectado' : 'Ingreso manual'}
              </h2>
              {mode === 'scan' && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)] bg-[var(--color-success-bg)] px-2 py-1 rounded-full">
                  <CheckCircle2 size={13} /> Código leído
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm rounded-lg px-3 py-2">
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Código *" value={form.codigo} onChange={(v) => setForm({ ...form, codigo: v })} placeholder="PAL-00005" />
              <FormField label="SKU *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="100001" />
              <FormField label="Lote" value={form.lote} onChange={(v) => setForm({ ...form, lote: v })} placeholder="LOTE-A100" />
              <FormField label="Cantidad *" value={form.cantidad} onChange={(v) => setForm({ ...form, cantidad: v })} type="number" />
              <FormField label="Peso (KG)" value={form.peso} onChange={(v) => setForm({ ...form, peso: v })} type="number" />
              <FormField label="Vencimiento" value={form.vencimiento} onChange={(v) => setForm({ ...form, vencimiento: v })} type="date" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={confirmarIngreso} disabled={submitting}
                className="flex-1 bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Guardando...' : 'Confirmar ingreso'}
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                <RotateCcw size={15} /> Escanear nuevamente
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                <X size={15} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Pallet {form.codigo} registrado</h2>
              <p className="text-sm text-slate-500 mt-1">Estado inicial: PENDIENTE DE VALIDACIÓN</p>
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={reset} className="bg-[var(--color-accent)] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90">
                Ingresar otro pallet
              </button>
              <button onClick={() => navigate('/validacion')} className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Ir a validación
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
      />
    </div>
  );
}
