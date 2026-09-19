import { useState, useEffect, useRef } from 'react';
import { Search, Bell, LogOut, ChevronDown, AlertTriangle, AlertCircle, Info, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSidebar } from '../hooks/useSidebar';
import { api } from '../services/api';

interface SearchResult {
  pallets: { codigo: string; sku: string; producto: string; posicion: string | null; estado: string }[];
  posiciones: { codigo: string; estado: string }[];
}

interface NotifRow { id: number; tipo: 'WARNING' | 'ERROR' | 'INFO'; mensaje: string; leida: number; fecha: string }
const NOTIF_ICON = { WARNING: AlertTriangle, ERROR: AlertCircle, INFO: Info };

export function Header({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const { user, logout } = useAuth();
  const { openMobile } = useSidebar();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/notificaciones').then((res) => setNotifs(res.data));
  }, []);

  const sinLeer = notifs.filter((n) => !n.leida).length;

  async function marcarLeida(id: number) {
    await api.post(`/notificaciones/${id}/leer`);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: 1 } : n)));
  }

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      api.get('/buscar', { params: { q: query } }).then((res) => setResults(res.data));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const searchBox = (
    <div ref={boxRef} className="relative w-full">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        autoFocus={mobileSearchOpen}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar pallet, SKU, producto, posición..."
        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
      />
      {results && (results.pallets.length > 0 || results.posiciones.length > 0) && (
        <div className="absolute mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-30">
          {results.pallets.map((p) => (
            <button
              key={p.codigo}
              onClick={() => { navigate(`/pallets/${p.codigo}`); setResults(null); setQuery(''); setMobileSearchOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between items-center gap-2"
            >
              <span className="truncate"><span className="font-medium">{p.codigo}</span> · {p.producto}</span>
              <span className="text-xs text-slate-400 shrink-0">{p.posicion || 'sin posición'}</span>
            </button>
          ))}
          {results.posiciones.map((p) => (
            <button
              key={p.codigo}
              onClick={() => { navigate('/posiciones'); setResults(null); setQuery(''); setMobileSearchOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between items-center"
            >
              <span>Posición {p.codigo}</span>
              <span className="text-xs text-slate-400">{p.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // En móvil, la búsqueda abierta reemplaza toda la barra del header para tener espacio
  if (mobileSearchOpen) {
    return (
      <header className="h-16 sticky top-0 z-20 bg-white border-b border-slate-100 flex items-center gap-2 px-3">
        {searchBox}
        <button onClick={() => { setMobileSearchOpen(false); setQuery(''); setResults(null); }} className="shrink-0 w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500">
          <X size={18} />
        </button>
      </header>
    );
  }

  return (
    <header className="h-16 sticky top-0 z-20 bg-white border-b border-slate-100 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={openMobile} className="md:hidden shrink-0 w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {breadcrumb && <p className="hidden sm:block text-xs text-slate-400">{breadcrumb}</p>}
          <h1 className="text-[15px] font-semibold text-slate-800 truncate">{title}</h1>
        </div>
      </div>

      <div className="hidden sm:block flex-1 max-w-md">{searchBox}</div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <button onClick={() => setMobileSearchOpen(true)} className="sm:hidden w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500">
          <Search size={18} />
        </button>

        <div className="relative">
          <button onClick={() => setNotifOpen((o) => !o)} className="relative w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500">
            <Bell size={18} />
            {sinLeer > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-danger)]" />
            )}
          </button>
          {notifOpen && (
            <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-96 overflow-y-auto z-30">
              {notifs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin notificaciones</p>
              ) : notifs.map((n) => {
                const Icon = NOTIF_ICON[n.tipo];
                return (
                  <button
                    key={n.id} onClick={() => marcarLeida(n.id)}
                    className={`w-full text-left flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 ${n.leida ? 'opacity-50' : ''}`}
                  >
                    <Icon size={15} className="mt-0.5 shrink-0 text-slate-500" />
                    <span className="flex-1">
                      <span className="block text-slate-700">{n.mensaje}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{new Date(n.fecha).toLocaleString('es-VE')}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-full hover:bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.nombre}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{user?.role_nombre}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
