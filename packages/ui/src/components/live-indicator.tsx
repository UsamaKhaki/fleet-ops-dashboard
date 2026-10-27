import { cn } from '../cn';

type ConnectionState = 'connecting' | 'open' | 'reconnecting';

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
};

export function LiveIndicator({
  status,
  className,
}: {
  status: ConnectionState;
  className?: string;
}) {
  return (
    <span
      role="status"
      data-slot="live-indicator"
      className={cn('inline-flex items-center gap-2 text-xs text-muted-foreground', className)}
    >
      <span className="relative flex size-2">
        {status === 'open' && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-active opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            status === 'open' ? 'bg-status-active' : 'bg-status-maintenance',
          )}
        />
      </span>
      {LABELS[status]}
    </span>
  );
}
