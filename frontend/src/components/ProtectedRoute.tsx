import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) {
    return (
      <div className="p-10 text-center text-slate-500 text-sm">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }
  return <>{children}</>;
}
