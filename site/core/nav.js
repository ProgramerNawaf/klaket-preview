/* The island nav. Builds itself from KLDATA.nav so every variant gets the same
   menu, and morphs between a pill and a card: the shell's width and radius
   tween while the panel's height opens, which is one animation the eye reads as
   the pill growing rather than two things moving at once. */
(function () {
  const D = window.KLDATA;
  /* Pages sit at different depths (/site/v01-x/, /site/blog/, /site/blog/post/),
     so a fixed number of ../ is wrong somewhere. This script always lives at
     <site>/core/nav.js, which makes its own URL the one reliable anchor. */
  const SITE = new URL('..', document.currentScript.src).href;
  const MARK = new URL('../brand/klaket-mark-on-dark.svg', SITE).href;

  /* The stills behind the menu. Drawn, not photographed: they stay sharp at any
     size, cost nothing to load, and never go stale when the app's UI moves on. */
  const STILLS = {
    thread: `<svg viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" fill="var(--bg-deep)"/>
      ${[0,1,2].map((i) => `<g opacity="${0.35 + i * 0.3}">
        <rect x="${26 + i * 10}" y="${28 + i * 54}" width="${150 + i * 28}" height="40" rx="12" fill="var(--raised)"/>
        <rect x="${40 + i * 10}" y="${42 + i * 54}" width="${90 + i * 22}" height="5" rx="2.5" fill="var(--muted)"/>
        <rect x="${40 + i * 10}" y="${54 + i * 54}" width="${58 + i * 14}" height="5" rx="2.5" fill="var(--faint)"/>
      </g>`).join('')}
      <circle cx="286" cy="186" r="4" fill="var(--signal)"/><circle cx="272" cy="186" r="4" fill="var(--signal)" opacity=".6"/><circle cx="258" cy="186" r="4" fill="var(--signal)" opacity=".3"/>
    </svg>`,

    route: `<svg viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" fill="var(--bg-deep)"/>
      <path d="M24 176 C 90 176, 86 96, 150 96 S 230 44, 296 44" fill="none" stroke="var(--teal)" stroke-width="22" stroke-linecap="round" opacity=".35"/>
      <path d="M24 176 C 90 176, 86 96, 150 96 S 230 44, 296 44" fill="none" stroke="var(--teal-tint)" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 7"/>
      ${[[24,176],[150,96],[296,44]].map(([x,y],i) => `<circle cx="${x}" cy="${y}" r="7" fill="var(--ink)" stroke="var(--teal-tint)" stroke-width="2"/><text x="${x}" y="${y + 3}" font-family="monospace" font-size="7" fill="var(--teal-tint)" text-anchor="middle">${i + 1}</text>`).join('')}
    </svg>`,

    callsheet: `<svg viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" fill="var(--bg-deep)"/>
      <rect x="54" y="18" width="212" height="196" rx="6" fill="var(--paper)"/>
      <rect x="54" y="18" width="212" height="26" rx="6" fill="var(--teal)"/>
      <rect x="66" y="28" width="62" height="7" rx="3.5" fill="var(--paper)" opacity=".9"/>
      <rect x="226" y="28" width="28" height="7" rx="3.5" fill="var(--paper)" opacity=".55"/>
      ${Array.from({length: 8}, (_, i) => `<g opacity="${i > 5 ? 0.3 : 1}">
        <rect x="66" y="${58 + i * 18}" width="${i % 3 === 0 ? 34 : 24}" height="6" rx="3" fill="var(--teal)" opacity=".55"/>
        <rect x="112" y="${58 + i * 18}" width="${132 - (i % 4) * 26}" height="6" rx="3" fill="var(--ink)" opacity=".35"/>
      </g>`).join('')}
    </svg>`,

    slate: `<svg viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" fill="var(--bg-deep)"/>
      <defs><pattern id="nv-st" width="28" height="28" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="14" height="28" fill="var(--paper)"/><rect x="14" width="14" height="28" fill="var(--ink)"/>
      </pattern></defs>
      <rect x="62" y="56" width="196" height="118" rx="8" fill="var(--teal)"/>
      <rect x="62" y="34" width="196" height="24" rx="5" fill="url(#nv-st)"/>
      ${[0,1].map((r) => [0,1,2].map((c) => `<g>
        <rect x="${78 + c * 60}" y="${80 + r * 42}" width="${26 - c * 4}" height="5" rx="2.5" fill="var(--paper)" opacity=".5"/>
        <rect x="${78 + c * 60}" y="${92 + r * 42}" width="${44 - c * 6}" height="8" rx="2" fill="var(--paper)" opacity=".85"/>
      </g>`).join('')).join('')}
    </svg>`,

    journal: `<svg viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" fill="var(--bg-deep)"/>
      <rect x="40" y="30" width="240" height="160" rx="6" fill="var(--surface)"/>
      <rect x="60" y="52" width="118" height="12" rx="4" fill="var(--paper)" opacity=".9"/>
      ${Array.from({length: 6}, (_, i) => `<rect x="60" y="${84 + i * 15}" width="${200 - (i % 3) * 44}" height="5" rx="2.5" fill="var(--muted)" opacity="${0.5 - i * 0.05}"/>`).join('')}
      <rect x="60" y="178" width="38" height="4" rx="2" fill="var(--teal-tint)"/>
    </svg>`,
  };

  function build() {
    const nav = document.querySelector('.island');
    if (!nav || !D) return;

    const items = D.nav;
    nav.innerHTML = `
      <div class="island__shell">
        <div class="island__bar">
          <a class="island__brand" href="#top" aria-label="Klaket, home">
            ${KL.mark(22, '')}
            <span>KLAKET</span>
          </a>
          <button class="island__toggle" type="button" aria-expanded="false" aria-controls="island-panel">
            <span class="island__icon" aria-hidden="true"><i></i><i></i></span>
            <span class="island__toggle-label">Menu</span>
          </button>
          <a class="btn island__cta" href="${D.hero.primary.href}">${D.hero.primary.label}</a>
        </div>
        <div class="island__panel" id="island-panel">
          <div>
            <ul class="island__list">
              ${items.map((it, i) => `<li><a class="island__link" data-i="${i}" href="${it.href || '#' + it.id}">${it.label}</a></li>`).join('')}
            </ul>
            <div class="island__minor">
              <a href="${D.hero.secondary.href}">${D.hero.secondary.label}</a>
            </div>
          </div>
          <div class="island__still">
            ${items.map((it, i) => `<figure class="${i === 0 ? 'is-on' : ''}" data-i="${i}">${STILLS[it.still] || ''}</figure>`).join('')}
            <figcaption class="island__caption"><b>0${1}</b><span>${items[0].caption}</span></figcaption>
          </div>
        </div>
      </div>`;

    const shell   = nav.querySelector('.island__shell');
    const panel   = nav.querySelector('.island__panel');
    const toggle  = nav.querySelector('.island__toggle');
    const label   = nav.querySelector('.island__toggle-label');
    const links   = [...nav.querySelectorAll('.island__link')];
    const figures = [...nav.querySelectorAll('.island__still figure')];
    const capNum  = nav.querySelector('.island__caption b');
    const capTxt  = nav.querySelector('.island__caption span');

    /* Only now does the panel collapse: without JS it stays open and usable. */
    nav.classList.add('island--ready');
    panel.setAttribute('inert', '');

    const g = window.KL && KL.gsap;
    let open = false;

    function openWidth() {
      // The card is as wide as it needs to be, capped by the viewport.
      return Math.min(window.innerWidth - parseFloat(getComputedStyle(document.documentElement).fontSize) * 2, 700);
    }

    function setOpen(next) {
      if (next === open) return;
      open = next;
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close' : 'Menu';

      if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');

      if (!g || (window.KL && KL.reduced)) {
        panel.style.height = open ? 'auto' : '0';
        panel.style.paddingBlock = open ? '1rem' : '0';
        shell.style.borderRadius = open ? 'var(--r-lg)' : 'var(--r-pill)';
        shell.style.width = open ? openWidth() + 'px' : '';
        return;
      }

      const barW = nav.querySelector('.island__bar').scrollWidth + 16;
      const from = shell.getBoundingClientRect().width;
      const to = open ? openWidth() : barW;

      g.killTweensOf([shell, panel, links]);
      g.fromTo(shell, { width: from }, {
        width: to,
        borderRadius: open ? 20 : 999,
        duration: 0.62,
        ease: open ? 'power3.out' : 'power3.inOut',
        onComplete: () => { if (!open) shell.style.width = ''; },
      });
      g.to(panel, {
        height: open ? 'auto' : 0,
        paddingTop: open ? 16 : 0,
        paddingBottom: open ? 16 : 0,
        duration: 0.62,
        ease: open ? 'power3.out' : 'power3.inOut',
      });
      if (open) {
        g.fromTo(links, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, delay: 0.1, ease: 'power3.out' });
      }
    }

    function show(i) {
      figures.forEach((f, j) => f.classList.toggle('is-on', i === j));
      links.forEach((l, j) => l.classList.toggle('is-active', i === j));
      capNum.textContent = String(i + 1).padStart(2, '0');
      capTxt.textContent = D.nav[i].caption;
    }

    toggle.addEventListener('click', () => setOpen(!open));
    links.forEach((l, i) => {
      l.addEventListener('pointerenter', () => show(i));
      l.addEventListener('focus', () => show(i));
      l.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('pointerdown', (e) => {
      if (open && !nav.contains(e.target)) setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (open && g) g.set(shell, { width: openWidth() });
    });

    /* A thin state change once past the fold, so the island reads as chrome. */
    /* A menu item pointing at a section this page does not have would silently
       do nothing, so it is re-aimed at the site root, which does have it. */
    links.forEach((a) => {
      const href = a.getAttribute('href');
      if (href.startsWith('#') && !document.querySelector(href)) a.setAttribute('href', SITE + href);
    });

    const mark = () => nav.classList.toggle('is-stuck', window.scrollY > 40);
    mark();
    (window.KL && KL.onScroll ? KL.onScroll(mark) : window.addEventListener('scroll', mark, { passive: true }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
