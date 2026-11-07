/* H3, the chapter card.
   The backdrop is a drawn set: cyc wall, floor, one tungsten head throwing a cone,
   a camera on sticks, a flag and a boom. Everything is geometry in the four
   colours, so the first frame of the film costs one SVG and no request.

   The sound is synthesised, not fetched: a noise crack through a bandpass is the
   stick, a decaying triangle is the wood, and a lowpassed noise loop is the room.
   That is why there is a toggle at all. It starts off, it needs a click to exist,
   and it suspends itself when the hero leaves the screen. */
(function () {
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const SPEAKER = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 8h3l4-3.5v11L7 12H4z" fill="currentColor"/><path class="hc__wave" d="M13.4 7a4 4 0 0 1 0 6M15.8 5a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /* Three sprocket motes and a couple of specks: enough to say the air is lit. */
  function motes() {
    const at = [[380, 300, 3], [612, 214, 2], [905, 332, 2.6], [1180, 268, 2], [742, 420, 1.8], [1015, 176, 2.2]];
    return at.map(([x, y, r]) => `<circle class="hc__mote" cx="${x}" cy="${y}" r="${r}"/>`).join('');
  }

  /* Floor marks: the tape a crew lays down for actors, not a grid. Each is a T,
     and they sit further apart as the floor comes towards the lens. */
  function floorMarks() {
    const at = [[352, 690, 0.6], [690, 726, 0.8], [1086, 702, 0.7], [474, 818, 1.1], [1210, 836, 1.2], [862, 870, 1.4]];
    return at.map(([x, y, s]) => {
      const w = 46 * s;
      const h = 26 * s;
      return `<path class="hc__mark" d="M${x - w} ${y} H${x + w} M${x} ${y} V${y + h}"/>`;
    }).join('');
  }

  const SET = `
    <svg class="hc__set" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hcWall" x1="0" y1="0" x2="0" y2="1">
          <stop class="s-wall-a" offset="0"/><stop class="s-wall-b" offset="1"/>
        </linearGradient>
        <radialGradient id="hcGlow" cx="0.3" cy="0.14" r="0.78">
          <stop class="s-glow-a" offset="0"/><stop class="s-glow-b" offset="1"/>
        </radialGradient>
        <linearGradient id="hcCone" x1="0.1" y1="0" x2="0.6" y2="1">
          <stop class="s-cone-a" offset="0"/><stop class="s-cone-b" offset="1"/>
        </linearGradient>
        <radialGradient id="hcVig" cx="0.5" cy="0.46" r="0.78">
          <stop class="s-vig-a" offset="0.4"/><stop class="s-vig-b" offset="1"/>
        </radialGradient>
        <filter id="hcSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="22"/>
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#hcWall)"/>
      <ellipse cx="470" cy="120" rx="820" ry="560" fill="url(#hcGlow)"/>

      <path class="hc__floor" d="M0 648 L1600 592 L1600 900 L0 900 Z"/>
      <path class="hc__seam" d="M0 648 L1600 592"/>
      ${floorMarks()}

      <g class="hc__cone" filter="url(#hcSoft)">
        <path class="hc__cone-g" d="M258 198 L672 900 L62 900 Z" fill="url(#hcCone)"/>
      </g>
      <path class="hc__pool" d="M232 900 C232 806 560 806 560 900 Z"/>

      <g>
        <rect class="hc__rig" x="222" y="196" width="14" height="486" rx="4"/>
        <path class="hc__rig" d="M160 690 L229 668 L298 690 L229 678 Z"/>
        <rect class="hc__rig" x="150" y="112" width="112" height="98" rx="8"/>
        <path class="hc__lens" d="M262 122 L300 106 L300 216 L262 200 Z"/>
        <path class="hc__rim" d="M154 116 V206 M262 122 V200 M154 116 H258"/>
        <path class="hc__rig" d="M150 100 H262 L250 86 H162 Z"/>
      </g>

      <g>
        <rect class="hc__rig" x="1318" y="226" width="12" height="452" rx="4"/>
        <path class="hc__rig" d="M1256 686 L1324 664 L1392 686 L1324 674 Z"/>
        <rect class="hc__rig" x="1330" y="230" width="188" height="256" rx="4"/>
        <path class="hc__rim" d="M1330 230 H1518 M1330 486 H1518" opacity="0.3"/>
      </g>

      <g>
        <rect class="hc__rig" x="858" y="574" width="16" height="178" rx="5"/>
        <path class="hc__rig" d="M782 764 L866 700 L950 764 L866 744 Z"/>
        <rect class="hc__rig" x="782" y="466" width="156" height="112" rx="10"/>
        <rect class="hc__rig" x="930" y="494" width="82" height="56" rx="10"/>
        <circle class="hc__rig" cx="824" cy="432" r="36"/>
        <circle class="hc__rig" cx="902" cy="432" r="36"/>
        <path class="hc__rim" d="M786 470 H934 M824 396 V470 M902 396 V470"/>
        <circle class="hc__rim" cx="824" cy="432" r="22" opacity="0.32"/>
        <circle class="hc__rim" cx="902" cy="432" r="22" opacity="0.32"/>
        <circle class="hc__glass" cx="1012" cy="522" r="18"/>
      </g>

      <g>
        <path class="hc__rim" d="M1600 56 L1206 214" opacity="0.45"/>
        <path class="hc__rig" d="M1206 206 L1150 228 L1156 246 L1212 224 Z"/>
      </g>

      ${motes()}
      <rect width="1600" height="900" fill="url(#hcVig)"/>
    </svg>`;

  /* ---- synthesised sound ------------------------------------------------
     No file, no request. Created on the first click, which is also the gesture
     the autoplay policy wants. */
  function makeSound() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    let ctx = null;
    let bus = null;
    let room = null;

    function noiseBuffer(seconds) {
      const n = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;   // a gentle tilt towards the low end
        d[i] = last * 3.2;
      }
      return buf;
    }

    function ensure() {
      if (ctx) return;
      ctx = new Ctx();
      bus = ctx.createGain();
      bus.gain.value = 0;
      bus.connect(ctx.destination);
    }

    /* The clap: a bright crack, then the wood under it. */
    function clap() {
      const t = ctx.currentTime + 0.02;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.2);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2100;
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      src.connect(bp).connect(g).connect(bus);
      src.start(t);
      src.stop(t + 0.22);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.42, t + 0.006);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(og).connect(bus);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    /* Room tone: three seconds of lowpassed noise on a loop, barely there. */
    function startRoom() {
      if (room) return;
      room = ctx.createBufferSource();
      room.buffer = noiseBuffer(3);
      room.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = 0.055;
      room.connect(lp).connect(g).connect(bus);
      room.start();
    }

    return {
      on() {
        ensure();
        if (ctx.state === 'suspended') ctx.resume();
        startRoom();
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setValueAtTime(0.0001, ctx.currentTime);
        bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.25);
        clap();
      },
      off() {
        if (!ctx) return;
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setValueAtTime(bus.gain.value || 0.0001, ctx.currentTime);
        bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        setTimeout(() => ctx && ctx.state === 'running' && ctx.suspend(), 280);
      },
      park() { if (ctx && ctx.state === 'running') ctx.suspend(); },
      wake() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
      close() { if (ctx) { try { ctx.close(); } catch (e) { /* already gone */ } ctx = null; } },
    };
  }

  function build() {
    const root = document.querySelector('.hero-chapter');
    const D = window.KLDATA;
    if (!root || !D) return;
    const H = D.hero;

    root.innerHTML = `
      ${SET}
      <div class="hc__card">
        <p class="hc__slug data">
          <span><i class="hc__tally"></i>SCENE 01</span>
          <span>TAKE 01</span>
          <span>ROLL A</span>
        </p>
        <h1 class="hc__title">${H.slogan}</h1>
        <p class="hc__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
        <p class="hc__lede">${H.lede}</p>
        <div class="hc__ctas">
          <a class="btn" href="${H.primary.href}">${H.primary.label}${ARROW}</a>
          <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
        </div>
      </div>

      <div class="hc__chrome">
        <button class="hc__btn hc__sound" type="button" aria-pressed="false">
          ${SPEAKER}<span class="hc__sound-label">Sound off</span>
        </button>
        <button class="hc__btn hc__skip" type="button">Skip intro${ARROW}</button>
      </div>`;

    /* ---- skip: the next section, or one screen down if this is the last ---- */
    const skip = root.querySelector('.hc__skip');
    skip.addEventListener('click', () => {
      const next = root.nextElementSibling;
      const to = next || (root.offsetTop + root.offsetHeight);
      if (window.KL && KL.lenis) KL.lenis.scrollTo(to, { offset: -8 });
      else if (next) next.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: root.offsetHeight, behavior: 'smooth' });
    });

    /* ---- sound: off until asked, and asleep whenever the hero is away ---- */
    const sound = makeSound();
    const soundBtn = root.querySelector('.hc__sound');
    const soundLabel = root.querySelector('.hc__sound-label');
    let on = false;
    if (!sound) {
      soundBtn.remove();
    } else {
      soundBtn.addEventListener('click', () => {
        on = !on;
        soundBtn.setAttribute('aria-pressed', String(on));
        soundLabel.textContent = on ? 'Sound on' : 'Sound off';
        if (on) sound.on(); else sound.off();
      });
    }

    const g = window.KL && KL.gsap;
    if (!g || (window.KL && KL.reduced)) return;

    /* ---- the title card sets, the way a card cuts in after the slate ---- */
    const card = root.querySelector('.hc__card');
    const intro = g.timeline({ delay: 0.15 });
    intro.from(root.querySelector('.hc__set'), { scale: 1.08, opacity: 0, duration: 1.4, ease: 'power2.out' }, 0)
      .from(card, { opacity: 0, scale: 0.97, y: 14, duration: 0.8, ease: 'power3.out' }, 0.25)
      .from(card.children, { opacity: 0, y: 16, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.4)
      .from(root.querySelector('.hc__chrome').children, { opacity: 0, y: 10, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.8);

    /* ---- the head breathes, and only while anyone can see it ---- */
    const cone = root.querySelector('.hc__cone-g');
    let release = null;
    function flicker() {
      if (release) return;
      release = KL.paint((time) => {
        const t = time * 1.6;
        const v = 0.78 + Math.sin(t) * 0.05 + Math.sin(t * 2.7) * 0.03 + Math.sin(t * 7.3) * 0.015;
        cone.style.setProperty('--hc-flicker', v.toFixed(3));
      });
    }
    function rest() { if (release) { release(); release = null; } }

    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        if (self.isActive) { flicker(); if (on) sound.wake(); }
        else { rest(); if (sound) sound.park(); }
      },
    });
    flicker();

    window.addEventListener('pagehide', () => { rest(); if (sound) sound.close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
