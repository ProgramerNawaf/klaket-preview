/* J3, the strip.
   Six frames of film on one length of stock. The section pins, the strip travels
   left, and each frame dwells in the gate before the next hop: that dwell is the
   mechanical rhythm, and it is in the progress curve rather than in ScrollTrigger
   snapping, so it cannot fight Lenis for the scroll position.
   Travel is measured from the real frame boxes on every refresh, so a resize
   mid-section lands the gate back on the frame it was holding. */
(function () {
  const DWELL = 0.2;      // share of each hop spent sitting still in the gate

  /* Linear scroll in, frame by frame travel out. */
  function cadence(p, seg) {
    const t = Math.max(0, Math.min(1, p)) * seg;
    const i = Math.min(seg - 1, Math.floor(t));
    const f = t - i;
    const e = f < DWELL ? 0 : f > 1 - DWELL ? 1 : (f - DWELL) / (1 - DWELL * 2);
    return (i + e * e * (3 - 2 * e)) / seg;
  }

  /* One still per step, drawn flat in the four colours. */
  const STILLS = [
    /* 01 the brief lands */ `
      <rect x="22" y="26" width="132" height="148" rx="8" class="f-paper"/>
      <path d="M70 76 L104 96 L70 116 Z" class="f-teal"/>
      <rect x="40" y="140" width="96" height="7" rx="3.5" class="f-ink o-30"/>
      <rect x="40" y="154" width="62" height="7" rx="3.5" class="f-ink o-30"/>
      <g class="f-tint">
        <rect x="198" y="84" width="9" height="32" rx="4.5"/>
        <rect x="216" y="66" width="9" height="68" rx="4.5"/>
        <rect x="234" y="78" width="9" height="44" rx="4.5"/>
        <rect x="252" y="56" width="9" height="88" rx="4.5"/>
      </g>
      <path d="M190 100 H166" class="s-tint" stroke-width="4"/>
      <path d="M174 92 L164 100 L174 108" class="s-tint" stroke-width="4"/>`,
    /* 02 the script breaks down */ `
      <rect x="26" y="22" width="122" height="156" rx="6" class="f-paper"/>
      <g class="f-ink o-30">
        <rect x="42" y="42" width="78" height="6" rx="3"/>
        <rect x="42" y="58" width="90" height="6" rx="3"/>
        <rect x="42" y="90" width="68" height="6" rx="3"/>
        <rect x="42" y="106" width="86" height="6" rx="3"/>
        <rect x="42" y="138" width="54" height="6" rx="3"/>
      </g>
      <g>
        <rect x="178" y="36" width="96" height="26" rx="13" class="f-mid"/>
        <rect x="178" y="72" width="72" height="26" rx="13" class="f-mid"/>
        <rect x="178" y="108" width="88" height="26" rx="13" class="f-mid-2"/>
        <rect x="178" y="144" width="60" height="26" rx="13" class="f-mid-2"/>
      </g>
      <path d="M152 60 H172 M152 96 H172 M152 122 H172 M152 156 H172" class="s-tint" stroke-width="3" opacity=".6"/>`,
    /* 03 the board gets built */ `
      <g>
        <rect x="28" y="28" width="244" height="22" rx="4" class="f-raised"/>
        <rect x="28" y="58" width="196" height="22" rx="4" class="f-mid"/>
        <rect x="52" y="88" width="220" height="22" rx="4" class="f-tint"/>
        <rect x="28" y="118" width="162" height="22" rx="4" class="f-mid"/>
        <rect x="28" y="148" width="214" height="22" rx="4" class="f-raised"/>
      </g>
      <path d="M44 99 H36 M44 99 L50 93 M44 99 L50 105" class="s-tint" stroke-width="3"/>
      <rect x="52" y="86" width="220" height="26" rx="4" class="s-tint" stroke-width="2.5" opacity=".8"/>`,
    /* 04 the call sheet goes out */ `
      <rect x="22" y="26" width="112" height="148" rx="6" class="f-paper"/>
      <rect x="36" y="42" width="64" height="8" rx="4" class="f-teal"/>
      <g class="f-ink o-30">
        <rect x="36" y="64" width="84" height="6" rx="3"/>
        <rect x="36" y="80" width="68" height="6" rx="3"/>
        <rect x="36" y="96" width="80" height="6" rx="3"/>
        <rect x="36" y="112" width="52" height="6" rx="3"/>
      </g>
      <g>
        <rect x="206" y="24" width="48" height="76" rx="8" class="f-surf"/>
        <rect x="206" y="24" width="48" height="76" rx="8" class="s-tint" stroke-width="2.5"/>
        <rect x="206" y="112" width="48" height="76" rx="8" class="f-surf"/>
        <rect x="206" y="112" width="48" height="76" rx="8" class="s-tint" stroke-width="2.5"/>
        <rect x="216" y="40" width="28" height="5" rx="2.5" class="f-tint"/>
        <rect x="216" y="128" width="28" height="5" rx="2.5" class="f-tint"/>
      </g>
      <path d="M146 92 C 170 92 176 62 196 62" class="s-tint" stroke-width="3"/>
      <path d="M146 108 C 170 108 176 150 196 150" class="s-tint" stroke-width="3"/>
      <circle cx="268" cy="62" r="6" class="f-tint"/>
      <circle cx="268" cy="150" r="6" class="f-tint"/>`,
    /* 05 action */ `
      <rect x="40" y="46" width="220" height="118" rx="8" class="f-ink"/>
      <rect x="40" y="46" width="220" height="118" rx="8" class="s-tint" stroke-width="2.5"/>
      <g class="f-paper">
        <path d="M40 46 H74 L56 76 H40 Z"/>
        <path d="M108 46 H142 L124 76 H90 Z"/>
        <path d="M176 46 H210 L192 76 H158 Z"/>
        <path d="M244 46 H260 V76 H226 Z"/>
      </g>
      <g class="f-tint">
        <rect x="60" y="96" width="78" height="8" rx="4"/>
        <rect x="60" y="116" width="54" height="8" rx="4"/>
        <rect x="60" y="136" width="66" height="8" rx="4"/>
      </g>
      <path d="M176 104 L190 118 L216 92" class="s-tint" stroke-width="5"/>`,
    /* 06 that's a wrap */ `
      <g>
        <rect x="48" y="54" width="46" height="120" rx="5" class="f-raised"/>
        <rect x="48" y="96" width="46" height="78" rx="5" class="f-mid"/>
        <rect x="124" y="54" width="46" height="120" rx="5" class="f-raised"/>
        <rect x="124" y="84" width="46" height="90" rx="5" class="f-tint"/>
        <rect x="200" y="54" width="46" height="120" rx="5" class="f-raised"/>
        <rect x="200" y="118" width="46" height="56" rx="5" class="f-mid"/>
      </g>
      <path d="M40 40 H256" class="s-tint" stroke-width="3" opacity=".5"/>
      <path d="M212 24 L226 38 L252 12" class="s-tint" stroke-width="5"/>`,
  ];

  function build() {
    const root = document.querySelector('.jstrip');
    const D = window.KLDATA;
    if (!root || !D) return;
    const J = D.journey;

    const frameHtml = J.steps.map((s, i) => `
      <li class="jfr" data-i="${i}">
        <div class="jfr__film">
          <span class="jfr__rail jfr__rail--t" aria-hidden="true"></span>
          <span class="jfr__rail jfr__rail--b" aria-hidden="true"></span>
          <div class="jfr__pic">
            <svg viewBox="0 0 300 200" aria-hidden="true">
              <rect width="300" height="200" class="f-deep"/>${STILLS[i % STILLS.length]}
            </svg>
          </div>
          <h3 class="jfr__t"><span class="data jfr__n">${s.n}</span>${s.title}</h3>
          <p class="jfr__b">${s.body}</p>
        </div>
        <button class="jfr__jump" type="button" aria-label="Step ${s.n}, ${s.title}"></button>
      </li>`).join('');

    root.innerHTML = `
      <div class="jstrip__pin">
        <h2 class="jstrip__title" id="jstrip-title">${J.title}</h2>
        <ol class="jstrip__track">${frameHtml}</ol>
        <div class="jstrip__gate" aria-hidden="true"><span class="jstrip__tally"></span></div>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.jstrip__pin');
    const track = root.querySelector('.jstrip__track');
    const frames = [...root.querySelectorAll('.jfr')];

    if (window.KL && KL.reduced) {
      /* Still version: the six frames as a grid, in order, nothing to scrub. */
      root.classList.add('is-still');
      frames.forEach((f) => f.classList.add('is-on'));
      return;
    }

    if (!g) {
      /* No GSAP: the track keeps the overflow and the snap points it was built
         with, so the strip is still a strip you can push sideways. The jump
         buttons cannot scrub a timeline that does not exist, so they centre
         their own frame in the gate instead, and tabbing through them walks the
         strip because the browser scrolls a focused child into view. */
      root.classList.add('is-free');
      frames.forEach((li) => {
        li.querySelector('.jfr__jump').addEventListener('click', () => {
          li.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      });
      return;
    }

    track.classList.add('is-js');
    const seg = frames.length - 1;

    /* Measured once per refresh rather than per frame: a layout read every tick
       is what makes a scrubbed strip feel sticky. */
    let x0 = 0, x1 = 0;
    function measure() {
      const mid = pin.clientWidth / 2;
      const a = frames[0], b = frames[seg];
      x0 = mid - (a.offsetLeft + a.offsetWidth / 2);
      x1 = mid - (b.offsetLeft + b.offsetWidth / 2);
    }

    let active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      frames.forEach((el, j) => {
        el.classList.toggle('is-on', j === i);
        if (j === i) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });
    }

    function render(p) {
      const c = cadence(p, seg);
      track.style.transform = 'translate3d(' + (x0 + (x1 - x0) * c).toFixed(2) + 'px, 0, 0)';
      setActive(Math.round(c * seg));
    }

    const prox = { p: 0 };
    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 5.4,
        pin: pin,
        scrub: 0.45,
        invalidateOnRefresh: true,
        onRefresh: () => { measure(); render(prox.p); },
      },
    });
    tl.to(prox, { p: 1, ease: 'none', duration: 1, onUpdate: () => render(prox.p) }, 0);

    /* The tally only runs while the gate is on screen. */
    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => root.classList.toggle('is-live', self.isActive),
    });

    measure();
    render(0);

    function jump(i) {
      const st = tl.scrollTrigger;
      const y = st.start + (st.end - st.start) * (i / seg);
      if (KL.lenis) KL.lenis.scrollTo(y, { duration: 0.7 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    frames.forEach((li, i) => {
      const btn = li.querySelector('.jfr__jump');
      btn.addEventListener('click', () => jump(i));
      btn.addEventListener('focus', () => { if (i !== active) jump(i); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
