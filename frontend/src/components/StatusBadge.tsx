const STYLES: Record<string, string> = {
  PENDIENTE: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  VALIDADO: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  ALMACENADO: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  EN_MOVIMIENTO: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  BLOQUEADO: 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]',
  RECHAZADO: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  DESPACHADO: 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]',
  LIBRE: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  OCUPADA: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  RESERVADA: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  BLOQUEADA: 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]',
};

const LABELS: Record<string, string> = {
  EN_MOVIMIENTO: 'EN MOVIMIENTO',
};

export function StatusBadge({ estado }: { estado: string }) {
  const style = STYLES[estado] || 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]';
  const label = LABELS[estado] || estado;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${style}`}>
      {label}
    </span>
  );
}
