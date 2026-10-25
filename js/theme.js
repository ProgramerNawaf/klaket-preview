/* Theme (Light / Dark / System) and style pack, applied to <html> before the page paints (load this in <head>).
   - data-theme: "light" | "dark", resolved from the choice; "system" follows prefers-color-scheme and its changes.
   - data-style: the UI style pack on trial (css/styles.css): n26 | workable | intercom | customerio | gitbutler.
   The choice is remembered per user (and for the sign-in screens, the last one used on this device). */
(function () {
  const MPH = (window.MPH = window.MPH || {});
  const THEMES = ['system', 'light', 'dark'];
  const STYLES = [
    { id: 'n26', label: 'N26', note: 'Calm vault: one teal, quiet space' },
    { id: 'workable', label: 'Workable', note: 'Warm newsroom: soft cards, crisp buttons' },
    { id: 'intercom', label: 'Intercom', note: 'Cream editorial: sharp, mono labels' },
    { id: 'customerio', label: 'Customer.io', note: 'Spruce & paper: flat, hairlines' },
    { id: 'gitbutler', label: 'GitButler', note: 'Teal terminal: technical grids' },
  ];
  let uid = null;
  const key = (name) => `klaket.${name}${uid ? '.' + uid : ''}`;
  const read = (name, fallback) => {
    try { return localStorage.getItem(key(name)) || localStorage.getItem(`klaket.${name}`) || fallback; } catch (e) { return fallback; }
  };
  const write = (name, v) => { try { localStorage.setItem(key(name), v); localStorage.setItem(`klaket.${name}`, v); } catch (e) { /* storage off */ } };
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const root = document.documentElement;

  function apply() {
    const choice = read('theme', 'system');
    const dark = choice === 'dark' || (choice === 'system' && media && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeChoice = THEMES.includes(choice) ? choice : 'system';
    const style = read('style', 'n26');
    root.dataset.style = STYLES.some((s) => s.id === style) ? style : 'n26';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121212' : '#FBF5EC';
  }
  if (media && media.addEventListener) media.addEventListener('change', apply);
  apply();

  MPH.theme = {
    THEMES, STYLES,
    get choice() { return root.dataset.themeChoice; },
    get style() { return root.dataset.style; },
    set(choice) { if (THEMES.includes(choice)) { write('theme', choice); apply(); } },
    setStyle(id) { if (STYLES.some((s) => s.id === id)) { write('style', id); apply(); } },
    /* after sign-in: switch to that user's saved choice */
    forUser(id) { uid = id || null; apply(); },
  };
})();
