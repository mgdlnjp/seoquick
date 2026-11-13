import type { MouseEvent, ReactNode } from 'react';
import {
  AlignLeft,
  ArrowDown,
  ArrowRight,
  Bot,
  CircleDashed,
  Code2,
  EyeOff,
  FileCode2,
  Globe,
  Heading1,
  Heading2,
  Image,
  Languages,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  MousePointerClick,
  Network,
  Play,
  Scale,
  ShieldCheck,
  Target,
  Timer,
  Type,
  UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnalyzerForm, AnalyzerProvider, AnalyzerResults } from '../components/Analyzer';
import { PaywallModal } from '../components/billing/PaywallModal';
import { PlanStatus } from '../components/billing/PlanStatus';
import { Pricing } from '../components/billing/Pricing';
import { Faq } from '../components/Faq';
import { ScoreRules } from '../components/ScoreRules';
import { StatusBadge, StatusIcon } from '../components/StatusBadge';
import { Eyebrow } from '../components/ui';
import { CHECK_DEFINITIONS } from '../core/rules';
import { SCORE_BAND_LABELS, scoreBand } from '../core/score';
import type { CheckId } from '../core/types';
import { useAnalyzer } from '../lib/analyzerContext';
import { BillingProvider } from '../lib/billingContext';
import { btn, cn } from '../lib/cn';

const CHECK_ICONS: Record<CheckId, LucideIcon> = {
  title: Type,
  metaDescription: AlignLeft,
  h1: Heading1,
  h2: Heading2,
  images: Image,
  canonical: Link2,
  robots: Bot,
  lang: Languages,
};

const TOTAL_POINTS = CHECK_DEFINITIONS.reduce((s, d) => s + d.maxPoints, 0);

function Section({
  id,
  eyebrow,
  title,
  intro,
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('no-print scroll-mt-16 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal max-w-2xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={`${id}-title`} className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-balance text-ink-950 sm:text-[2.6rem] sm:leading-[1.1]">
            {title}
          </h2>
          {intro && <p className="mt-4 text-[17px] leading-relaxed text-pretty text-ink-600">{intro}</p>}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/* ─── Aperçu du rapport (héros) : barème réel, puis résultat réel ─────── */
function HeroPreview() {
  const { state, runDemo } = useAnalyzer();
  const result = state.kind === 'success' ? state.result : null;
  const score = result?.score.value ?? null;

  return (
    <div className="ring-gradient relative rounded-2xl bg-ink-900/70 shadow-float backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <p className="font-mono text-[11px] text-ink-400">
          {result ? (result.source.kind === 'demo' ? 'rapport · démo' : 'rapport · en direct') : 'aperçu du rapport'}
        </p>
        <span className="w-[42px]" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-xs text-ink-400">Score SEO on-page</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className={cn('text-5xl font-semibold tracking-tight', score === null ? 'text-ink-600' : 'text-white')}>{score ?? '—'}</span>
            <span className="font-mono text-sm text-ink-500">/ 100</span>
          </p>
        </div>
        <p className="max-w-[10rem] text-right text-xs leading-snug text-ink-400">
          {score !== null
            ? SCORE_BAND_LABELS[scoreBand(score)]
            : `Barème public : ${TOTAL_POINTS} points répartis sur ${CHECK_DEFINITIONS.length} contrôles`}
        </p>
      </div>

      <ul className="mt-4 px-2 pb-2">
        {CHECK_DEFINITIONS.map((d) => {
          const check = result?.checks.find((c) => c.id === d.id);
          const Icon = CHECK_ICONS[d.id];
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] transition-colors hover:bg-white/[0.04]">
              {check ? <StatusIcon status={check.status} /> : <CircleDashed aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-600" />}
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-500" />
              <span className="min-w-0 flex-1 truncate text-ink-200">{d.label}</span>
              <span className="font-mono text-xs tabular-nums text-ink-400">
                {check ? (check.status === 'unverifiable' ? 'n/c' : `${check.points}/${check.maxPoints}`) : `${d.maxPoints} pts`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/[0.07] p-3">
        {state.kind === 'idle' && (
          <button type="button" onClick={() => void runDemo()} className={btn('ghost-dark', 'md', 'w-full rounded-xl')}>
            <Play aria-hidden="true" className="h-3.5 w-3.5 fill-signal-400 text-signal-400" /> Voir un rapport d’exemple
          </button>
        )}
        {state.kind === 'loading' && (
          <p className="flex h-10 items-center justify-center gap-2 text-sm text-ink-300">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-signal-400" /> Analyse en cours…
          </p>
        )}
        {(state.kind === 'success' || state.kind === 'error') && (
          <a href="#resultats" className={btn('ghost-dark', 'md', 'w-full rounded-xl')}>
            {state.kind === 'success' ? 'Voir le rapport complet' : 'Voir le détail de l’erreur'}
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

const TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: UserX, label: 'Sans inscription' },
  { icon: ShieldCheck, label: 'Aucun cookie' },
  { icon: Scale, label: 'Barème public' },
  { icon: Timer, label: '10 s max' },
];

function Hero() {
  return (
    <section id="accueil-hero" aria-labelledby="hero-title" className="hero-bg no-print relative -mt-16 overflow-hidden pt-16 text-white">
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/[0.05] py-1 pr-3 pl-1 text-[13px] text-ink-200 ring-1 ring-white/10">
            <span className="rounded-full bg-signal-400 px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide text-ink-950 uppercase">Gratuit</span>
            Vérification SEO on-page · sans inscription
          </p>
          <h1
            id="hero-title"
            className="animate-fade-up mt-7 text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance [animation-delay:80ms] sm:text-6xl lg:text-[4.1rem]"
          >
            Audit SEO gratuit : <span className="text-ink-400">analysez une page web en</span>{' '}
            <span className="font-serif font-normal tracking-[-0.01em] text-signal-400 italic">quelques secondes</span>
          </h1>
          <p className="animate-fade-up mt-6 max-w-xl text-[17px] leading-relaxed text-pretty text-ink-300 [animation-delay:160ms]">
            Saisissez une URL : SEOQuick lit le HTML de la page et vérifie les balises essentielles — title, description, titres, images,
            canonical, robots, langue. Chaque point est expliqué, sans jargon ni promesse de classement.
          </p>
          <div id="analyse" className="animate-fade-up mt-10 scroll-mt-28 [animation-delay:240ms]">
            <AnalyzerForm />
            <PlanStatus />
          </div>
          <ul className="animate-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-400 [animation-delay:320ms]">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4 text-ink-500" /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-fade-up min-w-0 [animation-delay:300ms]">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

const FACTS: [string, string][] = [
  [String(CHECK_DEFINITIONS.length), 'contrôles on-page expliqués'],
  [String(TOTAL_POINTS), 'points au barème public'],
  ['0', 'cookie, compte ou traceur'],
  ['1', 'URL, analysée en profondeur'],
];

function FactsBand() {
  return (
    <section aria-label="SEOQuick en chiffres" className="no-print border-b border-ink-200/70 bg-white">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
        {FACTS.map(([n, label], i) => (
          <div
            key={label}
            className={cn(
              'flex flex-col-reverse py-8 sm:py-10',
              i % 2 === 1 && 'border-l border-ink-100 pl-6 sm:pl-8',
              i >= 2 && 'border-t border-ink-100 lg:border-t-0',
              i === 2 && 'lg:border-l lg:pl-8',
            )}
          >
            <dt className="mt-2 text-sm text-ink-500">{label}</dt>
            <dd className="font-mono text-4xl font-medium tracking-tight text-ink-950 sm:text-5xl">{n}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: MousePointerClick, title: 'Saisissez une URL', text: 'Une page publique en http ou https : accueil, article, fiche produit…' },
  { icon: FileCode2, title: 'SEOQuick lit le HTML', text: 'Le serveur récupère le HTML initial de la page, sans exécuter JavaScript, et le décortique.' },
  { icon: ListChecks, title: 'Lisez le diagnostic', text: '8 contrôles expliqués, un score au calcul public et 3 à 5 actions classées par priorité.' },
];

const LIMITS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Code2, title: 'HTML initial uniquement', text: 'JavaScript n’est pas exécuté : un contenu injecté côté client peut apparaître comme « non détecté ».' },
  { icon: Target, title: 'Une seule URL', text: 'Ce n’est pas un crawler : ni les autres pages, ni le robots.txt, ni le sitemap ne sont analysés.' },
  { icon: EyeOff, title: 'Aucune donnée externe', text: 'Pas de volume de recherche, de position, de trafic ni de backlinks : SEOQuick n’invente pas ces chiffres.' },
  { icon: Scale, title: 'Pas de garantie de résultat', text: 'Corriger ces points aide les moteurs à comprendre la page mais ne garantit aucune hausse de position dans Google.' },
  { icon: Lock, title: 'Pages publiques seulement', text: 'Les pages privées, les réseaux internes et les ports non standards sont refusés pour des raisons de sécurité.' },
];

function FinalCta() {
  const { focusInput } = useAnalyzer();
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    focusInput();
  }
  return (
    <section aria-labelledby="cta-title" className="no-print px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="hero-bg reveal relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:py-20">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
        <div className="relative">
          <Globe aria-hidden="true" className="mx-auto h-8 w-8 text-signal-400" strokeWidth={1.5} />
          <h2 id="cta-title" className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            Prêt à vérifier <span className="font-serif font-normal tracking-normal text-signal-400 italic">votre page</span> ?
          </h2>
          <p className="mt-4 text-[17px] text-ink-300">Gratuit, sans inscription, résultat en quelques secondes.</p>
          <a href="#analyse" onClick={onClick} className={btn('primary', 'lg', 'group/cta mt-9 font-semibold')}>
            Lancer l’audit SEO gratuit
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <BillingProvider>
      <AnalyzerProvider>
        <Hero />
        <AnalyzerResults />
        <FactsBand />

        <Section
          id="methode"
          eyebrow="Méthode"
          title="Comment fonctionne l’analyse"
          intro="Trois étapes, un seul objectif : un diagnostic honnête, que vous pouvez vérifier vous-même."
        >
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-ink-200/80 bg-ink-200/80 shadow-card md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="reveal group relative bg-white p-7 transition-colors hover:bg-ink-50/50 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-950 text-signal-400 shadow-sm transition-transform duration-300 group-hover:-rotate-6">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs text-ink-400">
                    0{i + 1} / 03
                  </span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-tight text-ink-950">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="controles"
          className="border-y border-ink-200/70 bg-white"
          eyebrow="Vérification SEO on-page"
          title="Ce que vérifie l’analyse"
          intro="Huit contrôles, choisis parce qu’ils sont simples à corriger et utiles aux moteurs comme aux visiteurs."
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHECK_DEFINITIONS.map((d) => {
              const Icon = CHECK_ICONS[d.id];
              return (
                <li
                  key={d.id}
                  className="reveal group relative flex flex-col rounded-2xl border border-ink-200/80 bg-paper p-6 transition-[border-color,box-shadow,transform,background-color] duration-300 hover:-translate-y-0.5 hover:border-ink-300 hover:bg-white hover:shadow-card"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink-800 ring-1 ring-ink-200 transition-colors group-hover:bg-ink-950 group-hover:text-signal-400 group-hover:ring-ink-950">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-mono text-xs text-ink-400 tabular-nums">{d.maxPoints} pts</span>
                  </div>
                  <h3 className="mt-6 text-[15px] font-semibold tracking-tight text-ink-950">{d.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{d.why}</p>
                </li>
              );
            })}
          </ul>
          <div className="reveal mt-10 flex flex-col gap-4 rounded-2xl bg-paper p-5 ring-1 ring-ink-200/80 lg:flex-row lg:items-center lg:gap-6">
            <p className="shrink-0 text-sm font-medium text-ink-950">Statuts possibles</p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <StatusBadge status="pass" />
              </li>
              <li>
                <StatusBadge status="warn" />
              </li>
              <li>
                <StatusBadge status="missing" />
              </li>
              <li>
                <StatusBadge status="unverifiable" />
              </li>
            </ul>
            <p className="text-[13px] text-ink-500 lg:ml-auto lg:max-w-xs">
              « Non détecté » : absent du HTML reçu. « Non vérifiable » : rien à contrôler ou information indisponible.
            </p>
          </div>
        </Section>

        <Section
          id="score"
          eyebrow="Transparence"
          title="Comment le score est calculé"
          intro="Le score sur 100 est un repère pédagogique. Le barème est public et le calcul reproductible : une même page donne toujours le même résultat."
        >
          <ScoreRules />
        </Section>

        <Section
          id="limites"
          className="border-y border-ink-200/70 bg-white"
          eyebrow="Honnêteté"
          title="Limites de l’analyse"
          intro="Pour un diagnostic fiable, voici ce que SEOQuick ne fait pas."
        >
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {LIMITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="reveal flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-700 ring-1 ring-ink-200">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink-950">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{text}</p>
                </div>
              </li>
            ))}
            <li className="reveal flex gap-4 rounded-2xl bg-ink-950 p-5 text-ink-300">
              <Network aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-signal-400" />
              <p className="text-sm leading-relaxed">
                <span className="font-medium text-white">Sécurité d’abord.</span> Chaque URL et chaque redirection est revalidée côté serveur
                avant toute connexion.
              </p>
            </li>
          </ul>
        </Section>

        <Pricing />

        <section id="faq" aria-labelledby="faq-title" className="no-print scroll-mt-16 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="reveal lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>FAQ</Eyebrow>
              <h2 id="faq-title" className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink-950 sm:text-[2.6rem] sm:leading-[1.1]">
                Questions fréquentes
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-600">Tout ce qu’il faut savoir avant de lancer votre premier audit.</p>
            </div>
            <Faq />
          </div>
        </section>

        <FinalCta />
        <PaywallModal />
      </AnalyzerProvider>
    </BillingProvider>
  );
}
