/** FAQ de la landing page (affichée et reprise en données structurées FAQPage). */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: readonly FaqItem[] = [
  {
    question: 'L’audit SEO est-il vraiment gratuit ?',
    answer:
      'Oui. L’analyse d’une page ne demande ni inscription ni carte bancaire. Une limite de quelques analyses par minute protège le service contre les abus.',
  },
  {
    question: 'Que vérifie exactement SEOQuick ?',
    answer:
      'Huit éléments on-page présents dans le HTML : balise title, meta description, titres H1 et H2, texte alternatif des images, URL canonique, directives robots et langue de la page. Chaque contrôle est expliqué et accompagné des valeurs brutes trouvées.',
  },
  {
    question: 'Pourquoi un élément apparaît « non détecté » alors qu’il existe sur mon site ?',
    answer:
      'SEOQuick lit le HTML initial renvoyé par le serveur, sans exécuter JavaScript. Si un élément est ajouté par un script après le chargement (fréquent sur les sites en React, Vue ou certains constructeurs de sites), il n’apparaît pas dans ce HTML. « Non détecté » veut donc dire « absent du HTML reçu », pas forcément « inexistant ».',
  },
  {
    question: 'Le score correspond-il à ce que voit Google ?',
    answer:
      'Non. Le score est un indicateur pédagogique propre à SEOQuick, calculé à partir d’un barème public affiché sur cette page. Il aide à repérer les fondamentaux manquants mais ne reflète ni le classement ni l’évaluation d’un moteur de recherche.',
  },
  {
    question: 'Corriger les points signalés va-t-il améliorer mon positionnement ?',
    answer:
      'Aucun outil ne peut le garantir. Ces éléments facilitent la compréhension de la page par les moteurs et les internautes, mais le positionnement dépend aussi du contenu, de la concurrence, de la popularité du site et de nombreux autres facteurs.',
  },
  {
    question: 'SEOQuick explore-t-il tout mon site ?',
    answer:
      'Non. Ce n’est pas un crawler : chaque analyse porte sur une seule URL. Pour un audit complet, analysez vos pages importantes une par une ou utilisez un outil d’exploration dédié.',
  },
  {
    question: 'Quelles pages ne peuvent pas être analysées ?',
    answer:
      'Les pages privées ou protégées par mot de passe, les adresses de réseaux internes, les ports non standards, les pages trop lourdes et celles qui répondent par une erreur (404, 500…). Dans ces cas, SEOQuick affiche une erreur explicite plutôt qu’un score trompeur.',
  },
];
