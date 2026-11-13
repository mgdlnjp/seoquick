import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FileCode2, Gauge, Info, ListTree, Printer, RotateCcw, Search } from 'lucide-react';
import { DESCRIPTION_RANGE, TITLE_RANGE, charLength } from '../core/rules';
import { SCORE_BAND_LABELS, SCORE_RULE, scoreBand } from '../core/score';
import { STATUS_LABELS } from '../core/types';
import type { AnalysisResult, Check, CheckId, CheckStatus } from '../core/types';
import { useAnalyzer } from '../lib/analyzerContext';
import { btn, cn } from '../lib/cn';
import { ChecksList } from './CheckCard';
import { CopySummaryButton } from './CopySummaryButton';
import { Ring, ScoreGauge } from './Gauges';
import { RecommendationList } from './RecommendationList';
import { StatusIcon } from './StatusBadge';
import { StatusBar } from './StatusBar';
import { Panel } from './ui';

/**
 * Tableau de bord des résultats. Toutes les valeurs affichées proviennent du HTML
 * analysé : aucune donnée de trafic, de position ou de comparaison n'est inventée.
 */

const byId = (checks: Check[], id: CheckId) => checks.find((c) => c.id === id)!;

function formatBytes(n: number): string {
  return n < 1024 ? `${n} o` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / 1_048_576).toFixed(2)} Mo`;
}

/* ─── En-tête du rapport : page analysée, actions, chiffres clés ─────── */
function ReportHeader({ result }: { result: AnalysisResult }) {
  const { focusInput } = useAnalyzer();
  const s = result.source;
  const url = s.kind === 'live' ? s.finalUrl : s.pageUrl;
  const stats: [string, string][] =
    s.kind === 'live'
      ? [
          ['Réponse HTTP', String(s.httpStatus)],
          ['Taille du HTML', formatBytes(s.bytes)],
          ['Redirections', String(s.redirects.length)],
          ['Analysée à', new Date(s.fetchedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })],
        ]
      : [
          ['Source', 'HTML d’exemple'],
          ['Réseau', 'aucun appel'],
          ['Contrôles', String(result.checks.length)],
          ['Mode', 'démo'],
        ];
  return (
    <header className="print-avoid-break">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            {s.kind === 'demo' ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900 ring-1 ring-amber-300/60">Démo · page fictive</span>
            ) : (
              <span className="flex items-center gap-2 text-ink-500">
                <span aria-hidden="true" className="live-dot h-2 w-2 rounded-full bg-signal-500" /> Rapport d’analyse
              </span>
            )}
          </p>
          <h2 id="results-title" tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight text-ink-950 outline-none sm:text-4xl">
            Tableau de bord
          </h2>
          <p className="mt-2 flex min-w-0 items-center gap-2 font-mono text-sm text-ink-600">
            <span className="truncate" title={url}>
              {url}
            </span>
            {s.kind === 'live' && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="no-print shrink-0 rounded p-0.5 text-ink-400 hover:text-ink-950"
                aria-label="Ouvrir la page analysée dans un nouvel onglet"
              >
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </p>
          {s.kind === 'live' && s.redirects.length > 0 && <p className="mt-1 truncate text-xs text-ink-500">Demandée : {s.requestedUrl}</p>}
          {s.kind === 'demo' && <p className="mt-1 text-[13px] text-ink-500">Aucune page réelle récupérée : saisissez votre URL pour analyser votre page.</p>}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopySummaryButton result={result} />
          <button type="button" onClick={() => window.print()} className={btn('outline', 'sm')}>
            <Printer aria-hidden="true" className="h-3.5 w-3.5" /> Imprimer / PDF
          </button>
          <button type="button" onClick={focusInput} className={btn('dark', 'sm')}>
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Nouvelle analyse
          </button>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card sm:grid-cols-4">
        {stats.map(([k, v], i) => (
          <div
            key={k}
            className={cn('px-5 py-4', i % 2 === 1 && 'border-l border-ink-100', i >= 2 && 'border-t border-ink-100 sm:border-t-0', i === 2 && 'sm:border-l')}
          >
            <dt className="text-xs text-ink-500">{k}</dt>
            <dd className="mt-1 font-mono text-lg font-medium tracking-tight whitespace-nowrap text-ink-950">{v}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/* ─── Navigation interne collante (avec section active) ─────────────── */
const NAV = [
  { id: 'synthese', label: 'Synthèse' },
  { id: 'recommandations', label: 'Recommandations' },
  { id: 'controles-detail', label: 'Contrôles' },
  { id: 'apercu-serp', label: 'Aperçu recherche' },
  { id: 'structure', label: 'Structure' },
];

function ReportNav() {
  const [active, setActive] = useState('synthese');
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => e !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav
      aria-label="Sections du rapport"
      className="no-print sticky top-16 z-30 -mx-4 mt-8 border-y border-ink-200/70 bg-paper/85 px-4 backdrop-blur-md sm:mx-0 sm:w-fit sm:rounded-full sm:border sm:bg-white/80 sm:px-1.5 sm:shadow-card"
    >
      <ul className="flex gap-1 overflow-x-auto py-1.5">
        {NAV.map((n) => (
          <li key={n.id}>
            <a
              href={`#${n.id}`}
              aria-current={active === n.id ? 'location' : undefined}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                active === n.id ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
              )}
            >
              {n.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ─── Score (carte sombre signature) ─────────────────────────────────── */
function ScoreCard({ result }: { result: AnalysisResult }) {
  const { score, checks } = result;
  return (
    <section
      id="synthese"
      aria-labelledby="score-card-title"
      className="ring-gradient print-avoid-break relative scroll-mt-32 overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-float lg:col-span-4"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-signal-400/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 id="score-card-title" className="text-[15px] font-semibold tracking-tight">
            Score SEO on-page
          </h3>
          <p className="mt-0.5 text-xs text-ink-400">Indicateur pédagogique, pas une mesure Google</p>
        </div>
        <Gauge aria-hidden="true" className="h-4 w-4 text-ink-500" />
      </div>
      {score.value === null ? (
        <p className="relative mt-8 text-sm text-ink-300">Aucun contrôle vérifiable : score non calculé.</p>
      ) : (
        <div className="relative mt-3 flex flex-col items-center">
          <ScoreGauge value={score.value} />
          <p className="-mt-3 rounded-full bg-white/[0.06] px-3 py-1 text-[13px] font-medium text-white ring-1 ring-white/10">
            {SCORE_BAND_LABELS[scoreBand(score.value)]}
          </p>
          <p className="sr-only">
            Score : {score.value} sur 100. {score.earned} points obtenus sur {score.possible} vérifiables.
          </p>
          <dl className="mt-5 grid w-full grid-cols-2 divide-x divide-white/10 rounded-xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="px-3 py-2.5 text-center">
              <dt className="text-[11px] text-ink-400">Points obtenus</dt>
              <dd className="font-mono text-lg font-medium">{score.earned}</dd>
            </div>
            <div className="px-3 py-2.5 text-center">
              <dt className="text-[11px] text-ink-400">Points vérifiables</dt>
              <dd className="font-mono text-lg font-medium">{score.possible}</dd>
            </div>
          </dl>
        </div>
      )}
      <div className="relative mt-5 border-t border-white/10 pt-4">
        <StatusBar checks={checks} tone="dark" />
      </div>
      <p className="relative mt-4 text-[11px] leading-relaxed text-ink-400">
        {SCORE_RULE}{' '}
        <a href="/#score" className="font-medium text-signal-400 underline-offset-2 hover:underline">
          Voir le barème
        </a>
      </p>
    </section>
  );
}

/* ─── Indicateurs clés ──────────────────────────────────────────────── */
function Kpi({ label, value, hint, ratio, status }: { label: string; value: string; hint: string; ratio: number; status: CheckStatus }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-ink-50/60 p-4 ring-1 ring-ink-200/60">
      <Ring ratio={ratio} status={status} />
      <div className="min-w-0">
        <p className="truncate text-[13px] text-ink-500">{label}</p>
        <p className="font-mono text-xl font-medium tracking-tight text-ink-950">{value}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-600">
          <StatusIcon status={status} className="h-3.5 w-3.5" />
          <span className="truncate">
            {STATUS_LABELS[status]} · {hint}
          </span>
        </p>
      </div>
    </div>
  );
}

function KpiPanel({ result }: { result: AnalysisResult }) {
  const { extracted: x, checks } = result;
  const title = x.titles.find(Boolean) ?? '';
  const desc = x.metaDescriptions.find(Boolean) ?? '';
  const img = x.images;
  const withAlt = img.total - img.missingAlt - img.emptyAlt;
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const robots = byId(checks, 'robots').status;
  const facts: { label: string; value: string; status?: CheckStatus }[] = [
    { label: 'Indexation', value: robots === 'pass' ? 'autorisée' : 'restreinte', status: robots },
    { label: 'Canonical', value: x.canonicals.length ? 'déclarée' : 'non détectée', status: byId(checks, 'canonical').status },
    { label: 'Langue', value: x.htmlLang?.trim() || 'non détectée', status: byId(checks, 'lang').status },
    { label: 'H1', value: String(x.h1.length) },
    { label: 'H2', value: String(x.h2.length) },
    { label: 'Images', value: String(img.total) },
  ];
  return (
    <Panel title="Indicateurs clés" subtitle="Mesurés dans le HTML reçu" icon={<FileCode2 className="h-4 w-4" />} className="lg:col-span-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi
          label="Longueur du title"
          value={title ? `${charLength(title)} car.` : '—'}
          hint={`repère ${TITLE_RANGE.min}–${TITLE_RANGE.max}`}
          ratio={charLength(title) / TITLE_RANGE.max}
          status={byId(checks, 'title').status}
        />
        <Kpi
          label="Longueur de la description"
          value={desc ? `${charLength(desc)} car.` : '—'}
          hint={`repère ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max}`}
          ratio={charLength(desc) / DESCRIPTION_RANGE.max}
          status={byId(checks, 'metaDescription').status}
        />
        <Kpi
          label="Images avec alt renseigné"
          value={img.total ? `${Math.round((withAlt / img.total) * 100)} %` : '—'}
          hint={img.total ? `${withAlt}/${img.total} images` : 'aucune image'}
          ratio={img.total ? withAlt / img.total : 0}
          status={byId(checks, 'images').status}
        />
        <Kpi
          label="Contrôles corrects"
          value={`${passCount}/${checks.length}`}
          hint={`sur ${checks.length} contrôles`}
          ratio={passCount / checks.length}
          status={passCount === checks.length ? 'pass' : passCount >= checks.length / 2 ? 'warn' : 'missing'}
        />
      </div>
      <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl ring-1 ring-ink-200/70 lg:grid-cols-6">
        {facts.map((f, i) => (
          <div
            key={f.label}
            className={cn('min-w-0 px-3 py-2.5', i % 3 !== 0 && 'border-l border-ink-100', i >= 3 && 'border-t border-ink-100 lg:border-t-0', i === 3 && 'lg:border-l')}
          >
            <dt className="flex items-center gap-1.5 text-[11px] text-ink-500">
              {f.status && <StatusIcon status={f.status} className="h-3 w-3" />}
              {f.label}
            </dt>
            <dd className="mt-0.5 truncate font-mono text-sm font-medium text-ink-950" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ─── Aperçu dans les résultats de recherche ──────────────────────────── */
function truncate(text: string, max: number): { shown: string; cut: boolean } {
  const chars = [...text];
  return chars.length > max ? { shown: `${chars.slice(0, max).join('').trimEnd()}…`, cut: true } : { shown: text, cut: false };
}

/** Jauge de longueur : zone recommandée surlignée + curseur de la valeur mesurée. */
function LengthMeter({ label, length, min, max }: { label: string; length: number; min: number; max: number }) {
  const scale = max * 1.35;
  const ok = length >= min && length <= max;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-600">{label}</span>
        <span className="font-mono tabular-nums text-ink-950">
          {length} <span className="text-ink-400">/ repère {min}–{max}</span>
        </span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-ink-100" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-signal-300 ring-1 ring-signal-500/50"
          style={{ left: `${(min / scale) * 100}%`, width: `${((max - min) / scale) * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full ring-2 ring-white transition-[left] duration-700"
          style={{
            left: `calc(${Math.min(100, (length / scale) * 100)}% - 2px)`,
            background: length === 0 ? 'var(--color-status-neutral)' : ok ? 'var(--color-ink-950)' : 'var(--color-status-warning)',
          }}
        />
      </div>
    </div>
  );
}

function SerpPreview({ result }: { result: AnalysisResult }) {
  const { extracted: x, source } = result;
  const url = new URL(source.kind === 'live' ? source.finalUrl : source.pageUrl);
  const host = url.hostname.replace(/^www\./, '');
  const crumbs = url.pathname.split('/').filter(Boolean);
  const title = x.titles.find(Boolean);
  const desc = x.metaDescriptions.find(Boolean);
  const t = truncate(title ?? '', TITLE_RANGE.max);
  const d = truncate(desc ?? '', DESCRIPTION_RANGE.max);
  const flags: { text: string; ok: boolean }[] = [];
  if (t.cut) flags.push({ text: 'Title probablement tronqué', ok: false });
  if (d.cut) flags.push({ text: 'Description probablement tronquée', ok: false });
  if (title && charLength(title) < TITLE_RANGE.min) flags.push({ text: 'Title court : peu d’espace exploité', ok: false });
  if (desc && charLength(desc) < DESCRIPTION_RANGE.min) flags.push({ text: 'Description courte', ok: false });
  if (title && desc && flags.length === 0) flags.push({ text: 'Longueurs confortables pour l’affichage', ok: true });

  return (
    <Panel
      id="apercu-serp"
      title="Aperçu dans les résultats de recherche"
      subtitle="Simulation indicative : le moteur peut réécrire title et extrait"
      icon={<Search className="h-4 w-4" />}
      className="lg:col-span-7"
    >
      <div className="rounded-xl bg-white p-5 font-[Arial,sans-serif] shadow-[0_1px_6px_rgb(32_33_36/0.1)] ring-1 ring-ink-200">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700 ring-1 ring-ink-200" aria-hidden="true">
            {host.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm text-[#202124]">{host}</p>
            <p className="truncate text-xs text-[#4d5156]">
              {url.origin}
              {crumbs.length > 0 && ` › ${crumbs.join(' › ')}`}
            </p>
          </div>
        </div>
        <p className={cn('mt-2.5 text-xl leading-snug', title ? 'text-[#1a0dab]' : 'text-ink-400 italic')}>
          {title ? t.shown : 'Aucun title détecté : le moteur choisira un titre lui-même'}
        </p>
        <p className={cn('mt-1 text-sm leading-relaxed', desc ? 'text-[#4d5156]' : 'text-ink-400 italic')}>
          {desc ? d.shown : 'Aucune meta description détectée : le moteur choisira un extrait de la page'}
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <LengthMeter label="Title (caractères)" length={charLength(title ?? '')} min={TITLE_RANGE.min} max={TITLE_RANGE.max} />
        <LengthMeter label="Description (caractères)" length={charLength(desc ?? '')} min={DESCRIPTION_RANGE.min} max={DESCRIPTION_RANGE.max} />
      </div>
      {flags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs">
          {flags.map((f) => (
            <li
              key={f.text}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1',
                f.ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' : 'bg-amber-50 text-amber-900 ring-amber-500/30',
              )}
            >
              <StatusIcon status={f.ok ? 'pass' : 'warn'} className="h-3.5 w-3.5" />
              {f.text}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ─── Structure des titres ────────────────────────────────────────────── */
function HeadingsTile({ result }: { result: AnalysisResult }) {
  const { h1, h2 } = result.extracted;
  const rows = [...h1.map((t) => ({ level: 'H1' as const, text: t })), ...h2.slice(0, 8).map((t) => ({ level: 'H2' as const, text: t }))];
  return (
    <Panel id="structure" title="Structure des titres" subtitle="H1 puis H2 trouvés dans le HTML" icon={<ListTree className="h-4 w-4" />} className="lg:col-span-5">
      {rows.length === 0 ? (
        <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-600">Aucun H1 ni H2 dans le HTML reçu.</p>
      ) : (
        <ol className="space-y-0.5">
          {rows.map((r, i) => (
            <li key={i} className={cn('relative flex items-center gap-2.5', r.level === 'H2' && 'pl-7')}>
              {r.level === 'H2' && <span aria-hidden="true" className="absolute top-0 bottom-1/2 left-3 w-3 rounded-bl-md border-b border-l border-ink-300" />}
              <span
                className={cn(
                  'w-8 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-semibold',
                  r.level === 'H1' ? 'bg-ink-950 text-signal-400' : 'bg-ink-100 text-ink-700',
                )}
              >
                {r.level}
              </span>
              <span className={cn('truncate py-1.5 text-sm', r.text ? 'text-ink-800' : 'text-ink-400 italic')} title={r.text}>
                {r.text || '(vide)'}
              </span>
            </li>
          ))}
          {h2.length > 8 && <li className="pt-1 pl-7 text-xs text-ink-500">… et {h2.length - 8} autre(s) H2</li>}
        </ol>
      )}
      {h1.length > 1 && (
        <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-950 ring-1 ring-amber-500/25">
          <StatusIcon status="warn" className="h-3.5 w-3.5" />
          {h1.length} H1 détectés : un H1 unique rend le sujet principal plus évident.
        </p>
      )}
    </Panel>
  );
}

/* ─── À savoir ────────────────────────────────────────────────────────── */
function Notices({ notices }: { notices: string[] }) {
  return (
    <Panel title="À savoir sur cette analyse" icon={<Info className="h-4 w-4" />} className="lg:col-span-5">
      <ul className="space-y-3 text-sm text-ink-700">
        {notices.map((n) => (
          <li key={n} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal-600" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ─── Assemblage ──────────────────────────────────────────────────────── */
export function Dashboard({ result }: { result: AnalysisResult }) {
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // Focus sur le titre pour les lecteurs d'écran ; le défilement est géré par la zone de résultats.
    rootRef.current?.querySelector<HTMLElement>('#results-title')?.focus({ preventScroll: true });
  }, [result]);

  return (
    <section ref={rootRef} aria-labelledby="results-title" className="animate-fade-up">
      <ReportHeader result={result} />
      <ReportNav />
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <ScoreCard result={result} />
        <KpiPanel result={result} />
        <RecommendationList items={result.recommendations} className="lg:col-span-7" />
        <HeadingsTile result={result} />
        <ChecksList checks={result.checks} />
        <SerpPreview result={result} />
        {result.notices.length > 0 && <Notices notices={result.notices} />}
      </div>
    </section>
  );
}
