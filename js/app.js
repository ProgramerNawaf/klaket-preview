/* MPH platform shell: auth gate, hash router, rail, production phases, overlays, toasts.
   Routes (dot tokens):  #login  #signup  #invite.<token>  #setup  #home  #productions  #team  #account
                         #p.<productionId>.<module>[.<param>] */
(function () {
  const { esc, t, ui, api } = MPH;
  const cfg = window.MPH_CONFIG;
  const app = document.getElementById('app');
  const overlay = document.getElementById('overlay');
  const toasts = document.getElementById('toasts');

  /* ------------------------------------------------------------ production flow
     `live` modules work in Phase 1; the rest show a "coming soon" page linking to the demo. */
  const PHASES = [
    /* each phase is an ordered sequence of steps, grouped into activities (tabs keep the same order) */
    { id: 'pre', label: 'Pre-production', icon: 'pencil-ruler', color: 'var(--phase-band)',
      tabs: [['brief', 'Brief', 'clipboard-list', 1], ['script', 'Script', 'file-text', 1], ['treatment', 'Treatment & Lookbook', 'gallery-vertical-end', 1],
             ['breakdown', 'AI Breakdown', 'scan-text', 1],
             ['storyboard', 'Storyboard', 'layout-grid', 1], ['shotlist', 'Shot List', 'list-video', 1],
             ['stripboard', 'Stripboard', 'rows-3', 1], ['calendar', 'Calendar', 'calendar-days', 1],
             ['budget', 'Budget & Bid', 'calculator', 1]],
      groups: [['Brief', ['brief']], ['Story', ['script', 'treatment']], ['Breakdown', ['breakdown']], ['Visualize', ['storyboard', 'shotlist']],
               ['Schedule', ['stripboard', 'calendar']], ['Budget', ['budget']]] },
    { id: 'prod', label: 'Production', icon: 'clapperboard', color: 'var(--phase-band)',
      tabs: [['crew', 'Crew & Talent', 'users', 1], ['locations', 'Locations', 'map-pin', 1], ['callsheets', 'Call Sheets', 'clipboard-list', 1], ['shootday', 'Shoot Day', 'radio', 1]],
      groups: [['Team & places', ['crew', 'locations']], ['Shoot', ['callsheets', 'shootday']]] },
    { id: 'post', label: 'Post-production', icon: 'film', color: 'var(--phase-band)',
      tabs: [['dailies', 'Dailies & Media', 'hard-drive'], ['edit', 'Edit & Versions', 'scissors'], ['review', 'Review & Approvals', 'circle-check-big'],
             ['finishing', 'Finishing', 'wand-sparkles'], ['deliverables', 'Deliverables', 'package-check', 1], ['wrap', 'Wrap Report', 'file-bar-chart']],
      groups: [['Edit', ['dailies', 'edit']], ['Approve', ['review']], ['Finish & deliver', ['finishing', 'deliverables']], ['Close', ['wrap']]] },
  ];
  const CLIENT_MODULES = ['overview', 'brief', 'treatment', 'script', 'storyboard', 'calendar', 'budget', 'docs'];
  const phaseOf = (prod) => ({ 'Briefing': 'pre', 'Development': 'pre', 'Bidding': 'pre', 'Pre-production': 'pre', 'Shooting': 'prod', 'Post-production': 'post', 'Delivered': 'post' }[prod.status] || 'pre');
  const phaseForModule = (mod) => PHASES.find((ph) => ph.tabs.some(([id]) => id === mod));
  const isLive = (mod) => mod === 'overview' || mod === 'docs' || PHASES.some((ph) => ph.tabs.some(([id, , , live]) => id === mod && live));
  MPH.PHASES = PHASES;
  MPH.phaseOf = phaseOf;

  /* ------------------------------------------------------------ overlays & toasts */
  function openOverlay(html, mode, opts = {}) {
    overlay.className = mode === 'drawer' ? 'drawer-mode' : 'modal-mode';
    overlay.innerHTML = `<div class="${mode === 'drawer' ? 'drawer' : `modal ${opts.wide ? 'wide' : ''}`}" role="dialog" aria-modal="true">${html}</div>`;
    overlay.hidden = false;
    icons();
    const first = overlay.querySelector('input:not([type=hidden]), select, textarea');
    if (first) first.focus({ preventScroll: true });
    return overlay.firstElementChild;
  }
  const closeOverlay = () => { overlay.hidden = true; overlay.innerHTML = ''; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) closeOverlay(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closeOverlay(); });
  MPH.frame = ({ title, sub = '', body = '', foot = '' }) => `
    <header class="overlay-head"><div class="grow stack tight" style="gap:2px"><h2 class="h2">${title}</h2>${sub ? `<span class="small muted">${sub}</span>` : ''}</div>
      <button class="btn btn-ghost btn-sm btn-icon" data-close aria-label="Close">${ui.icon('x')}</button></header>
    <div class="overlay-body">${body}</div>${foot ? `<footer class="overlay-foot">${foot}</footer>` : ''}`;
  MPH.modal = (html, opts) => openOverlay(html, 'modal', opts);
  MPH.drawer = (html) => openOverlay(html, 'drawer');
  MPH.closeOverlay = closeOverlay;
  MPH.toast = (msg, icon = 'check', kind = '') => {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${ui.icon(kind === 'error' ? 'triangle-alert' : icon)}<span>${esc(msg)}</span>`;
    toasts.appendChild(el); icons();
    setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3200);
  };
  MPH.toastError = (err) => MPH.toast(err?.message || String(err), 'triangle-alert', 'error');
  /* swap <i data-lucide> placeholders for SVGs. Only unconverted placeholders are touched (lucide.createIcons
     re-draws every icon on the page on each call), and each icon is built once and cloned after that. */
  const iconTpl = new Map();
  const pascal = (n) => n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  const icons = (scope = document) => {
    const L = window.lucide;
    if (!L) return;
    scope.querySelectorAll('i[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      let tpl = iconTpl.get(name);
      if (tpl === undefined) {
        const node = L.icons[pascal(name)];
        tpl = node ? L.createElement(node) : null;
        if (tpl) { tpl.setAttribute('stroke-width', '1.8'); tpl.setAttribute('data-lucide', name); tpl.classList.add('lucide', `lucide-${name}`); }
        iconTpl.set(name, tpl);
      }
      if (!tpl) return;
      const svg = tpl.cloneNode(true);
      for (const a of el.attributes) {
        if (a.name === 'class') a.value.split(/\s+/).filter(Boolean).forEach((c) => svg.classList.add(c));
        else if (a.name !== 'data-lucide') svg.setAttribute(a.name, a.value);
      }
      el.replaceWith(svg);
    });
  };
  MPH.icons = icons;

  /* ------------------------------------------------------------ routing */
  const parse = () => {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';
    const parts = raw.split('.');
    if (parts[0] === 'p') return { section: 'p', productionId: parts[1], view: parts[2] || 'overview', params: parts.slice(3) };
    return { section: parts[0], view: parts[0], params: parts.slice(1) };
  };
  const go = (hash) => { const h = hash.startsWith('#') ? hash : '#' + hash; if (location.hash === h) render(); else location.hash = h; };
  MPH.go = go;

  /* production cache for the header (refreshed on every production route) */
  let prodCache = null;
  let prodFresh = false; // set by refreshAll: the next render re-reads the production instead of using the cache
  async function loadProduction(id) {
    const { data, error } = await MPH.sb.from('productions').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  /* Each screen's data is kept for a while so moving between tabs is instant: a revisited screen draws from the
     copy at once, re-reads in the background, and redraws only if something changed and you haven't started
     using the screen yet. ctx.reload() (after your own edits) always reads fresh. */
  const viewCache = new Map(); // key -> { data, json, at }
  const VIEW_TTL = 10 * 60 * 1000;
  const snapshot = (d) => { try { return JSON.stringify(d); } catch (e) { return null; } };
  const cacheKey = (r, prod, clientish) => `${r.view}|${prod ? prod.id : ''}|${r.params.join('.')}|${clientish ? 'client' : 'team'}|${MPH.session ? MPH.session.org?.id : ''}`;
  const cacheable = (r, data) => !r.params.some((p) => p === 'new' || p === 'run') && !(data && data.redirect);
  const remember = (key, data) => {
    viewCache.delete(key);
    viewCache.set(key, { data, json: snapshot(data), at: Date.now() });
    while (viewCache.size > 30) viewCache.delete(viewCache.keys().next().value);
  };
  MPH.clearCache = () => { viewCache.clear(); prodCache = null; };

  /* ------------------------------------------------------------ auth screens
     Split layout: a minimal form beside an interactive picture of Klaket's agents at work: the brief, the ideas, the
     client's approval, the script and the director's treatment, then the budget estimate as a graph. It plays on its
     own; clicking a stage pins it (wireAgents). */
  const AGENTS = [
    { id: 'brief', icon: 'inbox', en: ['Briefing agent', 'Reads the client’s email and the kickoff call, and fills the brief.'], ar: ['وكيل البريف', 'يقرأ إيميل العميل ومكالمة الكيك أوف، ويعبّي البريف.'] },
    { id: 'creative', icon: 'lightbulb', en: ['Creative agent', 'Turns the brief into creative ideas.'], ar: ['الوكيل الإبداعي', 'يحوّل البريف لأفكار إبداعية.'] },
    { id: 'approve', icon: 'badge-check', en: ['Client approves', 'One idea goes ahead.'], ar: ['العميل يعتمد', 'فكرة وحدة تمشي.'] },
    { id: 'script', icon: 'file-text', en: ['Script agent', 'Writes the script, scene by scene.'], ar: ['وكيل السكربت', 'يكتب السكربت مشهد مشهد.'] },
    { id: 'treatment', icon: 'clapperboard', en: ['Director’s treatment', 'The look, the feel, the frames.'], ar: ['معالجة المخرج', 'الشكل والإحساس واللقطات.'] },
    { id: 'budget', icon: 'chart-column', en: ['Budgeting agent', 'Reads the script and estimates the cost.'], ar: ['وكيل الميزانية', 'يقرأ السكربت ويقدّر التكلفة.'] },
  ];
  /* the estimate the budgeting agent draws (SAR thousands) and what in the script drives each line */
  const BUDGET = [
    { k: 'crew', v: 82, en: ['Crew', '2 shoot days · 18 crew'], ar: ['الطاقم', 'يومين تصوير · ١٨ فرد'] },
    { k: 'equip', v: 54, en: ['Equipment', 'Car rig · drone · lights'], ar: ['المعدات', 'ريق سيارة · درون · إضاءة'] },
    { k: 'cast', v: 46, en: ['Cast', 'Father, son, family of 5'], ar: ['الممثلين', 'أب وابن وعائلة من ٥'] },
    { k: 'post', v: 38, en: ['Post', '60s + 30s + 15s cuts'], ar: ['ما بعد الإنتاج', '٦٠ + ٣٠ + ١٥ ثانية'] },
    { k: 'loc', v: 28, en: ['Locations', 'King Fahd Rd · desert'], ar: ['المواقع', 'طريق الملك فهد · الصحراء'] },
    { k: 'cont', v: 20, en: ['Contingency', '8% of the total'], ar: ['احتياطي', '٨٪ من الإجمالي'] },
  ];
  function agentOutput(id, ar) {
    const L = (en, a) => (ar ? a : en);
    if (id === 'brief') return `
      <div class="ag-k"><span class="eyebrow">${L('Brief v1 · from the kickoff call', 'بريف v1 · من مكالمة الكيك أوف')}</span><span class="ag-src mono" dir="ltr">FAHAD, 03:12</span></div>
      <dl class="ag-fields">
        <dt>${L('Objective', 'الهدف')}</dt><dd>${L('Awareness → test-drive bookings', 'الوعي ← حجوزات تجربة القيادة')}</dd>
        <dt>${L('Audience', 'الجمهور')}</dt><dd><span lang="ar" dir="rtl">الأب والأم بين ٣٠ و٤٥، عندهم أطفال</span></dd>
        <dt>${L('Platforms', 'المنصات')}</dt><dd><span class="mono">16:9</span> YouTube · <span class="mono">9:16</span> Reels · ${L('Cinema', 'سينما')}</dd>
        <dt>${L('Budget', 'الميزانية')}</dt><dd>SAR 250–300K <span class="pill warn">${L('1 conflict', 'تعارض واحد')}</span></dd>
        <dt>${L('Go-live', 'الإطلاق')}</dt><dd><span class="mono" dir="ltr">01 DEC</span></dd>
      </dl>`;
    if (id === 'creative') return `
      <div class="ag-k"><span class="eyebrow">${L('3 ideas from the brief', '٣ أفكار من البريف')}</span></div>
      <div class="ag-ideas">
        <div class="ag-idea on"><span class="mono">01</span><b>${L('Father teaches son to drive', 'الأب يعلّم ولده السواقة')}</b><small>${L('Years later, the son does the same in the X7. Fahad’s own idea.', 'وبعد سنين، الولد يعيدها مع عياله في X7. فكرة فهد نفسه.')}</small></div>
        <div class="ag-idea"><span class="mono">02</span><b>${L('Riyadh after sunset', 'الرياض بعد الغروب')}</b><small>${L('One family, one night drive.', 'عائلة وحدة، مشوار ليلي.')}</small></div>
        <div class="ag-idea"><span class="mono">03</span><b>${L('Seven seats, seven stories', 'سبعة مقاعد، سبع حكايات')}</b><small>${L('Every seat has its own moment.', 'كل مقعد له لحظته.')}</small></div>
      </div>`;
    if (id === 'approve') return `
      <div class="ag-approve">${ui.bubble('approved', 'teal')}
        <p class="ag-big">${L('Idea 01 goes ahead.', 'الفكرة ٠١ تمشي.')}</p>
        <p class="ag-small"><span class="mono" dir="ltr">SARA · MARKETING DIRECTOR · v1</span></p></div>`;
    if (id === 'script') return `
      <div class="ag-k"><span class="eyebrow mono" dir="ltr">SCENE 01 · TAKE 01</span><span class="ag-src mono" dir="ltr">0:00–0:12</span></div>
      <p class="ag-slug mono" dir="ltr">EXT. KING FAHD ROAD — GOLDEN HOUR</p>
      <p class="ag-line">${L('A father in the passenger seat. His teenage son grips the wheel of the X7, eyes fixed ahead.', 'أب في مقعد الراكب. ولده المراهق ماسك دركسون الـX7، وعيونه على الطريق.')}</p>
      <p class="ag-line ag-dia" lang="ar" dir="rtl"><b>الأب:</b> «خلك هادي… وناظر قدّام.»</p>`;
    if (id === 'treatment') return `
      <div class="ag-k"><span class="eyebrow">${L('Director’s treatment · look & feel', 'معالجة المخرج · الشكل والإحساس')}</span></div>
      <div class="ag-frames">
        <figure class="ag-frame f1"><span></span><figcaption class="mono">WIDE · GOLDEN HOUR</figcaption></figure>
        <figure class="ag-frame f2"><span></span><figcaption class="mono">CLOSE · HANDS ON THE WHEEL</figcaption></figure>
        <figure class="ag-frame f3"><span></span><figcaption class="mono">TOP · SEVEN SEATS</figcaption></figure>
      </div>
      <div class="ag-tone"><span class="tag">${L('Warm', 'دافي')}</span><span class="tag">${L('Real', 'حقيقي')}</span><span class="tag">${L('Not glossy', 'مو لمّاع')}</span><span class="tag">${L('Handheld', 'كاميرا محمولة')}</span></div>`;
    const total = BUDGET.reduce((t, x) => t + x.v, 0), max = Math.max(...BUDGET.map((x) => x.v)), scale = 320;
    return `
      <div class="ag-k"><span class="eyebrow">${L('Estimate from script v1', 'تقدير من السكربت v1')}</span><span class="ag-total"><span class="mono" dir="ltr">SAR ${total}K</span></span></div>
      <div class="ag-meter" role="img" aria-label="${L(`Estimate SAR ${total}K, inside the brief's SAR 250–300K`, `التقدير ${total} ألف ريال، داخل ميزانية البريف ٢٥٠–٣٠٠ ألف`)}">
        <span class="ag-band" style="inset-inline-start:${250 / scale * 100}%;width:${50 / scale * 100}%"></span>
        <span class="ag-fill" style="--w:${total / scale * 100}%"></span>
        <span class="ag-meter-l mono">${L('BRIEF 250–300K', 'البريف ٢٥٠–٣٠٠ ألف')}</span>
      </div>
      <div class="ag-bars" role="group" aria-label="${L('Estimate by department', 'التقدير حسب القسم')}">
        ${BUDGET.map((x, i) => `<button type="button" class="ag-bar" data-bar="${i}" style="--h:${x.v / max * 100}%;--d:${i * 70}ms" aria-label="${esc((ar ? x.ar : x.en)[0])}: SAR ${x.v}K">
          <span class="ag-bar-v mono">${x.v}K</span><span class="ag-bar-col"></span><span class="ag-bar-l">${esc((ar ? x.ar : x.en)[0])}</span></button>`).join('')}
      </div>
      <p class="ag-why" aria-live="polite"><span class="mono">${esc((ar ? BUDGET[0].ar : BUDGET[0].en)[0]).toUpperCase()} · SAR ${BUDGET[0].v}K</span> — ${esc((ar ? BUDGET[0].ar : BUDGET[0].en)[1])}</p>`;
  }
  function authArt() {
    const ar = MPH.state.lang === 'ar';
    const L = (en, a) => (ar ? a : en);
    return `
      <aside class="aa ag" aria-label="${L('Klaket’s agents, from the brief to the budget', 'وكلاء كلاكيت، من البريف إلى الميزانية')}">
        <div class="ag-head">
          <span class="eyebrow mono">${L('KLAKET AGENTS · FROM BRIEF TO BUDGET', 'وكلاء كلاكيت · من البريف إلى الميزانية')}</span>
          <p class="ag-title">${L('The whole crew, in one conversation.', 'الطاقم كله، في محادثة وحدة.')}</p>
        </div>
        <ol class="ag-steps">
          ${AGENTS.map((g, i) => `<li><button type="button" class="ag-step${i === 0 ? ' on' : ''}${g.id === 'approve' ? ' gate' : ''}" data-agent="${i}" aria-pressed="${i === 0}">
            <span class="ag-node">${ui.icon(g.icon)}<span class="kl-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>
            <span class="ag-name">${esc((ar ? g.ar : g.en)[0])}</span></button></li>`).join('')}
        </ol>
        <div class="ag-stage">
          <p class="ag-does" aria-live="polite">${esc((ar ? AGENTS[0].ar : AGENTS[0].en)[1])}</p>
          <div class="ag-card" data-out="brief">${agentOutput('brief', ar)}</div>
        </div>
        <div class="ag-foot"><span class="mono">${L('AI DRAFTS · YOU DECIDE', 'الذكاء يقترح · وأنت تقرّر')}</span></div>
      </aside>`;
  }
  /* the agents picture: plays stage by stage; a click (or Enter) pins a stage for a while; hovering a budget bar explains it */
  function wireAgents(root) {
    const el = root && root.querySelector('.ag');
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    const ar = MPH.state.lang === 'ar';
    const steps = [...el.querySelectorAll('.ag-step')];
    const card = el.querySelector('.ag-card'), does = el.querySelector('.ag-does');
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = 0, timer = null, pinnedUntil = 0;
    const show = (i) => {
      cur = (i + AGENTS.length) % AGENTS.length;
      steps.forEach((b, k) => { b.classList.toggle('on', k === cur); b.classList.toggle('done', k < cur); b.setAttribute('aria-pressed', String(k === cur)); });
      const g = AGENTS[cur];
      does.textContent = (ar ? g.ar : g.en)[1];
      card.classList.remove('in'); void card.offsetWidth;
      card.dataset.out = g.id; card.innerHTML = agentOutput(g.id, ar); card.classList.add('in');
      icons(card);
      if (g.id === 'budget') wireBars();
    };
    const wireBars = () => {
      const why = card.querySelector('.ag-why');
      card.querySelectorAll('.ag-bar').forEach((b) => {
        const say = () => {
          card.querySelectorAll('.ag-bar').forEach((x) => x.classList.toggle('hot', x === b));
          const x = BUDGET[Number(b.dataset.bar)], t = ar ? x.ar : x.en;
          why.innerHTML = `<span class="mono">${esc(t[0]).toUpperCase()} · SAR ${x.v}K</span> — ${esc(t[1])}`;
        };
        b.addEventListener('mouseenter', say); b.addEventListener('focus', say); b.addEventListener('click', () => { pinnedUntil = Date.now() + 15000; say(); });
      });
    };
    const tick = () => {
      if (!document.body.contains(el)) { clearTimeout(timer); return; }
      if (Date.now() >= pinnedUntil) show(cur + 1);
      timer = setTimeout(tick, AGENTS[cur].id === 'budget' ? 7000 : 3600);
    };
    steps.forEach((b) => b.addEventListener('click', () => { pinnedUntil = Date.now() + 15000; show(Number(b.dataset.agent)); }));
    el.addEventListener('mouseenter', () => { pinnedUntil = Math.max(pinnedUntil, Date.now() + 4000); });
    if (!still) timer = setTimeout(tick, 3600);
  }
  /* shared frame for sign-in, sign-up, onboarding and invite screens: form on the start side, picture on the end side */
  const authShell = (inner) => `
    <div class="auth2">
      <main class="auth-panel">
        <div class="auth-inner">
          <a class="auth-logo" href="#login">${MPH.logo({ variant: 'vertical', size: 64 })}</a>
          ${inner}
        </div>
      </main>
      ${authArt()}
    </div>`;

  /* borderless floating-label field. The label sits inside and floats up once there's a value. */
  const fx = ({ id, label, icon, type = 'text', value = '', autocomplete = '', dir = '', end = '', attrs = '' }) => `
    <label class="fx" for="${id}">
      <span class="fx-icon">${ui.icon(icon)}</span>
      <input id="${id}" class="fx-input" type="${type}" placeholder=" " value="${esc(value)}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${dir ? ` dir="${dir}"` : ''} ${attrs}>
      <span class="fx-label">${esc(label)}</span>
      ${end}
      <span class="fx-line" aria-hidden="true"></span>
    </label>`;

  /* pointer spotlight on fields, cards and buttons: sets --mx/--my for the CSS glow */
  function wireGlow(root) {
    root.querySelectorAll('.fx, .acct-card, .auth-submit, .msel-trigger').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
  const shake = (el) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  /* open/close a collapsing row; "settled" (overflow visible) is added once the slide has finished */
  const setCollapse = (el, open) => {
    clearTimeout(el._settle);
    el.classList.remove('settled');
    if (open) { el.removeAttribute('inert'); el._settle = setTimeout(() => el.classList.add('settled'), 450); }
    else el.setAttribute('inert', '');
  };
  const settleOpen = (root) => root.querySelectorAll('.au-collapse:not([inert])').forEach((el) => el.classList.add('settled'));

  const AUTH_COPY = {
    login: { title: 'Welcome back', sub: 'Sign in to your workspace.', button: 'Sign in' },
    signup: { title: 'Create your account', sub: 'For everyone in production: producers, crew, talent, agencies and brands. Free to start.', button: 'Create account' },
  };

  function authScreen(mode, info = {}) {
    const signup = mode === 'signup';
    const copy = AUTH_COPY[mode];
    return authShell(`
      <div class="stack tight">
        <h1 class="auth-title" id="au-title">${info.title || copy.title}</h1>
        <p class="muted" id="au-sub">${info.sub || copy.sub}</p>
      </div>
      ${info.title ? '' : `<div class="auth-switch" role="tablist" data-mode="${mode}">
        <span class="auth-switch-pill" aria-hidden="true"></span>
        <button type="button" role="tab" data-mode-to="login" aria-selected="${!signup}">Sign in</button>
        <button type="button" role="tab" data-mode-to="signup" aria-selected="${signup}">Create account</button>
      </div>`}
      <form id="auth-form" class="auth-form" data-mode="${mode}" novalidate>
        <div class="au-collapse" data-only="signup" ${signup ? '' : 'inert'}><div>${fx({ id: 'au-name', label: 'Full name', icon: 'user-round', autocomplete: 'name' })}</div></div>
        ${fx({ id: 'au-email', label: 'Email', icon: 'mail', type: 'email', value: info.email || '', autocomplete: 'email' })}
        ${fx({ id: 'au-pass', label: 'Password', icon: 'lock-keyhole', type: 'password', autocomplete: signup ? 'new-password' : 'current-password', attrs: 'minlength="8"',
               end: `<button type="button" class="fx-end" id="au-eye" aria-label="Show password">${ui.icon('eye')}</button>` })}
        <div class="row between au-meta">
          <span class="tiny faint" data-only="signup" ${signup ? '' : 'hidden'}>At least 8 characters</span>
          <button class="auth-link" type="button" id="au-forgot" data-only="login" ${signup ? 'hidden' : ''}>Forgot password?</button>
        </div>
        <div id="au-error" hidden></div>
        <button class="btn btn-primary auth-submit" type="submit" id="au-submit"><span id="au-btn-text">${copy.button}</span>${ui.icon('arrow-right')}</button>
      </form>
      <a class="auth-demo" href="${esc(cfg.demoUrl)}" target="_blank" rel="noopener">${ui.icon('play')}Just looking? Watch the click-through demo</a>`);
  }

  function mountAuth(mode, next) {
    const form = document.getElementById('auth-form');
    const err = document.getElementById('au-error');
    const show = (m, bad = true) => { err.hidden = false; err.innerHTML = ui.errorBox(m); icons(); if (bad) shake(form); };
    wireGlow(document.getElementById('app'));
    wireAgents(document.getElementById('app'));
    settleOpen(form);

    // switch Sign in / Create account in place: the pill slides, the name field opens, copy changes
    const sw = document.querySelector('.auth-switch');
    const setMode = (m) => {
      mode = m;
      const signup = m === 'signup';
      sw.dataset.mode = m; form.dataset.mode = m;
      sw.querySelectorAll('[data-mode-to]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modeTo === m)));
      form.querySelectorAll('[data-only]').forEach((el) => {
        const on = el.dataset.only === m;
        if (el.classList.contains('au-collapse')) setCollapse(el, on);
        else el.hidden = !on;
      });
      document.getElementById('au-title').textContent = AUTH_COPY[m].title;
      document.getElementById('au-sub').textContent = AUTH_COPY[m].sub;
      document.getElementById('au-btn-text').textContent = AUTH_COPY[m].button;
      document.getElementById('au-pass').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
      err.hidden = true;
      history.replaceState(null, '', `#${m}${next ? '.' + next : ''}`);
      (signup ? document.getElementById('au-name') : document.getElementById('au-email')).focus({ preventScroll: true });
    };
    if (sw) sw.addEventListener('click', (e) => { const b = e.target.closest('[data-mode-to]'); if (b && b.dataset.modeTo !== mode) setMode(b.dataset.modeTo); });

    const eye = document.getElementById('au-eye');
    if (eye) eye.addEventListener('click', () => {
      const f = document.getElementById('au-pass');
      const showing = f.type === 'text';
      f.type = showing ? 'password' : 'text';
      eye.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      eye.innerHTML = ui.icon(showing ? 'eye' : 'eye-off'); icons();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('au-email').value.trim();
      const pass = document.getElementById('au-pass').value;
      if (!email || pass.length < 8) return show('Enter your email and a password of at least 8 characters.');
      const btn = document.getElementById('au-submit');
      const reset = () => { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = `<span id="au-btn-text">${AUTH_COPY[mode].button}</span>${ui.icon('arrow-right')}`; icons(); };
      if (mode === 'signup' && !document.getElementById('au-name').value.trim()) return show('Add your full name.');
      btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = `${ui.spinner()} Please wait`;
      try {
        if (mode === 'signup') {
          const name = document.getElementById('au-name').value.trim();
          const { data, error } = await api.signUp(email, pass, name);
          if (error) throw error;
          if (!data.session) { show('Check your email to confirm your account, then sign in.', false); reset(); return; }
        } else {
          const { error } = await api.signIn(email, pass);
          if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password don’t match an account.' : error.message);
        }
        const endSplash = MPH.splash ? MPH.splash() : () => {}; // أكشن: the slate claps while the workspace opens (3 s)
        try { await api.loadSession(); } finally { endSplash(); }
        go(next ? decodeURIComponent(next) : 'home');
      } catch (ex) {
        show(ex.message); reset();
      }
    });
    const forgot = document.getElementById('au-forgot');
    if (forgot) forgot.addEventListener('click', async () => {
      const email = document.getElementById('au-email').value.trim();
      if (!email) return show('Type your email first, then choose Forgot password.');
      const { error } = await api.resetPassword(email);
      show(error ? error.message : 'If that email has an account, a reset link is on its way.', !!error);
    });
  }

  /* ------------------------------------------------------------ onboarding: about you */
  const PROFESSIONS = [
    ['Production', ['Producer', 'Executive producer', 'Line producer', 'Production manager', 'Production coordinator', 'Production assistant']],
    ['Direction', ['Director', 'Assistant director', 'Script supervisor']],
    ['Camera & lighting', ['Director of photography', 'Camera operator', 'Camera assistant', 'Drone operator', 'Gaffer', 'Grip', 'Photographer', 'DIT']],
    ['Art & costume', ['Production designer', 'Art director', 'Set decorator', 'Props master', 'Wardrobe stylist', 'Hair & makeup']],
    ['Sound & music', ['Sound recordist', 'Sound designer', 'Composer']],
    ['Post-production', ['Editor', 'Colourist', 'VFX artist', 'Motion designer']],
    ['Talent', ['Actor', 'Voice artist', 'Presenter', 'Model', 'Extra / background']],
    ['Writing, casting & locations', ['Writer', 'Casting director', 'Location manager']],
    ['Other', ['Student', 'Other']],
  ];
  const SERVICES = [
    ['What your company does', ['Production house', 'Advertising agency', 'Brand / client', 'Equipment rental', 'Post-production house', 'Studio / stage', 'Casting agency', 'Location services', 'Catering & transport', 'Talent management', 'Film school', 'Other']],
  ];

  /* searchable multi-select dropdown */
  const msel = (id, label, icon) => `
    <div class="msel" id="${id}">
      <button type="button" class="msel-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="fx-icon">${ui.icon(icon)}</span>
        <span class="msel-body"><span class="msel-label">${esc(label)}</span><span class="msel-chips"></span></span>
        <span class="msel-chev">${ui.icon('chevron-down')}</span>
        <span class="fx-line" aria-hidden="true"></span>
      </button>
      <div class="msel-pop" hidden>
        <div class="msel-search">${ui.icon('search')}<input type="text" placeholder="Search" aria-label="Search options"></div>
        <div class="msel-list" role="listbox" aria-multiselectable="true"></div>
      </div>
    </div>`;
  function wireMsel(root, id, groups, selected) {
    const box = root.querySelector('#' + id);
    const trigger = box.querySelector('.msel-trigger');
    const pop = box.querySelector('.msel-pop');
    const list = box.querySelector('.msel-list');
    const search = box.querySelector('.msel-search input');
    const paintChips = () => {
      const chips = box.querySelector('.msel-chips');
      box.classList.toggle('has-value', selected.size > 0);
      chips.innerHTML = [...selected].map((v) => `<span class="msel-chip">${esc(v)}<span class="msel-x" data-remove="${esc(v)}" role="button" aria-label="Remove ${esc(v)}">${ui.icon('x')}</span></span>`).join('');
      icons();
    };
    const paintList = () => {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = groups.map(([group, items]) => {
        const hits = items.filter((v) => !q || v.toLowerCase().includes(q));
        return hits.length ? `<div class="msel-group">${esc(group)}</div>${hits.map((v) => `
          <button type="button" class="msel-opt ${selected.has(v) ? 'on' : ''}" role="option" aria-selected="${selected.has(v)}" data-value="${esc(v)}">
            <span class="msel-box">${ui.icon('check')}</span>${esc(v)}</button>`).join('')}` : '';
      }).join('') || '<div class="msel-empty">No match. Choose “Other”.</div>';
      icons();
    };
    const open = (v) => {
      pop.hidden = !v; box.classList.toggle('open', v); trigger.setAttribute('aria-expanded', String(v));
      if (v) { search.value = ''; paintList(); setTimeout(() => search.focus(), 30); }
    };
    trigger.addEventListener('click', (e) => {
      const x = e.target.closest('[data-remove]');
      if (x) { selected.delete(x.dataset.remove); paintChips(); if (!pop.hidden) paintList(); e.stopPropagation(); return; }
      open(pop.hidden);
    });
    list.addEventListener('click', (e) => {
      const o = e.target.closest('[data-value]'); if (!o) return;
      const v = o.dataset.value;
      if (selected.has(v)) selected.delete(v); else selected.add(v);
      o.classList.toggle('on'); o.setAttribute('aria-selected', String(selected.has(v)));
      paintChips();
    });
    search.addEventListener('input', paintList);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { open(false); trigger.focus(); }
      if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('[data-value]'); if (first) first.click(); }
    });
    document.addEventListener('click', function outside(e) {
      if (!document.body.contains(box)) return document.removeEventListener('click', outside);
      if (!box.contains(e.target)) open(false);
    });
    paintChips();
    return { reset: (g) => { groups = g; selected.clear(); paintChips(); open(false); } };
  }

  function onboardingScreen(opts = {}) {
    const p = MPH.session.profile;
    const first = (p.full_name || '').split(' ')[0];
    const type = opts.newWorkspace ? 'company' : (p.account_type || '');
    return authShell(`
      <div class="stack tight">
        <span class="eyebrow">${opts.newWorkspace ? 'New workspace' : `Welcome${first ? ', ' + esc(first) : ''}`}</span>
        <h1 class="auth-title">${opts.newWorkspace ? 'Set up another workspace' : 'Tell us about you'}</h1>
        <p class="muted">${opts.newWorkspace ? 'A separate workspace for another company, with its own productions and team.' : 'So we can shape your workspace. You can change this later.'}</p>
      </div>
      <form id="ob-form" class="auth-form" data-type="${type}" novalidate>
        <div class="acct-cards" role="radiogroup" aria-label="Account type" ${opts.newWorkspace ? 'hidden' : ''}>
          <button type="button" class="acct-card" role="radio" data-type="individual" aria-checked="${type === 'individual'}">
            <span class="acct-ico">${ui.icon('user-round')}</span><span class="acct-name">Individual</span><span class="acct-desc">Freelancer, crew, talent or student</span>
            <span class="acct-tick">${ui.icon('check')}</span></button>
          <button type="button" class="acct-card" role="radio" data-type="company" aria-checked="${type === 'company'}">
            <span class="acct-ico">${ui.icon('building-2')}</span><span class="acct-name">Company</span><span class="acct-desc">Production house, agency, brand or supplier</span>
            <span class="acct-tick">${ui.icon('check')}</span></button>
        </div>
        <div class="au-collapse" data-only="company" ${type === 'company' ? '' : 'inert'}><div>${fx({ id: 'ob-company', label: 'Company name', icon: 'building-2', autocomplete: 'organization', value: opts.newWorkspace ? '' : (p.company_name || '') })}</div></div>
        <div class="au-collapse" data-only="any" ${type ? '' : 'inert'}><div>${msel('ob-prof', type === 'company' ? 'What does your company do?' : 'What do you do?', 'briefcase-business')}</div></div>
        <div id="ob-error" hidden></div>
        <button class="btn btn-primary auth-submit" type="submit" id="ob-submit"><span>Continue</span>${ui.icon('arrow-right')}</button>
      </form>
      <button class="auth-demo" data-act="signout">${ui.icon('log-out')}${t('Sign out')}</button>`);
  }
  function mountOnboarding(opts = {}) {
    const root = document.getElementById('app');
    const form = document.getElementById('ob-form');
    const err = document.getElementById('ob-error');
    const p = MPH.session.profile;
    wireGlow(root);
    wireAgents(root);
    settleOpen(form);
    let type = form.dataset.type || '';
    const chosen = new Set(opts.newWorkspace ? [] : (p.professions || []));
    const ms = wireMsel(root, 'ob-prof', type === 'company' ? SERVICES : PROFESSIONS, chosen);
    const setType = (t2) => {
      if (t2 === type) return;
      const changedKind = type && type !== t2;
      type = t2; form.dataset.type = t2;
      form.querySelectorAll('.acct-card').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.type === t2)));
      form.querySelectorAll('.au-collapse').forEach((el) => {
        const on = el.dataset.only === 'any' || el.dataset.only === t2;
        if (on !== !el.hasAttribute('inert')) setCollapse(el, on);
      });
      form.querySelector('.msel-label').textContent = t2 === 'company' ? 'What does your company do?' : 'What do you do?';
      if (changedKind || !chosen.size) ms.reset(t2 === 'company' ? SERVICES : PROFESSIONS);
      err.hidden = true;
      if (t2 === 'company') setTimeout(() => document.getElementById('ob-company').focus({ preventScroll: true }), 220);
    };
    form.querySelectorAll('.acct-card').forEach((c) => c.addEventListener('click', () => setType(c.dataset.type)));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fail = (m) => { err.hidden = false; err.innerHTML = ui.errorBox(m); icons(); shake(form); };
      if (!type) return fail('Choose Individual or Company.');
      const company = document.getElementById('ob-company').value.trim();
      if (type === 'company' && !company) return fail('Add your company name.');
      if (!chosen.size) return fail(type === 'company' ? 'Choose at least one thing your company does.' : 'Choose at least one profession.');
      const btn = document.getElementById('ob-submit');
      btn.disabled = true; btn.innerHTML = `${ui.spinner()} Setting up`;
      try {
        const s = MPH.session;
        if (!opts.newWorkspace) {
          api.must(await MPH.sb.from('profiles').update({
            account_type: type, professions: [...chosen], company_name: type === 'company' ? company : null, onboarded_at: new Date().toISOString(),
          }).eq('id', s.user.id));
        }
        // a workspace for new users (or on request); invited people already belong to someone else's
        if (opts.newWorkspace || (!s.orgs.length && !s.clientProductions.length)) {
          const name = type === 'company' ? company : (s.profile.full_name || s.user.email.split('@')[0]);
          const orgId = api.must(await MPH.sb.rpc('create_org', { p_name: name, p_kind: type, p_services: type === 'company' ? [...chosen] : [] }));
          MPH.state.orgId = orgId; MPH.saveState();
        }
        await api.loadSession();
        MPH.toast(opts.newWorkspace ? 'Workspace created' : 'You’re all set');
        go('home');
      } catch (ex) { btn.disabled = false; btn.innerHTML = `<span>Continue</span>${ui.icon('arrow-right')}`; fail(ex.message); }
    });
  }

  /* invite link */
  async function inviteScreen(token) {
    const info = (await MPH.sb.rpc('invite_info', { p_token: token })).data;
    if (!info) return authShell(ui.empty('link-2-off', 'This invite link isn’t valid', 'Ask the producer to send you a new one.', `<a class="btn btn-outline" href="#login">Go to sign in</a>`));
    const what = info.role === 'client' ? `review <strong>${esc(info.production)}</strong> as the client` : `join <strong>${esc(info.org)}</strong> as ${info.role === 'hod' ? 'a head of department' : 'a ' + esc(info.role)}`;
    if (info.used) return authShell(ui.empty('circle-check', 'This invite has already been used', 'Sign in to continue.', `<a class="btn btn-primary" href="#login">Sign in</a>`));
    if (!MPH.session) return authScreen('signup', { title: 'You’re invited', sub: `Create an account to ${what}. Use ${esc(info.email)}.`, email: info.email, next: encodeURIComponent('invite.' + token) });
    return authShell(`
      <div class="stack tight"><span class="eyebrow">Invite</span><h1 class="auth-title">You’re invited</h1><p class="muted">Accept to ${what}.</p></div>
      <div id="inv-error" hidden></div>
      <button class="btn btn-primary auth-submit" id="inv-accept">${ui.icon('check')}Accept invite</button>`);
  }
  function mountInvite(token) {
    const btn = document.getElementById('inv-accept');
    if (!btn) return mountAuth('signup', encodeURIComponent('invite.' + token));
    btn.addEventListener('click', async () => {
      try {
        const res = api.must(await MPH.sb.rpc('accept_invite', { p_token: token }));
        if (res.org_id) { MPH.state.orgId = res.org_id; MPH.saveState(); }
        await api.loadSession();
        MPH.toast('Invite accepted');
        go(res.production_id ? `p.${res.production_id}.overview` : 'home');
      } catch (ex) { const b = document.getElementById('inv-error'); b.hidden = false; b.innerHTML = ui.errorBox(ex.message); icons(); }
    });
  }

  /* ------------------------------------------------------------ shell */
  function rail(r) {
    const s = MPH.session;
    const clientOnly = !s.orgs.length;
    const active = r.section === 'p' ? 'productions' : r.section;
    const items = [['home', 'Home', 'house'], ['productions', 'Productions', 'clapperboard']];
    if (!clientOnly) items.push(['team', 'Team', 'users-round']);
    return `
      <nav class="rail" aria-label="Main">
        <a class="rail-logo" href="#home" title="${esc(t('Home'))}">${MPH.logo({ variant: 'mark', size: 34 })}</a>
        ${items.map(([id, label, icon]) => `<a href="#${id}" class="${active === id ? 'active' : ''}">${ui.icon(icon)}<span>${t(label)}</span></a>`).join('')}
        ${clientOnly ? '' : `<a href="${esc(cfg.demoUrl)}#market" target="_blank" rel="noopener" class="market-link" title="Marketplace arrives in a later phase: opens the demo">${ui.icon('store')}<span>${t('Marketplace')}</span><span class="soon-dot">${t('Soon')}</span></a>`}
        <div class="rail-foot">
          <a href="#account" class="${active === 'account' ? 'active' : ''}">${ui.av(s.profile, 'sm')}<span>Account</span></a>
        </div>
      </nav>`;
  }

  function topbar(r, prod, access) {
    const s = MPH.session;
    const sep = `<span class="faint">/</span>`;
    const house = s.org ? `<span>${esc(s.org.name)}</span>` : `<span>${esc(MPH.logo.NAME[MPH.state.lang] || cfg.brand)}</span>`;
    let crumbs = house;
    if (r.section === 'p' && prod) {
      const ph = phaseForModule(r.view);
      const tab = ph && ph.tabs.find(([id]) => id === r.view);
      const here = tab ? tab[1] : r.view === 'docs' ? 'Documents' : 'Overview';
      crumbs += `${sep}<a href="#productions">${t('Productions')}</a>${sep}<a href="#p.${prod.id}.overview">${esc(prod.title)}</a>${sep}<span class="here">${t(here)}</span>`;
    } else {
      const label = { home: 'Home', productions: 'Productions', team: 'Team', account: 'Account' }[r.section] || '';
      crumbs += label ? `${sep}<span class="here">${t(label)}</span>` : '';
    }
    const houseSwitch = s.orgs.length > 1 ? `<select class="select" id="org-switch" style="width:auto;height:30px">${s.orgs.map((o) => `<option value="${o.id}" ${o.id === s.org?.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>` : '';
    const preview = prod && access.canSeeInternal
      ? `<button class="btn btn-sm ${MPH.state.previewClient ? 'btn-primary' : 'btn-outline'}" data-act="preview-client" title="See exactly what your client sees">${ui.icon(MPH.state.previewClient ? 'eye-off' : 'eye')}${MPH.state.previewClient ? t('Back to producer view') : t('Preview client view')}</button>` : '';
    return `
      <header class="topbar">
        <a class="topbar-logo" href="#home">${MPH.logo({ variant: 'mark', size: 32 })}</a>
        <div class="crumbs truncate">${crumbs}</div>
        <span class="spacer"></span>
        ${houseSwitch}${preview}
        <button class="btn btn-sm btn-ghost" data-act="toggle-lang">${MPH.state.lang === 'ar' ? 'EN' : 'عربي'}</button>
      </header>`;
  }

  function prodHeader(r, prod, access) {
    const client = access.isClient || MPH.state.previewClient;
    const allowed = (id) => !client || CLIENT_MODULES.includes(id);
    const current = phaseOf(prod);
    const order = PHASES.map((p) => p.id);
    const viewing = phaseForModule(r.view);
    const visible = PHASES.map((ph) => ({ ...ph, tabs: ph.tabs.filter(([id]) => allowed(id)) })).filter((ph) => ph.tabs.length);
    const stateOf = (ph) => order.indexOf(ph.id) < order.indexOf(current) ? 'done' : ph.id === current ? 'current' : 'next';
    const tab = ([id, label, icon, live]) => `<a href="#p.${prod.id}.${id}" class="${r.view === id ? 'active' : ''} ${live ? '' : 'soon'}">${ui.icon(icon)}${t(label)}${live ? '' : `<span class="soon-tag">${t('Soon')}</span>`}</a>`;
    const stepper = `
      <div class="phases" role="tablist">
        <a href="#p.${prod.id}.overview" class="phase-ov ${r.view === 'overview' ? 'active' : ''}">${ui.icon('layout-dashboard')}<span>${t('Overview')}</span></a>
        ${visible.map((ph, i) => {
          const st = stateOf(ph);
          const first = ph.tabs.find((x) => x[3]) || ph.tabs[0];
          return `<a href="#p.${prod.id}.${first[0]}" class="phase ${st} ${viewing && viewing.id === ph.id ? 'active' : ''}" style="--pc:${ph.color}">
            <span class="phase-num">${st === 'done' ? ui.icon('check') : i + 1}</span>
            <span class="stack" style="gap:0"><span class="phase-name">${t(ph.label)}</span><span class="phase-sub">${st === 'done' ? 'Complete' : st === 'current' ? 'In progress' : 'Up next'} · ${ph.tabs.filter((x) => x[3]).length} live</span></span></a>`;
        }).join('<span class="phase-link" aria-hidden="true"></span>')}
      </div>`;
    let steps = '';
    if (viewing) {
      const ph = visible.find((x) => x.id === viewing.id);
      if (ph) {
        // grouped, numbered activities, in sequence: "1 Story · Script, Treatment" …
        const groups = (ph.groups || [['', ph.tabs.map(([id]) => id)]])
          .map(([label, ids]) => [label, ph.tabs.filter(([id]) => ids.includes(id)).map(tab).join('')])
          .filter(([, html]) => html);
        steps = `<nav class="steps" style="--pc:${ph.color}">${groups.map(([label, html], i) => `
          <div class="step-group">${label ? `<span class="step-group-label"><b>${i + 1}</b>${esc(t(label))}</span>` : ''}<div class="step-group-tabs">${html}</div></div>`).join('')}</nav>`;
      }
    }
    return `
      <div class="prod-head">
        <div class="ph-top">
          ${ui.prodThumb(prod)}
          <div class="stack tight grow" style="gap:1px">
            <div class="row wrap"><span class="prod-title">${esc(MPH.state.lang === 'ar' && prod.title_ar ? prod.title_ar : prod.title)}</span>${ui.statusPill(prod.status)}</div>
            <span class="small muted">${esc(prod.client_name || 'No client yet')}${prod.agency ? ' · via ' + esc(prod.agency) : ''}${prod.format ? ' · ' + esc(prod.format) : ''}${prod.code ? ` · <span class="mono">${esc(prod.code)}</span>` : ''}</span>
          </div>
          ${prod.shoot_start ? `<div class="row small muted nowrap">${ui.icon('calendar')}Shoot ${MPH.date(prod.shoot_start)}${prod.shoot_end && prod.shoot_end !== prod.shoot_start ? '–' + MPH.date(prod.shoot_end) : ''}</div>` : ''}
          <a class="ph-docs ${r.view === 'docs' ? 'active' : ''}" href="#p.${prod.id}.docs">${ui.icon('folder-open')}${t('Documents')}</a>
        </div>
        ${stepper}${steps}
      </div>
      ${client ? `<div class="client-banner">${ui.icon('eye')}${access.isClient ? 'Client view' : 'Previewing the client view'}. Internal cost, margin, rates and crew detail are never sent to client accounts.</div>` : ''}`;
  }

  function soonPage(r, prod) {
    const ph = phaseForModule(r.view);
    const tab = ph && ph.tabs.find(([id]) => id === r.view);
    const label = tab ? tab[1] : r.view;
    return `<div class="page">${ui.empty('hammer', `${label} arrives in a later phase`, 'Phase 1 covers script, AI breakdown, shot list, stripboard, budget and bid, crew and call sheets. You can see how this screen will work in the click-through demo.',
      `<a class="btn btn-outline" href="${esc(cfg.demoUrl)}#p.desert-launch.${esc(r.view)}" target="_blank" rel="noopener">${ui.icon('external-link')}Open ${esc(label)} in the demo</a>`)}</div>`;
  }

  /* ------------------------------------------------------------ design preview dock (stakeholder review of 5 styles)
     Lives outside #app so renders don't replace it. Picks the style pack and the theme; both are remembered. */
  function styleDock() {
    if (!MPH.theme || document.getElementById('style-dock')) return;
    const el = document.createElement('div');
    el.id = 'style-dock'; el.className = 'style-dock'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Design preview');
    const draw = () => {
      el.innerHTML = `<span class="sd-label mono">PREVIEW</span>
        <select class="select" id="sd-style" aria-label="Style">${MPH.theme.STYLES.map((x) => `<option value="${x.id}" ${MPH.theme.style === x.id ? 'selected' : ''} title="${esc(x.note)}">${esc(x.label)}</option>`).join('')}</select>
        <div class="seg" role="radiogroup" aria-label="Theme">${[['light', 'sun'], ['dark', 'moon'], ['system', 'monitor']].map(([v, i]) =>
          `<button type="button" role="radio" aria-checked="${MPH.theme.choice === v}" aria-label="${v}" title="${v[0].toUpperCase() + v.slice(1)}" class="${MPH.theme.choice === v ? 'on' : ''}" data-dock-theme="${v}">${ui.icon(i)}</button>`).join('')}</div>`;
      icons(el);
    };
    el.addEventListener('change', (e) => { if (e.target.id === 'sd-style') MPH.theme.setStyle(e.target.value); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-dock-theme]'); if (b) { MPH.theme.set(b.dataset.dockTheme); draw(); } });
    draw();
    document.body.appendChild(el);
  }

  /* ------------------------------------------------------------ render */
  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    const r = parse();
    document.documentElement.lang = MPH.state.lang;
    document.documentElement.dir = MPH.state.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = MPH.logo.TITLE;
    document.body.dataset.zone = 'production';

    if (!api.configured) {
      app.innerHTML = authShell(ui.empty('plug', 'Not connected yet', 'Add the Supabase project URL and publishable key to js/config.js.'));
      return icons();
    }
    if (!MPH.session) await api.loadSession();
    if (MPH.theme) MPH.theme.forUser(MPH.session && MPH.session.user ? MPH.session.user.id : null);
    styleDock();
    if (seq !== renderSeq) return;

    // signed-out routes
    if (r.section === 'invite') {
      app.innerHTML = await inviteScreen(r.params[0]); icons(); return mountInvite(r.params[0]);
    }
    if (!MPH.session) {
      const mode = r.section === 'signup' ? 'signup' : 'login';
      const next = ['login', 'signup'].includes(r.section) ? r.params.join('.') : encodeURIComponent(location.hash.replace(/^#/, ''));
      app.innerHTML = authScreen(mode, { next }); icons(); return mountAuth(mode, next);
    }
    if (['login', 'signup'].includes(r.section)) return go(r.params.length ? decodeURIComponent(r.params.join('.')) : 'home');
    // onboarding: first sign-in (about you), a user with nowhere to work yet, or "new workspace" from Account
    const s0 = MPH.session;
    if (r.section === 'setup' || !s0.profile.onboarded_at || (!s0.orgs.length && !s0.clientProductions.length)) {
      const opts = { newWorkspace: r.section === 'setup' && !!s0.profile.onboarded_at };
      app.innerHTML = onboardingScreen(opts); icons(); return mountOnboarding(opts);
    }

    // production context
    let prod = null, access = api.accessFor(null);
    if (r.section === 'p') {
      const cached = !prodFresh && prodCache && prodCache.id === r.productionId ? prodCache : null;
      prodFresh = false;
      if (cached) {
        prod = cached;
        // re-read in the background; redraw only if the production itself changed (title, dates, cover…)
        const before = snapshot(cached);
        loadProduction(cached.id).then((fresh) => {
          if (seq !== renderSeq || prodCache !== cached) return;
          if (!fresh) { prodCache = null; render(); return; }
          if (snapshot(fresh) !== before) { prodCache = fresh; render(); }
        }).catch(() => {});
      } else {
        try { prod = await loadProduction(r.productionId); } catch (ex) { prod = null; }
        if (seq !== renderSeq) return;
      }
      if (!prod) { MPH.toast('That production doesn’t exist or you don’t have access.', 'triangle-alert', 'error'); return go('productions'); }
      prodCache = prod;
      access = api.accessFor(prod);
      if (!access.canSeeInternal) MPH.state.previewClient = false;
    }

    app.innerHTML = `
      <div class="shell">
        ${rail(r)}
        <main class="main">
          ${topbar(r, prod, access)}
          ${prod ? prodHeader(r, prod, access) : ''}
          <div class="content" id="content"><div id="view"></div></div>
        </main>
      </div>`;
    icons();
    await renderView(r, prod, access, seq);
  }
  MPH.render = render;

  let viewSeq = 0;
  /* after drawing from the cache: re-read, store, and redraw if the data changed and the screen is still untouched */
  function revalidate(r, prod, access, seq, mySeq, root, view, ctx, key, hit) {
    let touched = false;
    const touch = () => { touched = true; };
    ['pointerdown', 'keydown', 'input', 'dragstart'].forEach((ev) => root.addEventListener(ev, touch, { capture: true, once: true }));
    Promise.resolve().then(() => view.load(ctx)).then((fresh) => {
      if (seq !== renderSeq || mySeq !== viewSeq || !root.isConnected) return; // something newer has drawn since
      if (!cacheable(r, fresh)) { viewCache.delete(key); return; }
      const json = snapshot(fresh);
      remember(key, fresh);
      if (json !== null && json === hit.json) return;
      const ae = document.activeElement;
      const typing = ae && root.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
      if (touched || typing || !document.getElementById('overlay').hidden) return;
      const content = document.getElementById('content');
      const top = content ? content.scrollTop : 0, wtop = window.scrollY;
      renderView(r, prod, access, seq, { data: fresh }).then(() => {
        if (content && content.isConnected) content.scrollTop = top;
        window.scrollTo(0, wtop);
      });
    }).catch(() => { /* keep showing the cached copy */ });
  }

  async function renderView(r, prod, access, seq = renderSeq, opts = {}) {
    const old = document.getElementById('view');
    if (!old) return;
    const root = document.createElement('div');
    root.id = 'view';
    old.replaceWith(root);
    const mySeq = ++viewSeq;

    const clientish = access.isClient || MPH.state.previewClient;
    if (prod && clientish && !CLIENT_MODULES.includes(r.view)) {
      root.innerHTML = `<div class="page">${ui.empty('lock', 'Not shared with clients', 'This module holds internal production detail.')}</div>`; return icons();
    }
    if (prod && !isLive(r.view)) { root.innerHTML = soonPage(r, prod); return icons(); }

    const view = MPH.views[r.view];
    if (!view) { root.innerHTML = `<div class="page">${ui.empty('compass', 'Page not found', '', '<a class="btn btn-outline" href="#home">Go home</a>')}</div>`; return icons(); }

    const ctx = {
      route: r, params: r.params, production: prod, ...access,
      isClient: clientish, // client screens render for real clients and for producer preview
      realClient: access.isClient,
      go, reload: () => renderView(r, prod, access, renderSeq, { fresh: true }),
      refreshAll: () => { prodFresh = true; return render(); },
      toast: MPH.toast, toastError: MPH.toastError, modal: MPH.modal, drawer: MPH.drawer, closeOverlay, frame: MPH.frame,
      t, ui, esc, api, sb: MPH.sb, state: MPH.state, session: MPH.session,
    };
    const key = cacheKey(r, prod, clientish);
    const draw = async (data) => {
      root.innerHTML = view.render(ctx, data);
      icons(root);
      if (view.mount) await view.mount(root, ctx, data);
      icons(root);
    };
    try {
      let data;
      if (opts.data !== undefined) { await draw(opts.data); return; } // a background re-read found newer data
      const hit = view.load && !opts.fresh && viewCache.get(key);
      if (hit && Date.now() - hit.at < VIEW_TTL) {
        await draw(hit.data);
        revalidate(r, prod, access, seq, mySeq, root, view, ctx, key, hit);
        return;
      }
      if (view.load) {
        root.innerHTML = ui.loading(); icons(root);
        data = await view.load(ctx);
        if (seq !== renderSeq || !root.isConnected) return;
        if (cacheable(r, data)) remember(key, data); else viewCache.delete(key);
      }
      await draw(data);
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div class="page">${ui.errorBox(err.message || String(err))}<div><button class="btn btn-outline btn-sm" data-act="retry">Try again</button></div></div>`;
      icons();
      root.querySelector('[data-act=retry]').addEventListener('click', () => renderView(r, prod, access));
    }
  }

  /* ------------------------------------------------------------ global actions */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'toggle-lang') { MPH.state.lang = MPH.state.lang === 'ar' ? 'en' : 'ar'; MPH.saveState(); render(); }
    else if (a === 'preview-client') {
      MPH.state.previewClient = !MPH.state.previewClient;
      const r = parse();
      if (MPH.state.previewClient && r.section === 'p' && !CLIENT_MODULES.includes(r.view)) go(`p.${r.productionId}.overview`); else render();
      MPH.toast(MPH.state.previewClient ? 'Showing what your client sees' : 'Back to producer view', 'eye');
    } else if (a === 'signout') { await api.signOut(); MPH.session = null; MPH.clearCache(); go('login'); }
  });
  document.addEventListener('change', async (e) => {
    if (e.target.id === 'org-switch') { MPH.state.orgId = e.target.value; MPH.saveState(); MPH.clearCache(); await api.loadSession(); go('home'); }
  });

  if (MPH.sb) {
    MPH.sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { MPH.session = null; MPH.clearCache(); render(); }
      if (event === 'PASSWORD_RECOVERY') go('account');
    });
  }
  window.addEventListener('hashchange', render);
  render();
})();
