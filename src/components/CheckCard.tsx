import { useEffect, useState } from 'react';
import { ChevronDown, ListChecks, Lightbulb } from 'lucide-react';
import { STATUS_LABELS } from '../core/types';
import type { Check, CheckStatus } from '../core/types';
import { btn, cn } from '../lib/cn';
import { StatusBadge, StatusIcon } from './StatusBadge';
import { STATUS_COLOR } from './statusStyles';
import { Panel } from './ui';

type Filter = 'all' | 'issues' | 'pass' | 'unverifiable';

const FILTERS: { id: Filter; label: string; match: (s: CheckStatus) => boolean }[] = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'issues', label: 'À corriger', match: (s) => s === 'warn' || s === 'missing' },
  { id: 'pass', label: 'Corrects', match: (s) => s === 'pass' },
  { id: 'unverifiable', label: 'Non vérifiables', match: (s) => s === 'unverifiable' },
];

const ROW_GRID = 'sm:grid-cols-[18px_minmax(0,1fr)_minmax(0,1.4fr)_11.25rem_16px]';

/** Mini-barre segmentée : 10 segments de 10 % des points du contrôle. */
function PointsMeter({ check }: { check: Check }) {
  const counted = check.status !== 'unverifiable';
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-28 gap-[2px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => {
          const filled = counted && (i + 1) / 10 <= check.points / check.maxPoints + 1e-9;
          return <span key={i} className="h-2.5 flex-1 rounded-[2px]" style={{ background: filled ? STATUS_COLOR[check.status] : 'var(--color-ink-100)' }} />;
        })}
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-ink-700">
        {counted ? `${check.points}/${check.maxPoints}` : 'n/c'}
      </span>
    </div>
  );
}

function CheckRow({ check, open, onToggle }: { check: Check; open: boolean; onToggle: (open: boolean) => void }) {
  const counted = check.status !== 'unverifiable';
  return (
    <li id={`check-${check.id}`} className="scroll-mt-36">
      <details open={open} onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)} className="group">
        <summary
          className={cn(
            'grid cursor-pointer list-none grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-x-3 gap-y-0.5 px-5 py-3.5 transition-colors hover:bg-ink-50/70 sm:gap-x-5',
            ROW_GRID,
          )}
        >
          <StatusIcon status={check.status} className="h-[18px] w-[18px]" />
          <span className="min-w-0 truncate text-[15px] font-medium text-ink-950">
            {check.label}
            <span className="sr-only"> — {STATUS_LABELS[check.status]}</span>
          </span>
          <span className="col-start-2 row-start-2 truncate text-[13px] text-ink-500 sm:col-start-3 sm:row-start-1" title={check.summary}>
            {check.summary}
          </span>
          <span className="hidden sm:col-start-4 sm:row-start-1 sm:block">
            <PointsMeter check={check} />
          </span>
          <ChevronDown
            aria-hidden="true"
            className="col-start-3 row-start-1 h-4 w-4 text-ink-400 transition-transform duration-200 group-open:rotate-180 sm:col-start-5"
          />
        </summary>

        <div className="grid gap-5 border-t border-dashed border-ink-200 bg-ink-50/50 px-5 py-5 sm:pl-[3.4rem] lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={check.status} />
              <span className="font-mono text-xs text-ink-500">
                {counted ? `${check.points} / ${check.maxPoints} points` : 'Non compté dans le score'}
              </span>
            </div>
            <p className="text-[15px] font-medium text-ink-900">{check.summary}</p>
            <div className="flex gap-3 rounded-xl bg-white p-3.5 ring-1 ring-ink-200/70">
              <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-signal-700" />
              <p className="text-sm text-ink-700">{check.advice}</p>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-500">
              <span className="font-medium text-ink-700">Pourquoi c’est important — </span>
              {check.why}
            </p>
          </div>
          {check.raw.length > 0 && (
            <div className="min-w-0">
              <p className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.14em] text-ink-500 uppercase">Données brutes</p>
              <ol className="space-y-1 rounded-xl bg-ink-950 p-3.5 font-mono text-xs leading-relaxed break-words text-ink-200">
                {check.raw.map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden="true" className="select-none text-ink-500 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

/** Liste des 8 contrôles : vue d'ensemble compacte + détail dépliable (explications, conseils, données brutes). */
export function ChecksList({ checks }: { checks: Check[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  // Par défaut : les contrôles à corriger sont dépliés.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(checks.filter((c) => c.status === 'warn' || c.status === 'missing').map((c) => c.id)),
  );

  // Impression / PDF : tout déplier pour que le rapport soit complet.
  useEffect(() => {
    const before = () => {
      setFilter('all');
      setOpenIds(new Set(checks.map((c) => c.id)));
    };
    window.addEventListener('beforeprint', before);
    return () => window.removeEventListener('beforeprint', before);
  }, [checks]);

  const active = FILTERS.find((f) => f.id === filter)!;
  const visible = checks.filter((c) => active.match(c.status));
  const allOpen = visible.length > 0 && visible.every((c) => openIds.has(c.id));

  function toggle(id: string, open: boolean) {
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll() {
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (allOpen) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  return (
    <Panel
      id="controles-detail"
      title="Détail des contrôles"
      subtitle="Statut, points, conseil et valeurs exactes trouvées dans le HTML"
      icon={<ListChecks className="h-4 w-4" />}
      bodyClassName="p-0"
      className="lg:col-span-12"
      action={
        <button type="button" onClick={toggleAll} className={btn('ghost', 'sm', 'no-print shrink-0')}>
          {allOpen ? 'Tout replier' : 'Tout déplier'}
        </button>
      }
    >
      <div className="no-print flex gap-1 overflow-x-auto border-b border-ink-100 px-4 py-2.5" role="group" aria-label="Filtrer les contrôles par statut">
        {FILTERS.map((f) => {
          const count = checks.filter((c) => f.match(c.status)).length;
          const selected = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(f.id)}
              disabled={count === 0}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
                selected ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
              )}
            >
              {f.label}
              <span className={cn('font-mono text-[11px] tabular-nums', selected ? 'text-signal-400' : 'text-ink-400')}>{count}</span>
            </button>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className={cn('hidden gap-x-5 border-b border-ink-100 px-5 py-2 font-mono text-[10.5px] font-medium tracking-[0.12em] text-ink-400 uppercase sm:grid', ROW_GRID)}
      >
        <span />
        <span>Contrôle</span>
        <span>Valeur trouvée</span>
        <span className="text-right">Points</span>
        <span />
      </div>
      <ul className="divide-y divide-ink-100">
        {visible.map((c) => (
          <CheckRow key={c.id} check={c} open={openIds.has(c.id)} onToggle={(o) => toggle(c.id, o)} />
        ))}
      </ul>
    </Panel>
  );
}
