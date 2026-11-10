/* Theme (Light / Dark / System) and style pack, applied to <html> before the page paints (load this in <head>).
   - data-theme: "light" | "dark", resolved from the choice; "system" follows prefers-color-scheme and its changes.
   - data-style: the UI style pack (css/styles.css). Slate (css/slate.css, on top of Workable's
     neighbours in styles.css) is the one style; the trial packs' CSS stays but nothing selects them.
   The theme choice is remembered per user (and for the sign-in screens, the last one used on this device). */
(function () {
  const MPH = (window.MPH = window.MPH || {});
  const THEMES = ['system', 'light', 'dark'];
  const STYLE = 'slate'; // the Talking Slate with depth: layered surfaces, bubble pickers, motion that explains
  let uid = null;
  const key = (name) => `klaket.${name}${uid ? '.' + uid : ''}`;
  const read = (name, fallback) => {
    try { return localStorage.getItem(key(name)) || localStorage.getItem(`klaket.${name}`) || fallback; } catch (e) { return fallback; }
  };
  const write = (name, v) => { try { localStorage.setItem(key(name), v); localStorage.setItem(`klaket.${name}`, v); } catch (e) { /* storage off */ } };
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const root = document.documentElement;

  function apply() {
    const choice = read('theme', 'dark'); // dark by default; Light and System stay one tap away in the top bar
    const dark = choice === 'dark' || (choice === 'system' && media && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeChoice = THEMES.includes(choice) ? choice : 'system';
    root.dataset.style = STYLE;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121212' : '#FBF5EC';
  }
  if (media && media.addEventListener) media.addEventListener('change', apply);
  apply();

  MPH.theme = {
    THEMES,
    get choice() { return root.dataset.themeChoice; },
    set(choice) { if (THEMES.includes(choice)) { write('theme', choice); apply(); } },
    /* after sign-in: switch to that user's saved choice */
    forUser(id) { uid = id || null; apply(); },
  };
})();
