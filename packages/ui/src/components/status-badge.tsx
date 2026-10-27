import { cn } from '../cn';

export type StatusTone = 'active' | 'idle' | 'maintenance' | 'offline';

const TONE_CLASSES: Record<StatusTone, string> = {
  active: 'bg-status-active',
  idle: 'bg-status-idle',
  maintenance: 'bg-status-maintenance',
  offline: 'bg-status-offline',
};

export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      data-slot="status-badge"
      className={cn('inline-flex items-center gap-1.5 text-sm capitalize', className)}
    >
      <span className={cn('size-2 rounded-full', TONE_CLASSES[tone])} aria-hidden />
      {label}
    </span>
  );
}
