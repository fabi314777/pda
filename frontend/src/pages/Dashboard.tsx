import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, EmptyState } from '../components/Feedback';
import { api } from '../services/api';
import { onDataChange } from '../services/bus';
import type { DashboardResumen } from '../types';
import { Package, Clock, CheckCircle2, Archive, MapPin, MapPinOff, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const POSICION_COLORS: Record<string, string> = {
  LIBRE: '#12B76A', OCUPADA: '#F04438', RESERVADA: '#F79009', BLOQUEADA: '#667085',
};

const ALERTA_ICON = { WARNING: AlertTriangle, ERROR: AlertCircle, INFO: Info };
const ALERTA_TONE: Record<string, string> = {
  WARNING: 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]',
  ERROR: 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]',
  INFO: 'text-[var(--color-info)] bg-[var(--color-info-bg)]',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardResumen | null>(null);

  useEffect(() => {
    const cargar = () => api.get('/dashboard/resumen').then((res) => setData(res.data));
    cargar();
    const unsub = onDataChange(cargar);
    const onFocus = () => cargar();
    window.addEventListener('focus', onFocus);
    return () => { unsub(); window.removeEventListener('focus', onFocus); };
  }, []);

  if (!data) return <><Header title="Dashboard" breadcrumb="Inicio" /><Loading /></>;

  const { resumen, estadoPosiciones, ingresosPorDia, ultimosPallets, alertas } = data;

  return (
    <>
      <Header title="Dashboard" breadcrumb="Inicio" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <DashboardCard icon={Package} label="Pallets totales" value={resumen.palletsTotales} />
          <DashboardCard icon={Clock} label="Pendientes" value={resumen.palletsPendientes} tone="warning" />
          <DashboardCard icon={CheckCircle2} label="Validados" value={resumen.palletsValidados} tone="success" />
          <DashboardCard icon={Archive} label="Almacenados" value={resumen.palletsAlmacenados} tone="success" />
          <DashboardCard icon={MapPin} label="Posiciones ocupadas" value={resumen.posicionesOcupadas} tone="danger" />
          <DashboardCard icon={MapPinOff} label="Posiciones disponibles" value={resumen.posicionesDisponibles} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-4">Ingresos de pallets (últimos 14 días)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ingresosPorDia}>
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => v?.slice(5)} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F5F6F8' }} />
                <Bar dataKey="cantidad" fill="#4F6BFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-4">Estado de posiciones</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={estadoPosiciones} dataKey="cantidad" nameKey="estado" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {estadoPosiciones.map((s) => <Cell key={s.estado} fill={POSICION_COLORS[s.estado]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Últimos pallets</p>
              <Link to="/pallets" className="text-xs text-[var(--color-accent)] font-medium">Ver todos</Link>
            </div>
            {ultimosPallets.length === 0 ? <EmptyState label="Aún no hay pallets registrados" /> : (
              <div className="overflow-x-auto">
<table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2 font-medium">Código</th>
                    <th className="px-5 py-2 font-medium">Producto</th>
                    <th className="px-5 py-2 font-medium">Estado</th>
                    <th className="px-5 py-2 font-medium">Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPallets.map((p) => (
                    <tr key={p.codigo} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-2.5"><Link to={`/pallets/${p.codigo}`} className="font-medium text-slate-700">{p.codigo}</Link></td>
                      <td className="px-5 py-2.5 text-slate-500">{p.producto}</td>
                      <td className="px-5 py-2.5"><StatusBadge estado={p.estado} /></td>
                      <td className="px-5 py-2.5 text-slate-500">{p.posicion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Alertas</p>
            {alertas.length === 0 ? (
              <EmptyState label="Sin alertas activas" />
            ) : (
              <div className="space-y-2">
                {alertas.map((a, i) => {
                  const Icon = ALERTA_ICON[a.tipo];
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${ALERTA_TONE[a.tipo]}`}>
                      <Icon size={16} className="mt-0.5 shrink-0" />
                      <span>{a.mensaje}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
