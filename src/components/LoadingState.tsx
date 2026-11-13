import { Loader2, X } from 'lucide-react';
import { btn } from '../lib/cn';

/** Squelette du tableau de bord + progression indéterminée (aucune fausse étape chronométrée). */
export function LoadingState({ url, onCancel }: { url: string; onCancel: () => void }) {
  return (
    <div role="status" className="animate-fade-up">
      <div className="flex flex-col gap-4 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-signal-400">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink-950">Récupération et analyse du HTML…</p>
            <p className="truncate font-mono text-xs text-ink-500">{url}</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className={btn('outline', 'sm', 'self-start sm:self-auto')}>
          <X aria-hidden="true" className="h-3.5 w-3.5" /> Annuler
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
        <div className="progress-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-signal-500 to-transparent" />
      </div>
      <p className="mt-3 text-xs text-ink-500">Généralement quelques secondes — 10 s maximum côté site analysé.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-12" aria-hidden="true">
        <div className="skeleton h-64 rounded-2xl lg:col-span-4" />
        <div className="skeleton h-64 rounded-2xl lg:col-span-8" />
        <div className="skeleton h-48 rounded-2xl lg:col-span-7" />
        <div className="skeleton h-48 rounded-2xl lg:col-span-5" />
      </div>
    </div>
  );
}
