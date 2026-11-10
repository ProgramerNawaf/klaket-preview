/* Flow: the pieces that make the production flow quicker to fill in, with less typing.
   - bubble(): a speech-bubble popover (the Talking Slate shape) that opens next to the control that asked for it
   - short form selects become one-tap option chips; inputs with a list of suggestions open them as a bubble
   - quick picks under brief fields (tone, audience, music, KPI, revision rounds)
   - one "agent at work" card for every AI wait, which refreshes the screen when the work is in
   - the new-production wizard: pick, don't type. A slate fills in as you go and claps when the production starts.
   Every enhancement keeps the original control in the page and drives it with real input/change events, so each
   view's own saving code runs unchanged. */
(function () {
  const MPH = (window.MPH = window.MPH || {});
  const esc = (s) => MPH.esc(s);
  const icon = (n) => MPH.ui.icon(n);
  const ar = () => MPH.state && MPH.state.lang === 'ar';
  const L = (en, a) => (ar() ? a : en);
  const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fire = (el, ...types) => types.forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true })));

  /* ------------------------------------------------------------ bubble popover */
  let open = null;
  function closeBubble(focusBack = true) {
    if (!open) return;
    const { el, anchor, onClose } = open;
    open = null;
    anchor.setAttribute('aria-expanded', 'false');
    el.classList.add('out');
    setTimeout(() => el.remove(), still() ? 0 : 120);
    if (onClose) onClose();
    if (focusBack && anchor.isConnected) anchor.focus({ preventScroll: true });
  }
  function place(el, anchor) {
    const a = anchor.getBoundingClientRect();
    const w = Math.min(el.offsetWidth, window.innerWidth - 16), h = el.offsetHeight;
    const rtl = document.documentElement.dir === 'rtl';
    const below = a.bottom + 10 + h < window.innerHeight - 8 || a.top < h + 18;
    let x = rtl ? a.right - w : a.left;
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    el.style.left = `${x}px`;
    el.style.top = `${below ? a.bottom + 10 : a.top - h - 10}px`;
    el.classList.toggle('up', !below);
    const tail = Math.max(16, Math.min(w - 16, a.left + Math.min(a.width / 2, 28) - x));
    el.style.setProperty('--tail', `${rtl ? Math.max(16, Math.min(w - 16, a.right - Math.min(a.width / 2, 28) - x)) : tail}px`);
  }
  /* opens right after the anchor in the DOM (so Tab moves into it) but fixed on screen, so table scrollers don't clip it */
  function bubble(anchor, html, { label = '', onClose } = {}) {
    closeBubble(false);
    const el = document.createElement('div');
    el.className = 'fl-bubble';
    el.setAttribute('role', 'dialog');
    if (label) el.setAttribute('aria-label', label);
    el.innerHTML = html;
    anchor.insertAdjacentElement('afterend', el);
    anchor.setAttribute('aria-expanded', 'true');
    MPH.icons(el);
    place(el, anchor);
    open = { el, anchor, onClose };
    return el;
  }
  document.addEventListener('pointerdown', (e) => {
    if (open && !open.el.contains(e.target) && e.target !== open.anchor) closeBubble(false);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); closeBubble(); }
  }, true);
  window.addEventListener('resize', () => closeBubble(false));
  document.addEventListener('scroll', (e) => { if (open && !open.el.contains(e.target)) place(open.el, open.anchor); }, true);

  /* ------------------------------------------------------------ chips */
  const chip = (v, label, on, ico = '', role = '') =>
    `<button type="button" class="fl-chip${on ? ' on' : ''}" data-v="${esc(v)}" ${role === 'radio' ? `role="radio" aria-checked="${on}"` : `aria-pressed="${on}"`}>${ico ? icon(ico) : ''}<span>${esc(label)}</span></button>`;

  /* arrow keys move through a chip group, like a radio group */
  function arrows(group) {
    group.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const list = [...group.querySelectorAll('.fl-chip, .fl-tile')];
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const rtl = document.documentElement.dir === 'rtl';
      const fwd = e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
      list[(i + (fwd ? 1 : -1) + list.length) % list.length].focus();
    });
  }

  /* a short form select (2–7 short options) shows its options as chips; the select stays, hidden, and is the value */
  function chipSelect(sel) {
    if (sel.dataset.flDone || sel.multiple || sel.disabled || !sel.matches('select.select') || sel.closest('table, .topbar, [data-no-chips]')) return;
    const opts = [...sel.options].filter((o) => o.value !== '');
    if (opts.length < 2 || opts.length > 7 || opts.some((o) => o.text.trim().length > 24)) return;
    sel.dataset.flDone = '1';
    const label = sel.labels && sel.labels[0];
    if (label && !label.id) label.id = `fl-l-${Math.random().toString(36).slice(2, 8)}`;
    const row = document.createElement('div');
    row.className = 'fl-chips';
    row.setAttribute('role', 'radiogroup');
    if (label) row.setAttribute('aria-labelledby', label.id); else if (sel.getAttribute('aria-label')) row.setAttribute('aria-label', sel.getAttribute('aria-label'));
    const draw = () => {
      row.innerHTML = opts.map((o) => chip(o.value, o.text.trim(), sel.value === o.value, '', 'radio')).join('');
      row.querySelectorAll('.fl-chip').forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' || (!sel.value && b === row.firstElementChild) ? 0 : -1; });
    };
    draw();
    sel.classList.add('fl-sr');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    sel.insertAdjacentElement('afterend', row);
    row.addEventListener('click', (e) => {
      const b = e.target.closest('.fl-chip');
      if (!b) return;
      sel.value = b.dataset.v;
      fire(sel, 'input', 'change');
      draw();
      row.querySelector(`.fl-chip[data-v="${CSS.escape(b.dataset.v)}"]`).focus();
    });
    sel.addEventListener('change', draw);
    arrows(row);
  }

  /* an input with a <datalist>: its suggestions open as a bubble of chips; typing still works */
  function listInput(inp) {
    if (inp.dataset.flDone) return;
    const list = inp.list || document.getElementById(inp.getAttribute('list'));
    if (!list) return;
    const values = [...list.options].map((o) => o.value).filter(Boolean).slice(0, 18);
    if (!values.length) return;
    inp.dataset.flDone = '1';
    inp.dataset.flList = inp.getAttribute('list');
    inp.removeAttribute('list');
    inp.setAttribute('aria-haspopup', 'dialog');
    inp.setAttribute('aria-expanded', 'false');
    const show = () => {
      if (open && open.anchor === inp) return;
      const cur = inp.value.trim();
      const el = bubble(inp, `<div class="fl-chips wrap" role="group">${values.map((v) => chip(v, v, v === cur)).join('')}</div>`, { label: inp.getAttribute('aria-label') || '' });
      arrows(el);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('.fl-chip');
        if (!b) return;
        inp.value = b.dataset.v;
        fire(inp, 'input', 'change');
        closeBubble();
      });
    };
    inp.addEventListener('click', show);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && !(open && open.anchor === inp)) { e.preventDefault(); show(); open.el.querySelector('.fl-chip').focus(); }
      if (e.key === 'Tab' && !e.shiftKey && open && open.anchor === inp) { e.preventDefault(); open.el.querySelector('.fl-chip').focus(); }
    });
    inp.addEventListener('input', () => { if (open && open.anchor === inp && inp.value) closeBubble(false); });
  }

  /* ------------------------------------------------------------ brief: quick picks under free-text fields */
  const QUICK = {
    'bf-tone': { multi: true, opts: [['Warm', 'دافئ', 'sun'], ['Playful', 'مرح', 'party-popper'], ['Proud', 'فخور', 'flag'], ['Premium', 'فاخر', 'gem'], ['Funny', 'مضحك', 'laugh'], ['Emotional', 'مؤثر', 'heart'], ['Epic', 'ملحمي', 'mountain'], ['Calm', 'هادئ', 'leaf']] },
    'bf-audience': { multi: true, opts: [['Young families', 'عائلات شابة', 'baby'], ['Gen Z', 'الجيل زد', 'smartphone'], ['Women 25–40', 'نساء ٢٥–٤٠', 'user-round'], ['Men 25–40', 'رجال ٢٥–٤٠', 'user-round'], ['Professionals', 'مهنيون', 'briefcase'], ['Nationwide KSA', 'كل المملكة', 'map']] },
    'bf-music': { multi: true, opts: [['Oud', 'عود', 'music'], ['Modern pop', 'بوب حديث', 'radio'], ['Orchestral', 'أوركسترا', 'piano'], ['Khaleeji beat', 'إيقاع خليجي', 'drum'], ['Licensed track', 'أغنية مرخّصة', 'disc-3'], ['No music', 'بدون موسيقى', 'volume-x']] },
    'bf-kpi': { multi: true, opts: [['Views', 'المشاهدات', 'eye'], ['Brand recall', 'تذكّر العلامة', 'brain'], ['Sales', 'المبيعات', 'shopping-bag'], ['Leads', 'العملاء المحتملون', 'magnet'], ['App installs', 'تحميل التطبيق', 'download'], ['Followers', 'المتابعون', 'users']] },
    'bf-revision_rounds': { multi: false, opts: [['1', '١'], ['2', '٢'], ['3', '٣'], ['4', '٤']] },
  };
  const splitList = (v) => String(v || '').split(/\s*[,،]\s*/).map((x) => x.trim()).filter(Boolean);
  function quickPicks(inp) {
    const def = QUICK[inp.id];
    if (!def || inp.dataset.flQuick || inp.disabled || inp.readOnly) return;
    inp.dataset.flQuick = '1';
    const row = document.createElement('div');
    row.className = 'fl-chips fl-quick';
    row.setAttribute('role', 'group');
    const label = inp.labels && inp.labels[0];
    row.setAttribute('aria-label', `${label ? label.textContent.trim() : ''}: ${L('quick picks', 'اختيارات سريعة')}`);
    const words = (o) => [o[0], o[1]];
    const draw = () => {
      const have = def.multi ? splitList(inp.value).map((x) => x.toLowerCase()) : [String(inp.value)];
      row.innerHTML = def.opts.map((o) => {
        const on = def.multi ? words(o).some((w) => have.includes(w.toLowerCase())) : have.includes(o[0]);
        return chip(o[0], def.multi ? L(o[0], o[1]) : o[0], on, o[2] || '');
      }).join('');
      MPH.icons(row);
    };
    draw();
    inp.insertAdjacentElement('afterend', row);
    row.addEventListener('click', (e) => {
      const b = e.target.closest('.fl-chip');
      if (!b) return;
      const o = def.opts.find((x) => x[0] === b.dataset.v);
      if (def.multi) {
        const list = splitList(inp.value);
        const at = list.findIndex((x) => words(o).some((w) => w.toLowerCase() === x.toLowerCase()));
        if (at >= 0) list.splice(at, 1); else list.push(L(o[0], o[1]));
        inp.value = list.join(ar() ? '، ' : ', ');
      } else inp.value = inp.value === o[0] ? '' : o[0];
      fire(inp, 'input', 'change');
      draw();
      row.querySelector(`.fl-chip[data-v="${CSS.escape(o[0])}"]`).focus();
    });
    inp.addEventListener('input', (e) => { if (e.isTrusted) draw(); });
    arrows(row);
  }

  /* "Still missing: Delivery Date" chips jump to that field and open its picker */
  function missingChips(root) {
    root.querySelectorAll('.chip.bf-miss:not([data-fl-done])').forEach((c) => {
      c.dataset.flDone = '1';
      const name = c.textContent.trim().toLowerCase();
      const clean = (l) => l.textContent.trim().toLowerCase().replace(/\s*\(optional\)$/, '');
      const labels = [...root.querySelectorAll('.bf-group .field > label')];
      const field = labels.find((l) => clean(l) === name) || labels.find((l) => name.startsWith(clean(l)));
      const kind = /deliverable/.test(name) ? 'deliverables' : /usage/.test(name) ? 'usage' : '';
      const target = field ? root.querySelector(`#${CSS.escape(field.htmlFor)}`) : kind ? root.querySelector(`[data-bf="del-add"][data-kind="${kind}"]`) : null;
      if (!target) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip bf-miss fl-jump';
      b.innerHTML = `${icon('corner-down-right')}<span>${esc(c.textContent.trim())}</span>`;
      c.replaceWith(b);
      // the agent's list is a snapshot: a field filled since then ticks itself off
      if ('value' in target && target.tagName !== 'BUTTON') {
        const tick = () => { const done = !!String(target.value || '').trim(); b.classList.toggle('filled', done); b.title = done ? L('Filled since the agent read the source', 'تعبّى بعد ما قرأ الوكيل المصدر') : ''; };
        tick();
        target.addEventListener('input', tick);
      }
      b.addEventListener('click', () => {
        target.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' });
        const box = target.closest('.field') || target;
        box.classList.remove('fl-flash'); void box.offsetWidth; box.classList.add('fl-flash');
        setTimeout(() => { target.focus({ preventScroll: true }); if (target.showPicker && target.type === 'date') { try { target.showPicker(); } catch (ex) { /* not allowed here */ } } }, still() ? 0 : 380);
      });
    });
    MPH.icons(root);
  }

  /* ------------------------------------------------------------ one "agent at work" card for every AI wait */
  const AGENT_STEPS = {
    brief: { name: ['Brief Agent', 'وكيل البريف'], steps: [['Reading the email', 'يقرأ الإيميل'], ['Finding the deliverables', 'يحدد التسليمات'], ['Checking budget and dates', 'يراجع الميزانية والمواعيد'], ['Spotting what’s missing', 'يرصد الناقص'], ['Writing suggestions for you', 'يكتب لك الاقتراحات']] },
    concepts: { name: ['Creative Agent', 'الوكيل الإبداعي'], steps: [['Reading the approved brief', 'يقرأ البريف المعتمد'], ['Listening to the client’s words', 'يسمع كلام العميل'], ['Sketching three routes', 'يرسم ثلاث أفكار'], ['Pricing each idea against the budget', 'يسعّر كل فكرة مقابل الميزانية'], ['Polishing the pitch lines', 'يصقل جمل العرض']] },
  };
  function agentCard(kind, callout) {
    const def = AGENT_STEPS[kind];
    const key = `fl.agent.${kind}.${location.hash}`;
    let t0 = Number(sessionStorage.getItem(key)) || Date.now();
    try { sessionStorage.setItem(key, String(t0)); } catch (ex) { /* storage off */ }
    const card = document.createElement('div');
    card.className = 'fl-agent';
    card.setAttribute('role', 'status');
    card.innerHTML = `
      <span class="fl-agent-mark" aria-hidden="true"><span class="kl-dots"><i></i><i></i><i></i></span></span>
      <div class="fl-agent-body">
        <span class="fl-agent-name">${esc(L(...def.name))}</span>
        <ol class="fl-agent-steps">${def.steps.map((s) => `<li>${esc(L(...s))}</li>`).join('')}</ol>
        <span class="tiny faint fl-agent-time"></span>
      </div>`;
    callout.replaceWith(card);
    const items = [...card.querySelectorAll('li')];
    const time = card.querySelector('.fl-agent-time');
    const tick = () => {
      if (!card.isConnected) return clearInterval(timer);
      const s = Math.round((Date.now() - t0) / 1000);
      const at = Math.min(items.length - 1, Math.floor(s / 14));
      items.forEach((li, i) => { li.className = i < at ? 'done' : i === at ? 'now' : ''; });
      time.textContent = s < 240
        ? L(`${s}s · this screen refreshes itself when it’s done`, `${s} ث · الشاشة تتحدّث وحدها لما يخلص`)
        : L(`${Math.round(s / 60)} min · taking longer than usual. It keeps going; you can leave this page.`, `${Math.round(s / 60)} د · أطول من المعتاد. يكمل الشغل، وتقدر تطلع من الصفحة.`);
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => { try { sessionStorage.removeItem(key); } catch (ex) { /* storage off */ } };
  }
  /* while an agent is at work, re-read the screen every few seconds (never while someone is typing) */
  let poll = null;
  function watchAgent(root, ctx) {
    clearInterval(poll);
    const wait = root.querySelector('.callout.info .spin');
    const callout = wait && wait.closest('.callout');
    if (!callout) return;
    const txt = callout.textContent;
    const kind = /Brief Agent/.test(txt) ? 'brief' : /Creative Agent/.test(txt) ? 'concepts' : '';
    if (!kind) return;
    agentCard(kind, callout);
    poll = setInterval(() => {
      if (!root.isConnected) return clearInterval(poll);
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && root.contains(ae)) return;
      if (!document.getElementById('overlay').hidden) return;
      ctx.poll();
    }, 8000);
  }

  /* ------------------------------------------------------------ enhance whatever is on screen */
  function enhance(scope) {
    scope.querySelectorAll('select.select:not([data-fl-done])').forEach(chipSelect);
    scope.querySelectorAll('input[list]:not([data-fl-done])').forEach(listInput);
    Object.keys(QUICK).forEach((id) => { const el = scope.querySelector(`#${id}`); if (el) quickPicks(el); });
    missingChips(scope);
  }
  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(document.getElementById('app')); const ov = document.getElementById('overlay'); if (ov && !ov.hidden) enhance(ov); });
  });
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app'), ov = document.getElementById('overlay');
    if (app) mo.observe(app, { childList: true, subtree: true });
    if (ov) mo.observe(ov, { childList: true, subtree: true });
  });
  /* app.js announces each drawn view */
  document.addEventListener('mph:view', (e) => {
    const { root, ctx, fresh } = e.detail;
    if (fresh && !still()) { root.classList.remove('fl-enter'); void root.offsetWidth; root.classList.add('fl-enter'); }
    enhance(root);
    watchAgent(root, ctx);
  });

  /* ------------------------------------------------------------ new production wizard */
  const TYPES = [
    ['tvc', 'tv', 'TVC', 'إعلان تلفزيوني'],
    ['social', 'smartphone', 'Social', 'سوشال'],
    ['brand', 'film', 'Brand film', 'فيلم للعلامة'],
    ['doc', 'camera', 'Documentary', 'وثائقي'],
    ['music', 'music', 'Music video', 'فيديو كليب'],
    ['event', 'party-popper', 'Event', 'فعالية'],
    ['short', 'clapperboard', 'Short film', 'فيلم قصير'],
  ];
  const LENGTHS = ['6s', '15s', '30s', '60s', '90s', '2 min', '5 min+'];
  const CUTS = ['0', '1', '2', '3', '4'];
  const CUT_LEN = ['6s', '15s', '30s'];
  const DELIVER = [[7, '1 week after', 'بعد أسبوع'], [14, '2 weeks after', 'بعد أسبوعين'], [21, '3 weeks after', 'بعد ٣ أسابيع'], [28, '4 weeks after', 'بعد ٤ أسابيع']];
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => new Date(`${s}T00:00:00`);
  const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const niceDate = (s) => { if (!s) return ''; const d = fromIso(s); return `${d.getDate()} ${(ar() ? MONTHS_AR : MONTHS_EN)[d.getMonth()]}`; };

  async function newProduction(ctx) {
    const st = { type: '', hero: '', cuts: '0', cutLen: '15s', client: '', agency: '', start: '', end: '', delivery: '', deliverAfter: 14, tbc: false, title: '', titleAr: '', titleTouched: false, step: 0 };
    let recent = { clients: [], agencies: [] };
    try {
      const { data } = await ctx.sb.from('productions').select('client_name, agency, created_at').eq('org_id', ctx.session.org.id).order('created_at', { ascending: false }).limit(60);
      const uniq = (k) => [...new Set((data || []).map((x) => (x[k] || '').trim()).filter(Boolean))].slice(0, 6);
      recent = { clients: uniq('client_name'), agencies: uniq('agency') };
    } catch (ex) { /* the wizard works without suggestions */ }
    const today = new Date();
    let month = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const chalk = {};

    const typeOf = () => TYPES.find((t) => t[0] === st.type);
    const formatText = () => {
      if (!st.type) return '';
      const t = typeOf();
      const cuts = Number(st.cuts);
      return [L(t[2], t[3]), st.hero ? `${st.hero}${cuts ? ` + ${cuts}×${st.cutLen}` : ''}` : ''].filter(Boolean).join(' ');
    };
    const autoTitle = () => [st.client, st.type ? L(typeOf()[2], typeOf()[3]) : ''].filter(Boolean).join(' · ');
    const deliveryDate = () => (st.tbc || !st.end ? '' : st.delivery || addDays(st.end, st.deliverAfter));
    const STEPS = [
      { id: 'what', q: ['What are we making?', 'وش نصوّر؟'], ok: () => !!st.type },
      { id: 'who', q: ['Who is it for?', 'لمين؟'], ok: () => true },
      { id: 'when', q: ['When do we shoot?', 'متى التصوير؟'], ok: () => st.tbc || !!st.start },
      { id: 'name', q: ['Name it', 'سمّه'], ok: () => !!(st.title || autoTitle()).trim() },
    ];

    const stepWhat = () => `
      <div class="fl-tiles" role="radiogroup" aria-label="${esc(L('Type of production', 'نوع الإنتاج'))}">
        ${TYPES.map(([id, ico, en, a]) => `<button type="button" class="fl-tile${st.type === id ? ' on' : ''}" role="radio" aria-checked="${st.type === id}" data-type="${id}">${icon(ico)}<span>${esc(L(en, a))}</span></button>`).join('')}
      </div>
      <div class="fl-q2 ${st.type ? '' : 'dim'}">
        <span class="fl-label" id="fl-len-l">${esc(L('Main length', 'المدة الرئيسية'))}</span>
        <div class="fl-chips" role="radiogroup" aria-labelledby="fl-len-l" data-pick="hero">${LENGTHS.map((x) => chip(x, x, st.hero === x, '', 'radio')).join('')}</div>
        <span class="fl-label" id="fl-cut-l">${esc(L('Cutdowns', 'نسخ مختصرة'))}</span>
        <div class="row wrap" style="gap:10px">
          <div class="fl-chips" role="radiogroup" aria-labelledby="fl-cut-l" data-pick="cuts">${CUTS.map((x) => chip(x, x === '0' ? L('None', 'بدون') : `${x}×`, st.cuts === x, '', 'radio')).join('')}</div>
          ${st.cuts !== '0' ? `<div class="fl-chips" role="radiogroup" aria-label="${esc(L('Cutdown length', 'مدة النسخ المختصرة'))}" data-pick="cutLen">${CUT_LEN.map((x) => chip(x, x, st.cutLen === x, '', 'radio')).join('')}</div>` : ''}
        </div>
      </div>`;

    const pickOrType = (key, label, list, ph, extra = '') => `
      <span class="fl-label" id="fl-${key}-l">${esc(label)}</span>
      <div class="fl-chips wrap" role="group" aria-labelledby="fl-${key}-l" data-pick="${key}">
        ${extra}${list.map((x) => chip(x, x, st[key] === x)).join('')}
        <span class="fl-chip-input">${icon('pencil')}<input class="fl-mini" data-type-in="${key}" dir="auto" maxlength="120" placeholder="${esc(ph)}" value="${esc(list.includes(st[key]) ? '' : st[key])}" aria-label="${esc(label)}"></span>
      </div>`;
    const stepWho = () => `
      ${pickOrType('client', L('Client', 'العميل'), recent.clients, L('New client', 'عميل جديد'))}
      ${pickOrType('agency', L('Agency', 'الوكالة'), recent.agencies, L('Other agency', 'وكالة أخرى'), chip('', L('Direct, no agency', 'مباشر بدون وكالة'), !st.agency, 'handshake'))}`;

    const cal = () => {
      const y = month.getFullYear(), m = month.getMonth();
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < first; i++) cells.push('<span></span>');
      for (let d = 1; d <= days; d++) {
        const s = iso(new Date(y, m, d));
        const past = s < iso(today);
        const inRange = st.start && st.end && s > st.start && s < st.end;
        const edge = s === st.start || s === st.end;
        const wknd = [5, 6].includes(new Date(y, m, d).getDay());
        cells.push(`<button type="button" class="fl-day${edge ? ' on' : ''}${inRange ? ' in' : ''}${wknd ? ' wk' : ''}" data-day="${s}" ${past ? 'disabled' : ''} aria-pressed="${edge}" aria-label="${esc(niceDate(s))}">${d}</button>`);
      }
      const dows = ar() ? DOW_AR : DOW_EN;
      return `
        <div class="fl-cal">
          <div class="fl-cal-head">
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-mon="-1" aria-label="${esc(L('Previous month', 'الشهر السابق'))}">${icon(ar() ? 'chevron-right' : 'chevron-left')}</button>
            <span class="fl-cal-title">${esc((ar() ? MONTHS_AR : MONTHS_EN)[m])} ${y}</span>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-mon="1" aria-label="${esc(L('Next month', 'الشهر التالي'))}">${icon(ar() ? 'chevron-left' : 'chevron-right')}</button>
          </div>
          <div class="fl-cal-grid">${dows.map((x, i) => `<span class="fl-dow${[5, 6].includes(i) ? ' wk' : ''}">${esc(x)}</span>`).join('')}${cells.join('')}</div>
        </div>`;
    };
    const stepWhen = () => `
      <div class="fl-when">
        <div class="stack" style="gap:10px">
          <span class="fl-label">${esc(st.start ? (st.end && st.end !== st.start ? L('Tap another day to change the range', 'اضغط يوم ثاني لتغيير المدة') : L('Tap the last shoot day, or keep one day', 'اضغط آخر يوم تصوير، أو خلّه يوم واحد')) : L('Tap the first shoot day', 'اضغط أول يوم تصوير'))}</span>
          ${cal()}
          <div class="fl-chips" data-pick="tbc">${chip('tbc', L('Dates not set yet', 'المواعيد ما تحددت'), st.tbc, 'calendar-off')}</div>
        </div>
        <div class="stack fl-deliver ${st.start && !st.tbc ? '' : 'dim'}" style="gap:10px">
          <span class="fl-label" id="fl-del-l">${esc(L('Delivery', 'التسليم'))}</span>
          <div class="fl-chips wrap" role="radiogroup" aria-labelledby="fl-del-l" data-pick="deliverAfter">${DELIVER.map(([n, en, a]) => chip(String(n), L(en, a), !st.delivery && st.deliverAfter === n, '', 'radio')).join('')}</div>
          ${st.start && !st.tbc ? `<p class="small muted">${icon('package-check')} ${esc(L('Final files on', 'الملفات النهائية في'))} <b>${esc(niceDate(deliveryDate()))}</b></p>` : ''}
        </div>
      </div>`;

    const stepName = () => `
      <div class="stack" style="gap:14px">
        <label class="fl-label" for="fl-title">${esc(L('Production title', 'اسم الإنتاج'))}</label>
        <input id="fl-title" class="input fl-title-in" dir="auto" maxlength="120" value="${esc(st.title || autoTitle())}" placeholder="${esc(L('e.g. Desert Drive', 'مثال: رحلة الصحراء'))}">
        <details class="fl-more" ${st.titleAr ? 'open' : ''}>
          <summary>${icon('languages')}${esc(L('Add the Arabic title', 'أضف الاسم بالعربي'))}</summary>
          <input id="fl-title-ar" class="input" dir="rtl" lang="ar" maxlength="120" value="${esc(st.titleAr)}" aria-label="${esc(L('Arabic title', 'الاسم بالعربي'))}">
        </details>
        <p class="small muted">${icon('sparkles')} ${esc(L('Next: the brief. Paste the client’s email and the Brief Agent fills it in.', 'التالي: البريف. الصق إيميل العميل ووكيل البريف يعبّيه.'))}</p>
      </div>`;

    const slate = () => {
      const rows = [
        [L('PROD', 'إنتاج'), st.title || autoTitle()],
        [L('CLIENT', 'العميل'), st.client ? `${st.client}${st.agency ? ` · ${st.agency}` : ''}` : ''],
        [L('FORMAT', 'الصيغة'), formatText()],
        [L('SHOOT', 'التصوير'), st.tbc ? L('TBC', 'لاحقًا') : st.start ? `${niceDate(st.start)}${st.end && st.end !== st.start ? ` – ${niceDate(st.end)}` : ''}` : ''],
        [L('DELIVERY', 'التسليم'), deliveryDate() ? niceDate(deliveryDate()) : ''],
      ];
      // a line that just changed is chalked in; the rest stay still
      const fresh = rows.map(([k, v]) => !!v && chalk[k] !== v);
      rows.forEach(([k, v]) => { chalk[k] = v; });
      return `
        <div class="fl-slate" aria-hidden="true">
          <div class="fl-slate-stick"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="fl-slate-board">
            <div class="fl-slate-top"><span class="kl-dots"><i></i><i></i><i></i></span><span class="mono">${esc(ctx.session.org.name)}</span></div>
            ${rows.map(([k, v], i) => `<div class="fl-slate-row${v ? ' has' : ''}${fresh[i] ? ' new' : ''}"><span class="k mono">${esc(k)}</span><span class="v" dir="auto">${esc(v || '—')}</span></div>`).join('')}
            <div class="fl-slate-foot mono"><span>ROLL 01</span><span>SCENE 01</span><span>TAKE 01</span></div>
          </div>
        </div>`;
    };

    const el = ctx.modal(`
      <div class="fl-wiz">
        <header class="fl-wiz-head">
          <h2 class="h2">${esc(L('New production', 'إنتاج جديد'))}</h2>
          <ol class="fl-dots" aria-label="${esc(L('Steps', 'الخطوات'))}"></ol>
          <button class="btn btn-ghost btn-sm btn-icon" data-close aria-label="${esc(L('Close', 'إغلاق'))}">${icon('x')}</button>
        </header>
        <div class="fl-wiz-main">
          <section class="fl-wiz-step" aria-live="polite"></section>
          <aside class="fl-wiz-slate"></aside>
        </div>
        <footer class="fl-wiz-foot">
          <button class="btn btn-ghost" data-back>${icon(ar() ? 'arrow-right' : 'arrow-left')}${esc(L('Back', 'رجوع'))}</button>
          <span class="spacer"></span>
          <span class="small faint fl-hint"></span>
          <button class="btn btn-primary" data-next></button>
        </footer>
        <div id="fl-error" hidden></div>
      </div>`, { wide: true });
    el.classList.add('fl-wizard');

    const stepEl = el.querySelector('.fl-wiz-step'), slateEl = el.querySelector('.fl-wiz-slate'), dots = el.querySelector('.fl-dots');
    const next = el.querySelector('[data-next]'), back = el.querySelector('[data-back]'), hint = el.querySelector('.fl-hint');
    const last = () => st.step === STEPS.length - 1;
    const drawSlate = () => { slateEl.innerHTML = slate(); };
    const draw = (dir = 0) => {
      const S = STEPS[st.step];
      dots.innerHTML = STEPS.map((x, i) => `<li><button type="button" class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}" data-go="${i}" ${i > st.step && !STEPS.slice(0, i).every((y) => y.ok()) ? 'disabled' : ''} aria-current="${i === st.step ? 'step' : 'false'}">${i < st.step ? icon('check') : i + 1}<span>${esc(L(...x.q))}</span></button></li>`).join('');
      const body = { what: stepWhat, who: stepWho, when: stepWhen, name: stepName }[S.id]();
      stepEl.innerHTML = `<h3 class="fl-q">${esc(L(...S.q))}</h3>${body}`;
      stepEl.classList.remove('from-start', 'from-end');
      if (dir && !still()) { void stepEl.offsetWidth; stepEl.classList.add(dir > 0 ? 'from-end' : 'from-start'); }
      back.style.visibility = st.step ? 'visible' : 'hidden';
      next.innerHTML = last() ? `${icon('clapperboard')}${esc(L('Start the production', 'ابدأ الإنتاج'))}` : `${esc(L('Next', 'التالي'))}${icon(ar() ? 'arrow-left' : 'arrow-right')}`;
      next.disabled = !S.ok();
      hint.textContent = S.id === 'who' && !st.client ? L('You can add the client later', 'تقدر تضيف العميل بعدين') : '';
      MPH.icons(el);
      drawSlate();
      stepEl.querySelectorAll('[role=radiogroup], [role=group]').forEach(arrows);
      const focus = stepEl.querySelector('.fl-tile.on, .fl-chip.on, .fl-tile, #fl-title, .fl-day:not([disabled])');
      if (dir && focus) focus.focus({ preventScroll: true });
    };
    const refresh = () => { const f = document.activeElement && document.activeElement.dataset; const keep = f && (f.typeIn || f.day); draw(0); if (keep) { const t = stepEl.querySelector(f.typeIn ? `[data-type-in="${f.typeIn}"]` : `[data-day="${f.day}"]`); if (t) { t.focus(); if (t.setSelectionRange) t.setSelectionRange(t.value.length, t.value.length); } } };
    const go = (i) => { const dir = Math.sign(i - st.step); st.step = Math.max(0, Math.min(STEPS.length - 1, i)); draw(dir); };

    stepEl.addEventListener('click', (e) => {
      const t = e.target.closest('[data-type]');
      if (t) { st.type = t.dataset.type; if (!st.hero) st.hero = st.type === 'social' ? '15s' : st.type === 'doc' || st.type === 'short' ? '5 min+' : '30s'; return refresh(); }
      const c = e.target.closest('.fl-chip');
      const pick = c && c.closest('[data-pick]');
      if (pick) {
        const k = pick.dataset.pick, v = c.dataset.v;
        if (k === 'tbc') { st.tbc = !st.tbc; if (st.tbc) { st.start = ''; st.end = ''; } }
        else if (k === 'deliverAfter') { st.deliverAfter = Number(v); st.delivery = ''; }
        else if (k === 'client' || k === 'agency') { st[k] = st[k] === v ? '' : v; }
        else st[k] = v;
        refresh();
        const again = stepEl.querySelector(`[data-pick="${k}"] .fl-chip[data-v="${CSS.escape(v)}"]`);
        if (again) again.focus();
        return;
      }
      const day = e.target.closest('[data-day]');
      if (day) {
        const s = day.dataset.day;
        st.tbc = false;
        if (!st.start || (st.end && st.end !== st.start) || s < st.start) { st.start = s; st.end = s; }
        else st.end = s;
        return refresh();
      }
      const mon = e.target.closest('[data-mon]');
      if (mon) { month = new Date(month.getFullYear(), month.getMonth() + Number(mon.dataset.mon), 1); return refresh(); }
    });
    stepEl.addEventListener('input', (e) => {
      const k = e.target.dataset.typeIn;
      if (k) { st[k] = e.target.value.trim(); next.disabled = !STEPS[st.step].ok(); drawSlate(); stepEl.querySelectorAll(`[data-pick="${k}"] .fl-chip`).forEach((b) => { const on = b.dataset.v === st[k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
      if (e.target.id === 'fl-title') { st.title = e.target.value; st.titleTouched = true; next.disabled = !STEPS[st.step].ok(); drawSlate(); }
      if (e.target.id === 'fl-title-ar') st.titleAr = e.target.value.trim();
    });
    stepEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input') && !next.disabled) { e.preventDefault(); next.click(); } });
    dots.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) go(Number(b.dataset.go)); });
    back.addEventListener('click', () => go(st.step - 1));
    next.addEventListener('click', async () => {
      if (!STEPS[st.step].ok()) return;
      if (!last()) return go(st.step + 1);
      next.disabled = true;
      const err = el.querySelector('#fl-error');
      const title = (st.title || autoTitle()).trim();
      const row = {
        title, title_ar: st.titleAr || null, client_name: st.client || null, agency: st.agency || null, format: formatText() || null,
        status: 'Briefing', shoot_start: st.tbc ? null : st.start || null, shoot_end: st.tbc ? null : st.end || st.start || null,
        delivery: deliveryDate() || null, summary: null, org_id: ctx.session.org.id, created_by: ctx.session.user.id,
      };
      try {
        row.code = await nextCode(ctx);
        const board = slateEl.querySelector('.fl-slate');
        const clap = still() ? Promise.resolve() : new Promise((res) => { board.classList.add('clap'); setTimeout(res, 520); });
        const [created] = await Promise.all([ctx.api.must(await ctx.sb.from('productions').insert(row).select().single()), clap]);
        ctx.closeOverlay();
        ctx.toast(L(`${created.title} is rolling. Drawing its header image…`, `${created.title} بدأ. نرسم صورة الغلاف…`), 'clapperboard');
        MPH.illus.cover(ctx, created.id).then(() => { if (location.hash.includes(created.id)) ctx.refreshAll(); }).catch(() => {});
        ctx.go(`p.${created.id}.brief`);
      } catch (ex) {
        slateEl.querySelector('.fl-slate')?.classList.remove('clap');
        err.hidden = false; err.innerHTML = MPH.ui.errorBox(ex.message); err.setAttribute('role', 'alert'); MPH.icons(err);
        next.disabled = false;
      }
    });
    draw(0);
    const first = stepEl.querySelector('.fl-tile');
    if (first) first.focus({ preventScroll: true });
  }

  /* production codes: org initials, the year, then one more than the highest number used (a count repeats codes
     after a production is deleted, which is how two productions both became NF-2611) */
  async function nextCode(ctx) {
    const org = ctx.session.org;
    const prefix = `${(org.name.match(/\b\w/g) || ['P']).join('').slice(0, 3).toUpperCase()}-${String(new Date().getFullYear()).slice(2)}`;
    const { data } = await ctx.sb.from('productions').select('code').eq('org_id', org.id).like('code', `${prefix}%`);
    const max = (data || []).reduce((m, r) => Math.max(m, Number(String(r.code || '').slice(prefix.length)) || 0), 0);
    return `${prefix}${String(max + 1).padStart(2, '0')}`;
  }

  MPH.flow = { bubble, closeBubble, enhance, newProduction, nextCode };
})();
