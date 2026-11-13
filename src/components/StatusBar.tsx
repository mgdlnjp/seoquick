import { STATUS_LABELS } from '../core/types';
import type { Check, CheckStatus } from '../core/types';
import { STATUS_COLOR } from './statusStyles';
import { StatusIcon } from './StatusBadge';

const ORDER: CheckStatus[] = ['pass', 'warn', 'missing', 'unverifiable'];

/** Barre segmentée « partie d'un tout » : répartition des contrôles par statut. */
export function StatusBar({ checks, tone = 'light' }: { checks: Check[]; tone?: 'light' | 'dark' }) {
  const counts = ORDER.map((s) => ({ status: s, count: checks.filter((c) => c.status === s).length })).filter((x) => x.count > 0);
  const total = checks.length;
  const dark = tone === 'dark';
  return (
    <figure>
      <figcaption className={dark ? 'text-xs text-ink-400' : 'text-[13px] text-ink-500'}>Répartition des {total} contrôles</figcaption>
      <div className="mt-2.5 flex h-2 gap-[3px]" aria-hidden="true">
        {counts.map(({ status, count }) => (
          <div
            key={status}
            title={`${STATUS_LABELS[status]} : ${count}`}
            className="h-full rounded-full transition-[flex-grow] duration-700"
            style={{ flexGrow: count, background: STATUS_COLOR[status] }}
          />
        ))}
      </div>
      <ul className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] ${dark ? 'text-ink-300' : 'text-ink-600'}`}>
        {counts.map(({ status, count }) => (
          <li key={status} className="flex items-center gap-1.5">
            <StatusIcon status={status} className="h-3.5 w-3.5" />
            <span className="truncate">{STATUS_LABELS[status]}</span>
            <span className={`ml-auto font-mono font-medium tabular-nums ${dark ? 'text-white' : 'text-ink-950'}`}>{count}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
