import { scoreBand } from '../core/score';
import type { CheckStatus } from '../core/types';
import { STATUS_COLOR } from './statusStyles';

const BAND_COLOR = { bon: 'var(--color-status-good)', moyen: 'var(--color-status-warning)', faible: 'var(--color-status-critical)' } as const;

/** Point sur un cercle ; angle en degrés, 0 = haut, sens horaire. */
function polar(c: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}
function arc(c: number, r: number, from: number, to: number) {
  const a = polar(c, r, from);
  const b = polar(c, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/**
 * Jauge 270° (0–100) pour fond sombre. Les graduations 50 et 80 sont les vrais
 * seuils des niveaux SEOQuick (faible < 50 ≤ moyen < 80 ≤ bon).
 */
export function ScoreGauge({ value }: { value: number }) {
  const band = scoreBand(value);
  const c = 100;
  const r = 82;
  const start = -135;
  const sweep = 270;
  const end = start + (Math.max(0, Math.min(100, value)) / 100) * sweep;
  const tip = polar(c, r, end);
  return (
    <svg viewBox="0 0 200 178" className="w-full max-w-[15rem]" aria-hidden="true">
      <path d={arc(c, r, start, start + sweep)} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="12" strokeLinecap="round" />
      {value > 0 && (
        <path d={arc(c, r, start, end)} fill="none" stroke={BAND_COLOR[band]} strokeWidth="12" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${BAND_COLOR[band]})` }} />
      )}
      {[50, 80].map((t) => {
        const deg = start + (t / 100) * sweep;
        const p1 = polar(c, r - 13, deg);
        const p2 = polar(c, r - 19, deg);
        const lbl = polar(c, r - 29, deg);
        return (
          <g key={t}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" strokeLinecap="round" />
            <text x={lbl.x} y={lbl.y + 3} textAnchor="middle" fill="rgb(255 255 255 / 0.4)" fontSize="9" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        );
      })}
      {value > 0 && <circle cx={tip.x} cy={tip.y} r="4" fill="#fff" />}
      <text x={c} y={c + 6} textAnchor="middle" fill="#fff" fontSize="58" fontWeight="600" letterSpacing="-2" fontFamily="var(--font-sans)">
        {value}
      </text>
      <text x={c} y={c + 30} textAnchor="middle" fill="rgb(255 255 255 / 0.45)" fontSize="11" fontFamily="var(--font-mono)">
        / 100
      </text>
    </svg>
  );
}

/** Anneau compact : une valeur (0–1) colorée par le statut du contrôle lié. */
export function Ring({ ratio, status, size = 48 }: { ratio: number; status: CheckStatus; size?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-ink-100)" strokeWidth="5" />
      {clamped > 0 && (
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={STATUS_COLOR[status]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      )}
    </svg>
  );
}
