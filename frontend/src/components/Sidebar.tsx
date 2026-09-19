import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, ScanLine, CheckSquare, MapPin,
  ArrowLeftRight, History, BarChart3, Settings, ChevronsLeft, ChevronsRight, Boxes,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSidebar } from '../hooks/useSidebar';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/pallets', icon: PackageSearch, label: 'Pallets' },
  { to: '/ingreso', icon: ScanLine, label: 'Ingreso de pallets', perm: 'pallets.crear' },
  { to: '/validacion', icon: CheckSquare, label: 'Validación', perm: 'pallets.validar' },
  { to: '/posiciones', icon: MapPin, label: 'Posiciones' },
  { to: '/posiciones/asignar', icon: MapPin, label: 'Asignar posición', perm: 'posiciones.asignar' },
  { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos', perm: 'pallets.mover' },
  { to: '/historial', icon: History, label: 'Historial', perm: 'historial.ver' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', perm: 'reportes.ver' },
  { to: '/configuracion', icon: Settings, label: 'Configuración', perm: 'config.admin' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = useAuth();
  const { mobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Fondo oscuro al abrir el menú en móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 flex flex-col bg-[var(--color-sidebar)] text-slate-300
          transition-transform md:transition-[width] duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          ${collapsed ? 'md:w-[76px]' : 'md:w-64'} w-64`}
      >
        <div className="flex items-center gap-2 px-5 h-16 shrink-0 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Boxes size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-white font-semibold text-sm">Bodega WMS</p>
              <p className="text-[11px] text-slate-500">Gestión de pallets</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.filter((item) => !item.perm || hasPermission(item.perm)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMobile}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white'
                }`
              }
            >
              <item.icon size={18} className="shrink-0" />
              <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex items-center gap-2 mx-3 mb-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white text-sm transition-colors"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span>Contraer menú</span>}
        </button>
      </aside>
    </>
  );
}
