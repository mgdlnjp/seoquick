import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, FileWarning } from 'lucide-react';
import { Eyebrow } from '../components/ui';
import { btn } from '../lib/cn';

/** Les éléments entre crochets sont à compléter par l'éditeur du service avant la mise en ligne. */
function ToFill({ children }: { children: ReactNode }) {
  return <mark className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-950 ring-1 ring-amber-300/60">[{children}]</mark>;
}

function Prose({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <>
      <div className="relative overflow-hidden border-b border-ink-200/70 bg-white">
        <div aria-hidden="true" className="grid-lines-light pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
          <a href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 transition-colors hover:text-ink-950">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Accueil
          </a>
          <div className="mt-8">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-ink-950 sm:text-5xl">{title}</h1>
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-300/50">
          <FileWarning aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Modèle à compléter : les mentions entre crochets doivent être renseignées par l’éditeur avant toute mise en production. Ce texte
            ne constitue pas un conseil juridique.
          </span>
        </p>
        <div className="text-[16px] leading-relaxed text-ink-700 [&_h2]:mt-12 [&_h2]:border-t [&_h2]:border-ink-200/70 [&_h2]:pt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink-950 [&_li]:mt-2 [&_li]:pl-1 [&_li::marker]:text-signal-600 [&_p]:mt-4 [&_strong]:font-medium [&_strong]:text-ink-950 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
        <div className="mt-16 flex flex-col gap-4 rounded-2xl bg-ink-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]">
            Vérifiez votre page en quelques secondes. <span className="text-ink-400">Gratuit, sans inscription.</span>
          </p>
          <a href="/#analyse" className={btn('primary', 'md', 'shrink-0')}>
            Retour à l’audit SEO gratuit <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </article>
    </>
  );
}

export function PrivacyPage() {
  return (
    <Prose title="Politique de confidentialité" eyebrow="Vos données">
      <p>
        Dernière mise à jour : <ToFill>date</ToFill>
      </p>
      <h2>Responsable du traitement</h2>
      <p>
        <ToFill>Nom ou raison sociale</ToFill>, <ToFill>adresse</ToFill>, contact : <ToFill>adresse e-mail</ToFill>.
      </p>
      <h2>Données traitées</h2>
      <ul>
        <li>
          <strong>L’URL que vous soumettez</strong>, utilisée uniquement pour récupérer et analyser la page demandée. Elle n’est pas
          enregistrée en base de données par l’application.
        </li>
        <li>
          <strong>Votre adresse IP</strong>, conservée en mémoire vive pendant la fenêtre de limitation de fréquence (1 minute par défaut)
          afin de prévenir les abus, puis effacée.
        </li>
        <li>
          <strong>Journaux techniques</strong> de l’hébergeur (adresse IP, date, URL de la requête) :{' '}
          <ToFill>durée de conservation selon l’hébergeur</ToFill>.
        </li>
      </ul>
      <h2>Abonnement et paiement</h2>
      <ul>
        <li>
          L’abonnement Pro est souscrit sur une page de paiement hébergée par <strong>Stripe</strong>, qui traite votre adresse
          e-mail et vos informations de paiement en tant que prestataire de paiement. SEOQuick ne reçoit ni ne conserve vos
          coordonnées bancaires.
        </li>
        <li>
          Après le paiement, un <strong>jeton d’accès</strong> est enregistré dans le stockage local de votre navigateur (pas un
          cookie). Il ne contient que des identifiants techniques d’abonnement Stripe, signés par notre serveur.
        </li>
        <li>
          Pour la limite d’analyses gratuites, l’adresse IP est conservée en mémoire avec l’heure de chaque analyse pendant
          24 heures au maximum, puis effacée.
        </li>
        <li>
          <ToFill>base légale de la facturation, durée de conservation des factures et politique de remboursement</ToFill>.
        </li>
      </ul>
      <h2>Ce que SEOQuick ne fait pas</h2>
      <ul>
        <li>Aucun cookie, aucun traceur publicitaire ni outil de mesure d’audience n’est déposé par l’application.</li>
        <li>Aucun compte utilisateur n’est créé et aucune donnée n’est vendue ou cédée.</li>
        <li>Les résultats d’analyse ne sont pas conservés côté serveur : ils sont affichés puis oubliés.</li>
      </ul>
      <h2>Base légale</h2>
      <p>Intérêt légitime à fournir le service demandé et à le protéger contre les usages abusifs.</p>
      <h2>Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition. Contact : <ToFill>adresse e-mail</ToFill>. Vous
        pouvez aussi saisir la CNIL (cnil.fr).
      </p>
      <h2>Sites analysés</h2>
      <p>
        Lors d’une analyse, notre serveur envoie une requête à la page demandée avec un user-agent identifiable (« SEOQuickBot »), sans
        cookie ni identifiant.
      </p>
    </Prose>
  );
}

export function LegalNoticePage() {
  return (
    <Prose title="Mentions légales" eyebrow="Informations légales">
      <h2>Éditeur du site</h2>
      <p>
        <ToFill>Nom ou raison sociale, forme juridique, capital</ToFill>
        <br />
        <ToFill>Adresse du siège</ToFill>
        <br />
        <ToFill>SIREN / RCS</ToFill> — <ToFill>N° TVA intracommunautaire</ToFill>
        <br />
        Contact : <ToFill>adresse e-mail</ToFill> — <ToFill>téléphone</ToFill>
      </p>
      <h2>Directeur de la publication</h2>
      <p>
        <ToFill>Nom du directeur de la publication</ToFill>
      </p>
      <h2>Hébergement</h2>
      <p>
        <ToFill>Nom de l’hébergeur, adresse, téléphone</ToFill>
      </p>
      <h2>Nature du service</h2>
      <p>
        SEOQuick fournit un diagnostic automatisé et indicatif des éléments SEO présents dans le HTML d’une page publique. Les résultats ne
        constituent pas une garantie de positionnement dans les moteurs de recherche. Le score est un indicateur pédagogique propre au
        service et n’émane d’aucun moteur de recherche.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>Les contenus des pages analysées restent la propriété de leurs auteurs. SEOQuick n’en conserve aucune copie.</p>
    </Prose>
  );
}

export function NotFoundPage() {
  return (
    <section className="hero-bg relative -mt-16 overflow-hidden pt-16 text-white">
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-mono text-sm text-signal-400">Erreur 404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
          Page <span className="font-serif font-normal tracking-normal text-signal-400 italic">introuvable</span>
        </h1>
        <p className="mt-5 max-w-md text-[17px] text-ink-300">Cette adresse n’existe pas ou a été déplacée.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="/" className={btn('primary', 'lg', 'font-semibold')}>
            Lancer un audit SEO gratuit <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
          <a href="/#faq" className={btn('ghost-dark', 'lg')}>
            Questions fréquentes
          </a>
        </div>
      </div>
    </section>
  );
}
