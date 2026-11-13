import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Marque SEOQuick : un « Q » qui est aussi une loupe. SVG inline, aucune requête. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="#0a0b0b" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="rgb(255 255 255 / 0.12)" />
      <circle cx="14.5" cy="14.5" r="6.5" fill="none" stroke="#c8f562" strokeWidth="3" />
      <circle cx="14.5" cy="14.5" r="1.9" fill="#c8f562" />
      <path d="M19.4 19.4l4.6 4.6" stroke="#c8f562" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-[17px] font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink-950')}>
      <LogoMark />
      <span>
        SEO<span className={tone === 'light' ? 'text-signal-400' : 'text-ink-500'}>Quick</span>
      </span>
    </span>
  );
}

/** Surtitre de section : pastille signal + libellé mono. */
export function Eyebrow({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.14em] uppercase',
        tone === 'light' ? 'text-ink-300' : 'text-ink-500',
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal-500" />
      {children}
    </p>
  );
}

/** Carte du tableau de bord : surface blanche, bordure fine, en-tête optionnel. */
export function Panel({
  title,
  subtitle,
  icon,
  action,
  className,
  bodyClassName,
  id,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('print-avoid-break scroll-mt-32 rounded-2xl border border-ink-200/80 bg-white shadow-card', className)}
    >
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-600 ring-1 ring-ink-200/70">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h3 id={headingId} className="text-[15px] font-semibold tracking-tight text-ink-950">
                {title}
              </h3>
              {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Kbd({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-medium',
        tone === 'light' ? 'bg-white/10 text-ink-200 ring-1 ring-white/15' : 'bg-ink-50 text-ink-600 ring-1 ring-ink-200',
      )}
    >
      {children}
    </kbd>
  );
}
