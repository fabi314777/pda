import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiErrorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@wms.demo');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)] flex items-center justify-center mb-3">
            <Boxes size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Bodega WMS</h1>
          <p className="text-sm text-slate-400">Gestión y control de pallets</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          {error && <div className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Correo</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Contraseña</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[var(--color-accent)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Iniciar sesión
          </button>
          <p className="text-xs text-slate-400 text-center pt-2">
            Demo: admin@wms.demo · supervisor@wms.demo · operador@wms.demo — contraseña <code>demo1234</code>
          </p>
        </form>
      </div>
    </div>
  );
}
