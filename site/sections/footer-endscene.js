/* Footer Ft3: facts, links, and the last frame.
   The chips are checkable claims, not decoration: the typefaces are the four the
   page actually links, the versions are read off the headers of the files in
   docs/site/vendor/, and the date is written out because there is no build step
   to stamp one. If any of that stops being true, this list is wrong and should
   be corrected rather than quietly dropped. */
(function () {
  const WORDMARK = '../../brand/klaket-wordmark-cream.svg';

  const FACTS = [
    'No build step',
    'Cairo 700, 900',
    'IBM Plex Sans',
    'IBM Plex Sans Arabic',
    'IBM Plex Mono 500',
    'GSAP 3.13.0',
    'ScrollTrigger 3.13.0',
    'Lenis 1.3.4',
    'Vendored libraries',
    '2026-11-07',
  ];

  /* The clapper bar of the slate lying against the cases: the one place on this
     page the 45 degree stripes appear, drawn small enough to read as a prop. */
  function stripes(x, y, w, h, n) {
    let d = '';
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const a = x + i * step;
      d += `M${a} ${y}h${(step / 2).toFixed(1)}l${-h} ${h}h${(-step / 2).toFixed(1)}z`;
    }
    return d;
  }

  /* A stage after wrap. One lamp is still burning, everything else is struck and
     stacked. Nothing essential sits above y=185: wide viewports crop the top. */
  const SCENE = `
    <defs>
      <linearGradient id="fend-cyc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-g-deep" stop-opacity=".95"/>
        <stop offset="1" class="s-g-deep" stop-opacity=".4"/>
      </linearGradient>
      <radialGradient id="fend-wash" cx=".41" cy=".74" r=".46">
        <stop offset="0" class="s-g-teal" stop-opacity=".6"/>
        <stop offset="1" class="s-g-teal" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="fend-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-g-ink"/>
        <stop offset="1" class="s-g-night"/>
      </linearGradient>
      <radialGradient id="fend-soft">
        <stop offset="0" class="s-g-paper" stop-opacity=".5"/>
        <stop offset="1" class="s-g-paper" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fend-pool">
        <stop offset="0" class="s-g-paper" stop-opacity=".17"/>
        <stop offset="1" class="s-g-paper" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="1600" height="420" class="s-night"/>
    <rect width="1600" height="300" fill="url(#fend-cyc)"/>
    <rect width="1600" height="420" fill="url(#fend-wash)"/>
    <rect y="300" width="1600" height="120" fill="url(#fend-floor)"/>
    <path class="s-rig" opacity=".22" d="M0 300 H1600"/>
    <ellipse cx="662" cy="332" rx="300" ry="42" fill="url(#fend-pool)"/>

    <g class="s-rig" opacity=".28">
      <path d="M176 292 V238 M176 292 l-14 16 M176 292 l14 16"/>
      <path d="M1178 292 V246 M1178 292 l-13 15 M1178 292 l13 15"/>
    </g>

    <g class="s-shadow" opacity=".8">
      <ellipse cx="258" cy="304" rx="78" ry="7"/>
      <ellipse cx="432" cy="304" rx="62" ry="6"/>
      <ellipse cx="792" cy="304" rx="86" ry="7"/>
      <ellipse cx="946" cy="305" rx="118" ry="8"/>
      <ellipse cx="1012" cy="303" rx="70" ry="6"/>
      <ellipse cx="1118" cy="303" rx="64" ry="6"/>
      <ellipse cx="1256" cy="304" rx="96" ry="7"/>
      <ellipse cx="1436" cy="304" rx="104" ry="8"/>
    </g>

    <rect x="268" y="272" width="64" height="28" rx="3" class="s-solid"/>
    <rect x="268" y="272" width="64" height="28" rx="3" class="s-rig"/>
    <path class="s-solid" d="M430 300 q10 -26 30 -26 q20 0 30 26 z"/>

    <g>
      <ellipse id="fend-halo" cx="672" cy="214" rx="150" ry="130" fill="url(#fend-soft)" opacity=".55"/>
      <path class="s-rig" d="M620 300 V236 M620 300 l-26 34 M620 300 l26 34 M620 300 V334"/>
      <rect x="592" y="192" width="54" height="44" rx="6" class="s-solid"/>
      <rect x="592" y="192" width="54" height="44" rx="6" class="s-rig"/>
      <rect x="646" y="200" width="12" height="28" rx="3" class="s-glow" id="fend-lamp" opacity=".82"/>
      <circle cx="604" cy="246" r="4" class="s-standby"/>
    </g>

    <g class="s-rig"><path d="M770 300 L806 212 M806 300 L770 212 M776 256 H800"/></g>

    <rect x="848" y="252" width="118" height="48" rx="6" class="s-solid"/>
    <rect x="848" y="252" width="118" height="48" rx="6" class="s-rig"/>
    <rect x="864" y="216" width="86" height="36" rx="5" class="s-solid"/>
    <rect x="864" y="216" width="86" height="36" rx="5" class="s-rig"/>

    <g transform="rotate(-12 1002 272)">
      <rect x="974" y="244" width="56" height="56" rx="3" class="s-slate"/>
      <rect x="974" y="244" width="56" height="13" class="s-bar"/>
      <path class="s-slate" d="${stripes(976, 244, 52, 13, 4)}"/>
    </g>

    <ellipse cx="1118" cy="292" rx="26" ry="10" class="s-rig"/>
    <ellipse cx="1118" cy="292" rx="12" ry="5" class="s-rig"/>

    <path class="s-rig" d="M1212 300 L1298 198"/>
    <ellipse cx="1306" cy="193" rx="15" ry="8" transform="rotate(-50 1306 193)" class="s-solid"/>
    <ellipse cx="1306" cy="193" rx="15" ry="8" transform="rotate(-50 1306 193)" class="s-rig"/>

    <path class="s-rig" d="M1400 300 V206 M1400 300 l-28 34 M1400 300 l28 34 M1400 232 H1446"/>
    <rect x="1446" y="204" width="56" height="42" rx="3" class="s-solid"/>
    <rect x="1446" y="204" width="56" height="42" rx="3" class="s-rig"/>

    <g class="s-mote" opacity=".3">
      ${[[540, 262, 2.4], [702, 224, 2], [778, 196, 2.6], [886, 242, 2], [1048, 210, 2.4], [1164, 250, 2]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}
    </g>`;

  function build() {
    const root = document.querySelector('.fend');
    const D = window.KLDATA;
    if (!root || !D) return;

    root.innerHTML = `
      <div class="fend__top wrap">
        <h2 class="fend__cta">${D.footer.cta}</h2>
        <p class="fend__sub">${D.footer.ctaSub}</p>
        <a class="btn" href="${D.hero.primary.href}">${D.hero.primary.label}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>

      <ul class="fend__chips wrap" aria-label="How this page is built">
        ${FACTS.map((f) => `<li>${f}</li>`).join('')}
      </ul>

      <div class="fend__mid wrap">
        <div class="fend__cols">
          <div class="fend__brand-cell">
            <a class="fend__brand" href="#top"><img src="${WORDMARK}" alt="Klaket" width="124" height="78" decoding="async"></a>
            <p class="fend__ar ar" dir="rtl" lang="ar">${D.hero.sloganAr}</p>
          </div>
          ${D.footer.columns.map((c) => `
            <nav class="fend__col" aria-label="${c.title}">
              <h4>${c.title}</h4>
              <ul>${c.links.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
            </nav>`).join('')}
        </div>
        <p class="fend__legal">${D.footer.legal}</p>
      </div>

      <div class="fend__scene" aria-hidden="true">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">${SCENE}</svg>
      </div>`;

    const g = window.KL && KL.gsap;
    if (!g || KL.reduced) return;    /* reduced motion keeps the frame, loses the breath */

    /* Two slow tweens and nothing else: a wrapped set should look still. */
    const anims = [
      g.to(root.querySelector('#fend-lamp'), { opacity: 1, duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      g.to(root.querySelector('#fend-halo'), { opacity: 0.82, duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      g.to(root.querySelectorAll('.s-mote circle'), {
        y: -16, x: 7, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1,
        stagger: { each: 1.3, from: 'random' },
      }),
    ];

    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => anims.forEach((a) => (self.isActive ? a.play() : a.pause())),
    });

    KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
