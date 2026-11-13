import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { buildTextSummary } from '../core/summary';
import type { AnalysisResult } from '../core/types';
import { btn } from '../lib/cn';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli (contexte non sécurisé, permission refusée)
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function CopySummaryButton({ result }: { result: AnalysisResult }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onClick() {
    const ok = await copyText(buildTextSummary(result));
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2500);
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={onClick} className={btn('outline', 'sm')}>
        {state === 'copied' ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {state === 'copied' ? 'Copié' : 'Copier le résumé'}
      </button>
      <span aria-live="polite" className={state === 'failed' ? 'absolute top-full right-0 mt-2 w-60 rounded-lg bg-ink-950 px-3 py-2 text-xs text-white shadow-lg' : 'sr-only'}>
        {state === 'copied' && 'Résumé copié dans le presse-papiers.'}
        {state === 'failed' && 'Copie impossible : sélectionnez le texte manuellement.'}
      </span>
    </span>
  );
}
