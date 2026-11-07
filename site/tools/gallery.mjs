/* The review page: every variant, what it is made of, and whether its parts are
   on disk yet. Written from tools/built.json so it can never disagree with what
   the generator actually produced. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = JSON.parse(fs.readFileSync(path.join(SITE, 'tools/built.json'), 'utf8'));
const SLOTS = [['heroes', 'Hero'], ['value', 'Value'], ['journey', 'Journey'], ['features', 'Features'], ['footer', 'Footer']];

const rows = built.map((b) => {
  const parts = SLOTS.map(([k, label]) => `<div class="g-part"><span class="g-slot">${label}</span><span>${b.pick[k].name}</span></div>`).join('');
  const ready = b.missing.length === 0;
  return `<li class="g-card${ready ? '' : ' is-waiting'}">
    <a class="g-open" href="${b.dir}/">
      <span class="g-n">${b.n}</span>
      <h2>${b.title}</h2>
    </a>
    <div class="g-parts">${parts}</div>
    <p class="g-brands"><a href="${b.dir}/?brand=colour">Colour</a><a href="${b.dir}/?brand=mono">Mono</a></p>
    ${ready ? '' : `<p class="g-missing">waiting on ${b.missing.map((m) => m.split('/').pop()).join(', ')}</p>`}
  </li>`;
}).join('\n');

const readyCount = built.filter((b) => !b.missing.length).length;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klaket landing: 24 directions</title>
<meta name="robots" content="noindex">
<link rel="icon" href="../brand/favicon.svg" type="image/svg+xml">
<script>try{var q=new URLSearchParams(location.search).get('brand');var b=q||localStorage.getItem('klaket.brand');if(b==='mono')document.documentElement.setAttribute('data-brand','mono')}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600&display=swap">
<link rel="stylesheet" href="core/tokens.css">
<link rel="stylesheet" href="core/base.css">
<link rel="stylesheet" href="core/theme.css">
<style>
  body { padding: clamp(2rem, 6vh, 4rem) 0 6rem; }
  .g-head { margin-bottom: clamp(2rem, 5vh, 3rem); }
  .g-head p { color: var(--muted); max-width: 62ch; margin-top: 1rem; }
  .g-links { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.5rem; }
  .g-links a { font-size: var(--t-sm); padding: 0.5em 0.9em; border-radius: var(--r-pill); box-shadow: inset 0 0 0 1px var(--line-2); color: var(--muted); }
  .g-links a:hover { color: var(--text); }
  .g-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
  .g-card { background: var(--surface); border-radius: var(--r); padding: 1.1rem 1.2rem 1.2rem; box-shadow: inset 0 0 0 1px var(--line); }
  .g-card.is-waiting { opacity: 0.55; }
  .g-open { display: flex; align-items: baseline; gap: 0.7rem; }
  .g-open:hover h2 { color: var(--accent); }
  .g-n { font-family: var(--mono); font-size: var(--t-xs); color: var(--faint); letter-spacing: 0.1em; }
  .g-card h2 { font-size: var(--t-lg); line-height: 1.2; transition: color var(--d-fast) var(--e-out); }
  .g-parts { margin-top: 0.9rem; display: grid; gap: 0.3rem; }
  .g-part { display: flex; gap: 0.7rem; font-size: var(--t-sm); color: var(--muted); }
  .g-slot { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); width: 5.5em; flex: none; }
  .g-brands { margin-top: 0.9rem; display: flex; gap: 0.4rem; }
  .g-brands a {
    font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.45em 0.8em; border-radius: var(--r-pill); color: var(--muted);
    box-shadow: inset 0 0 0 1px var(--line-2); transition: color 140ms, background-color 140ms;
  }
  .g-brands a:hover { color: var(--text); background: color-mix(in srgb, var(--text) 8%, transparent); }
  .g-missing { margin-top: 0.8rem; font-family: var(--mono); font-size: var(--t-xs); color: var(--signal); }
  .g-note { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); color: var(--faint); font-size: var(--t-sm); max-width: 70ch; }
</style>
</head>
<body>
<div class="wrap">
  <header class="g-head">
    <h1>24 directions</h1>
    <p>Every page below is a complete landing page in Klaket's identity. They share one engine and one set of words, and differ in the five slots listed on each card, so what you are judging is the direction, not the copy. ${readyCount} of ${built.length} have all their parts on disk.</p>
    <p>Each one comes in two readings of the same identity. <b>Colour</b> is teal, ink, paper and signal red. <b>Mono</b> is black and white with signal red as the only colour left. Open either from the card, or switch inside any page with the dock at the bottom right. Keys: <b>b</b> switches brand, <b>[</b> and <b>]</b> step through the directions.</p>
    <nav class="g-links" aria-label="Other pages">
      <a href="demo/">Request demo page</a>
      <a href="blog/">Journal</a>
      <a href="sections/_preview-value.html">Value treatments</a>
      <a href="sections/_preview-features.html">Features treatments</a>
      <a href="sections/_preview-footer.html">Footer treatments</a>
      <a href="heroes/_preview-h345.html">Heroes 3 to 5</a>
      <a href="heroes/_preview-h678.html">Heroes 6 to 8</a>
      <a href="../landing/">The previous site</a>
    </nav>
  </header>
  <ul class="g-grid">
${rows}
  </ul>
  <p class="g-note">The company names in the trust strip are placeholders and must be replaced before anyone outside the team sees these. Grep PLACEHOLDER-COMPANIES.</p>
</div>
<script src="core/theme.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(SITE, 'index.html'), html);
console.log(`gallery written, ${readyCount}/${built.length} variants complete`);
