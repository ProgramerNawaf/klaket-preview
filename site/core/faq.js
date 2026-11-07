/* Questions. One open at a time: a list where everything is open is a wall of
   text, and a crew reading on a phone wants the next question in reach. */
(function () {
  function build() {
    const root = document.querySelector('.faq');
    const D = window.KLDATA;
    if (!root || !D) return;

    root.innerHTML = `
      <div class="wrap-narrow">
        <h2 data-reveal="up">${D.faq.title}</h2>
        <div class="faq__list" style="margin-top: clamp(2rem, 5vh, 3.5rem)">
          ${D.faq.items.map((it, i) => `
            <div class="faq__item">
              <h3 style="font:inherit;margin:0">
                <button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
                  <span class="faq__n">${String(i + 1).padStart(2, '0')}</span>
                  <span>${it.q}</span>
                  <span class="faq__mark" aria-hidden="true"><i></i><i></i></span>
                </button>
              </h3>
              <div class="faq__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div>${it.a}</div></div>
            </div>`).join('')}
        </div>
      </div>`;

    root.classList.add('faq--ready');
    const items = [...root.querySelectorAll('.faq__item')];
    const g = window.KL && KL.gsap;

    function set(item, open) {
      const panel = item.querySelector('.faq__a');
      const btn = item.querySelector('.faq__q');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (!g || (window.KL && KL.reduced)) { panel.style.height = open ? 'auto' : '0'; return; }
      g.to(panel, { height: open ? 'auto' : 0, duration: 0.45, ease: 'power3.inOut', overwrite: true });
    }

    items.forEach((item) => {
      item.querySelector('.faq__q').addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((other) => { if (other !== item) set(other, false); });
        set(item, willOpen);
        if (window.KL && KL.ScrollTrigger) KL.ScrollTrigger.refresh();
      });
    });

    if (window.KL) KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
