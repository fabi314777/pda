import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Loading, ErrorBanner, EmptyState } from '../components/Feedback';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Users, MapPin, Shield, Plus, X, Pencil, Lock, LockOpen, ChevronDown, ChevronRight } from 'lucide-react';

interface UserRow { id: number; nombre: string; email: string; activo: number; role_id: number; role_nombre: string; created_at: string }
interface RoleRow { id: number; nombre: string; descripcion: string }
interface SectorRow { id: number; codigo: string; nombre: string; racks: number; posiciones: number; libres: number; ocupadas: number; bloqueadas: number }
interface RackRow { id: number; codigo: string; sector_id: number; sector_codigo: string; posiciones: number }
interface PermisosData { roles: RoleRow[]; permisos: { id: number; codigo: string; descripcion: string }[]; asignados: { role_id: number; permission_id: number }[] }

export default function Configuracion() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  function cargar() {
    setLoading(true);
    Promise.all([api.get('/usuarios'), api.get('/usuarios/roles')])
      .then(([u, r]) => { setUsers(u.data); setRoles(r.data); })
      .finally(() => setLoading(false));
  }
  useEffect(cargar, []);

  return (
    <>
      <Header title="Configuración" breadcrumb="Bodega" />
      <div className="p-4 sm:p-6 space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Users size={16} /> Usuarios y roles</p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-[var(--color-accent)] text-white rounded-lg px-3 py-2 text-sm font-semibold hover:opacity-90">
              <Plus size={15} /> Nuevo usuario
            </button>
          </div>
          {loading ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Nombre</th>
                    <th className="px-5 py-3 font-medium">Correo</th>
                    <th className="px-5 py-3 font-medium">Rol</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-700">{u.nombre} {u.id === currentUser?.id && <span className="text-xs text-slate-400">(tú)</span>}</td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3 text-slate-500">{u.role_nombre}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.activo ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-500'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => setEditing(u)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50" title="Editar">
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SectoresRacks />
        <Permisos />
      </div>

      {showCreate && (
        <UserFormModal
          roles={roles} title="Nuevo usuario" onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            setError('');
            try {
              await api.post('/usuarios', data);
              setShowCreate(false);
              cargar();
            } catch (err) { setError(apiErrorMessage(err)); }
          }}
        />
      )}

      {editing && (
        <UserFormModal
          roles={roles} title={`Editar · ${editing.nombre}`} initial={editing} isSelf={editing.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            setError('');
            try {
              await api.patch(`/usuarios/${editing.id}`, data);
              setEditing(null);
              cargar();
            } catch (err) { setError(apiErrorMessage(err)); }
          }}
        />
      )}
    </>
  );
}

// ==================== SECTORES Y RACKS ====================

function SectoresRacks() {
  const [sectores, setSectores] = useState<SectorRow[]>([]);
  const [racksPorSector, setRacksPorSector] = useState<Record<number, RackRow[]>>({});
  const [abierto, setAbierto] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNuevoSector, setShowNuevoSector] = useState(false);
  const [nuevoRackSector, setNuevoRackSector] = useState<SectorRow | null>(null);

  function cargarSectores() {
    setLoading(true);
    api.get('/config/sectores').then((res) => setSectores(res.data)).finally(() => setLoading(false));
  }
  useEffect(cargarSectores, []);

  async function toggleSector(s: SectorRow) {
    if (abierto === s.id) { setAbierto(null); return; }
    setAbierto(s.id);
    if (!racksPorSector[s.id]) {
      const res = await api.get('/config/racks', { params: { sector_id: s.id } });
      setRacksPorSector((prev) => ({ ...prev, [s.id]: res.data }));
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><MapPin size={16} /> Sectores, racks y niveles</p>
        <button onClick={() => setShowNuevoSector(true)} className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Plus size={15} /> Nuevo sector
        </button>
      </div>
      {error && <div className="px-5 pt-3"><ErrorBanner message={error} /></div>}
      {loading ? <Loading /> : sectores.length === 0 ? <EmptyState label="No hay sectores creados" /> : (
        <div className="divide-y divide-slate-50">
          {sectores.map((s) => (
            <div key={s.id}>
              <button onClick={() => toggleSector(s)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  {abierto === s.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  Sector {s.codigo} <span className="text-slate-400 font-normal">— {s.racks} rack(s), {s.posiciones} posición(es)</span>
                </span>
                <span className="text-xs text-slate-400 hidden sm:flex gap-2">
                  <span className="text-[var(--color-success)]">{s.libres} libres</span>
                  <span className="text-[var(--color-danger)]">{s.ocupadas} ocupadas</span>
                  {s.bloqueadas > 0 && <span>{s.bloqueadas} bloqueadas</span>}
                </span>
              </button>
              {abierto === s.id && (
                <div className="px-5 pb-4 pl-9">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Racks</p>
                    <button onClick={() => setNuevoRackSector(s)} className="text-xs text-[var(--color-accent)] font-medium flex items-center gap-1">
                      <Plus size={13} /> Nuevo rack
                    </button>
                  </div>
                  {!racksPorSector[s.id]?.length ? (
                    <p className="text-xs text-slate-400">Sin racks todavía.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {racksPorSector[s.id].map((r) => (
                        <span key={r.id} className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1.5 font-mono">
                          Rack {r.codigo} <span className="text-slate-400">({r.posiciones} pos.)</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNuevoSector && (
        <Modal title="Nuevo sector" onClose={() => setShowNuevoSector(false)}>
          <SimpleForm
            fields={[{ key: 'codigo', label: 'Código (ej: E)' }, { key: 'nombre', label: 'Nombre (opcional)' }]}
            submitLabel="Crear sector"
            onSubmit={async (data) => {
              setError('');
              try {
                await api.post('/config/sectores', data);
                setShowNuevoSector(false);
                cargarSectores();
              } catch (err) { setError(apiErrorMessage(err)); }
            }}
          />
        </Modal>
      )}

      {nuevoRackSector && (
        <Modal title={`Nuevo rack en sector ${nuevoRackSector.codigo}`} onClose={() => setNuevoRackSector(null)}>
          <SimpleForm
            fields={[{ key: 'codigo', label: 'Código del rack (ej: 22)' }]}
            submitLabel="Crear rack"
            onSubmit={async (data) => {
              setError('');
              try {
                await api.post('/config/racks', { sector_id: nuevoRackSector.id, codigo: data.codigo });
                const res = await api.get('/config/racks', { params: { sector_id: nuevoRackSector.id } });
                setRacksPorSector((prev) => ({ ...prev, [nuevoRackSector.id]: res.data }));
                setNuevoRackSector(null);
                cargarSectores();
              } catch (err) { setError(apiErrorMessage(err)); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// ==================== PERMISOS ====================

function Permisos() {
  const [data, setData] = useState<PermisosData | null>(null);
  const [error, setError] = useState('');

  function cargar() {
    api.get('/config/permisos').then((res) => setData(res.data));
  }
  useEffect(cargar, []);

  function tieneAsignado(roleId: number, permId: number) {
    return !!data?.asignados.some((a) => a.role_id === roleId && a.permission_id === permId);
  }

  async function toggle(roleId: number, permId: number, actual: boolean) {
    setError('');
    // Actualización optimista
    setData((prev) => prev && {
      ...prev,
      asignados: actual
        ? prev.asignados.filter((a) => !(a.role_id === roleId && a.permission_id === permId))
        : [...prev.asignados, { role_id: roleId, permission_id: permId }],
    });
    try {
      await api.post('/config/permisos/toggle', { role_id: roleId, permission_id: permId, otorgado: !actual });
    } catch (err) {
      setError(apiErrorMessage(err));
      cargar(); // revertir si falló
    }
  }

  if (!data) return <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5"><Loading /></div>;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Shield size={16} /> Permisos por rol</p>
        <p className="text-xs text-slate-400 mt-1">ADMINISTRADOR siempre tiene todos los permisos y no se puede modificar. Los cambios aplican la próxima vez que ese usuario inicie sesión.</p>
      </div>
      {error && <div className="px-5 pt-3"><ErrorBanner message={error} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-medium">Permiso</th>
              {data.roles.map((r) => (
                <th key={r.id} className="px-5 py-3 font-medium text-center">{r.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permisos.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 text-slate-600">
                  <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{p.codigo}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{p.descripcion}</p>
                </td>
                {data.roles.map((r) => {
                  const esAdmin = r.nombre === 'ADMINISTRADOR';
                  const activo = esAdmin ? true : tieneAsignado(r.id, p.id);
                  return (
                    <td key={r.id} className="px-5 py-3 text-center">
                      <button
                        disabled={esAdmin}
                        onClick={() => toggle(r.id, p.id, activo)}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                          esAdmin ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'
                        } ${activo ? 'text-[var(--color-success)]' : 'text-slate-300'}`}
                        title={esAdmin ? 'ADMINISTRADOR siempre tiene todos los permisos' : activo ? 'Quitar permiso' : 'Otorgar permiso'}
                      >
                        {activo ? <LockOpen size={16} /> : <Lock size={16} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== COMPONENTES COMPARTIDOS ====================

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SimpleForm({ fields, submitLabel, onSubmit }: {
  fields: { key: string; label: string }[]; submitLabel: string; onSubmit: (data: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }} className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs font-medium text-slate-500 mb-1 block">{f.label}</label>
          <input
            value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          />
        </div>
      ))}
      <button type="submit" className="w-full bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}

function UserFormModal({ roles, title, initial, isSelf, onClose, onSubmit }: {
  roles: RoleRow[]; title: string; initial?: UserRow; isSelf?: boolean;
  onClose: () => void; onSubmit: (data: any) => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [roleId, setRoleId] = useState(initial?.role_id || roles[0]?.id || 0);
  const [activo, setActivo] = useState(initial ? !!initial.activo : true);
  const [password, setPassword] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (initial) {
      onSubmit({ nombre, role_id: roleId, activo: activo ? 1 : 0, ...(password ? { password } : {}) });
    } else {
      onSubmit({ nombre, email, password, role_id: roleId });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <Field label="Nombre" value={nombre} onChange={setNombre} required />
          {!initial && <Field label="Correo" type="email" value={email} onChange={setEmail} required />}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Rol</label>
            <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <Field
            label={initial ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password" value={password} onChange={setPassword} required={!initial}
          />
          {initial && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={activo} disabled={isSelf} onChange={(e) => setActivo(e.target.checked)} />
              Cuenta activa {isSelf && <span className="text-xs text-slate-400">(no puedes desactivar tu propia cuenta)</span>}
            </label>
          )}
        </div>

        <button type="submit" className="w-full mt-5 bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
          {initial ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      />
    </div>
  );
}
