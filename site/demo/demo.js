/* The Request Demo form.
   Every rule here is the mirror of a check constraint in supabase/migrations/..._demo_requests.sql, so
   the database never refuses something the form accepted. Validation waits for a field to be touched:
   a form that turns red while you are still reading it is telling you off for nothing. */
(function () {
  /* Nobody fills seven fields in under two and a half seconds. */
  const MIN_FILL_MS = 2500;
  const TIMEOUT_MS = 15000;
  /* PLACEHOLDER-CONTACT: keep in step with the address in index.html. */
  const INBOX = 'hello@klaket.com';

  /* The same shape the column checks: one @, a dot in the domain, no spaces. */
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  const PHONE = /^\+[0-9][0-9 ()\-]{5,30}$/;

  let client = null;

  /* Reuse the app's client when this page is opened inside the app; otherwise make one of our own.
     persistSession is off on purpose: a public landing page must not write to the app's auth storage. */
  function supa() {
    if (window.MPH && window.MPH.sb) return window.MPH.sb;
    if (client) return client;
    const cfg = window.MPH_CONFIG;
    if (!cfg || !window.supabase) return null;
    if (/PLACEHOLDER/.test(cfg.supabaseUrl + cfg.supabaseKey)) return null;
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return client;
  }

  async function send(row) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const sb = supa();
      if (sb) {
        const { error } = await sb.from('demo_requests').insert(row).abortSignal(ctrl.signal);
        if (error) throw new Error(error.message);
        return;
      }
      /* supabase-js is vendored next to this file, so this is the it-did-not-load path. The insert is
         one POST against the same REST endpoint and the same anon key, so send it rather than lose a lead. */
      const cfg = window.MPH_CONFIG;
      if (!cfg) throw new Error('MPH_CONFIG is missing, so there is nowhere to send this.');
      const res = await fetch(cfg.supabaseUrl + '/rest/v1/demo_requests', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          apikey: cfg.supabaseKey,
          authorization: 'Bearer ' + cfg.supabaseKey,
          prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error('The database answered ' + res.status + '.');
    } finally {
      clearTimeout(timer);
    }
  }

  function build() {
    const form = document.getElementById('dm-form');
    if (!form) return;

    const el = (id) => document.getElementById(id);
    const done = el('dm-done');
    const banner = el('dm-banner');
    const bannerText = el('dm-banner-text');
    const status = el('dm-status');
    const submit = form.querySelector('.dmf__submit');
    const stamp = el('dm-started-at');
    const trap = el('dm-company-website');
    const cc = el('dm-phone-cc');

    /* Only now are the browser's own bubbles turned off: with JavaScript off, native validation is
       the only validation this form has, so the attribute must not be in the markup. */
    form.setAttribute('novalidate', '');
    stamp.value = String(Date.now());

    const val = (id) => el(id).value.trim();
    const phoneFull = () => {
      const n = val('dm-phone');
      if (!n) return '';
      /* A local number is usually typed with its trunk zero; with a country code in front it has to go. */
      return cc.value + ' ' + n.replace(/^0+/, '');
    };

    const FIELDS = [
      { id: 'dm-name', check: (v) => (v.length < 2 ? 'Tell us your full name.'
          : v.length > 200 ? 'That is longer than 200 characters.' : '') },
      { id: 'dm-email', check: (v) => (!v ? 'We need an email to reply to.'
          : v.length > 200 ? 'That is longer than 200 characters.'
          : !EMAIL.test(v) ? 'Check the email address. It needs an @ and a domain, like name@company.com.' : '') },
      { id: 'dm-company', check: (v) => (v.length < 2 ? 'Which company or production house?'
          : v.length > 200 ? 'That is longer than 200 characters.' : '') },
      { id: 'dm-role', check: (v) => (v ? '' : 'Pick the closest role.') },
      { id: 'dm-volume', check: (v) => (v ? '' : 'Roughly how many productions a year?') },
      { id: 'dm-phone', check: () => {
          const full = phoneFull();
          /* optional, so empty is correct */
          return !full || PHONE.test(full) ? '' : 'Check the number. Digits, spaces and brackets only.';
        } },
      { id: 'dm-message', check: (v) => (v.length > 2000 ? 'That is longer than 2000 characters.' : '') },
    ];

    const touched = new Set();

    function mark(f) {
      const input = el(f.id);
      const msg = f.check(input.value.trim());
      const out = el(f.id + '-err');
      if (msg && touched.has(f.id)) {
        out.textContent = msg;
        input.setAttribute('aria-invalid', 'true');
      } else {
        out.textContent = '';
        input.removeAttribute('aria-invalid');
      }
      return !msg;
    }

    FIELDS.forEach((f) => {
      const input = el(f.id);
      input.addEventListener('blur', () => { touched.add(f.id); mark(f); });
      /* Once a field has been told off, it stops being told off the moment it is right. */
      input.addEventListener('input', () => { if (touched.has(f.id)) mark(f); });
      input.addEventListener('change', () => { touched.add(f.id); mark(f); });
    });
    /* Changing the country code can make a half-typed number valid or invalid. */
    cc.addEventListener('change', () => { if (touched.has('dm-phone')) mark(FIELDS[5]); });

    function setBanner(text) {
      if (!text) { banner.hidden = true; bannerText.textContent = ''; return; }
      bannerText.textContent = text;
      banner.hidden = false;
    }

    function succeed(email) {
      el('dm-done-email').textContent = email;
      form.hidden = true;
      done.hidden = false;
      done.focus();
      if (window.KL && KL.lenis) KL.lenis.scrollTo(done, { offset: -120 });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;

      const elapsed = Date.now() - Number(stamp.value || 0);
      /* A filled honeypot or an instant submit is a bot. Show it the success state and insert nothing:
         telling it what it got wrong only teaches it to get it right. */
      if (trap.value || elapsed < MIN_FILL_MS) { succeed(val('dm-email') || 'you'); return; }

      FIELDS.forEach((f) => touched.add(f.id));
      const bad = FIELDS.filter((f) => !mark(f));
      if (bad.length) {
        setBanner(bad.length === 1 ? 'One answer needs a look. It is marked below.'
          : bad.length + ' answers need a look. They are marked below.');
        el(bad[0].id).focus();
        return;
      }

      setBanner('');
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      status.textContent = 'Sending.';

      const email = val('dm-email').toLowerCase();
      const row = {
        name: val('dm-name'),
        email,
        company: val('dm-company'),
        role: val('dm-role'),
        phone: phoneFull() || null,
        volume: val('dm-volume'),
        message: val('dm-message') || null,
        source: 'site/demo',
        user_agent: (navigator.userAgent || '').slice(0, 300),
      };

      try {
        await send(row);
        succeed(email);
      } catch (err) {
        /* The real reason goes to the console, not to the visitor: it is a database message, and
           nothing in it tells them what to do differently. Their answers stay exactly as typed. */
        console.error('[demo] the request did not send:', err);
        setBanner('That did not send. Your answers are still here, so try again. If it keeps failing, email '
          + INBOX + '.');
        status.textContent = '';
        submit.disabled = false;
        form.removeAttribute('aria-busy');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
