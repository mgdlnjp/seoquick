import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CheckStatus } from '../core/types';

/** Couleurs de statut réservées (palette dataviz) : toujours accompagnées d'une icône + d'un libellé. */
export const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--color-status-good)',
  warn: 'var(--color-status-warning)',
  missing: 'var(--color-status-critical)',
  unverifiable: 'var(--color-status-neutral)',
};

/** Icône propre à chaque statut : le statut n'est jamais porté par la couleur seule. */
export const STATUS_ICON: Record<CheckStatus, LucideIcon> = {
  pass: CircleCheck,
  warn: TriangleAlert,
  missing: CircleX,
  unverifiable: CircleHelp,
};

/** Classes Tailwind (badges, puces) par statut, contrastes AA sur fond clair. */
export const STATUS_TONE: Record<CheckStatus, { badge: string; icon: string }> = {
  pass: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', icon: 'text-emerald-600' },
  warn: { badge: 'bg-amber-50 text-amber-900 ring-amber-500/30', icon: 'text-amber-500' },
  missing: { badge: 'bg-rose-50 text-rose-800 ring-rose-600/20', icon: 'text-rose-600' },
  unverifiable: { badge: 'bg-ink-50 text-ink-600 ring-ink-400/30', icon: 'text-ink-400' },
};
