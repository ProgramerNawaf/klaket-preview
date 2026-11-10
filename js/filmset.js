/* MPH.filmSet: the sign-in screen's picture. A night film set built in real 3D: a floor (tape marks, dolly track,
   cables, pools of light) with the props standing on it at their own depths: two light stands at the back, the boom
   operator, the camera on its tripod, the director, and the Klaket clapperboard.
   Scrolling is a crane shot. It starts high above the set looking down, then cranes down to eye level while the
   clapperboard comes down from above into the shot and snaps shut at the end: the action point. Scroll on past it
   and Klaket's splash plays (a flash, the logo and its three dots), then the agents picture takes over the panel
   ("Replay the shot" brings the set back).
   One anime.js timeline (10 s, never autoplayed) is sought to the scroll progress, eased so the camera glides.
     Wide screens   the picture is its own scroll track (the form beside it never moves).
     Phones         the picture sits under the form and follows the page's scroll as it passes through the screen.
     Reduce Motion  no set: the agents picture straight away.
   anime.js 3.2.1 loads only when this screen does. */
(function () {
  const MPH = (window.MPH = window.MPH || {});
  const ANIME = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js';
  const SNAP = 0.86;          // where the clapper shuts (share of the scroll): the action point
  const END = 0.97;           // scrolled past the clap: Klaket's splash, then the agents picture
  const SPLASH_SWAP = 800, SPLASH_DONE = 1700; // ms: when the splash covers the panel (the swap), and when it's gone
  const TILT = [-64, -4];     // the crane: rotateX of the set (negative looks down on it), from overhead to eye level
  const STAND = 0.62;         // how much the standing props lean back toward the camera (keeps them readable from above)
  const W = 1000, FLOOR_Y = 520, DEPTH = 900; // stage width, the floor line, the floor's depth
  let animeLoading = null;
  const loadAnime = () => animeLoading || (animeLoading = window.anime ? Promise.resolve(window.anime) : new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = ANIME; s.async = true;
    s.onload = () => ok(window.anime); s.onerror = fail;
    document.head.appendChild(s);
  }));

  const STRIPES = `<pattern id="fs-stripes" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="36" height="36" fill="#121212"/><rect width="18" height="36" fill="#F6EBD9"/></pattern>`;
  const LIGHT = (id) => `<svg viewBox="0 0 150 470"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EBD9" stop-opacity=".32"/><stop offset="1" stop-color="#F6EBD9" stop-opacity="0"/></linearGradient></defs>
      <path d="M58 70 L92 70 L150 470 L0 470 Z" fill="url(#${id})"/><path d="M75 110 V462 M75 462 L40 470 M75 462 L110 470" stroke="#2A2926" stroke-width="6" stroke-linecap="round"/>
      <rect x="45" y="40" width="60" height="44" rx="8" fill="#1C1C1C" stroke="#5FA8A1" stroke-width="3"/><rect x="52" y="78" width="46" height="8" rx="3" fill="#F6EBD9"/></svg>`;

  /* props: [class, x (left edge on the stage), z (depth: + toward the viewer), width, height, svg] */
  const PROPS = [
    ['fs-light', 120, -360, 150, 470, LIGHT('fs-beam-a')],
    ['fs-light', 730, -360, 150, 470, LIGHT('fs-beam-b')],
    ['crew-member-2', 40, -150, 560, 495, `<svg viewBox="90 60 560 495">
      <g class="fs-boom"><path d="M150 300 L560 112" stroke="#3A3834" stroke-width="7" stroke-linecap="round"/><path d="M556 104 L606 88" stroke="#3A3834" stroke-width="5"/>
        <rect x="590" y="72" width="54" height="26" rx="13" fill="#2A2926" transform="rotate(-18 617 85)"/></g>
      <path class="fs-body" d="M108 548 L112 420 C112 380 120 350 130 336 L146 318 C152 312 168 312 172 322 L176 360 C178 392 176 420 172 440 L168 548 Z" fill="#0B0B0B"/>
      <circle class="fs-body" cx="146" cy="292" r="24" fill="#0B0B0B"/><path d="M128 286 C126 270 166 266 168 286" stroke="#2A2926" stroke-width="6" fill="none"/>
      <path d="M150 336 L160 304" stroke="#0B0B0B" stroke-width="16" stroke-linecap="round"/></svg>`],
    ['fs-camera', 190, 110, 370, 395, `<svg viewBox="210 160 370 395">
      <defs><radialGradient id="fs-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#B5DDD8"/><stop offset=".45" stop-color="#5FA8A1" stop-opacity=".9"/><stop offset="1" stop-color="#5FA8A1" stop-opacity="0"/></radialGradient></defs>
      <g stroke="#2A2926" stroke-width="9" stroke-linecap="round" fill="none"><path d="M335 372 L262 546"/><path d="M335 372 L336 550"/><path d="M335 372 L410 546"/><path d="M290 470 L384 470" stroke-width="5" opacity=".7"/></g>
      <rect x="300" y="356" width="70" height="20" rx="4" fill="#2A2926"/>
      <g class="camera-reel-1"><circle cx="292" cy="222" r="54" fill="#1C1C1C" stroke="#5FA8A1" stroke-width="5"/>
        <g stroke="#5FA8A1" stroke-width="6" stroke-linecap="round"><path d="M292 176 V268"/><path d="M246 222 H338"/><path d="M260 190 L324 254" opacity=".55"/><path d="M324 190 L260 254" opacity=".55"/></g><circle cx="292" cy="222" r="11" fill="#F6EBD9"/></g>
      <g class="camera-reel-2"><circle cx="398" cy="222" r="54" fill="#1C1C1C" stroke="#5FA8A1" stroke-width="5"/>
        <g stroke="#5FA8A1" stroke-width="6" stroke-linecap="round"><path d="M398 176 V268"/><path d="M352 222 H444"/><path d="M366 190 L430 254" opacity=".55"/><path d="M430 190 L366 254" opacity=".55"/></g><circle cx="398" cy="222" r="11" fill="#F6EBD9"/></g>
      <path d="M292 276 C300 300 390 300 398 276" stroke="#8CCBC3" stroke-width="3" fill="none" opacity=".6"/>
      <rect x="246" y="276" width="190" height="86" rx="12" fill="#0A3F3C" stroke="#5FA8A1" stroke-width="4"/>
      <rect x="222" y="292" width="30" height="40" rx="6" fill="#0F5C57" stroke="#5FA8A1" stroke-width="3"/>
      <rect x="268" y="294" width="60" height="30" rx="4" fill="#121212" stroke="#266862" stroke-width="2"/>
      <circle cx="280" cy="342" r="7" fill="#F6EBD9" opacity=".85"/><circle cx="302" cy="342" r="7" fill="#F6EBD9" opacity=".55"/>
      <path d="M436 298 H470 L522 278 V362 L470 342 H436 Z" fill="#0F5C57" stroke="#5FA8A1" stroke-width="4" stroke-linejoin="round"/>
      <circle class="fs-lens-glow" cx="532" cy="320" r="46" fill="url(#fs-glow)"/><circle cx="526" cy="320" r="14" fill="#B5DDD8"/></svg>`],
    ['crew-member-1', 790, 40, 160, 285, `<svg viewBox="770 270 160 285">
      <path class="fs-body" d="M846 548 L850 430 C850 392 858 362 870 348 L886 334 C892 328 910 328 914 338 L918 380 C920 410 918 432 914 450 L910 548 Z" fill="#0B0B0B"/>
      <circle class="fs-body" cx="890" cy="306" r="24" fill="#0B0B0B"/><path d="M866 296 Q890 270 914 296" stroke="#0B0B0B" stroke-width="10" fill="none"/>
      <g class="fs-arm"><path d="M880 352 L812 318" stroke="#0B0B0B" stroke-width="15" stroke-linecap="round"/>
        <rect x="782" y="304" width="34" height="22" rx="4" fill="#2A2926" stroke="#5FA8A1" stroke-width="2"/><circle cx="788" cy="315" r="5" fill="#B5DDD8" opacity=".8"/></g></svg>`],
  ];

  /* the clapperboard: board + stick hinged at its top-left; it hangs above the floor at the action point */
  const CLAPPER = `<svg viewBox="606 150 258 214"><defs>${STRIPES}</defs>
    <g class="fs-slate">
      <rect x="620" y="210" width="240" height="150" rx="6" fill="#161616" stroke="#121212" stroke-width="3"/>
      <rect x="620" y="186" width="240" height="26" fill="url(#fs-stripes)" stroke="#121212" stroke-width="3"/>
      <g stroke="#F6EBD9" stroke-width="2.5" opacity=".9"><path d="M632 262 H848"/><path d="M632 312 H848"/><path d="M712 222 V262"/><path d="M790 222 V262"/></g>
      <g class="fs-slate-text" fill="#F6EBD9">
        <text x="636" y="236">SCENE</text><text x="720" y="236">TAKE</text><text x="798" y="236">ROLL</text>
        <text x="636" y="256" class="chalk">01</text><text x="720" y="256" class="chalk">01</text><text x="798" y="256" class="chalk">A</text>
        <text x="636" y="290" class="prod">KLAKET</text><text x="636" y="304">PROD.CO.</text><text x="636" y="342" class="action">ACTION</text>
      </g>
      <g class="fs-dots"><circle cx="812" cy="286" r="5"/><circle cx="826" cy="286" r="5"/><circle cx="840" cy="286" r="5"/></g>
    </g>
    <g class="clapper-stick"><rect x="620" y="156" width="240" height="26" fill="url(#fs-stripes)" stroke="#121212" stroke-width="3"/></g>
    <path d="M612 152 h30 l16 30 v32 h-46 z" fill="#0B0B0B"/><circle cx="624" cy="166" r="3.5" fill="#8a8580"/><circle cx="624" cy="200" r="3.5" fill="#8a8580"/></svg>`;

  /* the floor, seen best from above: pools of light, a dolly track, tape marks where the crew stands, cables, shadows.
     Floor coordinates: x = stage x + 100, y = depth from the back (0) to the front (DEPTH). */
  const fz = (z) => DEPTH / 2 + z;
  const FLOOR = `<svg viewBox="0 0 1200 ${DEPTH}" preserveAspectRatio="none">
    <defs><radialGradient id="fs-pool" r="50%"><stop offset="0" stop-color="#F6EBD9" stop-opacity=".22"/><stop offset="1" stop-color="#F6EBD9" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="295" cy="${fz(-150)}" rx="210" ry="170" fill="url(#fs-pool)"/><ellipse cx="905" cy="${fz(-150)}" rx="210" ry="170" fill="url(#fs-pool)"/>
    <ellipse cx="660" cy="${fz(40)}" rx="260" ry="200" fill="url(#fs-pool)"/>
    <g stroke="#5FA8A1" stroke-opacity=".35" stroke-width="5"><path d="M120 ${fz(270)} H1080"/><path d="M120 ${fz(330)} H1080"/></g>
    <g stroke="#5FA8A1" stroke-opacity=".22" stroke-width="3">${Array.from({ length: 17 }, (_, i) => `<path d="M${140 + i * 58} ${fz(258)} V${fz(342)}"/>`).join('')}</g>
    <g stroke="#F2483A" stroke-opacity=".75" stroke-width="5" stroke-linecap="round">
      <path d="M190 ${fz(-160)} l24 24 M214 ${fz(-160)} l-24 24"/><path d="M955 ${fz(30)} l24 24 M979 ${fz(30)} l-24 24"/><path d="M648 ${fz(-10)} l24 24 M672 ${fz(-10)} l-24 24"/></g>
    <g fill="none" stroke="#2A2926" stroke-width="6"><path d="M470 ${fz(150)} C560 ${fz(220)} 700 ${fz(160)} 820 ${fz(260)} S1000 ${fz(380)} 1180 ${fz(360)}"/><path d="M260 ${fz(-100)} C320 ${fz(0)} 300 ${fz(120)} 390 ${fz(180)}"/></g>
    <g fill="#000" opacity=".55"><ellipse cx="435" cy="${fz(110)}" rx="120" ry="60"/><ellipse cx="970" cy="${fz(40)}" rx="60" ry="36"/><ellipse cx="200" cy="${fz(-150)}" rx="54" ry="34"/>
      <ellipse cx="295" cy="${fz(-360)}" rx="60" ry="26"/><ellipse cx="905" cy="${fz(-360)}" rx="60" ry="26"/></g>
  </svg>`;

  const prop = ([cls, x, z, w, h, art]) =>
    `<div class="fs-prop ${cls}" style="left:${x}px;top:${FLOOR_Y - h}px;width:${w}px;height:${h}px;--z:${z}px">${art}</div>`;

  /* after: the picture shown once the shot is done (the agents) */
  function html(after = '') {
    const ar = MPH.state && MPH.state.lang === 'ar';
    const logo = MPH.logo ? MPH.logo({ variant: 'vertical', size: 96, tone: 'on-dark', decorative: true }) : '';
    const L = (en, a) => (ar ? a : en);
    return `
      <aside class="aa fs" aria-label="${L('A film set: scroll to crane down to the clap', 'موقع تصوير: مرّر لتنزل الكاميرا حتى ضربة الكلاكيت')}">
        <div class="fs-scroll" tabindex="0">
          <div class="fs-track">
            <div class="fs-sticky">
              <div class="fs-head">
                <span class="eyebrow mono">${L('ON SET · KLAKET', 'في موقع التصوير · كلاكيت')}</span>
                <p class="fs-title">${L('Every production starts with a clap.', 'كل إنتاج يبدأ بضربة كلاكيت.')}</p>
              </div>
              <div class="scene-container"><div class="fs-fit"><div class="fs-stage" aria-hidden="true">
                <div id="main-scene">
                  <div class="fs-floor" style="width:1200px;height:${DEPTH}px;left:-100px;top:${FLOOR_Y - DEPTH / 2}px">${FLOOR}</div>
                  ${PROPS.map(prop).join('')}
                  <div class="fs-prop" id="clapperboard-wrapper" style="left:575px;top:${FLOOR_Y - 430}px;width:258px;height:214px;--z:150px"><div class="fs-clap-hang">${CLAPPER}</div></div>
                </div>
              </div></div></div>
              <p class="fs-cue" aria-hidden="true"><span>${L('Scroll to Action', 'مرّر للأكشن')}</span><i></i></p>
              <div class="fs-foot"><span class="mono">${L('LIGHTS · CAMERA · KLAKET', 'إضاءة · كاميرا · كلاكيت')}</span></div>
            </div>
          </div>
        </div>
        <div class="fs-splash" aria-hidden="true"><div class="fs-splash-logo">${logo}</div></div>
        <div class="fs-after" hidden>${after}
          <button type="button" class="fs-replay">${MPH.ui ? MPH.ui.icon('rotate-ccw') : '↺'}<span>${L('Replay the shot', 'أعد اللقطة')}</span></button>
        </div>
      </aside>`;
  }

  /* the 10 s timeline. The crane (0 → 80%): from high above, looking down, to eye level, pushing in.
     The standing props lean back by STAND × the tilt so they read from above, and stand up as the camera comes down.
     The clapper comes down from above into the shot, its stick open, and snaps shut at SNAP. */
  function timeline(anime, el) {
    const q = (s) => el.querySelector(s), qa = (s) => el.querySelectorAll(s);
    const crane = 8000, ease = 'easeInOutSine';
    const tl = anime.timeline({ autoplay: false, duration: 10000, easing: 'linear' });
    tl.add({ targets: q('#main-scene'), translateY: [150, 40], translateZ: [-520, 70], rotateX: TILT, rotateY: [-14, 6], duration: crane, easing: ease }, 0)
      .add({ targets: qa('.fs-prop:not(#clapperboard-wrapper)'), rotateX: [-TILT[0] * STAND, -TILT[1] * STAND], duration: crane, easing: ease }, 0)
      .add({ targets: q('#clapperboard-wrapper'), rotateX: [-TILT[0], -TILT[1]], duration: crane, easing: ease }, 0) // the slate faces the lens all the way down
      .add({ targets: q('.camera-reel-1'), rotateZ: [0, 1440], duration: 10000 }, 0)
      .add({ targets: q('.camera-reel-2'), rotateZ: [0, 1440], duration: 10000 }, 0)
      .add({ targets: q('.crew-member-1 .fs-arm'), rotateZ: [0, -8], duration: crane, easing: ease }, 0)
      .add({ targets: q('.fs-boom'), rotateZ: [-6, 3], duration: crane, easing: ease }, 0)
      // the clapper: down from above (opacity in), the stick open, then the snap at the action point
      .add({ targets: q('.fs-clap-hang'), translateY: [-620, 0], opacity: [0, 1], duration: SNAP * 10000 - 600, easing: 'easeOutCubic' }, 0)
      .add({ targets: q('.clapper-stick'), rotateZ: [-45, -45], duration: 1 }, 0)
      .add({ targets: q('.clapper-stick'), rotateZ: [-45, 0], duration: 300, easing: 'easeInQuad' }, SNAP * 10000 - 300)
      .add({ targets: q('.fs-lens-glow'), opacity: [0.35, 1], duration: 10000 }, 0);
    return tl;
  }

  /* opts.onReveal: called once the agents picture is showing (it wires the agents' own animation) */
  function mount(root, opts = {}) {
    const el = root && root.querySelector('.fs');
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    const after = el.querySelector('.fs-after');
    let revealed = false;
    // the agents picture takes the panel; the set is kept for a replay
    const showAfter = () => {
      revealed = true;
      el.classList.add('fs-done');
      after.hidden = false;
      if (window.lucide) window.lucide.createIcons();
      if (opts.onReveal) opts.onReveal();
    };
    const splash = () => {
      if (revealed || el.classList.contains('fs-splashing')) return;
      el.classList.add('fs-splashing');
      setTimeout(showAfter, SPLASH_SWAP);
      setTimeout(() => el.classList.remove('fs-splashing'), SPLASH_DONE);
    };
    let replay = () => {};
    el.querySelector('.fs-replay').addEventListener('click', () => replay());
    const scroller = el.querySelector('.fs-scroll'), fit = el.querySelector('.fs-fit'), box = el.querySelector('.scene-container');
    // the stage is drawn at 1000×600 and scaled to the panel
    // (width always; height too on wide screens, where the panel is a fixed-height frame)
    const size = () => {
      const tall = matchMedia('(max-width: 860px)').matches ? Infinity : box.clientHeight / 600;
      const k = Math.min(box.clientWidth / W, tall, 1.15);
      fit.style.setProperty('--k', String(k > 0 ? k : 1));
    };
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(box);
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { el.classList.add('fs-still'); showAfter(); return; }
    const narrow = () => matchMedia('(max-width: 860px)').matches;
    // progress 0..1: the panel's own scroll on wide screens; on phones, the panel passing through the screen
    const progress = () => {
      if (!narrow()) { const max = scroller.scrollHeight - scroller.clientHeight; return max > 0 ? scroller.scrollTop / max : 0; }
      const r = el.getBoundingClientRect(), vh = innerHeight;
      return Math.min(1, Math.max(0, (vh - r.top) / r.height)); // 1 once the whole picture is on screen
    };
    loadAnime().then((anime) => {
      if (!document.body.contains(el)) return;
      el.classList.add('fs-live');
      const tl = timeline(anime, el);
      let shown = 0, target = progress(), raf = 0, clapped = false, auto = 0;
      const frame = () => {
        raf = 0;
        shown += (target - shown) * 0.2; // glide behind the scroll
        if (Math.abs(target - shown) < 0.0005) shown = target;
        tl.seek(shown * tl.duration);
        el.classList.toggle('fs-moving', shown > 0.02);
        // the clap: a flash on the slate each time it shuts going forward
        if (!clapped && shown >= SNAP) { clapped = true; el.classList.remove('fs-clap'); void el.offsetWidth; el.classList.add('fs-clap'); }
        if (shown < SNAP - 0.05) clapped = false;
        if (!revealed && shown >= END) splash();
        if (shown !== target) raf = requestAnimationFrame(frame);
      };
      // back to the set from the top: the agents picture hides, the crane starts over
      replay = () => {
        revealed = false;
        el.classList.remove('fs-done');
        after.hidden = true;
        tl.seek(0); clapped = false; target = shown = 0;
        if (!narrow()) { scroller.scrollTop = 0; scroller.focus({ preventScroll: true }); return; }
        // phones: the picture is usually all on screen already, so the shot plays by itself (about 5 s)
        auto = performance.now();
        const play = (now) => {
          if (!auto || !document.body.contains(el)) return;
          target = Math.min(1, (now - auto) / 5000);
          frame();
          if (target < 1) requestAnimationFrame(play); else auto = 0;
        };
        requestAnimationFrame(play);
      };
      const onScroll = () => { if (!document.body.contains(el)) { document.removeEventListener('scroll', onScroll, true); return; } if (auto) return; target = progress(); if (!raf) raf = requestAnimationFrame(frame); };
      document.addEventListener('scroll', onScroll, true); // capture: the panel's own scroll and the page's
      addEventListener('resize', onScroll);
      tl.seek(target * tl.duration); shown = target;
    }).catch(() => { el.classList.add('fs-still'); showAfter(); }); // no anime.js (offline): the agents picture
  }

  MPH.filmSet = { html, mount };
})();
