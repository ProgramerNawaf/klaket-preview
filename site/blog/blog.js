/* The journal's only script.
   core/nav.js and core/footer.js write their own paths, and they are written for a
   page that sits at /site/<page>/. A post sits one level deeper, at
   /site/blog/<slug>/, so once those two have rendered, every relative path they
   produced needs one more hop out. A page asks for that with data-reroot on <html>;
   the index, being at the expected depth, asks for nothing and this returns. */
(function () {
  const hops = Number(document.documentElement.dataset.reroot || 0);
  if (!hops) return;

  const prefix = '../'.repeat(hops);
  const SHELLS = '.island, .foot';

  function reroot() {
    document.querySelectorAll(SHELLS).forEach((shell) => {
      shell.querySelectorAll('[src^="../"], [href^="../"]').forEach((el) => {
        if (el.dataset.rerooted) return;
        el.dataset.rerooted = '1';
        const attr = el.hasAttribute('src') ? 'src' : 'href';
        el.setAttribute(attr, prefix + el.getAttribute(attr));
      });
    });
  }

  /* Both modules build on DOMContentLoaded and this file loads after them, so this
     listener fires last. The immediate call covers the case where the document was
     already parsed by the time any of the three ran. */
  reroot();
  document.addEventListener('DOMContentLoaded', reroot);
  window.addEventListener('load', reroot);
})();
