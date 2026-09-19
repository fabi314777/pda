import type { LucideIcon } from 'lucide-react';

export function DashboardCard({
  icon: Icon, label, value, hint, tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const toneStyles: Record<string, string> = {
    default: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneStyles[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
