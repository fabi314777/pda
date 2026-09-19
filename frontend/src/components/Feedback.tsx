import { Loader2, Inbox, AlertTriangle } from 'lucide-react';

export function Loading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-slate-400 py-16 text-sm">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
      <Inbox size={28} strokeWidth={1.5} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-lg px-4 py-3 text-sm">
      <AlertTriangle size={16} /> {message}
    </div>
  );
}
