/* Public configuration. The Supabase publishable (anon) key is designed to be public:
   what each user can read or write is enforced by Row Level Security in the database. */
window.MPH_CONFIG = {
  brand: 'Klaket',
  preview: true, // stakeholder preview build (klaket-staging)
  supabaseUrl: 'https://ynoiedyobvsrvuoaggqu.supabase.co',
  supabaseKey: 'sb_publishable_DKacttTPNeuyEoVdUG1n6w_hXSwmLRI',
  demoUrl: 'https://alomaiir.github.io/mph-prototype/',
};

/* Local development: on localhost, open the app with ?db=local to use the local Supabase stack (`npx supabase start`,
   seeded from supabase/seed.sql) and ?db=live to switch back. The choice is remembered in this browser.
   The local key is the CLI's fixed default; it only works against 127.0.0.1. */
(function () {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  var pick = new URLSearchParams(location.search).get('db');
  try {
    if (pick === 'local') localStorage.setItem('mph.db', 'local');
    if (pick === 'live') localStorage.removeItem('mph.db');
    if (localStorage.getItem('mph.db') !== 'local') return;
  } catch (e) { if (pick !== 'local') return; }
  window.MPH_CONFIG.supabaseUrl = 'http://127.0.0.1:55321';
  window.MPH_CONFIG.supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
  window.MPH_CONFIG.localDb = true;
})();
