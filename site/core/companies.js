/* The companies marquee.
   PLACEHOLDER-COMPANIES: KLDATA.companies.names are invented. Swap in the real
   employers before this goes anywhere near a stakeholder.

   The roll is one GSAP tween over a track printed twice, so the seam never shows.
   Hover eases the timeScale to zero rather than stopping dead: a hard stop on a
   moving row reads as a bug, a decelerating one reads as deliberate. */
(function () {
  function build() {
    const D = window.KLDATA;
    if (!D) return;
    /* The strip appears twice on the page, under the hero and before the footer,
       so each one gets its own track and its own tween. */
    document.querySelectorAll('.companies').forEach((root, idx) => one(root, D, idx));
  }

  function one(root, D, idx) {

    const names = D.companies.names;
    root.innerHTML = `
      <p class="companies__label data">${idx === 0 ? D.companies.label : D.companies.label2}</p>
      <div class="companies__viewport">
        <div class="companies__track">
          ${[...names, ...names].map((n, i) => `<span class="companies__name" data-n="${i % names.length}"${i >= names.length ? ' aria-hidden="true"' : ''}>${n}</span>`).join('')}
        </div>
      </div>`;

    const track = root.querySelector('.companies__track');
    const spans = [...root.querySelectorAll('.companies__name')];
    const g = window.KL && KL.gsap;
    if (!g || (window.KL && KL.reduced)) return;

    /* Pace it by distance, not by a fixed duration, so a long list and a short
       one travel at the same speed. */
    const half = track.scrollWidth / 2;
    if (idx % 2) g.set(track, { x: -half });
    const roll = g.to(track, {
      x: idx % 2 ? half : -half,
      duration: half / 70,
      ease: 'none',
      repeat: -1,
    });

    const ease = (v) => g.to(roll, { timeScale: v, duration: 0.45, ease: 'power2.out', overwrite: true });

    spans.forEach((span) => {
      span.addEventListener('pointerenter', () => {
        root.classList.add('is-focusing');
        const n = span.dataset.n;
        spans.forEach((s) => s.classList.toggle('is-focus', s.dataset.n === n));
        ease(0);
      });
      span.addEventListener('pointerleave', () => {
        root.classList.remove('is-focusing');
        spans.forEach((s) => s.classList.remove('is-focus'));
        ease(1);
      });
    });

    /* A marquee that keeps running off-screen burns frames for nobody. */
    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? roll.play() : roll.pause()),
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
