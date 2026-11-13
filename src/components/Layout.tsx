import type { MouseEvent, ReactNode } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { btn } from '../lib/cn';
import { Logo } from './ui';

const NAV = [
  { href: '/#methode', label: 'Méthode' },
  { href: '/#controles', label: 'Contrôles' },
  { href: '/#score', label: 'Barème' },
  { href: '/#faq', label: 'FAQ' },
];

/** Referme le menu mobile (<details>) après un clic sur un lien. */
function closeMenu(e: MouseEvent<HTMLElement>) {
  e.currentTarget.closest('details')?.removeAttribute('open');
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-signal-400 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
      >
        Aller au contenu
      </a>

      <header className="no-print sticky top-0 z-50 border-b border-white/[0.08] bg-ink-950/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="rounded-lg focus-visible:outline-signal-400" aria-label="SEOQuick — accueil">
            <Logo tone="light" />
          </a>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                {n.label}
              </a>
            ))}
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-white/10" />
            <a href="/#analyse" className={btn('primary', 'sm', 'group/cta px-4')}>
              Analyser une page
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
            </a>
          </nav>

          <details className="group relative md:hidden">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-ink-200 ring-1 ring-white/10 transition hover:bg-white/10"
              aria-label="Menu"
            >
              <Menu aria-hidden="true" className="h-5 w-5 group-open:hidden" />
              <X aria-hidden="true" className="hidden h-5 w-5 group-open:block" />
            </summary>
            <nav
              aria-label="Navigation mobile"
              className="animate-fade-up absolute top-[calc(100%+0.75rem)] right-0 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-ink-900 p-2 shadow-float ring-1 ring-white/10"
            >
              <ul>
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} onClick={closeMenu} className="flex items-center rounded-xl px-3.5 py-3 text-[15px] text-ink-200 hover:bg-white/[0.06] hover:text-white">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a href="/#analyse" onClick={closeMenu} className={btn('primary', 'md', 'mt-2 w-full')}>
                Analyser une page <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </nav>
          </details>
        </div>
      </header>

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <footer className="no-print relative overflow-hidden bg-ink-950 text-ink-300">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo tone="light" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
                Vérification SEO on-page d’une page web, à partir de son HTML initial. Gratuit, sans inscription, sans cookie.
              </p>
            </div>
            <nav aria-label="Outil" className="text-sm">
              <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">Outil</p>
              <ul className="mt-4 space-y-2.5">
                <li><a href="/" className="transition-colors hover:text-white">Audit SEO gratuit</a></li>
                <li><a href="/#controles" className="transition-colors hover:text-white">Ce que vérifie l’analyse</a></li>
                <li><a href="/#score" className="transition-colors hover:text-white">Calcul du score</a></li>
                <li><a href="/#limites" className="transition-colors hover:text-white">Limites</a></li>
              </ul>
            </nav>
            <nav aria-label="Informations légales" className="text-sm">
              <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">Informations</p>
              <ul className="mt-4 space-y-2.5">
                <li><a href="/#faq" className="transition-colors hover:text-white">Questions fréquentes</a></li>
                <li><a href="/confidentialite/" className="transition-colors hover:text-white">Confidentialité</a></li>
                <li><a href="/mentions-legales/" className="transition-colors hover:text-white">Mentions légales</a></li>
              </ul>
            </nav>
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Diagnostic indicatif. SEOQuick n’est affilié à aucun moteur de recherche.</p>
            <p className="flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal-500" /> Aucun cookie · aucun traceur
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
