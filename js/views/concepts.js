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

  /* ------------------------------------------------------------ one idea
     Three routes only mean something next to each other, so the card is the part you compare — the tier, the
     title, the logline and the scorecard at a glance, the same height every time. The idea itself (its beats,
     the client's words it uses, the reasoning behind each score) opens in a reading panel, where there is room
     for it. "Ask Saud" sits in the card's header, next to the idea it rewrites, not three screens below it. */
  const titleOf = (i) => (ar() ? i.title_ar || i.title_en : i.title_en || i.title_ar) || 'Untitled';
  const otherTitle = (i) => (ar() ? i.title_en : i.title_ar);
  const logOf = (i) => (ar() ? i.logline_ar || i.logline_en : i.logline_en || i.logline_ar) || '';
  const tierOf = (c) => TIER[c.tier] || TIER.custom;
  const tierName = (c) => (ar() ? tierOf(c)[2] : tierOf(c)[0]).toLowerCase();
  const stars = (n) => `<span class="cc-stars" aria-label="${esc(String(n || 0))} of 5">${[1, 2, 3, 4, 5].map((x) => `<i class="${x <= (n || 0) ? 'on' : ''}"></i>`).join('')}</span>`;
  const range = (bf) => ((bf.estimate_range_sar || []).length === 2 ? `${sar(bf.estimate_range_sar[0])}–${String(sar(bf.estimate_range_sar[1])).replace('SAR ', '')}` : '');
  /* which idea the agent is rewriting right now, if any */
  const writingId = (job) => (job && ['queued', 'waiting', 'running'].includes(job.status) && job.input && job.input.mode === 'one' ? job.input.concept_id : null);

  function ideaHtml(ctx, d, c, set, opts) {
    const { ui } = ctx;
    const i = c.data || {};
    const sc = i.scorecard || {};
    const t = tierOf(c);
    const team = opts.team, editable = team && set.status !== 'selected' && set.status !== 'archived';
    const chosen = set.selected_concept_id === c.id;
    const bf = sc.budget_fit || {}, sf = sc.schedule_fit || {}, rk = sc.risk || {};
    const mand = sc.mandatory_coverage || [];
    const covered = mand.filter((m) => m.covered).length;
    const impact = c.impact;
    const older = (d.concepts || []).filter((x) => x.status === 'replaced' && chainOf(d, c).includes(x.id));
    const writing = opts.writing === c.id;
    return `
      <article class="cc-idea ${chosen ? 'is-chosen' : ''} ${impact && impact.over_budget ? 'is-over' : ''} ${writing ? 'is-writing' : ''}" data-concept="${esc(c.id)}">
        <header class="cc-idea-head">
          <span class="cc-tier cc-${esc(c.tier)}">${ui.icon(t[1])}${esc(ar() ? t[2] : t[0])}</span>
          ${chosen ? ui.bubble('approved', 'teal') : ''}
          ${team && set.recommendation && set.recommendation.tier === c.tier ? `<span class="pill">${ui.icon('star')}Recommended</span>` : ''}
          <span class="spacer"></span>
          ${c.origin === 'human' ? '<span class="tiny muted">by hand</span>' : c.edited_at ? '<span class="tiny muted">edited</span>' : ''}
          ${editable && c.origin !== 'human' ? `<button class="btn btn-xs btn-outline cc-saud" data-cc="saud" ${opts.busy ? 'disabled title="Saud is already writing"' : ''}>${ui.icon('wand-sparkles')}Ask Saud</button>` : ''}
        </header>

        <h3 class="cc-title" dir="auto">${esc(titleOf(i))}</h3>
        ${otherTitle(i) ? `<p class="cc-title-2" dir="auto">${esc(otherTitle(i))}</p>` : ''}
        <p class="cc-logline" dir="auto">${esc(logOf(i))}</p>

        ${writing ? `<div class="callout info cc-writing" role="status"><span class="spin"></span><span class="small grow ltr-copy" dir="ltr"><span class="strong">Saud is rewriting this idea…</span>${opts.writingNote ? ` From your note: <span dir="auto">“${esc(opts.writingNote)}”</span>` : ''} Two or three minutes. You can leave this page.</span></div>` : ''}
        ${impact && team ? `<div class="callout ${impact.over_budget ? 'danger' : 'market'} cc-impact">${ui.icon(impact.over_budget ? 'circle-dollar-sign' : 'triangle-alert')}<span class="small"><span class="strong">${impact.over_budget ? 'Over budget now' : 'Brief changed: review'}.</span> ${esc(impact.why || '')}</span></div>` : ''}
        ${team && c.instruction ? `<p class="small cc-from ltr-copy" dir="ltr">${ui.icon('wand-sparkles')}<span dir="auto">Rewritten from: “${esc(c.instruction)}”</span></p>` : ''}

        ${team && !sc.brief_fit && !sc.budget_fit ? `<p class="small muted cc-unscored">${ui.icon('circle-dashed')}Not scored — this idea was added by hand.</p>` : ''}
        ${team && (sc.brief_fit || sc.budget_fit) ? `
        <div class="cc-strip">
          <div class="cc-cell"><span class="cc-k">Brief fit</span>${stars((sc.brief_fit || {}).score)}</div>
          <div class="cc-cell"><span class="cc-k">Budget</span><span class="row tight">${ui.pill((BUDGET[bf.tier] || ['—'])[0], (BUDGET[bf.tier] || [])[1] || '')}${range(bf) ? `<span class="mono tiny">${esc(range(bf))}</span>` : ''}</span></div>
          <div class="cc-cell"><span class="cc-k">Schedule</span><span class="row tight">${ui.pill(sf.fits === false ? 'Doesn’t fit' : 'Fits', sf.fits === false ? 'danger' : 'ok')}${sf.shoot_days_needed ? `<span class="mono tiny">${esc(plural(sf.shoot_days_needed, 'day'))}</span>` : ''}</span></div>
          <div class="cc-cell"><span class="cc-k">Risk</span>${ui.pill((RISK[rk.level] || ['—'])[0], (RISK[rk.level] || [])[1] || '')}</div>
          ${mand.length ? `<div class="cc-cell cc-wide"><span class="cc-k">Mandatories</span><span class="small ${covered === mand.length ? 'cc-all' : 'cc-miss'}">${ui.icon(covered === mand.length ? 'check' : 'triangle-alert')}${covered} of ${mand.length} covered</span></div>` : ''}
        </div>` : ''}

        <footer class="cc-actions">
          <button class="btn btn-sm btn-outline" data-cc="open">${ui.icon('book-open')}${ar() ? 'اقرأ الفكرة' : 'Read the idea'}</button>
          ${editable ? `<button class="btn btn-sm btn-ghost btn-icon" data-cc="edit" aria-label="Edit this idea" title="Edit">${ui.icon('pencil')}</button>
            <span class="spacer"></span>
            ${older.length ? `<button class="btn btn-sm btn-ghost" data-cc="history" title="What this idea replaced">${ui.icon('history')}${older.length}</button>` : ''}
            <button class="btn btn-sm btn-ghost btn-icon" data-cc="delete" aria-label="Delete this idea" title="Delete">${ui.icon('trash-2')}</button>` : ''}
          ${!team && opts.canChoose ? `<span class="spacer"></span><button class="btn btn-sm btn-primary" data-cc="choose">${ui.icon('check')}${ar() ? 'اختر هذه الفكرة' : 'Choose this idea'}</button>` : ''}
        </footer>
      </article>`;
  }

  /* the whole idea, for the reading panel: everything the card leaves out */
  function ideaFullHtml(ctx, d, c, set, team) {
    const { ui } = ctx;
    const i = c.data || {};
    const sc = i.scorecard || {};
    const bf = sc.budget_fit || {}, sf = sc.schedule_fit || {}, rk = sc.risk || {};
    const row = (k, pill, extra, why) => `<div class="cc-row"><span class="cc-k">${esc(k)}</span><span class="row tight wrap">${pill}${extra || ''}</span>${why ? `<p class="small muted" dir="auto">${esc(why)}</p>` : ''}</div>`;
    return `
      ${otherTitle(i) ? `<p class="cc-title-2" dir="auto">${esc(otherTitle(i))}</p>` : ''}
      <p class="cc-logline" dir="auto">${esc(logOf(i))}</p>
      ${(ar() ? i.logline_en : i.logline_ar) ? `<p class="cc-logline-2" dir="auto">${esc(ar() ? i.logline_en : i.logline_ar)}</p>` : ''}
      <dl class="cc-facts">
        ${i.key_message ? `<dt>Key message</dt><dd dir="auto">${esc(i.key_message)}</dd>` : ''}
        ${i.tone ? `<dt>Tone</dt><dd dir="auto">${esc(i.tone)}</dd>` : ''}
        ${i.builds_on_spark && team ? `<dt>Builds on</dt><dd dir="auto">${ui.icon('lightbulb')} the client’s spark: ${esc(i.builds_on_spark)}</dd>` : ''}
      </dl>
      ${(i.beats || []).length ? `<h4 class="cc-h">${ui.icon('film')}How it plays</h4><ol class="cc-beats">${i.beats.map((b) => `<li dir="auto">${esc(b)}</li>`).join('')}</ol>` : ''}
      ${team && (i.client_quotes_used || []).length ? `<h4 class="cc-h">${ui.icon('quote')}The client’s own words it uses</h4><div class="cc-quotes">${i.client_quotes_used.map((q) => `<span class="cc-quote" dir="auto">“${esc(q.quote)}” <span class="bf-said mono">${esc([q.speaker, q.timestamp].filter(Boolean).join(' · '))}</span></span>`).join('')}</div>` : ''}
      ${(i.visual_references || []).length ? `<h4 class="cc-h">${ui.icon('image')}Look</h4><p class="small muted" dir="auto">${i.visual_references.map(esc).join(' · ')}</p>` : ''}
      ${i.deliverables_plan ? `<h4 class="cc-h">${ui.icon('scissors')}How it cuts down</h4><p class="small" dir="auto">${esc(i.deliverables_plan)}</p>` : ''}
      ${team ? `
      <h4 class="cc-h">${ui.icon('clipboard-check')}Scorecard</h4>
      <div class="cc-score">
        ${row('Brief fit', stars((sc.brief_fit || {}).score), '', (sc.brief_fit || {}).why)}
        ${row('Budget', ui.pill((BUDGET[bf.tier] || ['—'])[0], (BUDGET[bf.tier] || [])[1] || ''), range(bf) ? `<span class="mono small">${esc(range(bf))}</span>` : '', bf.why)}
        ${row('Schedule', ui.pill(sf.fits === false ? 'Doesn’t fit' : 'Fits', sf.fits === false ? 'danger' : 'ok'), sf.shoot_days_needed ? `<span class="mono small">${esc(plural(sf.shoot_days_needed, 'shoot day'))}</span>` : '', sf.why)}
        ${row('Risk', ui.pill((RISK[rk.level] || ['—'])[0], (RISK[rk.level] || [])[1] || ''), '', (rk.items || []).join(' · '))}
      </div>
      ${(sc.mandatory_coverage || []).length ? `<h4 class="cc-h">${ui.icon('list-checks')}Mandatories</h4><ul class="cc-mand">${sc.mandatory_coverage.map((m) => `<li class="${m.covered ? 'ok' : 'no'}">${ui.icon(m.covered ? 'check' : 'x')}<span dir="auto"><span class="strong">${esc(m.mandatory)}</span> <span class="muted">${esc(m.how || '')}</span></span></li>`).join('')}</ul>` : ''}` : ''}`;
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
        ${set && set.status === 'draft' ? `<button class="btn btn-sm btn-primary" data-cc="send" ${approved ? '' : 'disabled title="The client approves the brief first; then the ideas can be sent."'}>${ui.icon('send')}Send to the client</button>` : ''}
        ${set && ['draft', 'sent'].includes(set.status) ? `<button class="btn btn-sm btn-outline" data-cc="behalf" ${approved ? '' : 'disabled title="The client approves the brief first; then they can choose an idea."'}>${ui.icon('badge-check')}Record the client’s choice</button>` : ''}`,
    });
    const writing = writingId(job);
    const writingNote = writing && job.input ? job.input.instruction : '';
    let top = '';
    if (busy && !writing) top += `<div class="callout info" role="status"><span class="spin"></span><span class="small ltr-copy" dir="ltr"><span class="strong">Saud is writing 3 ideas…</span> Two or three minutes. You can leave this page.${job.status === 'waiting' ? ` Waiting to retry: ${esc(job.last_error || '')}` : ''}</span></div>`;
    else if (job && job.status === 'failed') top += `<div class="callout danger">${ui.icon('triangle-alert')}<span class="small grow ltr-copy" dir="ltr"><span class="strong">The ideas couldn’t be written.</span> ${esc(job.last_error || '')}</span></div>`;
    if (!d.review) top += `<div class="callout">${ui.icon('lock')}<span class="small grow ltr-copy" dir="ltr"><span class="strong">Generate ideas is off until the brief is reviewed.</span> On the Brief, resolve the conflicts and suggestions, then choose <span class="strong">Mark brief reviewed</span>; the ideas start by themselves.</span><a class="btn btn-sm btn-outline" href="#p.${esc(pid)}.brief">${ui.icon('clipboard-list')}Open the brief</a></div>`;
    if (set && set.brief_changed && ['draft', 'sent', 'selected'].includes(set.status)) {
      const fields = ((set.brief_changes || {}).fields || []).map((k) => FIELD[k] || k);
      const over = d.concepts.filter((c) => c.set_id === set.id && c.status === 'active' && c.impact && c.impact.over_budget).length;
      top += `<div class="callout market">${ui.icon('triangle-alert')}<span class="small grow ltr-copy" dir="ltr"><span class="strong">Brief changed: review.</span> Since these ideas were written: ${fields.map(esc).join(', ')}.${over ? ` <span class="strong">${plural(over, 'idea is', 'ideas are')} now over budget.</span>` : ''}</span></div>`;
    }
    if (set && set.status === 'selected') {
      const pick = d.concepts.find((c) => c.id === set.selected_concept_id);
      top += `<div class="callout ok">${ui.icon('badge-check')}<span class="small grow ltr-copy" dir="ltr"><span class="strong">${esc(set.selected_by_name || 'The client')} chose “${esc(pick ? pick.data.title_en : '')}”</span>${set.chosen_via === 'on_behalf' ? ' (recorded on their behalf)' : ''} on ${esc(MPH.date(set.selected_at, 'long'))}${set.client_comment ? `: <span dir="auto">“${esc(set.client_comment)}”</span>.` : '.'} Script is unlocked.</span><a class="btn btn-sm btn-primary" href="#p.${esc(pid)}.script">${ui.icon('file-text')}Open Script</a></div>`;
    }
    if (!set) return `<div class="page cc-page">${head}${top}${d.review && !busy ? ui.empty('lightbulb', 'No ideas yet', 'Generate three ideas from the reviewed brief.', `<button class="btn btn-primary" data-cc="generate">${ui.icon('sparkles')}Generate ideas</button>`) : ''}</div>`;
    const ideas = d.concepts.filter((c) => c.set_id === set.id && c.status === 'active').sort((a, b) => a.position - b.position);
    const versions = d.sets.length > 1 ? `<div class="seg cc-sets" role="tablist">${d.sets.map((x) => `<button type="button" class="${x.id === set.id ? 'on' : ''}" data-cc-set="${esc(x.id)}">v${esc(x.version)}${x.status === 'selected' ? ' ✓' : ''}</button>`).join('')}</div>` : '';
    return `<div class="page cc-page">${head}${top}
      <div class="row wrap cc-bar">${versions}${ui.pill((SET[set.status] || [''])[0], (SET[set.status] || [])[1] || '')}<span class="spacer"></span>${ui.lockNote(set.status === 'draft' ? 'Internal: the client can’t see these' : 'The client sees the ideas, never the scorecards')}</div>
      ${set.instruction ? `<p class="cc-asked">${ui.icon('wand-sparkles')}<span class="small ltr-copy" dir="ltr">This set was written from your note: <span class="strong">“${esc(set.instruction)}”</span></span></p>` : ''}
      ${set.recommendation ? `<div class="callout info cc-rec">${ui.icon('star')}
        <div class="grow stack tight" style="gap:3px">
          <span class="small ltr-copy" dir="ltr"><span class="strong">Saud recommends the ${esc((TIER[set.recommendation.tier] || TIER.custom)[0].toLowerCase())} idea.</span></span>
          <p class="small cc-rec-why ltr-copy" dir="ltr">${esc(set.recommendation.why || '')}</p>
          ${String(set.recommendation.why || '').length > 260 ? `<button type="button" class="btn btn-xs btn-ghost cc-more" data-cc="more">${ui.icon('chevron-down')}Read why</button>` : ''}
        </div></div>` : ''}
      <div class="cc-grid">${ideas.map((c) => ideaHtml(ctx, d, c, set, { team: true, busy, writing, writingNote })).join('')}</div>
      ${(set.assumptions || []).length ? `<section class="cc-assume ltr-copy" dir="ltr"><p class="eyebrow">Assumptions the agent made</p><ul class="small muted">${set.assumptions.map((a) => `<li dir="auto">${esc(a)}</li>`).join('')}</ul></section>` : ''}
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
      /* ---------- Ask Saud: say what should change, in your own words, about this one idea.
         The note goes to the Creative Agent as a creative direction; the brief, the client's words and the other
         two ideas go with it, so the rewrite stays on brief and stays a different film from its neighbours. */
      const NUDGES = {
        one: [
          ['Funnier', 'Make it funnier — lighter, with real comic timing.'],
          ['Warmer', 'Make it warmer and more emotional.'],
          ['Cheaper to shoot', 'Make it cheaper to shoot: fewer locations, no drone, no night work.'],
          ['Fewer locations', 'Keep it to one location.'],
          ['More Saudi', 'Root it harder in Saudi life — our streets, our people, our dialect.'],
          ['Simpler', 'Simplify it: one idea, one scene, told plainly.'],
          ['Keep the ending', 'Keep the ending exactly as it is, and change how we get there.'],
          ['Different story', 'Same tone, completely different story.'],
        ],
        all: [
          ['Bolder across the board', 'Push all three further — we can take more risk.'],
          ['Cheaper', 'Bring all three inside the budget: fewer locations and no drone.'],
          ['More Saudi', 'Root all three harder in Saudi life.'],
          ['Less product-led', 'Less about the product, more about the people.'],
        ],
      };
      /* the notes already given to this idea and the ones it replaced, newest first */
      const notesOf = (c) => {
        const out = [];
        let cur = c;
        while (cur) {
          if (cur.instruction) out.push({ note: cur.instruction, title: (cur.data || {}).title_en || '', at: cur.created_at });
          cur = cur.replaces_id ? (d.concepts || []).find((x) => x.id === cur.replaces_id) : null;
        }
        return out;
      };
      function askSaud(c, set) {
        const one = !!c;
        const i = c ? c.data || {} : {};
        const past = c ? notesOf(c) : (d.sets || []).filter((x) => x.instruction).map((x) => ({ note: x.instruction, title: `v${x.version}`, at: x.created_at }));
        const el = ctx.modal(ctx.frame({
          title: one ? `Ask Saud to redo the ${esc(tierName(c))} idea` : 'Ask Saud for three new ideas',
          sub: one ? 'Say what should change. The idea you have now is kept, so you can go back to it.'
            : `A new set (v${(d.sets || []).reduce((m, x) => Math.max(m, x.version || 0), 0) + 1}) from the reviewed brief. The sets you have now are kept.`,
          body: `
            ${one ? `<div class="cc-ask-of"><span class="cc-tier cc-${esc(c.tier)}">${ui.icon(tierOf(c)[1])}${esc(tierOf(c)[0])}</span>
              <div class="stack tight" style="gap:2px;min-width:0"><span class="strong" dir="auto">${esc(titleOf(i))}</span><span class="small muted cc-ask-log" dir="auto">${esc(logOf(i))}</span></div></div>` : ''}
            <div class="field">
              <label for="cc-ins">${one ? 'What should Saud change?' : 'Anything to steer the three by?'} <span class="faint">(optional)</span></label>
              <textarea id="cc-ins" class="textarea" rows="3" dir="auto" maxlength="1000" placeholder="${one ? 'Make it funnier, and lose the desert — we can’t afford it.' : 'Lean into night driving in Riyadh.'}"></textarea>
            </div>
            <div class="cc-nudges">${(one ? NUDGES.one : NUDGES.all).map(([label, text]) => `<button type="button" class="chip cc-nudge" data-text="${esc(text)}">${esc(label)}</button>`).join('')}</div>
            <details class="cc-keeps"><summary class="small muted">${ui.icon('info')}What Saud works from</summary>
              <ul class="small muted cc-keeps-list">
                <li>${ui.icon('clipboard-check')}The reviewed brief — goal, audience, deliverables, budget, dates and mandatories.</li>
                <li>${ui.icon('quote')}The client’s own words, sparks and references from the Brief.</li>
                ${one ? `<li>${ui.icon('columns-3')}The other two ideas, so this one stays a different film.</li>
                  <li>${ui.icon('history')}This idea as it stands now, and every earlier version of it.</li>` : ''}
              </ul>
              <p class="tiny faint">Your note is a creative direction. It can’t change the brief, the budget or the rules — change those on the Brief.</p>
            </details>
            ${past.length ? `<details class="cc-past"><summary class="small muted">${ui.icon('messages-square')}${plural(past.length, 'note')} already given</summary>
              <ul class="small cc-past-list">${past.map((p) => `<li><span dir="auto">“${esc(p.note)}”</span> <span class="tiny faint">→ ${esc(p.title)}</span></li>`).join('')}</ul></details>` : ''}
            <div id="cc-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="cc-go">${ui.icon('wand-sparkles')}${one ? 'Ask Saud to rewrite it' : 'Ask Saud to write them'}</button>`,
        }), { wide: true });
        const box = el.querySelector('#cc-ins');
        el.querySelectorAll('.cc-nudge').forEach((b) => b.addEventListener('click', () => {
          const t = b.dataset.text;
          const cur = box.value.trim();
          if (cur.includes(t)) return;
          box.value = cur ? `${cur} ${t}` : t;
          b.classList.add('is-on');
          box.focus();
        }));
        setTimeout(() => box.focus(), 50);
        el.querySelector('#cc-go').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true; btn.innerHTML = `${ui.spinner()}Sending to Saud…`;
          const instruction = box.value.trim();
          try {
            if (one) await ctx.api.fn('agents', 'regenerate_idea', { concept_id: c.id, instruction });
            else await ctx.api.fn('agents', 'generate_ideas', { production_id: pid, instruction });
            ctx.closeOverlay();
            ctx.toast(one ? `Saud is rewriting the ${tierName(c)} idea` : 'Saud is writing three ideas', 'wand-sparkles');
            ctx.reload();
          } catch (err) {
            btn.disabled = false; btn.innerHTML = `${ui.icon('wand-sparkles')}${one ? 'Ask Saud to rewrite it' : 'Ask Saud to write them'}`;
            el.querySelector('#cc-err').innerHTML = ui.errorBox(err.message); MPH.icons();
          }
        });
      }

      /* ---------- the idea in full, with room to read it */
      const readIdea = (c, set) => {
        const team = canWrite(ctx);
        const editable = team && set.status !== 'selected' && set.status !== 'archived';
        const jobNow = d.jobs[0];
        const busyNow = jobNow && ['queued', 'waiting', 'running'].includes(jobNow.status);
        const el = ctx.drawer(ctx.frame({
          title: esc(titleOf(c.data || {})),
          sub: `${esc(ar() ? tierOf(c)[2] : tierOf(c)[0])}${team && c.instruction ? ` · rewritten from “${esc(c.instruction)}”` : ''}`,
          body: ideaFullHtml(ctx, d, c, set, team),
          foot: `<button class="btn btn-ghost" data-close>Close</button>
            ${editable ? `<button class="btn btn-outline" data-cc-drawer="edit">${ui.icon('pencil')}Edit</button>
              ${c.origin !== 'human' ? `<button class="btn btn-primary" data-cc-drawer="saud" ${busyNow ? 'disabled title="Saud is already writing"' : ''}>${ui.icon('wand-sparkles')}Ask Saud to redo it</button>` : ''}` : ''}`,
        }));
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-cc-drawer]');
          if (!b) return;
          ctx.closeOverlay();
          if (b.dataset.ccDrawer === 'edit') editModal(c, set);
          else askSaud(c, set);
        });
      };

      /* ---------- what an idea replaced, and the note that replaced it */
      const showHistory = (c) => {
        const chain = chainOf(d, c).map((id) => (d.concepts || []).find((x) => x.id === id)).filter(Boolean);
        ctx.drawer(ctx.frame({
          title: `Earlier versions of ${esc(titleOf(c.data || {}))}`,
          sub: `${plural(chain.length, 'version')} before this one`,
          body: `<ol class="cc-hist">
            <li class="is-now"><span class="pill ok">${ui.icon('check')}Now</span>
              <p class="strong" dir="auto">${esc(titleOf(c.data || {}))}</p><p class="small muted" dir="auto">${esc(logOf(c.data || {}))}</p>
              ${c.instruction ? `<p class="small cc-from">${ui.icon('wand-sparkles')}<span dir="auto">From your note: “${esc(c.instruction)}”</span></p>` : ''}</li>
            ${chain.map((o) => `<li><span class="pill">${esc(MPH.date(o.created_at, 'long'))}</span>
              <p class="strong" dir="auto">${esc(titleOf(o.data || {}))}</p><p class="small muted" dir="auto">${esc(logOf(o.data || {}))}</p>
              ${o.instruction ? `<p class="small cc-from">${ui.icon('wand-sparkles')}<span dir="auto">From your note: “${esc(o.instruction)}”</span></p>` : ''}</li>`).join('')}
          </ol>`,
          foot: '<button class="btn btn-ghost" data-close>Close</button>',
        }));
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
        if (act === 'generate') return askSaud(null, set);
        if (act === 'more') { const w = b.closest('.cc-rec').querySelector('.cc-rec-why'); w.classList.toggle('is-open'); b.innerHTML = `${ui.icon(w.classList.contains('is-open') ? 'chevron-up' : 'chevron-down')}${w.classList.contains('is-open') ? 'Less' : 'Read why'}`; return MPH.icons(b); }
        if (act === 'add') return editModal(null, set);
        if (act === 'send') return sendModal(set);
        if (act === 'behalf') return MPH.approve.onBehalf(ctx, { type: 'concepts', id: set.id, title: `Concept set v${set.version}`,
          ideas: d.concepts.filter((c) => c.set_id === set.id && c.status === 'active').map((c) => ({ id: c.id, title: `${c.tier ? c.tier[0].toUpperCase() + c.tier.slice(1) + ': ' : ''}${(c.data && c.data.title_en) || ''}${c.data && c.data.title_ar ? ' · ' + c.data.title_ar : ''}` })) });
        const c = ideaOf(b);
        if (act === 'edit') return editModal(c, set);
        if (act === 'saud') return askSaud(c, set);
        if (act === 'open') return readIdea(c, set);
        if (act === 'history') return showHistory(c);
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
