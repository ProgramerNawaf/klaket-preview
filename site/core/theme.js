/* The brand switch and the way through the 24.

   Two brands, one identity: 'colour' is teal, ink, paper and signal; 'mono' is
   black and white with signal as the only colour left. The choice is kept per
   browser and applied before the first paint by the inline script in each
   page's head, so the page never flashes the other brand.

   Switching reloads. CSS tokens would swap live, but the clapperboard textures
   are painted into a canvas and the 3D materials are built once at load, so a
   live swap would leave half the page in the old brand. A reload is the only
   version of this that is honestly correct, and the scroll position is put back
   so it reads as a switch rather than a navigation. */
(function () {
  const KEY = 'klaket.brand';
  const POS = 'klaket.scroll';
  const BRANDS = [
    { id: 'colour', label: 'Colour' },
    { id: 'mono', label: 'Mono' },
  ];

  const SITE = new URL('..', document.currentScript.src).href;
  const current = () => document.documentElement.getAttribute('data-brand') === 'mono' ? 'mono' : 'colour';

  function setBrand(id) {
    if (id === current()) return;
    try {
      localStorage.setItem(KEY, id);
      sessionStorage.setItem(POS, String(window.scrollY));
    } catch (e) { /* private mode: the switch still works, it just forgets */ }
    /* A ?brand= in the address overrides the saved choice on load, so it has to
       be rewritten here or the dock would look stuck on the pinned brand. */
    const url = new URL(location.href);
    if (url.searchParams.has('brand')) {
      url.searchParams.set('brand', id);
      location.href = url.href;
    } else {
      location.reload();
    }
  }

  /* Put the reader back where they were, once, after a brand switch. */
  function restore() {
    let y = null;
    try { y = sessionStorage.getItem(POS); sessionStorage.removeItem(POS); } catch (e) { return; }
    if (y === null) return;
    const to = parseInt(y, 10);
    if (!to) return;
    const go = () => {
      if (window.KL && KL.lenis) KL.lenis.scrollTo(to, { immediate: true });
      else window.scrollTo(0, to);
    };
    go();
    /* Pinned sections settle after their first measure, so land it twice. */
    requestAnimationFrame(() => setTimeout(go, 120));
  }

  async function variants() {
    try {
      const list = await fetch(SITE + 'tools/built.json').then((r) => (r.ok ? r.json() : null));
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  async function build() {
    const dock = document.createElement('div');
    dock.className = 'kldock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', 'Review controls');

    const list = await variants();
    const here = decodeURIComponent(location.pathname).replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
    const i = list.findIndex((v) => here.endsWith('/' + v.dir + '/'));
    const prev = i > 0 ? list[i - 1] : null;
    const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;

    const nav = i >= 0 ? `
      <button type="button" class="kldock__prev" ${prev ? '' : 'disabled'} aria-label="Previous direction">&#8592;</button>
      <span class="kldock__n" aria-label="Direction ${list[i].n} of ${list.length}">${list[i].n}/${list.length}</span>
      <button type="button" class="kldock__next" ${next ? '' : 'disabled'} aria-label="Next direction">&#8594;</button>
      <span class="kldock__sep" aria-hidden="true"></span>` : '';

    dock.innerHTML = `
      ${nav}
      ${BRANDS.map((b) => `<button type="button" data-brand-set="${b.id}" aria-pressed="${current() === b.id}">${b.label}</button>`).join('')}
      <span class="kldock__sep" aria-hidden="true"></span>
      <a href="${SITE}" class="kldock__title">All</a>
      <button type="button" class="kldock__fold" aria-label="Hide the review controls" title="Hide">&#8942;</button>`;

    document.body.appendChild(dock);

    dock.querySelectorAll('[data-brand-set]').forEach((b) => {
      b.addEventListener('click', () => setBrand(b.dataset.brandSet));
    });
    const go = (v) => { if (v) location.href = SITE + v.dir + '/'; };
    const pb = dock.querySelector('.kldock__prev'), nb = dock.querySelector('.kldock__next');
    if (pb) pb.addEventListener('click', () => go(prev));
    if (nb) nb.addEventListener('click', () => go(next));

    const fold = dock.querySelector('.kldock__fold');
    fold.addEventListener('click', () => {
      const folded = dock.classList.toggle('is-folded');
      fold.setAttribute('aria-label', folded ? 'Show the review controls' : 'Hide the review controls');
      try { localStorage.setItem('klaket.dock', folded ? 'folded' : 'open'); } catch (e) {}
    });
    try { if (localStorage.getItem('klaket.dock') === 'folded') dock.classList.add('is-folded'); } catch (e) {}

    /* b switches brand, square brackets step through the directions. Ignored
       while someone is typing, so the demo form is unaffected. */
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return;
      if (e.key === 'b') setBrand(current() === 'mono' ? 'colour' : 'mono');
      if (e.key === '[') go(prev);
      if (e.key === ']') go(next);
    });
  }

  restore();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
