/* F3, the bento.
   Six small loops, one clock. They share the single KL.paint frame rather than
   each starting a timer, and a demo is only touched on the beat its own state
   actually changes, so a grid of six costs a handful of class flips a second.
   A ScrollTrigger parks the clock while the section is off screen, the same way
   core/companies.js parks the marquee.

   Each loop is derived from k, never accumulated, so a loop that was paused
   mid-cycle resumes correct instead of drifting. */
(function () {
  const TICK = 820;   /* ms per beat: slow enough to read, quick enough to notice */

  const SKETCH = [
    '<path d="M4 30h64" class="s-tint" stroke-width="1.3" stroke-opacity=".75" fill="none"/><rect x="28" y="16" width="9" height="14" class="p-pale" fill-opacity=".8"/>',
    '<circle cx="36" cy="17" r="8" class="p-pale" fill-opacity=".8"/><path d="M23 34c0-8 6-13 13-13s13 5 13 13z" class="p-pale" fill-opacity=".45"/>',
    '<circle cx="36" cy="20" r="14" class="p-pale" fill-opacity=".26"/><circle cx="36" cy="20" r="5" class="p-tint"/>',
    '<path d="M4 18h64" class="s-tint" stroke-width="1.3" stroke-opacity=".5" fill="none"/><rect x="14" y="18" width="15" height="16" class="p-pale" fill-opacity=".55"/><circle cx="52" cy="24" r="7" class="p-pale" fill-opacity=".8"/>',
    '<path d="M8 34l16-18 12 12 10-9 18 15z" class="p-tint" fill-opacity=".45"/>',
    '<rect x="12" y="12" width="48" height="24" rx="2" class="p-pale" fill-opacity=".22"/><circle cx="36" cy="24" r="6" class="p-tint"/>',
  ];
  const frameSvg = (i) => `<svg viewBox="0 0 72 44" aria-hidden="true">${SKETCH[i % SKETCH.length]}</svg>`;

  /* ---- the six loops -------------------------------------------------- */
  const DEMOS = {

    /* Rows land one at a time, then the confirmations come back in. */
    callsheet: {
      states: 14, every: 1, phase: 0,
      html: `<div class="fb-cs">
        <div class="fb-head">
          <span class="fb-num fb-num--on">DAY 3 OF 7</span>
          <span class="fb-cs__time">06:00</span>
        </div>
        <ul class="fb-cs__rows">
          ${[['CAMERA', '06:00'], ['GRIP', '06:00'], ['ART', '05:30'], ['TALENT', '07:15'], ['SOUND', '06:00'], ['MAKEUP', '05:30']]
            .map(([d, t]) => `<li class="fb-cs__row fb-row">
              <span class="fb-num">${d}</span><span class="fb-bar"></span>
              <span class="fb-num fb-num--text">${t}</span><span class="fb-tick"></span></li>`).join('')}
        </ul>
        <div class="fb-cs__foot">
          <span class="fb-cs__track"><i class="fb-cs__fill"></i></span>
          <span class="fb-num fb-cs__count">0 / 18 CONFIRMED</span>
        </div>
      </div>`,
      bind(el) {
        const rows = [...el.querySelectorAll('.fb-cs__row')];
        const ticks = rows.map((r) => r.querySelector('.fb-tick'));
        const fill = el.querySelector('.fb-cs__fill');
        const count = el.querySelector('.fb-cs__count');
        return (k) => {
          const inN = Math.min(k, rows.length);
          const okN = Math.max(0, Math.min(k - rows.length, rows.length));
          rows.forEach((r, i) => r.classList.toggle('is-in', i < inN));
          ticks.forEach((t, i) => t.classList.toggle('is-on', i < okN));
          const conf = okN * 2;
          fill.style.setProperty('--p', String(Math.round((conf / 18) * 100)));
          count.textContent = `${conf} / 18 CONFIRMED`;
        };
      },
    },

    /* Two strips trade places and the day total moves with them, which is the
       whole argument of a stripboard. */
    board: {
      states: 6, every: 2, phase: 1,
      html: `<div class="fb-bo">
        <div class="fb-bo__stack">
          ${[['04', ''], ['07', ' fb-bo__strip--alt'], ['11', ''], ['02', ' fb-bo__strip--alt']]
            .map(([n, alt], i) => `<div class="fb-bo__strip${alt}" style="--y:${i}">
              <span class="fb-chip">${n}</span><span class="fb-bo__slug"></span>
              <span class="fb-num">${['1 2/8', '2', '7/8', '1 4/8'][i]}</span></div>`).join('')}
        </div>
        <div class="fb-bo__tot">
          <span class="fb-num fb-num--on">DAY 2 OF 5</span>
          <span class="fb-num fb-bo__pg">4 3/8 PAGES</span>
        </div>
      </div>`,
      bind(el) {
        const strips = [...el.querySelectorAll('.fb-bo__strip')];
        const pg = el.querySelector('.fb-bo__pg');
        const SEQ = [[0, 1], [1, 2], [2, 3], [1, 2], [0, 1]];
        const PAGES = ['4 3/8', '5 1/8', '4 6/8', '5 4/8', '4 3/8', '5 1/8'];
        return (k) => {
          const slot = strips.map((_, i) => i);   /* slot[i] = where strip i sits */
          for (let j = 0; j < k; j++) {
            const [a, b] = SEQ[j % SEQ.length];
            const ia = slot.indexOf(a);
            const ib = slot.indexOf(b);
            const t = slot[ia]; slot[ia] = slot[ib]; slot[ib] = t;
          }
          strips.forEach((s, i) => s.style.setProperty('--y', String(slot[i])));
          const lifted = k > 0 ? SEQ[(k - 1) % SEQ.length][0] : -1;
          strips.forEach((s, i) => s.classList.toggle('is-lift', slot[i] === lifted));
          pg.textContent = PAGES[k % PAGES.length] + ' PAGES';
        };
      },
    },

    /* Runs of script get tagged. The last one stays dashed, because a suggestion
       nobody has looked at is not the same thing as a tag. */
    breakdown: {
      states: 7, every: 1, phase: 3,
      html: `<div class="fb-bd">
        <div class="fb-bd__scene">04 · INT. MAJLIS - NIGHT</div>
        <div class="fb-bd__page">
          <div class="fb-bd__ln"><span class="fb-bar"></span></div>
          <div class="fb-bd__ln"><span class="fb-bar"></span><span class="fb-bd__run"><i></i></span></div>
          <div class="fb-bd__ln"><span class="fb-bd__run"><i></i></span><span class="fb-bar"></span></div>
          <div class="fb-bd__ln"><span class="fb-bar"></span></div>
          <div class="fb-bd__ln"><span class="fb-bar"></span><span class="fb-bd__run"><i></i></span></div>
          <div class="fb-bd__ln"><span class="fb-bd__run fb-bd__run--sug"><i></i></span><span class="fb-bar"></span></div>
          <div class="fb-bd__ln"><span class="fb-bar"></span></div>
        </div>
        <div class="fb-bd__foot">
          <span class="fb-num fb-bd__n">0 ELEMENTS</span>
          <span class="fb-num fb-num--warn fb-bd__rev"></span>
        </div>
      </div>`,
      bind(el) {
        const runs = [...el.querySelectorAll('.fb-bd__run')];
        const nEl = el.querySelector('.fb-bd__n');
        const revEl = el.querySelector('.fb-bd__rev');
        return (k) => {
          const n = Math.min(k, runs.length);
          runs.forEach((r, i) => r.classList.toggle('is-in', i < n));
          nEl.textContent = `${n * 3} ELEMENTS`;
          revEl.textContent = n >= runs.length ? '! 3 TO REVIEW' : '';
        };
      },
    },

    /* A version goes out and comes back decided. The spine down the leading edge
       is how the app says which of those it is. */
    approvals: {
      states: 4, every: 2, phase: 5,
      html: `<div class="fb-ap">
        <div class="fb-ap__page">
          <div class="fb-ap__top"><span class="fb-ap__mark"></span></div>
          <div class="fb-ap__kv">
            <span class="fb-bar"></span><span class="fb-bar" style="width:76%"></span><span class="fb-bar" style="width:48%"></span>
          </div>
          <div class="fb-ap__btns"><span class="fb-ap__yes">APPROVE</span><span class="fb-ap__no">CHANGES</span></div>
        </div>
        <div class="fb-ap__bar" data-k="draft">
          <span class="fb-ap__v">v1</span>
          <span class="fb-ap__v is-on">v2</span>
          <span class="fb-ap__v">v3</span>
          <span class="fb-num fb-ap__state">DRAFT</span>
          <span class="fb-tick"></span>
        </div>
      </div>`,
      bind(el) {
        const bar = el.querySelector('.fb-ap__bar');
        const state = el.querySelector('.fb-ap__state');
        const tick = el.querySelector('.fb-ap__bar .fb-tick');
        const K = ['draft', 'sent', 'approved', 'approved'];
        const L = ['DRAFT', 'SENT · LOCKED', 'APPROVED', 'APPROVED'];
        return (k) => {
          bar.dataset.k = K[k];
          state.textContent = L[k];
          state.classList.toggle('fb-num--on', k >= 2);
          tick.classList.toggle('is-on', k >= 2);
        };
      },
    },

    /* The voice memo on the left is still recording while the fields on the right
       fill in from it. */
    brief: {
      states: 7, every: 1, phase: 2,
      html: `<div class="fb-br">
        <div class="fb-br__in">
          <span class="fb-br__dot"></span>
          <span class="fb-num fb-num--text">01:12</span>
          <span class="fb-num">VOICE MEMO</span>
        </div>
        <ul class="fb-br__fields">
          ${[['OBJECTIVE', 'SET'], ['DELIVERABLES', '04'], ['SHOOT DAYS', '02'], ['BUDGET', '280 TO 320K'], ['DELIVERY', '4 NOV']]
            .map(([l, v]) => `<li class="fb-br__field">
              <span class="fb-num">${l}</span><span class="fb-br__v">${v}</span></li>`).join('')}
        </ul>
      </div>`,
      bind(el) {
        const vals = [...el.querySelectorAll('.fb-br__v')];
        return (k) => {
          const n = Math.min(k, vals.length);
          vals.forEach((v, i) => v.classList.toggle('is-in', i < n));
        };
      },
    },

    /* Shots get ticked off and the scene's own count follows. There is no take
       counter here because the product does not have one yet. */
    shots: {
      states: 8, every: 1, phase: 4,
      html: `<div class="fb-sh">
        <div class="fb-head">
          <span class="fb-num fb-num--on">SC. 4</span>
          <span class="fb-row">
            <span class="fb-num fb-sh__prog">0/6</span>
            <span class="fb-sh__bar"><i></i></span>
          </span>
        </div>
        <div class="fb-sh__strip">
          ${['4A', '4B', '4C', '4D', '4E', '4F'].map((c, i) => `<div class="fb-sh__frame">
            ${frameSvg(i)}
            <span class="fb-sh__code">${c}</span>
            <span class="fb-sh__size">${['WS', 'MS', 'CU', 'OTS', 'WS', 'ECU'][i]}</span>
            <span class="fb-tick"></span></div>`).join('')}
        </div>
      </div>`,
      bind(el) {
        const frames = [...el.querySelectorAll('.fb-sh__frame')];
        const ticks = frames.map((f) => f.querySelector('.fb-tick'));
        const prog = el.querySelector('.fb-sh__prog');
        const bar = el.querySelector('.fb-sh__bar i');
        return (k) => {
          const n = Math.min(k, frames.length);
          frames.forEach((f, i) => f.classList.toggle('is-done', i < n));
          ticks.forEach((t, i) => t.classList.toggle('is-on', i < n));
          prog.textContent = `${n}/6`;
          bar.style.setProperty('--p', String(Math.round((n / frames.length) * 100)));
        };
      },
    },
  };

  function build() {
    const root = document.querySelector('.fbento');
    const D = window.KLDATA;
    if (!root || !D) return;
    const items = D.features.items;

    root.innerHTML = `
      <div class="wrap">
        <div class="fbento__head" data-reveal="up">
          <h2 class="fbento__title" id="fbento-title">${D.features.title}</h2>
        </div>
        <div class="fbento__grid">
          ${items.map((f) => `
            <article class="fb__card fb__card--${f.key}">
              <div class="fb__demo" aria-hidden="true">${(DEMOS[f.key] || { html: '' }).html}</div>
              <h3 class="fb__name">${f.title}</h3>
              <p class="fb__body">${f.body}</p>
            </article>`).join('')}
        </div>
      </div>`;

    /* One record per card: its own cycle length, its own pace and its own offset,
       so six loops on one clock do not march in step. */
    const loops = [];
    items.forEach((f) => {
      const spec = DEMOS[f.key];
      const el = root.querySelector(`.fb__card--${f.key} .fb__demo`);
      if (!spec || !el) return;
      const apply = spec.bind(el);
      loops.push({ apply, states: spec.states, every: spec.every, phase: spec.phase, k: -1 });
    });

    const reduced = !window.KL || !KL.paint || KL.reduced;
    if (reduced) {
      /* The end of each cycle is the state that makes the point, so park there. */
      root.classList.add('fbento--still');
      loops.forEach((l) => l.apply(l.states - 1));
      if (window.KL && KL.autoReveal) KL.autoReveal(root);
      return;
    }

    loops.forEach((l) => { l.k = 0; l.apply(0); });

    let live = true;
    let beat = 0;
    let last = -Infinity;
    const stop = KL.paint((time) => {
      if (!live) return;
      const ms = time * 1000;
      if (ms - last < TICK) return;
      last = ms;
      beat += 1;
      for (const l of loops) {
        const k = Math.floor((beat + l.phase) / l.every) % l.states;
        if (k !== l.k) { l.k = k; l.apply(k); }
      }
    });

    /* Loops that keep running off screen burn frames for nobody. */
    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        live = self.isActive;
        root.classList.toggle('is-idle', !self.isActive);
      },
    });

    window.addEventListener('pagehide', () => stop && stop());
    KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
