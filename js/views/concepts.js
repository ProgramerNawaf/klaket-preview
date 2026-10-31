/* Concepts: the Creative Agent's three ideas (safe / bold / wildcard), written from the reviewed brief and the
   client's own words, each with a scorecard (brief fit, budget, schedule, risk, mandatories).
   Team (owners and producers): versions of the set, edit / regenerate / add / delete ideas (earlier versions are
   kept), "Brief changed: review" flags when the brief moves on, send the set once the client has approved the
   brief.
   Client: only a sent set, without scorecards; they pick one idea with a comment, and Script unlocks. */
(function () {
  const { esc } = MPH;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const TIER = { safe: ['Safe', 'shield-check', 'الآمنة'], bold: ['Bold', 'flame', 'الجريئة'], wildcard: ['Wildcard', 'sparkles', 'المفاجئة'], custom: ['By hand', 'pencil', 'يدوية'] };
  const BUDGET = { within: ['Within budget', 'ok'], at_limit: ['At the limit', 'warn'], over: ['Over budget', 'danger'] };
  const RISK = { low: ['Low risk', 'ok'], medium: ['Medium risk', 'warn'], high: ['High risk', 'danger'] };
  const SET = { draft: ['Draft · internal', ''], sent: ['Sent to the client', 'info'], selected: ['Client chose', 'ok'], archived: ['Earlier version', ''] };
  const FIELD = { objective: 'objective', key_message: 'key message', audience: 'audience', tone: 'tone', mandatories: 'mandatories', budget_min_sar: 'budget from', budget_max_sar: 'budget to', go_live_date: 'go-live', delivery_date: 'delivery', revision_rounds: 'revision rounds', references: 'references' };
  const S = { set: {}, open: {} };
  const sar = (n) => (n == null || n === '' ? '' : `SAR ${Math.round(Number(n) / 1000)}K`);
  const canWrite = (ctx) => ctx.canSeeInternal && !ctx.isClient;
  const ar = () => MPH.state.lang === 'ar';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------ one idea */
  function ideaHtml(ctx, d, c, set, opts) {
    const { ui } = ctx;
    const i = c.data || {};
    const sc = i.scorecard || {};
    const t = TIER[c.tier] || TIER.custom;
    const team = opts.team, editable = team && set.status !== 'selected' && set.status !== 'archived';
    const chosen = set.selected_concept_id === c.id;
    const title = ar() ? i.title_ar || i.title_en : i.title_en || i.title_ar;
    const other = ar() ? i.title_en : i.title_ar;
    const bf = sc.budget_fit || {}, sf = sc.schedule_fit || {}, rk = sc.risk || {};
    const older = (d.concepts || []).filter((x) => x.status === 'replaced' && chainOf(d, c).includes(x.id));
    const impact = c.impact;
    return `
      <article class="cc-idea ${chosen ? 'is-chosen' : ''} ${impact && impact.over_budget ? 'is-over' : ''}" data-concept="${esc(c.id)}">
        <header class="cc-idea-head">
          <span class="cc-tier cc-${esc(c.tier)}">${ui.icon(t[1])}${esc(ar() ? t[2] : t[0])}</span>
          ${chosen ? ui.bubble('approved', 'teal') : ''}
          ${team && set.recommendation && set.recommendation.tier === c.tier ? `<span class="pill">${ui.icon('star')}Recommended</span>` : ''}
          <span class="spacer"></span>
          ${c.origin === 'human' ? `<span class="tiny muted">by hand</span>` : c.edited_at ? `<span class="tiny muted">edited</span>` : ''}
        </header>
        <h3 class="cc-title" dir="auto">${esc(title || 'Untitled')}</h3>
        ${other ? `<p class="cc-title-2" dir="auto">${esc(other)}</p>` : ''}
        <p class="cc-logline" dir="auto">${esc(ar() ? i.logline_ar || i.logline_en : i.logline_en || i.logline_ar)}</p>
        ${(ar() ? i.logline_en : i.logline_ar) ? `<p class="cc-logline-2" dir="auto">${esc(ar() ? i.logline_en : i.logline_ar)}</p>` : ''}
        ${impact && team ? `<div class="callout ${impact.over_budget ? 'danger' : 'market'} cc-impact">${ui.icon(impact.over_budget ? 'circle-dollar-sign' : 'triangle-alert')}<span class="small"><span class="strong">${impact.over_budget ? 'Over budget now' : 'Brief changed: review'}.</span> ${esc(impact.why || '')}</span></div>` : ''}
        <dl class="cc-facts">
          ${i.key_message ? `<dt>Key message</dt><dd dir="auto">${esc(i.key_message)}</dd>` : ''}
          ${i.tone ? `<dt>Tone</dt><dd dir="auto">${esc(i.tone)}</dd>` : ''}
          ${i.builds_on_spark && team ? `<dt>Builds on</dt><dd dir="auto">${ui.icon('lightbulb')} the client’s spark: ${esc(i.builds_on_spark)}</dd>` : ''}
        </dl>
        ${(i.beats || []).length ? `<ol class="cc-beats">${i.beats.map((b) => `<li dir="auto">${esc(b)}</li>`).join('')}</ol>` : ''}
        ${team && (i.client_quotes_used || []).length ? `<div class="cc-quotes">${i.client_quotes_used.map((q) => `<span class="cc-quote" dir="auto">“${esc(q.quote)}” <span class="bf-said mono">${esc([q.speaker, q.timestamp].filter(Boolean).join(' · '))}</span></span>`).join('')}</div>` : ''}
        ${(i.visual_references || []).length ? `<p class="small muted cc-refs">${ui.icon('image')} ${i.visual_references.map(esc).join(' · ')}</p>` : ''}
        ${i.deliverables_plan ? `<p class="small cc-plan">${ui.icon('scissors')} <span dir="auto">${esc(i.deliverables_plan)}</span></p>` : ''}
        ${team ? `
        <div class="cc-score">
          <div class="cc-score-row"><span class="cc-k">Brief fit</span><span class="cc-stars" aria-label="${esc(sc.brief_fit && sc.brief_fit.score)} of 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= ((sc.brief_fit || {}).score || 0) ? 'on' : ''}"></i>`).join('')}</span><span class="tiny muted" dir="auto">${esc((sc.brief_fit || {}).why || '')}</span></div>
          <div class="cc-score-row"><span class="cc-k">Budget</span>${ui.pill((BUDGET[bf.tier] || ['—'])[0], (BUDGET[bf.tier] || [])[1] || '')}<span class="mono small">${(bf.estimate_range_sar || []).length === 2 ? `${esc(sar(bf.estimate_range_sar[0]))}–${esc(sar(bf.estimate_range_sar[1]).replace('SAR ', ''))}` : ''}</span><span class="tiny muted" dir="auto">${esc(bf.why || '')}</span></div>
          <div class="cc-score-row"><span class="cc-k">Schedule</span>${ui.pill(sf.fits === false ? 'Doesn’t fit' : 'Fits', sf.fits === false ? 'danger' : 'ok')}<span class="mono small">${esc(plural(sf.shoot_days_needed || 0, 'shoot day'))}</span><span class="tiny muted" dir="auto">${esc(sf.why || '')}</span></div>
          <div class="cc-score-row"><span class="cc-k">Risk</span>${ui.pill((RISK[rk.level] || ['—'])[0], (RISK[rk.level] || [])[1] || '')}<span class="tiny muted" dir="auto">${(rk.items || []).map(esc).join(' · ')}</span></div>
          ${(sc.mandatory_coverage || []).length ? `<ul class="cc-mand">${sc.mandatory_coverage.map((m) => `<li class="${m.covered ? 'ok' : 'no'}">${ui.icon(m.covered ? 'check' : 'x')}<span dir="auto"><span class="strong">${esc(m.mandatory)}</span> <span class="muted">${esc(m.how || '')}</span></span></li>`).join('')}</ul>` : ''}
        </div>` : ''}
        ${editable ? `<footer class="cc-actions">
          <button class="btn btn-xs btn-outline" data-cc="edit">${ui.icon('pencil')}Edit</button>
          ${c.origin !== 'human' ? `<button class="btn btn-xs btn-outline" data-cc="regen" ${opts.busy ? 'disabled' : ''}>${ui.icon('rotate-ccw')}Regenerate</button>` : ''}
          <span class="spacer"></span><button class="btn btn-xs btn-ghost" data-cc="delete">${ui.icon('trash-2')}Delete</button></footer>` : ''}
        ${!team && opts.canChoose ? `<footer class="cc-actions"><button class="btn btn-sm btn-primary" data-cc="choose">${ui.icon('check')}${ar() ? 'اختر هذه الفكرة' : 'Choose this idea'}</button></footer>` : ''}
        ${team && older.length ? `<details class="cc-older"><summary class="tiny muted">${plural(older.length, 'earlier version')} of this idea</summary>${older.map((o) => `<p class="small" dir="auto"><span class="strong">${esc(o.data.title_en || '')}</span> · ${esc(o.data.logline_en || '')}${o.instruction ? ` <span class="tiny muted">(replaced: “${esc(o.instruction)}”)</span>` : ''}</p>`).join('')}</details>` : ''}
      </article>`;
  }
  /* the ids an idea replaced, oldest last */
  function chainOf(d, c) {
    const out = [];
    let cur = c;
    while (cur && cur.replaces_id) { out.push(cur.replaces_id); cur = (d.concepts || []).find((x) => x.id === cur.replaces_id); }
    return out;
  }

  /* ------------------------------------------------------------ the team page */
  function teamPage(ctx, d) {
    const { ui } = ctx;
    const pid = ctx.production.id;
    const set = d.sets.find((x) => x.id === S.set[pid]) || d.sets.find((x) => x.status !== 'archived') || d.sets[0];
    const job = d.jobs[0];
    const busy = job && ['queued', 'waiting', 'running'].includes(job.status);
    const approved = d.brief && d.brief.status === 'approved';
    const why = !d.review ? 'Mark the brief reviewed first: the ideas are written from the reviewed brief.' : busy ? 'The Creative Agent is already writing.' : '';
    const head = ui.pageHead({
      eyebrow: 'Step 1 · Internal until the brief is approved',
      title: ctx.t('Concepts'),
      sub: set ? `Set v${esc(set.version)} · ${plural(d.concepts.filter((c) => c.set_id === set.id && c.status === 'active').length, 'idea')}` : 'Three creative routes, written from the reviewed brief and the client’s own words.',
      actions: `${set ? `<button class="btn btn-sm btn-ghost" data-cc="add" ${set.status === 'draft' ? '' : 'disabled title="Only a draft set can change"'}>${ui.icon('plus')}Add an idea</button>` : ''}
        <button class="btn btn-sm ${set ? 'btn-outline' : 'btn-primary'}" data-cc="generate" ${why ? `disabled title="${esc(why)}"` : ''}>${ui.icon('sparkles')}${set ? 'Regenerate all' : 'Generate ideas'}</button>
        ${set && set.status === 'draft' ? `<button class="btn btn-sm btn-primary" data-cc="send" ${approved ? '' : 'disabled title="The client approves the brief first; then the ideas can be sent."'}>${ui.icon('send')}Send to the client</button>` : ''}`,
    });
    let top = '';
    if (busy) top += `<div class="callout info" role="status"><span class="spin"></span><span class="small"><span class="strong">The Creative Agent is writing${job.input && job.input.mode === 'one' ? ' one idea' : ' 3 ideas'}…</span> Two or three minutes. You can leave this page.${job.status === 'waiting' ? ` Waiting to retry: ${esc(job.last_error || '')}` : ''}</span></div>`;
    else if (job && job.status === 'failed') top += `<div class="callout danger">${ui.icon('triangle-alert')}<span class="small grow"><span class="strong">The ideas couldn’t be written.</span> ${esc(job.last_error || '')}</span></div>`;
    if (!d.review) top += `<div class="callout">${ui.icon('lock')}<span class="small grow"><span class="strong">Generate ideas is off until the brief is reviewed.</span> On the Brief, resolve the conflicts and suggestions, then choose <span class="strong">Mark brief reviewed</span>; the ideas start by themselves.</span><a class="btn btn-sm btn-outline" href="#p.${esc(pid)}.brief">${ui.icon('clipboard-list')}Open the brief</a></div>`;
    if (set && set.brief_changed && ['draft', 'sent', 'selected'].includes(set.status)) {
      const fields = ((set.brief_changes || {}).fields || []).map((k) => FIELD[k] || k);
      const over = d.concepts.filter((c) => c.set_id === set.id && c.status === 'active' && c.impact && c.impact.over_budget).length;
      top += `<div class="callout market">${ui.icon('triangle-alert')}<span class="small grow"><span class="strong">Brief changed: review.</span> Since these ideas were written: ${fields.map(esc).join(', ')}.${over ? ` <span class="strong">${plural(over, 'idea is', 'ideas are')} now over budget.</span>` : ''}</span></div>`;
    }
    if (set && set.status === 'selected') {
      const pick = d.concepts.find((c) => c.id === set.selected_concept_id);
      top += `<div class="callout ok">${ui.icon('badge-check')}<span class="small grow"><span class="strong">${esc(set.selected_by_name || 'The client')} chose “${esc(pick ? pick.data.title_en : '')}”</span> on ${esc(MPH.date(set.selected_at, 'long'))}${set.client_comment ? `: <span dir="auto">“${esc(set.client_comment)}”</span>` : '.'} Script is unlocked.</span><a class="btn btn-sm btn-primary" href="#p.${esc(pid)}.script">${ui.icon('file-text')}Open Script</a></div>`;
    }
    if (!set) return `<div class="page cc-page">${head}${top}${d.review && !busy ? ui.empty('lightbulb', 'No ideas yet', 'Generate three ideas from the reviewed brief.', `<button class="btn btn-primary" data-cc="generate">${ui.icon('sparkles')}Generate ideas</button>`) : ''}</div>`;
    const ideas = d.concepts.filter((c) => c.set_id === set.id && c.status === 'active').sort((a, b) => a.position - b.position);
    const versions = d.sets.length > 1 ? `<div class="seg cc-sets" role="tablist">${d.sets.map((x) => `<button type="button" class="${x.id === set.id ? 'on' : ''}" data-cc-set="${esc(x.id)}">v${esc(x.version)}${x.status === 'selected' ? ' ✓' : ''}</button>`).join('')}</div>` : '';
    return `<div class="page cc-page">${head}${top}
      <div class="row wrap cc-bar">${versions}${ui.pill((SET[set.status] || [''])[0], (SET[set.status] || [])[1] || '')}${set.instruction ? `<span class="small muted" dir="auto">Instruction: “${esc(set.instruction)}”</span>` : ''}<span class="spacer"></span>${ui.lockNote(set.status === 'draft' ? 'Internal: the client can’t see these' : 'The client sees the ideas, never the scorecards')}</div>
      ${set.recommendation ? `<div class="callout info cc-rec">${ui.icon('star')}<span class="small"><span class="strong">The agent recommends the ${esc((TIER[set.recommendation.tier] || TIER.custom)[0].toLowerCase())} idea.</span> <span dir="auto">${esc(set.recommendation.why || '')}</span></span></div>` : ''}
      <div class="cc-grid">${ideas.map((c) => ideaHtml(ctx, d, c, set, { team: true, busy })).join('')}</div>
      ${(set.assumptions || []).length ? `<section class="cc-assume"><p class="eyebrow">Assumptions the agent made</p><ul class="small muted">${set.assumptions.map((a) => `<li dir="auto">${esc(a)}</li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  /* ------------------------------------------------------------ the client page */
  function clientPage(ctx, d) {
    const { ui } = ctx;
    const set = d.sets.find((x) => ['sent', 'selected'].includes(x.status));
    const head = ui.pageHead({ eyebrow: ar() ? 'الأفكار الإبداعية' : 'Creative ideas', title: ctx.t('Concepts'), sub: set ? (ar() ? 'ثلاث أفكار من البريف المعتمد. اختر واحدة.' : 'Three routes from your approved brief. Choose the one to develop.') : '' });
    if (!set) return `<div class="page cc-page">${head}${ui.empty('lightbulb', 'Ideas are on their way', 'The production team will share creative ideas here once your brief is approved.')}</div>`;
    const ideas = d.concepts.filter((c) => c.set_id === set.id && c.status === 'active').sort((a, b) => a.position - b.position);
    const canChoose = set.status === 'sent' && ctx.realClient;
    return `<div class="page cc-page">${head}
      ${set.status === 'selected' ? `<div class="callout ok">${ui.icon('badge-check')}<span class="small">You chose “${esc((ideas.find((c) => c.id === set.selected_concept_id) || { data: {} }).data.title_en || '')}”. The team starts on the script.</span></div>` : ''}
      <div class="cc-grid">${ideas.map((c) => ideaHtml(ctx, d, c, set, { team: false, canChoose })).join('')}</div></div>`;
  }

  MPH.view('concepts', {
    async load(ctx) {
      const pid = ctx.production.id;
      const { must } = ctx.api;
      const none = Promise.resolve({ data: [], error: null });
      const team = canWrite(ctx);
      const [sets, concepts, review, jobs, brief, people] = await Promise.all([
        ctx.sb.from('concept_sets').select('*').eq('production_id', pid).order('version', { ascending: false }),
        ctx.sb.from('concepts').select('*').eq('production_id', pid).order('created_at'),
        team ? ctx.sb.from('brief_reviews').select('id, version, created_at').eq('production_id', pid).order('version', { ascending: false }).limit(1) : none,
        team ? ctx.sb.from('agent_jobs').select('id, status, last_error, input, created_at').eq('production_id', pid).eq('agent', 'creative').order('created_at', { ascending: false }).limit(1) : none,
        ctx.sb.from('briefs').select('id, version, status').eq('production_id', pid).neq('status', 'draft').order('version', { ascending: false }).limit(1),
        team ? ctx.sb.from('production_stakeholders').select('*').eq('production_id', pid) : none,
      ]);
      return { sets: must(sets), concepts: must(concepts), review: must(review)[0] || null, jobs: must(jobs), brief: must(brief)[0] || null, stakeholders: must(people) };
    },

    render: (ctx, d) => (ctx.isClient ? clientPage(ctx, d) : teamPage(ctx, d)),

    mount(root, ctx, d) {
      const { ui } = ctx;
      const pid = ctx.production.id;
      const job = d.jobs[0];
      // while the agent writes, look again every few seconds
      if (job && ['queued', 'waiting', 'running'].includes(job.status)) {
        setTimeout(() => { if (location.hash.startsWith(`#p.${pid}.concepts`) && document.body.contains(root)) ctx.reload(); }, 6000);
      }
      const ideaOf = (el) => d.concepts.find((c) => c.id === el.closest('[data-concept]').dataset.concept);
      const instructionModal = (title, sub, go) => {
        const el = ctx.modal(ctx.frame({
          title, sub,
          body: `<div class="field"><label for="cc-ins">Instruction for the Creative Agent <span class="faint">(optional)</span></label><textarea id="cc-ins" class="textarea" rows="3" dir="auto" maxlength="1000" placeholder="For example: make the wildcard more comedic"></textarea></div><div id="cc-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="cc-go">${ui.icon('sparkles')}Write</button>`,
        }));
        el.querySelector('#cc-go').addEventListener('click', async (e) => {
          e.target.disabled = true;
          try { await go(el.querySelector('#cc-ins').value.trim()); ctx.closeOverlay(); ctx.reload(); }
          catch (err) { e.target.disabled = false; el.querySelector('#cc-err').innerHTML = ui.errorBox(err.message); MPH.icons(); }
        });
      };
      const editModal = (c, set) => {
        const i = c ? c.data : { tier: 'custom', title_en: '', title_ar: '', logline_en: '', logline_ar: '', key_message: '', tone: '', beats: [] };
        const el = ctx.modal(ctx.frame({
          title: c ? 'Edit idea' : 'Add an idea by hand',
          sub: c ? 'Your edits are kept; the agent never writes over them. Scorecards stay as the agent wrote them.' : 'It joins this draft set next to the agent’s ideas.',
          body: `<div class="grid-2"><div class="field"><label>Title (English)</label><input class="input" id="ce-te" maxlength="200" value="${esc(i.title_en || '')}"></div><div class="field"><label>العنوان (عربي)</label><input class="input" id="ce-ta" dir="rtl" maxlength="200" value="${esc(i.title_ar || '')}"></div></div>
            <div class="grid-2"><div class="field"><label>Logline (English)</label><textarea class="textarea" id="ce-le" rows="3" maxlength="600">${esc(i.logline_en || '')}</textarea></div><div class="field"><label>الفكرة باختصار (عربي)</label><textarea class="textarea" id="ce-la" rows="3" dir="rtl" maxlength="600">${esc(i.logline_ar || '')}</textarea></div></div>
            <div class="grid-2"><div class="field"><label>Key message</label><input class="input" id="ce-km" dir="auto" maxlength="300" value="${esc(i.key_message || '')}"></div><div class="field"><label>Tone</label><input class="input" id="ce-to" dir="auto" maxlength="200" value="${esc(i.tone || '')}"></div></div>
            <div class="field"><label>Beats <span class="faint">(one per line)</span></label><textarea class="textarea" id="ce-be" rows="5" dir="auto" maxlength="3000">${esc((i.beats || []).join('\n'))}</textarea></div><div id="cc-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ce-go">${ui.icon('check')}Save</button>`,
        }), { wide: true });
        el.querySelector('#ce-go').addEventListener('click', async () => {
          const v = (id) => el.querySelector(id).value.trim();
          const data = { ...i, title_en: v('#ce-te'), title_ar: v('#ce-ta'), logline_en: v('#ce-le'), logline_ar: v('#ce-la'), key_message: v('#ce-km'), tone: v('#ce-to'), beats: v('#ce-be').split('\n').map((x) => x.trim()).filter(Boolean) };
          if (!data.title_en && !data.title_ar) { el.querySelector('#cc-err').innerHTML = ui.errorBox('Give the idea a title.'); return MPH.icons(); }
          const now = new Date().toISOString();
          const r = c
            ? await ctx.sb.from('concepts').update({ data, edited_by: ctx.session.user.id, edited_at: now }).eq('id', c.id)
            : await ctx.sb.from('concepts').insert({ set_id: set.id, production_id: pid, tier: 'custom', position: 10, data, origin: 'human', edited_by: ctx.session.user.id, edited_at: now });
          if (r.error) { el.querySelector('#cc-err').innerHTML = ui.errorBox(r.error.message); return MPH.icons(); }
          ctx.closeOverlay(); ctx.reload();
        });
      };
      const sendModal = (set) => {
        const people = (d.stakeholders || []).filter((x) => x.side !== 'internal' && x.email).sort((a, b) => (a.role !== 'approver') - (b.role !== 'approver'));
        const el = ctx.modal(ctx.frame({
          title: `Send concept set v${esc(set.version)} to the client`,
          sub: 'Each approver gets their own link to pick one idea, with a comment. They see the ideas, never the scorecards.',
          body: people.length ? `<div class="list bf-ap-list">${people.map((x) => `<div class="list-row" data-ap="${esc(x.id)}"><input type="checkbox" data-ap-on ${x.role === 'approver' && x.approval_consent ? 'checked' : ''} ${x.approval_consent ? '' : 'disabled'}><div class="grow stack tight" style="gap:0"><span class="small strong" dir="auto">${esc(x.name || x.email)}</span><span class="tiny muted" dir="ltr">${esc(x.email)}</span></div><select class="select" data-ap-role style="width:auto">${[['approver', 'Chooses'], ['cc', 'Kept informed']].map(([id, l]) => `<option value="${id}" ${(x.role || 'cc') === id ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>
            <div class="field"><label for="cs-note">Note in the email <span class="faint">(optional)</span></label><textarea id="cs-note" class="textarea" rows="2" dir="auto" maxlength="2000"></textarea></div><div id="cs-out"></div>`
            : ui.empty('users', 'Nobody to email yet', 'Add the client’s approver on the Brief, under People, with their email.'),
          foot: `<button class="btn btn-ghost" data-close>Close</button>${people.length ? `<button class="btn btn-primary" id="cs-go">${ui.icon('send')}Send</button>` : ''}`,
        }), { wide: true });
        const go = el.querySelector('#cs-go');
        if (!go) return;
        go.addEventListener('click', async () => {
          const recipients = [...el.querySelectorAll('[data-ap]')].filter((r) => r.querySelector('[data-ap-on]').checked).map((r) => ({ stakeholder_id: r.dataset.ap, role: r.querySelector('[data-ap-role]').value }));
          const out = el.querySelector('#cs-out');
          if (!recipients.some((r) => r.role === 'approver')) { out.innerHTML = ui.errorBox('Tick at least one person who chooses.'); return MPH.icons(); }
          go.disabled = true;
          try {
            const res = await ctx.api.fn('approvals', 'send', { target_type: 'concepts', target_id: set.id, recipients, note: el.querySelector('#cs-note').value.trim() || undefined });
            out.innerHTML = `<div class="callout ${res.cancelled ? 'danger' : ''}">${ui.icon(res.cancelled ? 'triangle-alert' : 'mail-check')}<span class="small">${res.cancelled ? 'Nobody could be emailed.' : 'Sent.'} ${res.recipients.map((r) => `${esc(r.name || r.email || '')}: ${esc(r.status)}`).join(' · ')}</span></div>`;
            MPH.icons(); go.remove();
            el.querySelector('[data-close]').addEventListener('click', () => ctx.reload(), { once: true });
          } catch (err) { go.disabled = false; out.innerHTML = ui.errorBox(err.message); MPH.icons(); }
        });
      };
      const chooseModal = (c) => {
        const el = ctx.modal(ctx.frame({
          title: ar() ? 'اختر هذه الفكرة' : 'Choose this idea',
          sub: esc(ar() ? c.data.title_ar || c.data.title_en : c.data.title_en),
          body: `<div class="field"><label for="ch-note">${ar() ? 'تعليق للفريق (اختياري)' : 'A comment for the team (optional)'}</label><textarea id="ch-note" class="textarea" rows="3" dir="auto" maxlength="2000"></textarea></div><div id="ch-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>${ar() ? 'إلغاء' : 'Cancel'}</button><button class="btn btn-primary" id="ch-go">${ui.icon('check')}${ar() ? 'اختيار' : 'Choose'}</button>`,
        }));
        el.querySelector('#ch-go').addEventListener('click', async () => {
          const { error } = await ctx.sb.rpc('choose_concept', { p_concept: c.id, p_comment: el.querySelector('#ch-note').value.trim() || null });
          if (error) { el.querySelector('#ch-err').innerHTML = ui.errorBox(error.message); return MPH.icons(); }
          ctx.closeOverlay(); ctx.reload();
        });
      };

      root.addEventListener('click', async (e) => {
        const sb = e.target.closest('[data-cc-set]');
        if (sb) { S.set[pid] = sb.dataset.ccSet; return MPH.render(); }
        const b = e.target.closest('[data-cc]');
        if (!b) return;
        const act = b.dataset.cc;
        const set = d.sets.find((x) => x.id === S.set[pid]) || d.sets.find((x) => x.status !== 'archived') || d.sets[0];
        if (act === 'generate') return instructionModal(set ? 'Regenerate all three ideas' : 'Generate ideas', set ? 'A new set (v' + (set.version + 1) + ') from the reviewed brief. This set is kept.' : 'Three ideas from the reviewed brief and the client’s own words.',
          (instruction) => ctx.api.fn('agents', 'generate_ideas', { production_id: pid, instruction }));
        if (act === 'add') return editModal(null, set);
        if (act === 'send') return sendModal(set);
        const c = ideaOf(b);
        if (act === 'edit') return editModal(c, set);
        if (act === 'regen') return instructionModal(`Regenerate the ${(TIER[c.tier] || TIER.custom)[0].toLowerCase()} idea`, 'A new version of this idea; the current one is kept under “earlier versions”.',
          (instruction) => ctx.api.fn('agents', 'regenerate_idea', { concept_id: c.id, instruction }));
        if (act === 'choose') return chooseModal(c);
        if (act === 'delete') {
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('btn-danger'); b.title = 'Click again to delete'; return; }
          const { error } = await ctx.sb.from('concepts').update({ status: 'deleted', edited_by: ctx.session.user.id, edited_at: new Date().toISOString() }).eq('id', c.id);
          if (error) return ctx.toastError(new Error(error.message));
          ctx.reload();
        }
      });
      void wait;
    },
  });
})();
