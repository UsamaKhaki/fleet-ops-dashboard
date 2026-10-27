import { AlertTriangleIcon, InboxIcon, RotateCwIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../cn';
import { Button } from './button';

interface StateProps {
  title: string;
  description?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: StateProps & { action?: React.ReactNode }) {
  return (
    <div
      className={cn('flex flex-col items-center gap-2 px-4 py-12 text-center', className)}
      data-slot="empty-state"
    >
      <InboxIcon className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  isRetrying = false,
  className,
}: Partial<StateProps> & { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-2 px-4 py-12 text-center', className)}
      data-slot="error-state"
    >
      <AlertTriangleIcon className="size-8 text-destructive" aria-hidden />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          <RotateCwIcon className={cn(isRetrying && 'animate-spin')} />
          Try again
        </Button>
      )}
    </div>
  );
}
