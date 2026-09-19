import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading } from '../components/Feedback';
import { api } from '../services/api';
import { onDataChange } from '../services/bus';
import { Download, AlertTriangle } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel';

const COLS_PALLETS = [
  { key: 'codigo', label: 'Código pallet', width: 16 },
  { key: 'sku', label: 'SKU', width: 12 },
  { key: 'producto', label: 'Producto', width: 32 },
  { key: 'lote', label: 'Lote', width: 16 },
  { key: 'cantidad', label: 'Cantidad', width: 12 },
  { key: 'peso', label: 'Peso (KG)', width: 12 },
  { key: 'estado', label: 'Estado', width: 14 },
  { key: 'posicion', label: 'Posición', width: 12 },
  { key: 'fecha_ingreso', label: 'Fecha de ingreso', width: 20 },
];

const COLS_MOVIMIENTOS = [
  { key: 'pallet', label: 'Pallet', width: 16 },
  { key: 'posicion_anterior', label: 'Posición anterior', width: 16 },
  { key: 'posicion_nueva', label: 'Posición nueva', width: 16 },
  { key: 'motivo', label: 'Motivo', width: 26 },
  { key: 'usuario', label: 'Usuario', width: 18 },
  { key: 'fecha', label: 'Fecha', width: 20 },
];

const COLS_VENCIMIENTOS = [
  { key: 'codigo', label: 'Código pallet', width: 16 },
  { key: 'producto', label: 'Producto', width: 32 },
  { key: 'lote', label: 'Lote', width: 16 },
  { key: 'fecha_vencimiento', label: 'Fecha de vencimiento', width: 18 },
  { key: 'dias_restantes', label: 'Días restantes', width: 14 },
  { key: 'posicion', label: 'Posición', width: 12 },
  { key: 'estado', label: 'Estado', width: 14 },
];

export default function Reportes() {
  const [pallets, setPallets] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [vencimientos, setVencimientos] = useState<any[]>([]);
  const [diasVencimiento, setDiasVencimiento] = useState(30);
  const [loading, setLoading] = useState(true);

  function cargarBase() {
    Promise.all([
      api.get('/pallets', { params: { pageSize: 500 } }),
      api.get('/movimientos'),
    ]).then(([a, b]) => { setPallets(a.data.data); setMovimientos(b.data); }).finally(() => setLoading(false));
  }
  useEffect(cargarBase, []);
  useEffect(() => onDataChange(cargarBase), []);

  useEffect(() => {
    api.get('/reportes/vencimientos', { params: { dias: diasVencimiento } }).then((res) => setVencimientos(res.data));
  }, [diasVencimiento]);
  useEffect(() => onDataChange(() => api.get('/reportes/vencimientos', { params: { dias: diasVencimiento } }).then((res) => setVencimientos(res.data))), [diasVencimiento]);

  const porEstado: Record<string, number> = {};
  pallets.forEach((p) => { porEstado[p.estado] = (porEstado[p.estado] || 0) + 1; });

  if (loading) return <><Header title="Reportes" breadcrumb="Bodega" /><Loading /></>;

  return (
    <>
      <Header title="Reportes" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(porEstado).map(([estado, cantidad]) => (
            <div key={estado} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-800">{cantidad}</p>
              <p className="text-xs text-slate-500">{estado.replaceAll('_', ' ')}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" /> Pallets próximos a vencer
            </p>
            <div className="flex items-center gap-2">
              <select value={diasVencimiento} onChange={(e) => setDiasVencimiento(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                <option value={7}>Próximos 7 días</option>
                <option value={15}>Próximos 15 días</option>
                <option value={30}>Próximos 30 días</option>
                <option value={90}>Próximos 90 días</option>
              </select>
              <button
                onClick={() => exportToExcel('reporte-vencimientos', `Pallets próximos a vencer (${diasVencimiento} días)`, vencimientos, COLS_VENCIMIENTOS)}
                className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} /> Excel
              </button>
            </div>
          </div>
          {vencimientos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay pallets próximos a vencer en este período.</p>
          ) : (
            <div className="overflow-x-auto">
<table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Pallet</th>
                  <th className="py-2 font-medium">Producto</th>
                  <th className="py-2 font-medium">Lote</th>
                  <th className="py-2 font-medium">Vencimiento</th>
                  <th className="py-2 font-medium">Días restantes</th>
                  <th className="py-2 font-medium">Posición</th>
                </tr>
              </thead>
              <tbody>
                {vencimientos.map((v) => (
                  <tr key={v.codigo} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-medium text-slate-700">{v.codigo}</td>
                    <td className="py-2 text-slate-500">{v.producto}</td>
                    <td className="py-2 text-slate-500">{v.lote || '—'}</td>
                    <td className="py-2 text-slate-500">{v.fecha_vencimiento}</td>
                    <td className={`py-2 font-medium ${v.dias_restantes < 0 ? 'text-[var(--color-danger)]' : v.dias_restantes <= 7 ? 'text-[var(--color-warning)]' : 'text-slate-500'}`}>
                      {v.dias_restantes < 0 ? `Vencido (${Math.abs(v.dias_restantes)}d)` : `${v.dias_restantes} día(s)`}
                    </td>
                    <td className="py-2 text-slate-500">{v.posicion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Reporte de pallets ({pallets.length} registros)</p>
            <p className="text-xs text-slate-400">Código, SKU, producto, lote, cantidad, estado, posición y fecha de ingreso</p>
          </div>
          <button
            onClick={() => exportToExcel('reporte-pallets', 'Reporte de Pallets', pallets, COLS_PALLETS)}
            className="flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            <Download size={15} /> Exportar Excel
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Reporte de movimientos ({movimientos.length} registros)</p>
            <p className="text-xs text-slate-400">Pallet, posición anterior/nueva, usuario, motivo y fecha</p>
          </div>
          <button
            onClick={() => exportToExcel('reporte-movimientos', 'Reporte de Movimientos', movimientos, COLS_MOVIMIENTOS)}
            className="flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            <Download size={15} /> Exportar Excel
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Próxima etapa: filtros por fecha/usuario/sector y más reportes (ocupación de posiciones, productividad por usuario).
        </p>
      </div>
    </>
  );
}
