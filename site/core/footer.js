/* The footer shot: camera, tape, screen.
   The tape is one strip drawn twice and translated by exactly half its width, so
   the loop has no seam. The reels turn at the speed the tape travels, which is
   the whole trick: a camera whose reels turn at a different rate than its film
   reads as a cartoon. */
(function () {
  /* Same reasoning as core/nav.js: resolve against this script, not the page. */
  const SITE = new URL('..', document.currentScript.src).href;
  const MARK = new URL('../brand/klaket-mark-on-dark.svg', SITE).href;

  /* A side-on film camera: body, lens, two magazines. Drawn flat, in the four
     colours, so it sits beside the mark without competing with it. */
  const CAMERA = `
    <svg viewBox="0 0 200 150" class="foot__camera" aria-hidden="true">
      <g fill="none" stroke="var(--teal-tint)" stroke-width="2.4" stroke-linejoin="round">
        <rect x="52" y="74" width="96" height="52" rx="6" fill="var(--surface)"/>
        <path d="M148 88 L178 76 L178 124 L148 112 Z" fill="var(--teal)" fill-opacity=".45"/>
        <rect x="26" y="88" width="28" height="26" rx="4" fill="var(--surface)"/>
        <path d="M26 101 H10"/>
        <g class="reel"><circle cx="74" cy="48" r="26" fill="var(--ink)"/><circle cx="74" cy="48" r="6" fill="none"/>
          <path d="M74 22 V34 M74 62 V74 M48 48 H60 M88 48 H100 M56 30 L64 38 M84 58 L92 66 M92 30 L84 38 M64 58 L56 66"/></g>
        <g class="reel"><circle cx="126" cy="48" r="26" fill="var(--ink)"/><circle cx="126" cy="48" r="6" fill="none"/>
          <path d="M126 22 V34 M126 62 V74 M100 48 H112 M140 48 H152 M108 30 L116 38 M136 58 L144 66 M144 30 L136 38 M116 58 L108 66"/></g>
        <path d="M74 74 V66 M126 74 V66"/>
        <rect x="64" y="126" width="18" height="20" rx="3" fill="var(--surface)"/>
      </g>
      <circle cx="40" cy="80" r="3.5" fill="var(--signal)"/>
    </svg>`;

  /* One frame of tape: perforations top and bottom, a picture between them. */
  function frame(i) {
    const W = 108, H = 120;
    const holes = (y) => Array.from({ length: 5 }, (_, k) =>
      `<rect x="${9 + k * 20}" y="${y}" width="10" height="8" rx="2" fill="var(--bg-deep)"/>`).join('');
    const pics = [
      `<rect x="12" y="34" width="84" height="52" rx="2" fill="var(--teal)"/><rect x="20" y="46" width="42" height="5" rx="2.5" fill="var(--paper)" opacity=".8"/><rect x="20" y="58" width="60" height="4" rx="2" fill="var(--paper)" opacity=".35"/>`,
      `<rect x="12" y="34" width="84" height="52" rx="2" fill="var(--raised)"/><circle cx="54" cy="60" r="15" fill="none" stroke="var(--teal-tint)" stroke-width="2"/><circle cx="54" cy="60" r="4" fill="var(--teal-tint)"/>`,
      `<rect x="12" y="34" width="84" height="52" rx="2" fill="var(--paper)"/>${Array.from({length:4},(_,k)=>`<rect x="22" y="${44+k*11}" width="${62-k*9}" height="4" rx="2" fill="var(--ink)" opacity=".4"/>`).join('')}`,
      `<rect x="12" y="34" width="84" height="52" rx="2" fill="var(--teal-deep)"/><path d="M34 74 L54 44 L74 74 Z" fill="var(--teal-tint)" opacity=".55"/>`,
    ];
    return `<svg class="foot__frame" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect width="${W}" height="${H}" fill="var(--raised)"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--bg-deep)" stroke-width="2"/>
      ${holes(8)}${holes(104)}
      ${pics[i % pics.length]}
    </svg>`;
  }

  function build() {
    const root = document.querySelector('.foot');
    const D = window.KLDATA;
    if (!root || !D) return;

    const FRAMES = 14;
    const strip = Array.from({ length: FRAMES }, (_, i) => frame(i)).join('');

    root.innerHTML = `
      <div class="foot__screen" data-reveal="scale">
        <h2 class="foot__cta-title">${D.footer.cta}</h2>
        <p class="foot__cta-sub">${D.footer.ctaSub}</p>
        <a class="btn" href="${D.hero.primary.href}">${D.hero.primary.label}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>

      <div class="foot__reel" aria-hidden="true">
        <div class="foot__tape"><div class="foot__tape-track">${strip}${strip}</div></div>
        ${CAMERA}
      </div>

      <div class="foot__plate wrap">
        <div class="foot__grid">
          <div class="foot__brand-cell">
            <a class="foot__brand" href="#top">${KL.mark(26, '')}<span>KLAKET</span></a>
            <p class="foot__tag">The production platform for film crews.</p>
          </div>
          ${D.footer.columns.map((c) => `
            <nav class="foot__col" aria-label="${c.title}">
              <h3>${c.title}</h3>
              <ul>${c.links.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
            </nav>`).join('')}
        </div>
        <div class="foot__legal">
          <span>${D.footer.legal}</span>
          <span class="ar" dir="rtl">${D.hero.sloganAr}</span>
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    if (!g || (window.KL && KL.reduced)) return;

    const track = root.querySelector('.foot__tape-track');
    const reels = root.querySelectorAll('.foot__camera .reel');

    const half = track.scrollWidth / 2;
    const SPEED = 58;                    // px per second of tape
    const duration = half / SPEED;
    const tape = g.to(track, { x: -half, duration, ease: 'none', repeat: -1 });

    /* A 108px frame passing the gate is one sprocket turn, and the reel is four
       sprockets round, so the reel turns a quarter turn per frame. */
    const turn = g.to(reels, { rotation: 360, duration: (108 / SPEED) * 4, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });

    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        if (self.isActive) { tape.play(); turn.play(); } else { tape.pause(); turn.pause(); }
      },
    });

    KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
