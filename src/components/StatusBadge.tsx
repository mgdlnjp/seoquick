import { STATUS_LABELS } from '../core/types';
import type { CheckStatus } from '../core/types';
import { cn } from '../lib/cn';
import { STATUS_ICON, STATUS_TONE } from './statusStyles';

/** Le statut n'est jamais porté par la couleur seule : icône + texte. */
export function StatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        STATUS_TONE[status].badge,
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('h-3.5 w-3.5', STATUS_TONE[status].icon)} strokeWidth={2.25} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Icône de statut seule (le libellé est fourni à côté ou via aria). */
export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon aria-hidden="true" className={cn('h-4 w-4 shrink-0', STATUS_TONE[status].icon, className)} strokeWidth={2.25} />;
}
