/* J2, the lens: one continuous zoom, scrubbed and pinned.
   Four drawn stages and the Klaket interface sit on the same centre and are
   scaled by powers of five, so stage n is drawn as the small target in the
   middle of stage n-1. That is the whole illusion: the zoom never stops because
   there is always another thing inside the thing you are looking at.
   DOM and SVG rather than WebGL, because a vector stage stays sharp at 600x,
   needs no context, and a resize costs one reflow instead of a re-upload. */
(function () {
  const S = 5;             // each stage is five times the width of the next one in
  const STAGES = 4;        // set, camera, barrel, glass. The interface is stage four.
  const ZOOM_END = 0.52;   // share of the scroll spent getting through the glass
  const STEP_FROM = 0.55;
  const SPAN = (0.985 - STEP_FROM) / 6;

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* A stage is only worth drawing while it is near its own frame. It fades in
     while it is still the small target inside its parent, and then it is cut,
     not faded: by the time a stage is five times the frame its own child covers
     the screen completely, so cutting it is invisible, while fading it is not.
     Fading early is what puts a visible rectangle on the screen, because the
     child's ground no longer matches the hole it is sitting in.
     The last stage is the exception: the interface is a panel, not a full bleed,
     so the glass has to dissolve rather than cut. */
  const IN0 = -1.35, IN1 = -1.02, CUT = 1.04, SOFT0 = 0.5, SOFT1 = 1.05;
  function fade(d, soft) {
    if (d <= IN0) return 0;
    if (d < IN1) return (d - IN0) / (IN1 - IN0);
    if (!soft) return d >= CUT ? 0 : 1;
    if (d <= SOFT0) return 1;
    if (d >= SOFT1) return 0;
    return 1 - (d - SOFT0) / (SOFT1 - SOFT0);
  }

  const svg = (inner) =>
    '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + inner + '</svg>';

  /* ---- the nesting rule ----------------------------------------------
     A stage is a 1600x900 rectangle, so at 1/5 scale its corners sit 184 units
     from the centre. Every hole a stage is seen through therefore has to be at
     least that wide, and has to be filled with the colour of the next stage's
     ground, or the child's rectangle shows its edges inside the parent. Those
     two rules are the whole reason the zoom looks continuous. ---- */

  /* ---- stage 0: the wide set. The camera sits dead centre at a fifth of the
     frame, which is exactly where stage 1 lands when it is at scale 1/5. ---- */
  function lamp(x, dir) {
    const h = x + dir * 54;
    return `<path d="M${x} 300 L${800 - dir * 120} 648 L${800 + dir * 40} 656 Z" class="f-tint o-16"/>
    <g class="s-tint" stroke-width="5">
      <path d="M${x} 646 V300"/>
      <path d="M${x - 46} 646 L${x} 600 L${x + 46} 646"/>
      <path d="M${x - 34} 248 H${x + 34} V300 H${x - 34} Z" class="f-surf s-tint"/>
      <path d="M${h} 236 V312"/>
    </g>`;
  }

  function crew(x, s) {
    const top = 644 - 300 * s;
    return `<g class="f-ink">
      <circle cx="${x}" cy="${top + 28 * s}" r="${28 * s}"/>
      <path d="M${x - 44 * s} 644 V${top + 96 * s} Q${x} ${top + 44 * s} ${x + 44 * s} ${top + 96 * s} V644 Z"/>
    </g>`;
  }

  const SET = svg(`
    <rect width="1600" height="900" class="f-deep"/>
    <rect x="60" y="60" width="1480" height="520" class="f-deepteal"/>
    <rect x="60" y="60" width="1480" height="520" class="s-faint" stroke-width="4"/>
    <rect y="580" width="1600" height="320" class="f-ink"/>
    <ellipse cx="800" cy="664" rx="470" ry="98" class="f-surf o-55"/>
    <rect y="18" width="1600" height="16" class="f-surf"/>
    <g class="s-tint" stroke-width="5" opacity=".6">
      <path d="M470 34 V116"/><path d="M1130 34 V92"/>
    </g>
    <path d="M420 116 H520 L506 178 H434 Z" class="f-surf s-tint" stroke-width="5"/>
    <path d="M1080 92 H1180 L1166 154 H1094 Z" class="f-surf s-tint" stroke-width="5"/>
    ${lamp(250, 1)}
    ${lamp(1350, -1)}
    ${crew(448, 1)}
    ${crew(1156, 0.92)}
    <g>
      <path d="M800 514 L724 652 M800 514 L876 652 M800 518 L802 644" class="s-tint" stroke-width="6"/>
      <rect x="670" y="390" width="260" height="124" rx="10" class="f-surf"/>
      <rect x="670" y="390" width="260" height="124" rx="10" class="s-tint" stroke-width="3"/>
      <rect x="724" y="366" width="66" height="24" rx="7" class="f-raised"/>
      <rect x="806" y="372" width="86" height="12" rx="6" class="f-raised"/>
      <rect x="742" y="394" width="116" height="116" rx="7" class="f-ink"/>
      <circle cx="800" cy="452" r="42" class="s-tint" stroke-width="3"/>
      <circle cx="800" cy="452" r="39" class="f-ink"/>
    </g>`);

  /* ---- stage 1: the camera. Its ground is the same teal as the cyc behind it,
     so at a fifth of the frame its rectangle disappears into the set. ---- */
  const CAMERA = svg(`
    <rect width="1600" height="900" class="f-deepteal"/>
    <rect x="150" y="150" width="1300" height="620" rx="44" class="f-surf"/>
    <rect x="150" y="150" width="1300" height="620" rx="44" class="s-tint" stroke-width="7"/>
    <rect x="270" y="30" width="330" height="122" rx="22" class="f-raised"/>
    <rect x="680" y="60" width="430" height="30" rx="15" class="f-raised"/>
    <path d="M740 90 V150 M1050 90 V150" class="s-tint" stroke-width="7"/>
    <rect x="196" y="226" width="240" height="146" rx="12" class="f-ink"/>
    <g class="f-tint o-55">
      <rect x="220" y="254" width="146" height="12" rx="6"/>
      <rect x="220" y="286" width="194" height="9" rx="4.5"/>
      <rect x="220" y="312" width="112" height="9" rx="4.5"/>
    </g>
    <g class="f-raised">
      <rect x="196" y="486" width="104" height="104" rx="16"/>
      <rect x="320" y="486" width="104" height="104" rx="16"/>
      <rect x="1200" y="486" width="200" height="56" rx="28"/>
    </g>
    <circle cx="1320" cy="268" r="24" class="f-signal"/>
    <rect x="502" y="164" width="596" height="592" rx="30" class="f-ink"/>
    <rect x="502" y="164" width="596" height="592" rx="30" class="s-tint" stroke-width="6"/>
    <circle cx="800" cy="450" r="282" class="f-ink"/>
    <circle cx="800" cy="450" r="282" class="s-tint" stroke-width="7"/>
    <circle cx="800" cy="450" r="248" class="s-tint" stroke-width="3" opacity=".55"/>
    <circle cx="800" cy="450" r="222" class="s-faint" stroke-width="8"/>
    <circle cx="800" cy="450" r="196" class="f-ink"/>
    <path d="M672 360 A 190 190 0 0 1 880 324" class="s-tint" stroke-width="7" opacity=".45"/>`);

  /* ---- stage 2: down the barrel. Rings out to the frame, the coated front
     element, and the pupil the next stage comes through. ---- */
  function ticks() {
    let out = '';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 440 : 454;
      out += `<path d="M${(800 + Math.cos(a) * r0).toFixed(1)} ${(450 + Math.sin(a) * r0).toFixed(1)}
        L${(800 + Math.cos(a) * 472).toFixed(1)} ${(450 + Math.sin(a) * 472).toFixed(1)}"
        class="s-tint" stroke-width="${i % 3 === 0 ? 7 : 3}" opacity="${i % 3 === 0 ? 0.8 : 0.4}"/>`;
    }
    return out;
  }

  const BARREL = svg(`
    <rect width="1600" height="900" class="f-ink"/>
    <circle cx="800" cy="450" r="478" class="f-surf"/>
    ${ticks()}
    <circle cx="800" cy="450" r="430" class="f-raised"/>
    <circle cx="800" cy="450" r="392" class="f-surf"/>
    <circle cx="800" cy="450" r="392" class="s-tint" stroke-width="4" opacity=".45"/>
    <circle cx="800" cy="450" r="358" class="f-ink"/>
    <circle cx="800" cy="450" r="330" class="f-teal"/>
    <ellipse cx="712" cy="368" rx="128" ry="44" transform="rotate(-36 712 368)" class="f-tint o-16"/>
    <circle cx="800" cy="450" r="330" class="s-tint" stroke-width="4" opacity=".7"/>
    <circle cx="800" cy="450" r="196" class="f-deepteal"/>`);

  /* ---- stage 3: the glass, and the aperture we pass through ---- */
  function blades(r) {
    let hex = '';
    const edge = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = 800 + Math.cos(a) * r, y = 450 + Math.sin(a) * r;
      hex += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      edge.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${(800 + Math.cos(a) * 470).toFixed(1)} ${(450 + Math.sin(a) * 470).toFixed(1)}" class="s-tint" stroke-width="5" opacity=".3"/>`);
    }
    return `<path d="${hex}Z" class="f-ink"/>${edge.join('')}`;
  }

  const GLASS = svg(`
    <rect width="1600" height="900" class="f-deepteal"/>
    <circle cx="800" cy="450" r="430" class="f-teal"/>
    <ellipse cx="688" cy="318" rx="196" ry="78" transform="rotate(-34 688 318)" class="f-tint o-16"/>
    <circle cx="800" cy="450" r="430" class="s-tint" stroke-width="5" opacity=".55"/>
    <g class="jlens__blades">${blades(190)}</g>`);

  function build() {
    const root = document.querySelector('.jlens');
    const D = window.KLDATA;
    if (!root || !D) return;
    const J = D.journey;

    const g = window.KL && KL.gsap;
    const still = !g || KL.reduced;

    /* The row is the button when there is a scroll to drive, and plain text when
       there is not: a focusable control that cannot do anything is worse than no
       control at all. */
    const row = (s) => `<span class="data jlens__step-n">${s.n}</span><span>${s.title}</span>`;
    const steps = J.steps.map((s) => `
      <li class="jlens__step">
        ${still
          ? `<h3 class="jlens__step-t">${row(s)}</h3>`
          : `<button class="jlens__step-t jlens__jump" type="button">${row(s)}</button>`}
        <p class="jlens__step-b">${s.body}</p>
      </li>`).join('');

    root.innerHTML = `
      <div class="jlens__pin">
        <div class="jlens__well" aria-hidden="true">
          <div class="jlens__stage" data-i="0">${SET}</div>
          <div class="jlens__stage" data-i="1">${CAMERA}</div>
          <div class="jlens__stage" data-i="2">${BARREL}</div>
          <div class="jlens__stage" data-i="3">${GLASS}</div>
        </div>
        <h2 class="jlens__title" id="jlens-title">${J.title}</h2>
        <div class="jlens__ui">
          <div class="jlens__bar">
            <span class="jlens__traffic" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="data">KLAKET</span>
            <span class="data jlens__bar-meta" aria-hidden="true">01 / 06</span>
          </div>
          <div class="jlens__panel"><ol class="jlens__steps">${steps}</ol></div>
        </div>
      </div>`;

    const stages = [...root.querySelectorAll('.jlens__stage')];
    const ui = root.querySelector('.jlens__ui');
    const title = root.querySelector('.jlens__title');
    const meta = root.querySelector('.jlens__bar-meta');
    const items = [...root.querySelectorAll('.jlens__step')];
    const bladeG = root.querySelector('.jlens__blades');

    if (still) {
      /* Still version: the set as a drawing, then the six steps as a list. */
      root.classList.add('is-still');
      items[0].classList.add('is-on');
      return;
    }

    let active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      items.forEach((el, j) => {
        el.classList.toggle('is-on', j === i);
        if (j === i) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });
      meta.textContent = items[i].querySelector('.jlens__step-n').textContent + ' / 06';
    }

    function render(p) {
      /* One scalar drives everything: z is how many stages deep we are. Past the
         glass it keeps creeping, so the picture is never completely still. */
      const z = p <= ZOOM_END ? (p / ZOOM_END) * STAGES : STAGES + (p - ZOOM_END) * 0.17;

      for (const el of stages) {
        const d = z - Number(el.dataset.i);
        const a = fade(d, el.dataset.i === String(STAGES - 1));
        if (!a) { el.style.visibility = 'hidden'; el.style.opacity = '0'; continue; }
        const ad = Math.abs(d);
        const b = ad < 0.1 ? 0 : Math.min(4, (ad - 0.1) * 3.4);
        el.style.visibility = 'visible';
        el.style.opacity = a.toFixed(3);
        el.style.transform = 'scale(' + Math.pow(S, d).toFixed(4) + ')';
        el.style.filter = b ? 'blur(' + b.toFixed(2) + 'px)' : 'none';
      }

      /* The blades ease open on the way in, so the pupil is widest as we cross it. */
      if (bladeG) {
        const t = clamp01((z - 2.4) / 1.2);
        bladeG.setAttribute('transform', `rotate(${(-14 + t * 14).toFixed(2)} 800 450) scale(${(1 + t * 0.22).toFixed(3)}) translate(${(-800 * t * 0.22 / (1 + t * 0.22)).toFixed(1)} ${(-450 * t * 0.22 / (1 + t * 0.22)).toFixed(1)})`);
      }

      const du = z - STAGES;
      const ua = clamp01((du + 1.45) / 0.4);
      ui.style.opacity = ua.toFixed(3);
      ui.style.transform = 'translate(-50%, -50%) scale(' + Math.pow(S, du).toFixed(4) + ')';
      const ub = du < -0.04 ? Math.min(5, -du * 4) : 0;
      ui.style.filter = ub ? 'blur(' + ub.toFixed(2) + 'px)' : 'none';
      ui.classList.toggle('is-live', du > -0.3);

      const ta = 1 - clamp01((z - 0.22) / 0.5);
      title.style.opacity = ta.toFixed(3);
      title.style.transform = 'translateX(-50%) translateY(' + (-(1 - ta) * 40).toFixed(1) + 'px)';

      setActive(p < STEP_FROM ? 0 : Math.min(5, Math.floor((p - STEP_FROM) / SPAN)));
    }

    const prox = { p: 0 };
    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 6.4,
        pin: root.querySelector('.jlens__pin'),
        scrub: 0.5,
        invalidateOnRefresh: true,
        onRefresh: () => render(prox.p),
      },
    });
    /* Scrubbing a proxy rather than the layers directly: the easing then happens
       once, on one number, and the whole composition is drawn from it per frame. */
    tl.to(prox, { p: 1, ease: 'none', duration: 1, onUpdate: () => render(prox.p) }, 0);

    render(0);

    /* Keyboard: tabbing to a step scrolls the pin to where that step plays, so
       the list is reachable instead of being a thing you can only scroll past. */
    function jump(i) {
      const st = tl.scrollTrigger;
      const y = st.start + (st.end - st.start) * (STEP_FROM + (i + 0.5) * SPAN);
      if (KL.lenis) KL.lenis.scrollTo(y, { duration: 0.7 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    items.forEach((li, i) => {
      const btn = li.querySelector('.jlens__jump');
      btn.addEventListener('click', () => jump(i));
      btn.addEventListener('focus', () => { if (i !== active) jump(i); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
