/* Footer Ft2: the ask, the giant slogan, the aperture.
   The halftone edge is generated rather than drawn: a hex packed grid of dots
   over the ring outside the solid core, each dot shrinking with distance, all of
   them white inside one mask. A real halftone works exactly this way, and doing
   it in mask space means the dots scale with the aperture instead of with the
   page, so 390px gets the same picture as 2560px. */
(function () {
  const WORDMARK = '../../brand/klaket-wordmark-cream.svg';

  /* mask geometry, in the aperture's own 1000 unit square */
  const CX = 500, CY = 500, CORE = 300, EDGE = 496, PITCH = 30;

  function halftone() {
    const start = CORE - PITCH * 0.5;          // dots overlap the core so there is no seam
    const rmax = PITCH * 0.54;                 // wider than half the pitch: they fuse at the inside
    const step = PITCH * 0.866;                // hex packing reads smoother than a square grid
    let d = '';
    let row = 0;
    for (let y = CY - EDGE; y <= CY + EDGE; y += step, row++) {
      const off = row % 2 ? PITCH / 2 : 0;
      for (let x = CX - EDGE + off; x <= CX + EDGE; x += PITCH) {
        const dist = Math.hypot(x - CX, y - CY);
        if (dist < start || dist > EDGE) continue;
        const u = (dist - start) / (EDGE - start);
        const r = rmax * Math.pow(1 - u, 1.15);
        if (r < 0.4) continue;
        const rr = r.toFixed(2), dd = (r * 2).toFixed(2);
        d += `M${x.toFixed(1)} ${y.toFixed(1)}m-${rr} 0a${rr} ${rr} 0 1 0 ${dd} 0a${rr} ${rr} 0 1 0 -${dd} 0`;
      }
    }
    return d;
  }

  /* The thing behind the aperture: a set at the end of a lighting setup, drawn
     flat. Colours come from the stylesheet, so no hex lives in here. */
  const SET = `
    <rect width="1000" height="1000" class="a-sky"/>
    <rect width="1000" height="560" class="a-wall" opacity=".5"/>
    <rect y="560" width="1000" height="440" class="a-floor"/>
    <ellipse cx="500" cy="624" rx="430" ry="62" class="a-glow" opacity=".05"/>
    <path class="a-beam" d="M398 334 L452 298 L870 606 L596 648 Z"/>
    <path class="a-rig" opacity=".35" d="M0 560 H1000"/>

    <g class="a-rig">
      <path d="M380 330 V700 M380 700 L333 762 M380 700 L427 762 M380 700 V758"/>
    </g>
    <g transform="rotate(-17 380 320)">
      <rect x="332" y="283" width="96" height="74" rx="7" class="a-glow" opacity=".88"/>
      <rect x="332" y="283" width="96" height="74" rx="7" class="a-rig"/>
    </g>

    <g class="a-rig" opacity=".5">
      <path d="M120 804 H880 M120 832 H880 M190 804 V832 M330 804 V832 M470 804 V832 M610 804 V832 M750 804 V832"/>
    </g>

    <rect x="148" y="642" width="124" height="72" rx="7" class="a-solid"/>
    <rect x="148" y="642" width="124" height="72" rx="7" class="a-rig"/>
    <circle cx="430" cy="744" r="27" class="a-rig"/>
    <circle cx="430" cy="744" r="13" class="a-rig"/>

    <g>
      <path class="a-rig" d="M620 700 L574 792 M620 700 L666 792 M620 700 V646"/>
      <rect x="586" y="600" width="70" height="46" rx="6" class="a-solid"/>
      <rect x="586" y="600" width="70" height="46" rx="6" class="a-rig"/>
      <rect x="556" y="608" width="34" height="26" rx="5" class="a-solid"/>
      <rect x="556" y="608" width="34" height="26" rx="5" class="a-rig"/>
      <circle cx="622" cy="578" r="19" class="a-solid"/>
      <circle cx="622" cy="578" r="19" class="a-rig"/>
      <circle cx="668" cy="594" r="7" class="a-tally"/>
    </g>

    <g class="a-solid">
      <circle cx="752" cy="516" r="21"/>
      <path d="M728 546 h48 l11 152 h-23 l-12 -88 -12 88 h-23 z"/>
      <circle cx="818" cy="528" r="18"/>
      <path d="M798 554 h40 l9 144 h-20 l-9 -82 -9 82 h-20 z"/>
    </g>`;

  function build() {
    const root = document.querySelector('.fmarq');
    const D = window.KLDATA;
    if (!root || !D) return;

    const phrase = D.hero.slogan.toUpperCase();
    const word = `<span class="fmarq__word">${phrase}</span>`;

    root.innerHTML = `
      <div class="wrap">
        <div class="fmarq__panel" data-reveal="up">
          <div>
            <h2 class="fmarq__cta-title">${D.footer.cta}</h2>
            <p class="fmarq__cta-sub">${D.footer.ctaSub}</p>
          </div>
          <a class="btn" href="${D.hero.primary.href}">${D.hero.primary.label}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>

      <div class="fmarq__band" aria-hidden="true">
        <div class="fmarq__track">${word}${word}${word}${word}</div>
      </div>

      <div class="fmarq__plate">
        <div class="fmarq__ap" aria-hidden="true">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="fmarq-beam" x1="0.2" y1="0" x2="0.9" y2="1">
                <stop offset="0" class="g-near" stop-opacity=".2"/>
                <stop offset="1" class="g-far" stop-opacity="0"/>
              </linearGradient>
              <mask id="fmarq-aperture" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
                <circle cx="${CX}" cy="${CY}" r="${CORE}" fill="white"/>
                <path fill="white" d="${halftone()}"/>
              </mask>
            </defs>
            <g mask="url(#fmarq-aperture)">${SET}</g>
          </svg>
        </div>

        <div class="fmarq__over wrap">
          <div class="fmarq__cols">
            <div class="fmarq__brand-cell">
              <a class="fmarq__brand" href="#top"><img src="${WORDMARK}" alt="Klaket" width="132" height="83" decoding="async"></a>
              <p class="fmarq__ar ar" dir="rtl" lang="ar">${D.hero.sloganAr}</p>
            </div>
            ${D.footer.columns.map((c) => `
              <nav class="fmarq__col" aria-label="${c.title}">
                <h4>${c.title}</h4>
                <ul>${c.links.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
              </nav>`).join('')}
          </div>
          <div class="fmarq__legal">
            <span>${D.footer.legal}</span>
          </div>
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    if (!g || KL.reduced) return;      /* reduced motion keeps the type, loses the travel */

    const track = root.querySelector('.fmarq__track');
    const SPEED = 72;                  // px per second: big type wants a slow hand

    /* Two identical halves, so a 50% translate lands exactly on the seam. The
       count is measured rather than guessed, or a wide screen runs out of words. */
    function layout() {
      const one = track.firstElementChild.getBoundingClientRect().width;
      const need = Math.max(2, Math.ceil(window.innerWidth / one) + 1);
      if (track.children.length !== need * 2) track.innerHTML = word.repeat(need * 2);
      return track.scrollWidth / 2;
    }

    const run = g.to(track, { xPercent: -50, duration: layout() / SPEED, ease: 'none', repeat: -1 });

    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? run.play() : run.pause()),
      onRefresh: () => run.duration(layout() / SPEED),
    });

    KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
