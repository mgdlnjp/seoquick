import { Sparkles } from 'lucide-react';
import type { Recommendation } from '../core/types';
import { cn } from '../lib/cn';
import { Panel } from './ui';

const IMPACT_STYLE = {
  élevé: 'bg-ink-950 text-signal-400',
  moyen: 'bg-ink-100 text-ink-800',
  faible: 'bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200',
} as const;

const IMPACT_BARS = { élevé: 3, moyen: 2, faible: 1 } as const;

export function RecommendationList({ items, className }: { items: Recommendation[]; className?: string }) {
  return (
    <Panel
      id="recommandations"
      title="Recommandations prioritaires"
      subtitle="Triées par impact estimé, puis par facilité (estimations éditoriales)"
      icon={<Sparkles className="h-4 w-4" />}
      className={className}
      bodyClassName="p-2"
    >
      <ol className="space-y-1">
        {items.map((r, i) => (
          <li key={r.id} className={cn('flex gap-4 rounded-xl p-3.5 transition-colors', i === 0 ? 'bg-signal-200/40 ring-1 ring-signal-500/30' : 'hover:bg-ink-50/80')}>
            <span
              aria-hidden="true"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold',
                i === 0 ? 'bg-ink-950 text-signal-400' : 'bg-ink-100 text-ink-600',
              )}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink-950">{r.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{r.detail}</p>
              <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium', IMPACT_STYLE[r.impact])}>
                  <span aria-hidden="true" className="flex items-end gap-[2px]">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={cn('w-[3px] rounded-full bg-current', n <= IMPACT_BARS[r.impact] ? 'opacity-100' : 'opacity-25')} style={{ height: 3 + n * 2 }} />
                    ))}
                  </span>
                  Impact {r.impact}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-medium text-ink-700 ring-1 ring-inset ring-ink-200">Effort {r.effort}</span>
                {r.generic && <span className="rounded-full px-2 py-0.5 text-ink-500">Bonne pratique générale</span>}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
