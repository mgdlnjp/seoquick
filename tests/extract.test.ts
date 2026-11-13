import { describe, expect, it } from 'vitest';
import { extractSeoData } from '../src/core/extract';

const page = (head: string, body = '', htmlAttrs = ' lang="fr"') =>
  `<!doctype html><html${htmlAttrs}><head>${head}</head><body>${body}</body></html>`;

describe('extractSeoData — parsing HTML', () => {
  it('extrait title, description, canonical, robots et lang', () => {
    const d = extractSeoData(
      page(
        `<title>  Mon   titre\n</title>
         <META NAME="Description" CONTENT="Une description">
         <link rel="Canonical" href="https://ex.fr/a">
         <meta name="robots" content="noindex, follow">`,
      ),
    );
    expect(d.titles).toEqual(['Mon titre']);
    expect(d.metaDescriptions).toEqual(['Une description']);
    expect(d.canonicals).toEqual(['https://ex.fr/a']);
    expect(d.robotsMeta).toEqual([{ name: 'robots', content: 'noindex, follow' }]);
    expect(d.htmlLang).toBe('fr');
  });

  it('compte les H1/H2 et récupère leur texte, y compris imbriqué', () => {
    const d = extractSeoData(page('', '<h1>Bonjour <span>le <b>monde</b></span></h1><h2>A</h2><section><h2>B</h2></section><h1></h1>'));
    expect(d.h1).toEqual(['Bonjour le monde', '']);
    expect(d.h2).toEqual(['A', 'B']);
  });

  it('distingue images sans alt et images à alt vide', () => {
    const d = extractSeoData(
      page('', '<img src="a.png"><img src="b.png" alt=""><img src="c.png" alt="  "><img src="d.png" alt="Chat"><picture><img src="e.png"></picture>'),
    );
    expect(d.images).toEqual({ total: 5, missingAlt: 2, emptyAlt: 2, missingAltExamples: ['a.png', 'e.png'] });
  });

  it('ignore le <title> des SVG et le contenu des <template>', () => {
    const d = extractSeoData(
      page('<title>Vrai</title>', '<svg><title>Icône</title></svg><template><h1>Caché</h1><img src="x"></template>'),
    );
    expect(d.titles).toEqual(['Vrai']);
    expect(d.h1).toEqual([]);
    expect(d.images.total).toBe(0);
  });

  it('signale plusieurs title et plusieurs descriptions', () => {
    const d = extractSeoData(page('<title>A</title><title>B</title><meta name="description" content="x"><meta name="description" content="y">'));
    expect(d.titles).toHaveLength(2);
    expect(d.metaDescriptions).toHaveLength(2);
  });

  it('renvoie des listes vides sur un HTML minimal ou malformé, sans planter', () => {
    const d = extractSeoData('<p>texte <b>non fermé');
    expect(d.titles).toEqual([]);
    expect(d.h1).toEqual([]);
    expect(d.htmlLang).toBeNull();
    expect(d.canonicals).toEqual([]);
    expect(extractSeoData('').titles).toEqual([]);
  });

  it('lit <base href> et l’attribut lang absent', () => {
    const d = extractSeoData(page('<base href="https://cdn.ex.fr/">', '', ''));
    expect(d.baseHref).toBe('https://cdn.ex.fr/');
    expect(d.htmlLang).toBeNull();
  });

  it('mesure le texte visible hors scripts/styles (détection de rendu côté client)', () => {
    const d = extractSeoData(page('<script>var a = "beaucoup de texte"</script>', '<div id="root"></div><script src="app.js"></script><noscript>Activez JS</noscript>'));
    expect(d.signals.visibleTextLength).toBe(0);
    expect(d.signals.scriptCount).toBe(2);
  });

  it('décode les entités HTML', () => {
    const d = extractSeoData(page('<title>Caf&eacute; &amp; th&#233;</title>'));
    expect(d.titles).toEqual(['Café & thé']);
  });
});
