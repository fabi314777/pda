import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Feedback';
import { api } from '../services/api';
import { ArrowLeft, MapPin, User, Calendar } from 'lucide-react';

export default function PalletDetail() {
  const { codigo } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`/pallets/${codigo}`).then((res) => setData(res.data));
  }, [codigo]);

  if (!data) return <><Header title="Pallet" breadcrumb="Pallets" /><Loading /></>;

  const { pallet, movimientos, auditoria } = data;

  const eventos = [
    ...auditoria.map((a: any) => ({ ...a, tipo: 'auditoria', fecha: a.fecha })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <>
      <Header title={pallet.codigo} breadcrumb="Pallets" />
      <div className="p-4 sm:p-6 space-y-4">
        <Link to="/pallets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Volver al listado
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs text-slate-400">Código pallet</p>
                <h2 className="text-lg font-bold text-slate-800">{pallet.codigo}</h2>
              </div>
              <StatusBadge estado={pallet.estado} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="SKU" value={pallet.sku} />
              <Field label="Producto" value={pallet.producto} />
              <Field label="Lote" value={pallet.lote || '—'} />
              <Field label="Vencimiento" value={pallet.fecha_vencimiento || '—'} />
              <Field label="Cantidad" value={String(pallet.cantidad)} />
              <Field label="Peso" value={pallet.peso ? `${pallet.peso} KG` : '—'} />
              <Field label="Posición" value={pallet.posicion || 'Sin asignar'} />
              <Field label="Usuario de ingreso" value={pallet.usuario_ingreso || '—'} />
            </div>

            {pallet.motivo_rechazo && (
              <div className="mt-4 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm rounded-lg px-3 py-2">
                Motivo de rechazo: {pallet.motivo_rechazo}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-3">Últimos movimientos</p>
              {movimientos.length === 0 ? (
                <p className="text-sm text-slate-400">Este pallet no registra movimientos entre posiciones.</p>
              ) : (
                <div className="space-y-2">
                  {movimientos.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 text-sm text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{m.posicion_anterior || 'Ingreso'} → <span className="font-medium">{m.posicion_nueva}</span></span>
                      <span className="text-xs text-slate-400 ml-auto">{new Date(m.fecha).toLocaleString('es-VE')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Historial completo</p>
            <div className="relative pl-5 space-y-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
              {eventos.map((e: any) => (
                <div key={e.id} className="relative">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                  <p className="text-sm font-medium text-slate-700">{e.accion.replaceAll('_', ' ')}</p>
                  {e.motivo && <p className="text-xs text-slate-500">Motivo: {e.motivo}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><User size={11} />{e.usuario || 'Sistema'}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} />{new Date(e.fecha).toLocaleString('es-VE')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-700 font-medium">{value}</p>
    </div>
  );
}
