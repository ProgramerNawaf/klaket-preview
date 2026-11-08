/* Writes the 24 variant pages from tools/variants.json.
   This runs once, by hand, and emits plain static HTML: the site itself still
   has no build step. Keeping one template here is the only way 24 pages stay
   identical in everything except the four slots that are meant to differ. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = JSON.parse(fs.readFileSync(path.join(SITE, 'tools/variants.json'), 'utf8'));
const SLOTS = ['heroes', 'value', 'journey', 'features', 'footer'];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exists = (p) => fs.existsSync(path.join(SITE, p));

/* A module script needs type="module"; a classic one must not have it, or the
   browser defers it past the DOM and half the page never builds. */
const isModule = (p) => exists(p) && /^\s*import\s/m.test(fs.readFileSync(path.join(SITE, p), 'utf8'));

function dirFor(part, key) {
  return part === 'heroes' ? 'heroes' : part === 'footer' && M.footer[key].core ? 'core' : 'sections';
}

function page(row, i) {
  const [hero, value, journey, features, footer, title] = row;
  const pick = Object.fromEntries(SLOTS.map((s, k) => [s, M[s][row[k]]]));
  const n = String(i + 1).padStart(2, '0');
  const missing = [];

  const css = [], js = [];
  SLOTS.forEach((slot, k) => {
    const key = row[k];
    const d = dirFor(slot, key);
    const base = `${d}/${M[slot][key].file}`;
    if (!exists(base + '.css')) missing.push(base + '.css');
    if (!exists(base + '.js')) missing.push(base + '.js');
    css.push(`../${base}.css`);
    js.push({ src: `../${base}.js`, mod: isModule(base + '.js') });
  });

  const heroPaper = pick.heroes.paper ? ' on-paper' : '';
  /* A hero can ask for a variation of itself rather than a whole second file. */
  const heroAttrs = pick.heroes.attrs ? ' ' + pick.heroes.attrs : '';
  const desc = 'Klaket is the production platform for film crews. Brief, script breakdown, scheduling, call sheets and wrap, in one place the whole crew understands.';

  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Klaket, the production platform for film crews</title>
<meta name="description" content="${desc}">
<meta name="robots" content="noindex">
<link rel="icon" href="../../brand/favicon.svg" type="image/svg+xml">
<!-- The brand is set before the first paint, or the page flashes the other one. -->
<script>try{var q=new URLSearchParams(location.search).get('brand');var b=q||localStorage.getItem('klaket.brand');if(b==='mono')document.documentElement.setAttribute('data-brand','mono')}catch(e){}</script>
<meta property="og:title" content="Klaket, the production platform for film crews">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">

<link rel="stylesheet" href="../core/tokens.css">
<link rel="stylesheet" href="../core/base.css">
<link rel="stylesheet" href="../core/nav.css">
<link rel="stylesheet" href="../core/companies.css">
<link rel="stylesheet" href="../core/faq.css">
<link rel="stylesheet" href="../core/theme.css">
${css.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<nav class="island" data-dock="top" aria-label="Main"></nav>

<main id="main">
  <section class="${pick.heroes.root}${heroPaper}" id="top"${heroAttrs}></section>
  <section class="companies" aria-label="Where the team has worked"></section>
  <section class="${pick.value.root}" id="value"></section>
  <section class="${pick.journey.root}" id="journey"></section>
  <section class="${pick.features.root} section" id="features"></section>
  <section class="faq section" id="faq"></section>
  <section class="companies" aria-label="Where the team has worked"></section>
</main>

<footer class="${pick.footer.root}"></footer>

<script src="../vendor/gsap.min.js"></script>
<script src="../vendor/ScrollTrigger.min.js"></script>
<script src="../vendor/lenis.min.js"></script>
<script src="../core/data.js"></script>
<script src="../core/boot.js"></script>
<script src="../core/nav.js"></script>
<script src="../core/companies.js"></script>
<script src="../core/faq.js"></script>
<script src="../core/theme.js"></script>
${js.map((s) => `<script${s.mod ? ' type="module"' : ''} src="${s.src}"></script>`).join('\n')}
</body>
</html>
`;

  const dir = `v${n}-${slug(title)}`;
  fs.mkdirSync(path.join(SITE, dir), { recursive: true });
  fs.writeFileSync(path.join(SITE, dir, 'index.html'), html);
  return { n, dir, title, pick, missing: [...new Set(missing)] };
}

const built = M.variants.map(page);
fs.writeFileSync(path.join(SITE, 'tools/built.json'), JSON.stringify(built, null, 2));

const gaps = new Set(built.flatMap((b) => b.missing));
console.log(`wrote ${built.length} variants`);
if (gaps.size) {
  console.log(`\nnot on disk yet (${gaps.size}):`);
  [...gaps].sort().forEach((g) => console.log('  ' + g));
} else {
  console.log('every module is on disk');
}
