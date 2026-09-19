import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, EmptyState, ErrorBanner } from '../components/Feedback';
import { api, apiErrorMessage } from '../services/api';
import { onDataChange, emitDataChange } from '../services/bus';
import { Eye, CheckCircle2, XCircle, X, Pencil } from 'lucide-react';

interface Pendiente {
  id: number; codigo: string; sku: string; producto: string; lote: string | null;
  fecha_vencimiento: string | null; cantidad: number; peso: number | null; usuario: string; fecha_ingreso: string;
}

const MOTIVOS = ['Datos incorrectos', 'Código no válido', 'Diferencia de cantidad', 'Lote incorrecto', 'Producto incorrecto', 'Vencimiento incorrecto', 'Otro'];

export default function Validacion() {
  const [rows, setRows] = useState<Pendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<any>(null);
  const [rechazoCodigo, setRechazoCodigo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [editando, setEditando] = useState<Pendiente | null>(null);
  const [editForm, setEditForm] = useState({ sku: '', lote: '', cantidad: '', peso: '', vencimiento: '' });
  const [error, setError] = useState('');

  function cargar() {
    setLoading(true);
    api.get('/validaciones/pendientes').then((res) => setRows(res.data)).finally(() => setLoading(false));
  }
  useEffect(cargar, []);
  useEffect(() => onDataChange(cargar), []);

  async function verDetalle(codigo: string) {
    const res = await api.get(`/validaciones/${codigo}`);
    setDetalle(res.data);
  }

  async function validar(codigo: string) {
    setError('');
    try {
      await api.post(`/validaciones/${codigo}/validar`);
      setDetalle(null);
      emitDataChange();
      cargar();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function rechazar() {
    if (!rechazoCodigo) return;
    setError('');
    try {
      await api.post(`/validaciones/${rechazoCodigo}/rechazar`, { motivo });
      setRechazoCodigo(null);
      setDetalle(null);
      emitDataChange();
      cargar();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  function abrirEdicion(p: Pendiente) {
    setEditando(p);
    setEditForm({
      sku: p.sku, lote: p.lote || '', cantidad: String(p.cantidad),
      peso: p.peso != null ? String(p.peso) : '', vencimiento: p.fecha_vencimiento || '',
    });
  }

  async function guardarEdicion() {
    if (!editando) return;
    setError('');
    try {
      await api.patch(`/pallets/${editando.codigo}/editar`, {
        sku: editForm.sku,
        lote: editForm.lote || undefined,
        cantidad: Number(editForm.cantidad),
        peso: editForm.peso ? Number(editForm.peso) : undefined,
        vencimiento: editForm.vencimiento || undefined,
      });
      setEditando(null);
      emitDataChange();
      cargar();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <Header title="Validar ingresos" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? <Loading /> : rows.length === 0 ? <EmptyState label="No hay pallets pendientes de validación" /> : (
            <div className="overflow-x-auto">
<table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Lote</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 font-medium">Peso</th>
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.codigo} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-700">{p.codigo}</td>
                    <td className="px-5 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 text-slate-500">{p.producto}</td>
                    <td className="px-5 py-3 text-slate-500">{p.lote || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{p.cantidad}</td>
                    <td className="px-5 py-3 text-slate-500">{p.peso ? `${p.peso} KG` : '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{p.usuario}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => verDetalle(p.codigo)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50" title="Ver"><Eye size={15} /></button>
                        <button onClick={() => abrirEdicion(p)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="Editar ingreso"><Pencil size={15} /></button>
                        <button onClick={() => validar(p.codigo)} className="p-1.5 rounded-lg border border-[var(--color-success)]/30 text-[var(--color-success)] hover:bg-[var(--color-success-bg)]" title="Validar"><CheckCircle2 size={15} /></button>
                        <button onClick={() => setRechazoCodigo(p.codigo)} className="p-1.5 rounded-lg border border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]" title="Rechazar"><XCircle size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          )}
        </div>
      </div>

      {detalle && (
        <Modal onClose={() => setDetalle(null)} title={`Validación · ${detalle.pallet.codigo}`}>
          <div className="grid grid-cols-2 gap-4 text-sm mb-5">
            <Info label="Producto" value={detalle.pallet.producto} />
            <Info label="SKU" value={detalle.pallet.sku} />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos del escaneo vs. sistema</p>
          <div className="space-y-2 mb-5">
            {detalle.comparacion.map((c: any) => (
              <div key={c.campo} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-500">{c.campo}</span>
                <span className="text-slate-700">{String(c.escaneado ?? '—')} / {String(c.registrado ?? '—')}</span>
                <span className={c.coincide ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                  {c.coincide ? '✓ Coincide' : '⚠ Difiere'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => validar(detalle.pallet.codigo)} className="flex-1 bg-[var(--color-success)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
              Validar ingreso
            </button>
            <button onClick={() => { abrirEdicion(detalle.pallet); setDetalle(null); }} className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-50">
              Editar
            </button>
            <button onClick={() => { setRechazoCodigo(detalle.pallet.codigo); setDetalle(null); }} className="flex-1 border border-[var(--color-danger)]/30 text-[var(--color-danger)] rounded-lg py-2.5 text-sm font-semibold hover:bg-[var(--color-danger-bg)]">
              Rechazar
            </button>
          </div>
        </Modal>
      )}

      {rechazoCodigo && (
        <Modal onClose={() => setRechazoCodigo(null)} title={`Rechazar ${rechazoCodigo}`}>
          <p className="text-sm text-slate-500 mb-3">Selecciona el motivo del rechazo:</p>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4">
            {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <button onClick={rechazar} className="w-full bg-[var(--color-danger)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
            Confirmar rechazo
          </button>
        </Modal>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)} title={`Editar ingreso · ${editando.codigo}`}>
          <p className="text-xs text-slate-400 mb-4">Los cambios quedan registrados en la auditoría con tu usuario.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <EditField label="SKU" value={editForm.sku} onChange={(v) => setEditForm({ ...editForm, sku: v })} />
            <EditField label="Lote" value={editForm.lote} onChange={(v) => setEditForm({ ...editForm, lote: v })} />
            <EditField label="Cantidad" type="number" value={editForm.cantidad} onChange={(v) => setEditForm({ ...editForm, cantidad: v })} />
            <EditField label="Peso (KG)" type="number" value={editForm.peso} onChange={(v) => setEditForm({ ...editForm, peso: v })} />
            <EditField label="Vencimiento" type="date" value={editForm.vencimiento} onChange={(v) => setEditForm({ ...editForm, vencimiento: v })} />
          </div>
          <button onClick={guardarEdicion} className="w-full bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
            Guardar cambios
          </button>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-700 font-medium">{value}</p>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      />
    </div>
  );
}
