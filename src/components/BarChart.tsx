/**
 * Barres horizontales, une seule série (une seule teinte).
 * Marques fines à extrémité arrondie, piste discrète, valeur en encre texte.
 * Survol / focus clavier : infobulle avec le détail. Les valeurs restent lisibles sans survol.
 */
export interface BarItem {
  id: string;
  label: string;
  value: number;
  max: number;
  /** Texte de valeur affiché à droite (ex. « 15/20 »). */
  valueLabel: string;
  /** Détail affiché dans l'infobulle. */
  tooltip: string;
  /** Barre neutralisée (ex. contrôle non compté). */
  muted?: boolean;
}

export function BarChart({ items, scaleMax, caption }: { items: BarItem[]; scaleMax: number; caption: string }) {
  return (
    <figure className="w-full">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-3.5">
        {items.map((it) => {
          const width = scaleMax > 0 ? (it.value / scaleMax) * 100 : 0;
          const track = scaleMax > 0 ? (it.max / scaleMax) * 100 : 0;
          return (
            <li
              key={it.id}
              className="group relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-signal-600 focus-visible:ring-offset-4"
              tabIndex={0}
              aria-label={`${it.label} : ${it.valueLabel}, ${it.tooltip}`}
            >
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate text-ink-700">{it.label}</span>
                <span className="shrink-0 font-mono font-medium tabular-nums text-ink-950">{it.valueLabel}</span>
              </div>
              <div className="relative mt-1.5 h-2" aria-hidden="true">
                <div className="absolute inset-y-0 left-0 rounded-full bg-ink-100" style={{ width: `${track}%` }} />
                {!it.muted && it.value > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-ink-900 transition-colors duration-200 group-hover:bg-signal-600 group-focus-visible:bg-signal-600"
                    style={{ width: `${width}%` }}
                  />
                )}
              </div>
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-8 right-0 z-10 hidden rounded-lg bg-ink-950 px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block"
              >
                {it.tooltip}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
