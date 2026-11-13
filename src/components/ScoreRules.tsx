import { Sigma } from 'lucide-react';
import { CHECK_DEFINITIONS } from '../core/rules';
import { SCORE_RULE } from '../core/score';
import { BarChart } from './BarChart';

const TOTAL = CHECK_DEFINITIONS.reduce((s, d) => s + d.maxPoints, 0);

/** Barème public, généré depuis les mêmes définitions que le moteur (source unique). */
export function ScoreRules() {
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="reveal flex flex-col rounded-2xl border border-ink-200/80 bg-white p-6 shadow-card lg:col-span-2">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink-950">Poids de chaque contrôle</h3>
        <p className="mt-0.5 text-[13px] text-ink-500">Points maximum, sur un total de {TOTAL}.</p>
        <div className="mt-6">
          <BarChart
            caption="Points maximum par contrôle"
            scaleMax={Math.max(...CHECK_DEFINITIONS.map((d) => d.maxPoints))}
            items={CHECK_DEFINITIONS.map((d) => ({
              id: d.id,
              label: d.label,
              value: d.maxPoints,
              max: d.maxPoints,
              valueLabel: `${d.maxPoints} pts`,
              tooltip: `${Math.round((d.maxPoints / TOTAL) * 100)} % du score total`,
            }))}
          />
        </div>
        <div className="mt-auto pt-6">
          <div className="flex gap-3 rounded-xl bg-ink-950 p-4 text-ink-200">
            <Sigma aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" />
            <p className="font-mono text-xs leading-relaxed">{SCORE_RULE}</p>
          </div>
        </div>
      </div>

      <div className="reveal overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card lg:col-span-3">
        <ul className="divide-y divide-ink-100">
          {CHECK_DEFINITIONS.map((d, i) => (
            <li key={d.id} className="grid grid-cols-[2rem_1fr_auto] gap-x-3 px-5 py-4 transition-colors hover:bg-ink-50/60 sm:px-6">
              <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-ink-400 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-ink-950">{d.label}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{d.scoring}</p>
              </div>
              <span className="h-fit shrink-0 rounded-full bg-ink-50 px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums text-ink-800 ring-1 ring-inset ring-ink-200">
                {d.maxPoints} pts
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-ink-100 bg-ink-50/60 px-5 py-4 text-[13px] text-ink-600 sm:px-6">
          Les repères de longueur (title, description) sont des conseils éditoriaux liés à l’affichage, pas des pénalités appliquées
          par Google.
        </p>
      </div>
    </div>
  );
}
