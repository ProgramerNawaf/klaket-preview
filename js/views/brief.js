/* Brief (#p.<id>.brief): Pre-production step 0, client-visible.
   The client's request as structured data: who the client is, the goal, the deliverables (rows), usage rights (rows),
   money and dates, mandatories. Versioned like the treatment (briefs: one row per version) and decided by the client:
   draft → sent → approved / changes_requested. Sent versions are locked in the database, not just here.
   Owners and producers write; HoDs and crew read; clients only ever load versions that were sent to them.
   Later screens read the active brief (latest approved, else latest) through MPH.briefs.active().
   Sources (pasted text and files now; emails and meetings later) are read by the brief_extract AI action into
   suggestions, reviewed here the way the AI Breakdown reviews elements. Sources and suggestions are internal:
   owners and producers only, enforced by RLS. A person's edits always win over later suggestions. */
(function () {
  const esc = MPH.esc;
  const STATUS = {
    draft: { label: 'Draft', kind: '', icon: 'pencil-line' },
    sent: { label: 'Sent', kind: 'warn', icon: 'send' },
    approved: { label: 'Approved', kind: 'ok', icon: 'badge-check' },
    changes_requested: { label: 'Changes requested', kind: 'danger', icon: 'message-square-warning' },
  };
  const RATIOS = ['16:9', '9:16', '1:1', '4:5', '2.39:1'];
  const MEDIA = [['digital', 'Digital'], ['tv', 'TV'], ['cinema', 'Cinema'], ['ooh', 'Outdoor (OOH)'], ['all', 'All media']];
  const PLATFORMS = ['YouTube', 'Instagram Reels', 'Instagram feed', 'TikTok', 'Snapchat', 'X', 'LinkedIn', 'TV', 'Cinema', 'Website', 'Outdoor screens'];
  const LANGS = ['Arabic', 'English', 'Arabic and English'];
  const DURATIONS = [6, 10, 15, 20, 30, 45, 60, 90, 120, 180];
  const TERRITORIES = ['Saudi Arabia', 'GCC', 'MENA', 'Worldwide'];

  /* the brief's scalar fields, in screen order. type: text | area | money | date | int | approver | refs */
  const GROUPS = [
    { id: 'client', title: 'Client', icon: 'building-2', fields: [
      { k: 'client_company', label: 'Client company', type: 'text', ph: 'Al-Rimal Motors' },
      { k: 'brand', label: 'Brand', type: 'text', ph: 'The brand or product line' },
      { k: 'agency', label: 'Agency', type: 'text', ph: 'Leave empty if the client briefs you directly', optional: true },
      { k: 'approver', label: 'Approver', type: 'approver', hint: 'The person who approves this brief for the client.' },
    ] },
    { id: 'goal', title: 'Goal', icon: 'target', fields: [
      { k: 'objective', label: 'Objective', type: 'area', ph: 'What should this film achieve for the brand?' },
      { k: 'key_message', label: 'Key message', type: 'area', ph: 'The one thing the audience should remember' },
      { k: 'audience', label: 'Target audience', type: 'area', ph: 'Who, where, how old, what they care about' },
      { k: 'tone', label: 'Tone', type: 'text', ph: 'Warm, proud, quietly funny' },
    ] },
    { id: 'money', title: 'Money and time', icon: 'calendar-clock', fields: [
      { k: 'budget_min_sar', label: 'Budget from (SAR)', type: 'money' },
      { k: 'budget_max_sar', label: 'Budget to (SAR)', type: 'money' },
      { k: 'go_live_date', label: 'Go-live date', type: 'date' },
      { k: 'delivery_date', label: 'Delivery date', type: 'date', hint: 'When the final files are due.' },
    ] },
    { id: 'rules', title: 'Mandatories and feedback', icon: 'list-checks', fields: [
      { k: 'mandatories', label: 'Mandatories', type: 'area', ph: 'Logo end frame, call to action, legal lines, product specs' },
      { k: 'revision_rounds', label: 'Revision rounds', type: 'int', ph: '2' },
      { k: 'feedback_owner', label: 'Feedback owner', type: 'text', ph: 'Who collects and sends the client’s feedback' },
      { k: 'references', label: 'References', type: 'refs', ph: 'One per line: a name, then the link\nBrand guidelines https://…' },
      { k: 'format_notes', label: 'Format notes', type: 'area', ph: 'Anything about formats that doesn’t fit the deliverables table' },
    ] },
  ];
  const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);
  /* what a brief needs before it can do its job downstream */
  const ESSENTIALS = [['objective', 'objective'], ['audience', 'target audience'], ['budget_max_sar', 'budget'], ['delivery_date', 'delivery date']];

  /* per-production UI state that outlives re-renders */
  const S = { ver: {}, hide: {} };
  const runs = new Map(); // production id -> promise of the extraction summary (survives navigation)
  const HIGH = 0.75;      // "Accept all high-confidence"
  const ROW_LABEL = { deliverable: 'Deliverable', usage_right: 'Usage right', reference: 'Reference' };
  const SRC = { manual: ['clipboard-paste', 'Pasted text'], email: ['mail', 'Email'], meeting: ['video', 'Meeting'] };
  let activeSaver = null;
  window.addEventListener('beforeunload', (e) => {
    if (activeSaver && activeSaver.dirty) { activeSaver.flush(); e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------ helpers */
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const txt = (v, max = 4000) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : ''; };
  const numOrNull = (v) => { const s = String(v ?? '').replace(/[,\s]/g, ''); if (!s) return null; const n = Number(s); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; };
  const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some((x) => String(x || '').trim()));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');
  const mediaLabel = (m) => (MEDIA.find(([id]) => id === m) || [m, m])[1];
  const durLabel = (s) => { s = Number(s) || 0; return !s ? '' : s < 60 || s % 60 ? `${s}s` : `${s / 60} min`; };
  const termLabel = (m) => { m = Number(m) || 0; return !m ? '' : m % 12 ? plural(m, 'month') : plural(m / 12, 'year'); };
  const range = (f) => {
    const a = numOrNull(f.budget_min_sar), b = numOrNull(f.budget_max_sar);
    if (a == null && b == null) return '';
    if (a != null && b != null) return `${MPH.sarK(a)} to ${MPH.sarK(b)}`;
    return a != null ? `From ${MPH.sarK(a)}` : `Up to ${MPH.sarK(b)}`;
  };
  /* references: stored as [{label, url}], edited as one line each */
  const refsToText = (list) => (Array.isArray(list) ? list : []).map((r) => [r.label, r.url].filter(Boolean).join(' ')).join('\n');
  const textToRefs = (s) => String(s || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const m = /(https?:\/\/\S+)/i.exec(line);
    return { label: txt(m ? line.replace(m[1], '') : line, 200).replace(/[\s:–-]+$/, ''), url: m ? m[1] : '' };
  }).slice(0, 30);

  /* ------------------------------------------------------------ sources and suggestions */
  const fieldDef = (k) => ALL_FIELDS.find((x) => x.k === k);
  const labelOf = (k) => (fieldDef(k) || {}).label || ROW_LABEL[k] || k;
  const srcOf = (d, id) => (d.sources || []).find((x) => x.id === id) || null;
  const srcTitle = (d, id) => { const x = srcOf(d, id); return x ? (x.title || SRC[x.type][1]) : 'an earlier source'; };
  const sugOf = (d, id) => (d.suggestions || []).find((x) => x.id === id) || null;
  function fmtVal(k, v) {
    if (isEmpty(v)) return '<span class="faint">empty</span>';
    if (k === 'deliverable') return esc([v.name || 'Untitled', durLabel(v.duration_s), v.aspect_ratio, v.platform, v.language, v.subtitles ? 'subtitled' : '', v.clean_version ? 'clean version' : ''].filter(Boolean).join(' · '));
    if (k === 'usage_right') return esc([mediaLabel(v.media), v.territory, termLabel(v.term_months)].filter(Boolean).join(' · '));
    if (k === 'reference') return esc([v.label, v.url].filter(Boolean).join(' '));
    const def = fieldDef(k);
    return def ? fieldRead(def, v) : esc(String(v));
  }
  const pctPill = (ui, c) => ui.pill(`${Math.round((Number(c) || 0) * 100)}%`, c >= 0.9 ? 'ok' : c >= HIGH ? '' : 'warn');

  /* where a field's value came from (team only): the source, and the quote that supports it */
  function provHtml(ctx, d, b, k) {
    if (!canWrite(ctx) || !d.suggestions) return '';
    const m = (b.field_meta || {})[k];
    if (!m || !m.suggestion_id) return '';
    const sg = sugOf(d, m.suggestion_id);
    const how = m.by === 'ai' ? 'AI ·' : m.via === 'corrected' ? 'Corrected from' : 'Accepted from';
    return `<button type="button" class="bf-prov ${m.by === 'ai' ? 'is-ai' : ''}" data-bf-src="${esc(m.source_id || '')}" title="Open the source">
      ${ctx.ui.icon(m.by === 'ai' ? 'sparkles' : 'check')}<span class="bf-prov-s">${how} ${esc(srcTitle(d, m.source_id))}</span>${sg && sg.source_quote ? `<span class="bf-prov-q" dir="auto">“${esc(sg.source_quote)}”</span>` : ''}</button>`;
  }
  const rowProv = (ctx, d, r) => {
    const sg = r.suggestion_id && canWrite(ctx) ? sugOf(d, r.suggestion_id) : null;
    return sg ? `<span class="bf-row-ai" title="${esc(`From ${srcTitle(d, sg.source_id)}${sg.source_quote ? `: “${sg.source_quote}”` : ''}`)}">${ctx.ui.icon('sparkles')}</span>` : '';
  };

  /* ------------------------------------------------------------ shared: the brief later screens follow */
  MPH.briefs = {
    STATUS,
    /* { brief, deliverables, usage } for the latest approved version (else the latest the reader may see), or null */
    async active(ctx, pid = ctx.production.id) {
      const rows = ctx.api.must(await ctx.sb.from('active_briefs').select('*').eq('production_id', pid).limit(1));
      const brief = rows[0];
      if (!brief) return null;
      const [dl, ur] = await Promise.all([
        ctx.sb.from('brief_deliverables').select('*').eq('brief_id', brief.id).order('sort'),
        ctx.sb.from('brief_usage_rights').select('*').eq('brief_id', brief.id).order('sort'),
      ]);
      return { brief, deliverables: ctx.api.must(dl), usage: ctx.api.must(ur) };
    },
    ratios: (b) => [...new Set((b ? b.deliverables : []).map((x) => x.aspect_ratio).filter(Boolean))],
    range,
    durLabel,
  };

  /* Read a source with the AI. Runs outlive the screen that started them (Home links a meeting, the Brief shows the
     result); when one finishes, the brief page redraws if it's open. Returns false if a read is already running. */
  function startRead(ctx, pid, sourceId, title) {
    if (runs.has(pid)) return false;
    const onBrief = () => location.hash.startsWith(`#p.${pid}.brief`);
    const run = ctx.api.ai('brief_extract', { production_id: pid, source_id: sourceId });
    runs.set(pid, run);
    delete S.hide[pid];
    run.then((sum) => {
      runs.delete(pid);
      const conf = sum.conflicts.length ? `, ${plural(sum.conflicts.length, 'conflict')}` : '';
      ctx.toast(`Brief updated from ${title}: ${plural(sum.applied, 'field')} filled, ${plural(sum.pending, 'suggestion')} to review${conf}.${sum.missing_info.length ? ` Missing: ${sum.missing_info.join(', ')}.` : ''}`, 'sparkles');
      if (onBrief()) MPH.render();
    }, async (err) => {
      runs.delete(pid);
      ctx.toastError(new Error(`Couldn’t read ${title}: ${err.message || err}`));
      // the engine marks its own failures; this covers requests refused before it started (no key, timeouts)
      await ctx.sb.from('brief_sources').update({ status: 'failed', error: String(err.message || err).slice(0, 500) }).eq('id', sourceId).in('status', ['new', 'extracting']);
      if (onBrief()) MPH.render();
    });
    return true;
  }
  MPH.briefs.read = startRead;

  /* ------------------------------------------------------------ data selection */
  const latestOf = (d) => d.versions[0] || null;
  const currentOf = (ctx, d) => d.versions.find((v) => v.version === S.ver[ctx.production.id]) || latestOf(d);
  const canWrite = (ctx) => ctx.canSeeInternal && !ctx.isClient;
  const isEditable = (ctx, d, cur) => canWrite(ctx) && cur && cur === latestOf(d) && cur.status === 'draft';
  const rowsOf = (d, cur, key) => (cur ? d[key].filter((r) => r.brief_id === cur.id).sort((a, b) => (a.sort || 0) - (b.sort || 0)) : []);
  const missingOf = (d, cur) => {
    const f = cur.fields || {};
    const miss = ESSENTIALS.filter(([k]) => isEmpty(f[k])).map(([, label]) => label);
    if (!rowsOf(d, cur, 'deliverables').length) miss.splice(2, 0, 'deliverables');
    return miss;
  };

  /* ------------------------------------------------------------ pieces */
  const statusPill = (ui, b) => { if (b.status === 'approved') return ui.bubble('approved', 'teal'); const st = STATUS[b.status] || STATUS.draft; return ui.pill(st.label, st.kind, st.icon); };

  function fieldInput(f, v, people) {
    const id = `bf-${f.k}`;
    const common = `id="${id}" data-bf-f="${f.k}" dir="auto"`;
    switch (f.type) {
      case 'area': return `<textarea ${common} class="textarea" rows="2" maxlength="4000" placeholder="${esc(f.ph || '')}">${esc(v || '')}</textarea>`;
      case 'refs': return `<textarea ${common} class="textarea" rows="3" maxlength="6000" placeholder="${esc(f.ph || '')}">${esc(refsToText(v))}</textarea>`;
      case 'money': return `<input ${common} class="input num" inputmode="numeric" placeholder="0" value="${v == null ? '' : esc(Math.round(v).toLocaleString('en-US'))}">`;
      case 'int': return `<input ${common} class="input num" type="number" min="0" max="20" step="1" placeholder="${esc(f.ph || '')}" value="${v == null ? '' : esc(v)}">`;
      case 'date': return `<input ${common} class="input" type="date" value="${esc(v || '')}">`;
      case 'approver': {
        const a = v || {};
        if (people) {
          // the client's approver is one of the production's people (client or agency side, with an email)
          const pick = people.filter((x) => x.side !== 'internal' && x.email);
          const cur = pick.find((x) => x.id === a.stakeholder_id || x.email === a.email);
          return `<select id="${id}" data-bf-f="approver.pick" class="select">
            <option value="">${pick.length ? 'Choose who approves for the client…' : 'Add the client’s people below first'}</option>
            ${!cur && a.email ? `<option value="" selected>${esc([a.name, a.email].filter(Boolean).join(' · '))} (not in People)</option>` : ''}
            ${pick.map((x) => `<option value="${esc(x.id)}" ${cur && cur.id === x.id ? 'selected' : ''}>${esc([x.name, x.email].filter(Boolean).join(' · '))}${x.company ? ` · ${esc(x.company)}` : ''}</option>`).join('')}
          </select>`;
        }
        return `<div class="bf-pair">
          <input id="${id}" data-bf-f="approver.name" dir="auto" class="input" maxlength="200" placeholder="Name" value="${esc(a.name || '')}">
          <input data-bf-f="approver.email" dir="ltr" class="input" type="email" maxlength="200" placeholder="Email" value="${esc(a.email || '')}" aria-label="Approver email">
        </div>`;
      }
      default: return `<input ${common} class="input" maxlength="300" placeholder="${esc(f.ph || '')}" value="${esc(v || '')}">`;
    }
  }

  function fieldRead(f, v) {
    if (isEmpty(v)) return '<span class="faint">Not given</span>';
    switch (f.type) {
      case 'money': return `<span class="num">${esc(MPH.sar(v))}</span>`;
      case 'date': return esc(MPH.date(v, 'long'));
      case 'approver': return `${esc(v.name || '')}${v.email ? ` <span class="muted small" dir="ltr">${esc(v.email)}</span>` : ''}`;
      case 'refs': return `<ul class="bf-refs">${v.map((r) => {
        const url = safeUrl(r.url);
        return `<li>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" dir="auto">${esc(r.label || url)}</a>` : `<span dir="auto">${esc(r.label)}</span>`}</li>`;
      }).join('')}</ul>`;
      case 'area': return `<span class="bf-pre" dir="auto">${esc(v)}</span>`;
      default: return `<span dir="auto">${esc(v)}</span>`;
    }
  }

  function groupHtml(ctx, d, g, b, editable) {
    const f = b.fields || {};
    if (editable) {
      return `
        <section class="bf-group" id="bf-g-${g.id}">
          <header class="bf-group-head">${ctx.ui.icon(g.icon)}<h3 class="h3">${esc(g.title)}</h3></header>
          <div class="bf-grid">
            ${g.fields.map((x) => `
              <div class="field ${['area', 'refs'].includes(x.type) ? 'bf-wide' : ''}">
                <label for="bf-${x.k}">${esc(x.label)}${x.optional ? ' <span class="faint">(optional)</span>' : ''}</label>
                ${fieldInput(x, f[x.k], canWrite(ctx) ? d.stakeholders : null)}
                ${provHtml(ctx, d, b, x.k)}
                ${x.hint ? `<span class="tiny faint">${esc(x.hint)}</span>` : ''}
              </div>`).join('')}
          </div>
        </section>`;
    }
    return `
      <section class="bf-group" id="bf-g-${g.id}">
        <header class="bf-group-head">${ctx.ui.icon(g.icon)}<h3 class="h3">${esc(g.title)}</h3></header>
        <dl class="kv bf-kv">${g.fields.filter((x) => !(x.optional && isEmpty(f[x.k]))).map((x) => `<dt>${esc(x.label)}</dt><dd>${fieldRead(x, f[x.k])}${provHtml(ctx, d, b, x.k)}</dd>`).join('')}</dl>
      </section>`;
  }

  function deliverablesHtml(ctx, d, rows, editable) {
    const { ui } = ctx;
    const opt = (list, v) => list.map((x) => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const body = editable ? rows.map((r) => `
      <tr data-bf-row="${esc(r.id)}">
        <td><div class="row tight"><input class="cell-input" data-bf-c="name" dir="auto" maxlength="200" placeholder="Hero film" value="${esc(r.name || '')}" aria-label="Deliverable name">${rowProv(ctx, d, r)}</div></td>
        <td><input class="cell-input num" data-bf-c="duration_s" list="bf-durations" inputmode="numeric" placeholder="30" value="${r.duration_s ?? ''}" aria-label="Duration in seconds"></td>
        <td><select class="cell-input" data-bf-c="aspect_ratio" aria-label="Aspect ratio"><option value="">—</option>${opt(RATIOS, r.aspect_ratio)}</select></td>
        <td><input class="cell-input" data-bf-c="platform" list="bf-platforms" dir="auto" maxlength="120" placeholder="YouTube" value="${esc(r.platform || '')}" aria-label="Platform"></td>
        <td><input class="cell-input" data-bf-c="language" list="bf-langs" dir="auto" maxlength="60" placeholder="Arabic" value="${esc(r.language || '')}" aria-label="Language"></td>
        <td class="c"><input type="checkbox" data-bf-c="subtitles" ${r.subtitles ? 'checked' : ''} aria-label="Subtitles"></td>
        <td class="c"><input type="checkbox" data-bf-c="clean_version" ${r.clean_version ? 'checked' : ''} aria-label="Clean version"></td>
        <td class="c"><button class="btn btn-ghost btn-xs btn-icon" data-bf="row-del" aria-label="Remove deliverable" title="Remove">${ui.icon('trash-2')}</button></td>
      </tr>`).join('') : rows.map((r) => `
      <tr>
        <td dir="auto" class="strong">${esc(r.name || 'Untitled')}${rowProv(ctx, d, r)}</td>
        <td class="num">${esc(durLabel(r.duration_s))}</td>
        <td>${r.aspect_ratio ? `<span class="bf-ratio">${esc(r.aspect_ratio)}</span>` : ''}</td>
        <td dir="auto">${esc(r.platform || '')}</td>
        <td dir="auto">${esc(r.language || '')}</td>
        <td class="c">${r.subtitles ? ui.icon('check') : '<span class="faint">—</span>'}</td>
        <td class="c">${r.clean_version ? ui.icon('check') : '<span class="faint">—</span>'}</td>
      </tr>`).join('');
    return `
      <section class="bf-group" id="bf-g-deliverables">
        <header class="bf-group-head">${ui.icon('package-check')}<h3 class="h3">Deliverables</h3><span class="count">${rows.length}</span>
          <span class="spacer"></span>${editable ? `<button class="btn btn-sm btn-outline" data-bf="del-add" data-kind="deliverables">${ui.icon('plus')}Add deliverable</button>` : ''}</header>
        ${rows.length ? `<div class="bf-table-wrap"><table class="table bf-table">
          <thead><tr><th>Name</th><th class="r">Duration</th><th>Ratio</th><th>Platform</th><th>Language</th><th class="c">Subtitles</th><th class="c">Clean</th>${editable ? '<th></th>' : ''}</tr></thead>
          <tbody>${body}</tbody></table></div>`
          : `<p class="small muted bf-none">${editable ? 'List every film the client expects: the hero film and each cutdown, with its length, ratio and platform. The storyboard and the deliverables list follow this table.' : 'No deliverables listed.'}</p>`}
        ${editable ? `<datalist id="bf-durations">${DURATIONS.map((x) => `<option value="${x}">`).join('')}</datalist>
          <datalist id="bf-platforms">${PLATFORMS.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
          <datalist id="bf-langs">${LANGS.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}
      </section>`;
  }

  function usageHtml(ctx, d, rows, editable) {
    const { ui } = ctx;
    const body = editable ? rows.map((r) => `
      <tr data-bf-row="${esc(r.id)}">
        <td><div class="row tight">${rowProv(ctx, d, r)}<select class="cell-input" data-bf-c="media" aria-label="Media">${MEDIA.map(([id, label]) => `<option value="${id}" ${id === r.media ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div></td>
        <td><input class="cell-input" data-bf-c="territory" list="bf-territories" dir="auto" maxlength="120" placeholder="Saudi Arabia" value="${esc(r.territory || '')}" aria-label="Territory"></td>
        <td><input class="cell-input num" data-bf-c="term_months" inputmode="numeric" placeholder="12" value="${r.term_months ?? ''}" aria-label="Term in months"></td>
        <td class="c"><button class="btn btn-ghost btn-xs btn-icon" data-bf="row-del" aria-label="Remove usage right" title="Remove">${ui.icon('trash-2')}</button></td>
      </tr>`).join('') : rows.map((r) => `
      <tr><td>${esc(mediaLabel(r.media))}${rowProv(ctx, d, r)}</td><td dir="auto">${esc(r.territory || '')}</td><td class="num">${esc(termLabel(r.term_months))}</td></tr>`).join('');
    return `
      <section class="bf-group" id="bf-g-usage">
        <header class="bf-group-head">${ui.icon('scale')}<h3 class="h3">Usage rights</h3><span class="count">${rows.length}</span>
          <span class="spacer"></span>${editable ? `<button class="btn btn-sm btn-outline" data-bf="del-add" data-kind="usage">${ui.icon('plus')}Add usage right</button>` : ''}</header>
        ${rows.length ? `<div class="bf-table-wrap"><table class="table bf-table">
          <thead><tr><th>Media</th><th>Territory</th><th class="r">Term (months)</th>${editable ? '<th></th>' : ''}</tr></thead>
          <tbody>${body}</tbody></table></div>`
          : `<p class="small muted bf-none">${editable ? 'Where and for how long the client may use the films. Talent and music fees depend on this.' : 'No usage rights listed.'}</p>`}
        ${editable ? `<datalist id="bf-territories">${TERRITORIES.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}
      </section>`;
  }

  function docHtml(ctx, d, b, editable) {
    const g = (id) => groupHtml(ctx, d, GROUPS.find((x) => x.id === id), b, editable);
    return `<div class="bf-doc ${editable ? 'is-edit' : ''}">
      ${g('client')}${g('goal')}
      ${deliverablesHtml(ctx, d, rowsOf(d, b, 'deliverables'), editable)}
      ${usageHtml(ctx, d, rowsOf(d, b, 'usage'), editable)}
      ${g('money')}${g('rules')}
      ${peopleHtml(ctx, d)}
    </div>`;
  }

  /* summary strip: what the later screens will read */
  function summaryHtml(ctx, d, b) {
    const f = b.fields || {};
    const dl = rowsOf(d, b, 'deliverables');
    const ratios = [...new Set(dl.map((x) => x.aspect_ratio).filter(Boolean))];
    const until = MPH.daysUntil(f.delivery_date);
    return `<div class="grid-4 bf-stats">
      ${ctx.ui.stat(dl.length, plural(dl.length, 'deliverable').replace(/^\d+ /, ''), ratios.length ? `<span class="tiny muted">${ratios.map(esc).join(' · ')}</span>` : '')}
      ${ctx.ui.stat(esc(range(f) || '—'), 'Budget range')}
      ${ctx.ui.stat(f.delivery_date ? esc(MPH.date(f.delivery_date)) : '—', 'Delivery', until != null ? `<span class="tiny muted">${until >= 0 ? `in ${plural(until, 'day')}` : `${plural(-until, 'day')} ago`}</span>` : '')}
      ${ctx.ui.stat(f.go_live_date ? esc(MPH.date(f.go_live_date)) : '—', 'Go-live')}
    </div>`;
  }

  /* the latest finished read: what it filled, what's still missing, the AI's notes */
  function lastHtml(ctx, d) {
    const { ui } = ctx;
    const pid = ctx.production.id;
    const last = (d.sources || []).filter((x) => x.status === 'done' && x.extraction).sort((a, b) => String(b.extraction.ran_at || '').localeCompare(String(a.extraction.ran_at || '')))[0];
    const failed = (d.sources || []).find((x) => x.status === 'failed' && S.hide[pid] !== x.id);
    if (failed && (!last || String(failed.created_at) > String(last.extraction.ran_at || ''))) {
      return `<div class="callout danger bf-last">${ui.icon('triangle-alert')}<span class="small grow">Couldn’t read <span class="strong">${esc(srcTitle(d, failed.id))}</span>: ${esc(failed.error || 'unknown error')}</span>
        <button class="btn btn-xs btn-outline" data-bf-rerun="${esc(failed.id)}">${ui.icon('rotate-ccw')}Try again</button><button class="btn btn-ghost btn-xs btn-icon" data-bf-hide="${esc(failed.id)}" aria-label="Dismiss">${ui.icon('x')}</button></div>`;
    }
    if (!last || S.hide[pid] === last.id) return '';
    const x = last.extraction, c = x.counts || {};
    const miss = x.missing_info || [];
    return `<div class="callout ${(x.conflicts || []).length ? 'market' : 'info'} bf-last">${ui.icon(SRC[last.type][0])}
      <div class="grow stack tight" style="gap:4px">
        <span class="small"><span class="strong">Read ${esc(srcTitle(d, last.id))}:</span> ${plural(c.applied || 0, 'field')} filled, ${plural(c.pending || 0, 'suggestion')} to review${c.conflicts ? `, ${plural(c.conflicts, 'conflict')}` : ''}.</span>
        <span class="small">${miss.length ? `Still missing: ${miss.map((m) => `<span class="chip bf-miss">${esc(m)}</span>`).join(' ')}` : 'Goal, audience, platform, budget and deadline are all covered.'}</span>
        ${(x.notes || []).length ? `<ul class="bf-notes small muted">${x.notes.map((n) => `<li dir="auto">${esc(n)}</li>`).join('')}</ul>` : ''}
      </div>
      <button class="btn btn-ghost btn-xs btn-icon" data-bf-hide="${esc(last.id)}" aria-label="Dismiss">${ui.icon('x')}</button></div>`;
  }

  function sugRow(ctx, d, sg, editable) {
    const { ui } = ctx;
    const c = sg.conflict;
    const other = !c ? '' : c.with === 'brief'
      ? `${c.by === 'human' ? 'You set' : 'The brief has'} ${fmtVal(sg.field, c.value)}${c.source_id ? ` (from ${esc(srcTitle(d, c.source_id))})` : ''}`
      : `${esc(srcTitle(d, c.source_id))} says ${fmtVal(sg.field, c.value)}`;
    return `
      <li class="bf-sug ${c ? 'is-conflict' : ''}" data-sug="${esc(sg.id)}">
        <div class="bf-sug-main">
          <div class="row wrap tight"><span class="bf-sug-f">${esc(labelOf(sg.field))}</span><span class="bf-sug-v" dir="auto">${fmtVal(sg.field, sg.value)}</span></div>
          ${sg.source_quote ? `<span class="bf-sug-q" dir="auto">“${esc(sg.source_quote)}”</span>` : ''}
          <span class="tiny muted bf-sug-meta">${pctPill(ui, sg.confidence)} from <button type="button" class="bf-link" data-bf-src="${esc(sg.source_id || '')}">${esc(srcTitle(d, sg.source_id))}</button>${sg.reason ? ` · <span dir="auto">${esc(sg.reason)}</span>` : ''}</span>
          ${c ? `<span class="small bf-conf">${ui.icon('git-compare')}Conflict: ${other}</span>` : ''}
        </div>
        <div class="bf-sug-act">
          ${editable ? `<button class="btn btn-xs btn-primary" data-bf-sug="accept">${ui.icon('check')}Accept</button><button class="btn btn-xs btn-outline" data-bf-sug="correct">${ui.icon('pencil')}Correct</button>` : ''}
          <button class="btn btn-xs btn-ghost" data-bf-sug="remove">${ui.icon('x')}Remove</button>
        </div>
      </li>`;
  }

  function reviewHtml(ctx, d) {
    if (!canWrite(ctx)) return '';
    const { ui } = ctx;
    const pid = ctx.production.id;
    const latest = latestOf(d);
    const editable = !!latest && latest.status === 'draft';
    let html = runs.has(pid)
      ? `<div class="callout info bf-run" role="status"><span class="spin"></span><span class="small"><span class="strong">Reading the source…</span> This takes about a minute. You can keep working or leave this page; the suggestions will be here when it’s done.</span></div>`
      : lastHtml(ctx, d);
    const order = (x) => { const i = ALL_FIELDS.findIndex((f) => f.k === x.field); return i < 0 ? 100 + Object.keys(ROW_LABEL).indexOf(x.field) : i; };
    const pend = (d.suggestions || []).filter((x) => x.status === 'pending').sort((a, b) => (!!b.conflict - !!a.conflict) || order(a) - order(b));
    if (!pend.length) return html;
    const high = pend.filter((x) => x.confidence >= HIGH && !x.conflict);
    html += `
      <section class="bf-group bf-review" id="bf-review">
        <header class="bf-group-head">${ui.icon('sparkles')}<h3 class="h3">Suggestions to review</h3><span class="count">${pend.length}</span><span class="spacer"></span>
          ${editable && high.length ? `<button class="btn btn-sm btn-outline" data-bf="accept-high" title="Accepts every suggestion at ${Math.round(HIGH * 100)}% or more that doesn’t conflict with the brief">${ui.icon('check-check')}Accept ${plural(high.length, 'high-confidence suggestion')}</button>` : ''}
        </header>
        ${editable ? '' : `<div class="callout market">${ui.icon('lock')}<span class="small grow">v${esc(latest.version)} was sent, so it can’t change. Start a new version to apply these suggestions.</span><button class="btn btn-sm btn-primary" data-bf="new-version">${ui.icon('copy-plus')}Start v${esc(latest.version + 1)}</button></div>`}
        <ul class="bf-sugs">${pend.map((x) => sugRow(ctx, d, x, editable)).join('')}</ul>
      </section>`;
    return html;
  }

  /* People: stakeholders from meetings, emails and by hand; the default recipients of approvals (team only) */
  const SIDES = [['client', 'Client'], ['agency', 'Agency'], ['internal', 'Internal']];
  const ROLES = [['', 'No role'], ['approver', 'Approver'], ['reviewer', 'Reviewer'], ['cc', 'Kept informed (cc)']];
  function peopleHtml(ctx, d) {
    if (!canWrite(ctx)) return '';
    const { ui } = ctx;
    const list = (d.stakeholders || []).slice().sort((a, b) => (a.side === 'internal') - (b.side === 'internal') || String(a.name || a.email || '').localeCompare(String(b.name || b.email || '')));
    const fresh = list.filter((x) => !x.reviewed);
    const srcLabel = (x) => x.source === 'meeting' ? (x.invited ? 'Invited' : 'Joined uninvited') : x.source === 'email' ? 'From email' : 'Added by hand';
    const att = (x) => x.source !== 'meeting' && !x.invited ? '<span class="faint">—</span>' : x.attended ? `<span class="bf-att ok" title="Joined a meeting">${ui.icon('check')}</span>` : `<span class="bf-att no" title="Invited, didn’t join">${ui.icon('x')}</span>`;
    const opt = (pairs, v) => pairs.map(([id, label]) => `<option value="${id}" ${String(v || '') === id ? 'selected' : ''}>${esc(label)}</option>`).join('');
    return `
      <section class="bf-group" id="bf-g-people">
        <header class="bf-group-head">${ui.icon('users')}<h3 class="h3">People</h3><span class="count">${list.length}</span><span class="spacer"></span>
          ${ui.lockNote('Team only')}<button class="btn btn-sm btn-outline" data-bf="person-add">${ui.icon('user-plus')}Add person</button></header>
        ${fresh.length ? `<div class="callout info bf-guard">${ui.icon('user-check')}<span class="small grow"><span class="strong">${plural(fresh.length, 'new person', 'new people')}</span> from meetings and emails. Check each one’s side and role: approvers get approval emails, internal people never do.</span><button class="btn btn-sm btn-primary" data-bf="people-reviewed">${ui.icon('check')}Done reviewing</button></div>` : ''}
        ${list.length ? `<div class="bf-table-wrap"><table class="table bf-table bf-people">
          <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Side</th><th>Role</th><th class="c">Attended</th><th>How we met</th><th></th></tr></thead>
          <tbody>${list.map((x) => `
            <tr data-person="${esc(x.id)}" class="${x.reviewed ? '' : 'is-new'}">
              <td><input class="cell-input" data-pf="name" dir="auto" maxlength="200" value="${esc(x.name || '')}" placeholder="Name" aria-label="Name"></td>
              <td>${x.email ? `<span class="small" dir="ltr">${esc(x.email)}</span>${x.approval_consent ? '' : ` ${ui.pill('Opted out', 'warn')}`}`
                : `<input class="cell-input bf-noemail" data-pf="email" dir="ltr" type="email" maxlength="200" placeholder="Unknown attendee: add email" aria-label="Email for ${esc(x.name || 'this person')}">`}</td>
              <td><input class="cell-input" data-pf="company" dir="auto" maxlength="120" value="${esc(x.company || '')}" placeholder="—" aria-label="Company"></td>
              <td><select class="cell-input" data-pf="side" aria-label="Side">${opt(SIDES, x.side)}</select></td>
              <td><select class="cell-input" data-pf="role" aria-label="Role" ${x.side === 'internal' ? 'disabled title="Internal people never get approval emails"' : ''}>${opt(ROLES, x.role)}</select></td>
              <td class="c">${att(x)}</td>
              <td><span class="tiny muted">${esc(srcLabel(x))}${x.last_seen_at ? ` · ${esc(MPH.date(x.last_seen_at))}` : ''}</span></td>
              <td class="c"><button class="btn btn-ghost btn-xs btn-icon" data-bf="person-del" aria-label="Remove ${esc(x.name || x.email || 'person')}" title="Remove">${ui.icon('trash-2')}</button></td>
            </tr>`).join('')}</tbody></table></div>`
          : `<p class="small muted bf-none">Meeting attendees and the people on client emails appear here automatically. Add the client’s approver by hand if they haven’t been in touch yet.</p>`}
      </section>`;
  }

  /* the kickoff meeting booked from this brief (Google Calendar + Meet; the Fireflies notetaker records it) */
  const NOTETAKER = { requested: 'Fireflies asked to join', joined: 'Fireflies is in the meeting', transcribed: 'Fireflies transcribed this meeting', failed: 'Fireflies couldn’t join' };
  function kickoffHtml(ctx, d) {
    const k = (d.kickoffs || []).slice(-1)[0];
    if (!k || !canWrite(ctx)) return '';
    const { ui } = ctx;
    const when = `${MPH.date(k.starts_at, 'long')}, ${MPH.date(k.starts_at, 'time')}`;
    const past = new Date(k.ends_at || k.starts_at) < new Date();
    const soon = !past && new Date(k.starts_at) - Date.now() < 30 * 60e3; // from half an hour before until it ends
    const fromMeeting = (d.sources || []).some((x) => x.type === 'meeting');
    return `<div class="callout ${past ? '' : 'info'} bf-guard">${ui.icon('video')}<span class="small grow">
      <span class="strong">Kickoff ${past ? 'held' : 'booked'}:</span> ${esc(when)} · ${plural((k.invitees || []).length, 'guest')} invited.
      ${past && !fromMeeting ? 'When Fireflies finishes the transcript, it fills this brief.' : ''}
      ${NOTETAKER[k.notetaker_status] ? `<br>${ui.icon('audio-lines')} <span class="${k.notetaker_status === 'failed' ? 'strong' : ''}">${esc(NOTETAKER[k.notetaker_status])}</span>${k.notetaker_error ? `: ${esc(k.notetaker_error)}` : ''}` : ''}</span>
      ${soon && k.meet_link && !['joined', 'transcribed'].includes(k.notetaker_status) ? `<button class="btn btn-sm btn-ghost" data-bf="notetaker-add" data-ev="${esc(k.id)}" title="If Fireflies hasn't joined from your calendar">${ui.icon('audio-lines')}Add Fireflies to this meeting</button>` : ''}
      ${k.meet_link && !past ? `<a class="btn btn-sm btn-outline" href="${esc(safeUrl(k.meet_link))}" target="_blank" rel="noopener noreferrer">${ui.icon('video')}Join the Meet</a>` : ''}</div>`;
  }

  function sourcesHtml(ctx, d) {
    if (!canWrite(ctx) || !(d.sources || []).length) return '';
    const { ui } = ctx;
    return `
      <section class="bf-group" id="bf-g-sources">
        <header class="bf-group-head">${ui.icon('inbox')}<h3 class="h3">Sources</h3><span class="count">${d.sources.length}</span><span class="spacer"></span>${ui.lockNote('Internal: clients never see sources')}</header>
        <div class="bf-srcs">${d.sources.map((x) => {
          const c = (x.extraction && x.extraction.counts) || {};
          const st = runs.has(ctx.production.id) && x.status === 'extracting' ? ui.pill('Reading', 'info') : x.status === 'failed' ? ui.pill('Failed', 'danger') : x.status === 'done' ? `<span class="tiny muted">${plural(c.applied || 0, 'filled')} · ${plural(c.pending || 0, 'suggested')}</span>` : '';
          return `<button type="button" class="bf-src" data-bf-src="${esc(x.id)}">${ui.icon(SRC[x.type][0])}<span class="grow truncate" dir="auto">${esc(x.title || SRC[x.type][1])}</span>${st}<span class="tiny faint">${esc(MPH.date(x.received_at))}</span></button>`;
        }).join('')}</div>
      </section>`;
  }

  /* status bar over the brief (team) */
  function barHtml(ctx, d, cur) {
    const { ui } = ctx;
    const latest = latestOf(d);
    const editor = canWrite(ctx);
    const isLatest = cur === latest;
    const via = cur.approved_via === 'email' ? ' by email' : '';
    const detail = {
      draft: 'Only your team can see drafts.',
      sent: `Sent to the client${cur.sent_at ? ' ' + esc(MPH.date(cur.sent_at, 'long')) : ''}. Waiting for their decision.`,
      approved: `Approved by ${cur.decided_by_name ? esc(cur.decided_by_name) : 'the client'}${via}${cur.decided_at ? ' ' + esc(MPH.date(cur.decided_at, 'long')) : ''}.`,
      changes_requested: `${cur.decided_by_name ? esc(cur.decided_by_name) : 'The client'} asked for changes${cur.approved_via === null && cur.decided_by_name ? ' by email' : ''}${cur.decided_at ? ' ' + esc(MPH.date(cur.decided_at, 'long')) : ''}.`,
    }[cur.status] || '';
    const vers = d.versions.length > 1
      ? `<div class="seg tr-vers" role="group" aria-label="Version">${d.versions.slice().reverse().map((v) => `
          <button class="${v === cur ? 'on' : ''}" data-bf-ver="${v.version}" aria-pressed="${v === cur}" title="v${v.version} · ${esc((STATUS[v.status] || STATUS.draft).label)}">v${esc(v.version)}<span class="tr-vdot k-${esc(v.status)}"></span></button>`).join('')}</div>`
      : `<span class="tr-vbadge num">v${esc(cur.version)}</span>`;
    let actions = '';
    if (!isLatest) actions = `<button class="btn btn-sm btn-outline" data-bf-ver="${latest.version}">${ui.icon('arrow-right')}Open the latest, v${esc(latest.version)}</button>`;
    else if (editor) {
      if (cur.status === 'draft') actions = `<button class="btn btn-sm btn-ghost" data-bf="new-version" title="Copy v${esc(cur.version)} into a new draft">${ui.icon('copy-plus')}New version</button><button class="btn btn-sm btn-primary" data-bf="send">${ui.icon('send')}Send to client</button>`;
      else if (cur.status === 'changes_requested') actions = `<button class="btn btn-sm btn-primary" data-bf="new-version">${ui.icon('file-pen-line')}Start v${esc(cur.version + 1)} from these notes</button>`;
      else actions = `<button class="btn btn-sm btn-outline" data-bf="new-version">${ui.icon('copy-plus')}New version</button>`;
      if (cur.status === 'sent') actions += `<button class="btn btn-sm btn-primary" data-bf="email-approval">${ui.icon('mail-check')}Email for approval</button>`;
    }
    return `
      <section class="tr-bar k-${esc(cur.status)}">
        ${vers}
        <div class="tr-bar-state">${statusPill(ui, cur)}<span class="small muted">${isLatest ? detail : `You’re viewing v${esc(cur.version)}. It’s read only.`}</span></div>
        <span class="spacer"></span>
        ${isEditable(ctx, d, cur) ? '<span class="tr-save tiny" data-bf-save aria-live="polite"></span>' : ''}
        <div class="toolbar">${actions}</div>
      </section>
      ${cur.client_note ? `<div class="callout ${cur.status === 'approved' ? '' : 'market'} tr-cnote">${ui.icon('quote')}<div class="stack tight" style="gap:2px"><span class="strong small">Client’s note on v${esc(cur.version)}</span><span dir="auto">${esc(cur.client_note)}</span></div></div>` : ''}
      ${cur.note && cur.status !== 'draft' ? `<p class="tiny muted tr-sentnote">${ui.icon('send')}Your note with v${esc(cur.version)}: <span dir="auto">“${esc(cur.note)}”</span></p>` : ''}
      ${isLatest && editor && cur.status !== 'draft' ? `<p class="tiny faint tr-sentnote">${ui.icon('lock')}Sent versions are locked, so the client reviews exactly what you sent. Start a new version to make changes.</p>` : ''}`;
  }

  /* email approvals for the version on screen: who was asked, who answered, the audit trail (team only) */
  function approvalHtml(ctx, d, cur) {
    if (!canWrite(ctx) || !cur) return '';
    const { ui } = ctx;
    const reqs = (d.approvals || []).filter((r) => r.target_id === cur.id);
    const rq = reqs[0];
    if (!rq) return '';
    const resp = (rq.approval_responses || []).slice().sort((a, b) => String(a.responded_at).localeCompare(String(b.responded_at)));
    const STATE = { sent: ['Sent', ''], blocked: ['Blocked (test allowlist)', 'warn'], failed: ['Not sent', 'danger'], opted_out: ['Opted out', 'warn'], pending: ['Not sent', 'warn'] };
    const pill = (x) => {
      const r = resp.find((y) => y.recipient_id === x.id);
      if (r) return r.decision === 'approved' ? ui.pill('Approved', 'ok', 'check') : ui.pill('Asked for changes', 'danger', 'message-square');
      if (x.send_status === 'sent' && x.opened_at) return ui.pill('Opened', 'info');
      const [l, k] = STATE[x.send_status] || STATE.pending;
      return ui.pill(l, k);
    };
    const open = rq.status === 'open', expired = open && new Date(rq.expires_at) < new Date();
    const head = rq.status === 'cancelled' ? 'Email approval replaced or closed'
      : !open ? `Email approval ${rq.status === 'approved' ? 'complete: approved' : 'complete: changes requested'}`
        : expired ? 'Email approval links expired' : `Waiting for ${rq.rule === 'all' ? 'all approvers' : 'any one approver'}`;
    return `
      <section class="bf-group bf-approvals">
        <header class="bf-group-head">${ui.icon('mail-check')}<h3 class="h3">${esc(head)}</h3><span class="spacer"></span>
          <span class="tiny muted">sent ${esc(MPH.date(rq.created_at, 'long'))}${open && !expired ? ` · links expire ${esc(MPH.date(rq.expires_at))}` : ''}</span></header>
        <div class="list">${(rq.approval_recipients || []).map((x) => `
          <div class="list-row">${ui.av(x.name || x.email, 'sm')}<div class="grow stack tight" style="gap:0;min-width:0"><span class="small strong" dir="auto">${esc(x.name || x.email)}</span>
            <span class="tiny muted"><span dir="ltr">${esc(x.email)}</span> · ${esc({ approver: 'Approver', reviewer: 'Reviewer', cc: 'Kept informed' }[x.role] || '')}${x.send_error ? ` · ${esc(x.send_error)}` : ''}</span></div>${pill(x)}</div>`).join('')}</div>
        ${resp.length ? `<details class="bf-audit"><summary class="small">Audit trail · ${plural(resp.length, 'response')}</summary><table class="table bf-table"><thead><tr><th>When</th><th>Name confirmed</th><th>Decision</th><th>Version</th><th>IP address</th><th>Comment</th></tr></thead><tbody>
          ${resp.map((r) => `<tr><td class="nowrap">${esc(MPH.date(r.responded_at, 'long'))} ${esc(MPH.date(r.responded_at, 'time'))}</td><td dir="auto">${esc(r.confirmed_name)}<div class="tiny muted">${esc(r.email || '')}</div></td><td>${r.decision === 'approved' ? 'Approved' : 'Changes requested'}</td><td class="num">v${esc(r.version)}</td><td class="mono tiny">${esc(r.ip || '—')}</td><td dir="auto">${esc(r.comment || '')}</td></tr>`).join('')}
        </tbody></table></details>` : ''}
      </section>`;
  }

  function startHtml(ctx) {
    const { ui } = ctx;
    if (!canWrite(ctx)) {
      return ui.panel({ body: ui.empty('clipboard-list', 'No brief yet', 'Owners and producers write the client’s brief here. It appears for you as soon as they start.') });
    }
    return ui.panel({ body: `
      <div class="bf-start">
        <span class="bf-start-ic">${ui.icon('clipboard-list')}</span>
        <div class="stack tight grow">
          <span class="h3">Start with the client’s brief</span>
          <span class="small muted">Write down what the client asked for: the goal, every deliverable with its length, ratio and platform, usage rights, the budget range and the dates. Then send it to the client to approve. The storyboard, calendar, budget and treatment all follow the approved brief.</span>
        </div>
        <div class="row wrap"><button class="btn btn-outline" data-bf="add-source">${ui.icon('sparkles')}Fill from an email or document</button><button class="btn btn-primary" data-bf="start">${ui.icon('plus')}Start the brief</button></div>
      </div>` });
  }

  /* ------------------------------------------------------------ pages */
  function teamPage(ctx, d) {
    const { ui } = ctx;
    const cur = currentOf(ctx, d);
    const head = ui.pageHead({
      eyebrow: 'Step 0 · Client-visible',
      title: ctx.t('Brief'),
      sub: cur ? `${esc(cur.fields?.brand || cur.fields?.client_company || ctx.production.title)} · ${plural(d.versions.length, 'version')}` : 'What the client asked for, in a form every later step can read. The client approves it before anything else starts.',
      actions: canWrite(ctx) ? `<button class="btn btn-sm btn-ghost" data-bf="kickoff">${ui.icon('calendar-plus')}Book kickoff meeting</button>${cur ? `<button class="btn btn-sm btn-outline" data-bf="add-source" ${runs.has(ctx.production.id) ? 'disabled' : ''}>${ui.icon('sparkles')}Fill from a source</button>` : ''}` : '',
    });
    if (!cur) return `<div class="page bf-page">${head}${kickoffHtml(ctx, d)}${reviewHtml(ctx, d)}${startHtml(ctx)}${peopleHtml(ctx, d)}${sourcesHtml(ctx, d)}</div>`;
    const editable = isEditable(ctx, d, cur);
    return `<div class="page bf-page">${head}${barHtml(ctx, d, cur)}${approvalHtml(ctx, d, cur)}${kickoffHtml(ctx, d)}${reviewHtml(ctx, d)}${summaryHtml(ctx, d, cur)}${docHtml(ctx, d, cur, editable)}${sourcesHtml(ctx, d)}</div>`;
  }

  function clientPage(ctx, d) {
    const { ui } = ctx;
    const p = ctx.production;
    const preview = !ctx.realClient;
    const cur = latestOf(d);
    if (!cur) {
      return `<div class="page bf-page">
        ${ui.pageHead({ eyebrow: 'Brief', title: ctx.t('Brief'), sub: esc(p.title) })}
        ${ui.panel({ body: ui.empty('clipboard-list', 'No brief shared yet', preview
          ? 'Your client sees the brief here once you send a version. Drafts never appear in this view.'
          : 'Your production team will share the brief here as they understood it. You’ll be able to approve it or ask for changes.') })}
      </div>`;
    }
    let decision = '';
    if (cur.status === 'sent') {
      decision = `<div class="callout tr-decide">${ui.icon('bell-ring')}
        <div class="grow stack tight">
          <span><span class="strong">This brief is waiting for your decision.</span> <span class="muted">Check that it matches what you asked for. Approving lets your production team start work on it. Requesting changes sends them your note.</span></span>
          ${cur.note ? `<span class="small">Note from your production team: <span dir="auto">“${esc(cur.note)}”</span></span>` : ''}
          ${preview ? `<span class="tiny tr-preview-note">${ui.icon('eye')}Clients see these buttons. They’re disabled in preview.</span>` : ''}
        </div>
        <div class="row wrap">
          <button class="btn btn-sm btn-primary" data-bf="approve" ${preview ? 'disabled' : ''}>${ui.icon('check')}Approve brief</button>
          <button class="btn btn-sm btn-outline" data-bf="changes" ${preview ? 'disabled' : ''}>${ui.icon('message-square')}Request changes</button>
        </div></div>`;
    } else if (cur.status === 'approved') {
      decision = `<div class="callout">${ui.icon('circle-check')}<div class="grow"><span class="strong">Approved${cur.decided_at ? ' on ' + esc(MPH.date(cur.decided_at, 'long')) : ''}.</span>${cur.client_note ? ` <span class="muted">Your note: <span dir="auto">“${esc(cur.client_note)}”</span></span>` : ''}</div></div>`;
    } else if (cur.status === 'changes_requested') {
      decision = `<div class="callout market">${ui.icon('message-square')}<div class="grow"><span class="strong">Changes requested${cur.decided_at ? ' on ' + esc(MPH.date(cur.decided_at, 'long')) : ''}.</span>${cur.client_note ? ` <span class="muted"><span dir="auto">“${esc(cur.client_note)}”</span></span>` : ''} <span class="muted">Your production team will send a revised version.</span></div></div>`;
    }
    return `
      <div class="page bf-page">
        ${ui.pageHead({
          eyebrow: `Brief · v${esc(cur.version)}${cur.sent_at ? ' · sent ' + esc(MPH.date(cur.sent_at, 'long')) : ''}`,
          title: esc(p.title),
          sub: 'The brief as your production team understood it.',
          actions: statusPill(ui, cur),
        })}
        ${decision}
        ${summaryHtml(ctx, d, cur)}
        ${docHtml(ctx, d, cur, false)}
      </div>`;
  }

  const renderPage = (ctx, d) => (ctx.isClient ? clientPage(ctx, d) : teamPage(ctx, d));

  /* ------------------------------------------------------------ autosave for the draft being edited */
  function makeSaver(ctx, root) {
    let doc = null, timer = null, dirty = false, chain = Promise.resolve();
    const ind = (st) => {
      const el = root.querySelector('[data-bf-save]');
      if (!el) return;
      el.dataset.st = st;
      el.innerHTML = { dirty: 'Editing…', saving: `${MPH.ui.spinner()}Saving`, saved: `${MPH.ui.icon('check')}Saved`, error: `${MPH.ui.icon('triangle-alert')}Not saved` }[st] || '';
      MPH.icons();
    };
    const save = () => {
      clearTimeout(timer);
      if (!dirty || !doc) return chain;
      dirty = false;
      const target = doc;
      const payload = { fields: target.fields, field_meta: target.field_meta };
      ind('saving');
      chain = chain.then(async () => {
        const { error } = await ctx.sb.from('briefs').update(payload).eq('id', target.id);
        if (error) { if (doc === target) dirty = true; ind('error'); ctx.toastError(new Error(`Your last change didn’t save: ${error.message}`)); }
        else if (!dirty) ind('saved');
      });
      return chain;
    };
    return {
      bind(d0) { if (doc && doc !== d0 && dirty) save(); doc = d0; },
      touch() { dirty = true; ind('dirty'); clearTimeout(timer); timer = setTimeout(save, 700); },
      flush: save,
      get dirty() { return dirty; },
    };
  }

  /* ------------------------------------------------------------ view */
  MPH.view('brief', {
    async load(ctx) {
      const pid = ctx.production.id;
      const { must } = ctx.api;
      // clients (and the producer's preview) never load drafts; RLS enforces the same
      let q = ctx.sb.from('briefs').select('*').eq('production_id', pid).order('version', { ascending: false });
      if (ctx.isClient) q = q.neq('status', 'draft');
      const none = Promise.resolve({ data: [], error: null });
      // rows of every version, embedded by production id so it's one round trip; sources and suggestions are internal
      const [vr, dl, ur, src, sug, ko, sh, ap] = await Promise.all([
        q,
        ctx.sb.from('brief_deliverables').select('*').eq('production_id', pid),
        ctx.sb.from('brief_usage_rights').select('*').eq('production_id', pid),
        canWrite(ctx) ? ctx.sb.from('brief_sources').select('id, type, title, received_at, status, error, extraction, attachments, created_at').eq('production_id', pid).order('received_at', { ascending: false }) : none,
        canWrite(ctx) ? ctx.sb.from('brief_field_suggestions').select('*').eq('production_id', pid).in('status', ['pending', 'accepted']).order('created_at') : none,
        canWrite(ctx) ? ctx.sb.from('events').select('id, title, starts_at, ends_at, meet_link, invitees, notetaker_status, notetaker_error').eq('production_id', pid).eq('kind', 'kickoff').order('starts_at') : none,
        canWrite(ctx) ? ctx.sb.from('production_stakeholders').select('*').eq('production_id', pid) : none,
        canWrite(ctx) ? ctx.sb.from('approval_requests').select('*, approval_recipients(*), approval_responses(*)').eq('production_id', pid).eq('target_type', 'brief').order('created_at', { ascending: false }) : none,
      ]);
      const versions = must(vr);
      const ids = new Set(versions.map((v) => v.id));
      versions.forEach((v) => { v.fields = v.fields || {}; v.field_meta = v.field_meta || {}; });
      return {
        versions, deliverables: must(dl).filter((r) => ids.has(r.brief_id)), usage: must(ur).filter((r) => ids.has(r.brief_id)),
        sources: must(src), suggestions: must(sug), kickoffs: must(ko), stakeholders: must(sh), approvals: must(ap),
      };
    },

    render: renderPage,

    mount(root, ctx, d) {
      const { ui } = ctx;
      const pid = ctx.production.id;
      const saver = makeSaver(ctx, root);
      activeSaver = saver;
      const editDoc = () => { const cur = currentOf(ctx, d); return isEditable(ctx, d, cur) ? cur : null; };
      const repaint = () => { saver.bind(editDoc()); root.innerHTML = renderPage(ctx, d); MPH.icons(); };
      saver.bind(editDoc());

      /* ---------- scalar fields: every human edit is recorded so later AI suggestions never overwrite it */
      const setField = (key, value) => {
        const doc = editDoc();
        if (!doc) return;
        const [k, sub] = key.split('.');
        if (sub) doc.fields[k] = { ...(doc.fields[k] || {}), [sub]: value };
        else doc.fields[k] = value;
        if (isEmpty(doc.fields[k])) delete doc.fields[k];
        doc.field_meta[k] = { by: 'human', at: new Date().toISOString(), user: ctx.session.user.id };
        saver.touch();
      };
      const readField = (el) => {
        const key = el.dataset.bfF;
        if (key === 'approver.pick') {
          const x = (d.stakeholders || []).find((s) => s.id === el.value);
          if (!x) return;
          setField('approver', null);
          setField('approver.name', x.name || ''); setField('approver.email', x.email); setField('approver.stakeholder_id', x.id);
          // whoever approves the brief is an approver among the production's people
          if (x.role !== 'approver') { x.role = 'approver'; x.reviewed = true; ctx.sb.from('production_stakeholders').update({ role: 'approver', reviewed: true }).eq('id', x.id).then(() => {}); }
          saver.flush();
          repaint();
          return;
        }
        const def = ALL_FIELDS.find((x) => x.k === key.split('.')[0]);
        if (!def) return;
        let v = el.value;
        if (def.type === 'money' || def.type === 'int') v = numOrNull(v);
        else if (def.type === 'refs') v = textToRefs(v);
        else v = txt(v, def.type === 'area' ? 4000 : 300);
        setField(key, v);
      };
      root.addEventListener('input', (e) => { const el = e.target.closest('[data-bf-f]'); if (el) readField(el); });
      root.addEventListener('focusout', (e) => {
        const el = e.target.closest('[data-bf-f]');
        if (!el) return;
        const def = ALL_FIELDS.find((x) => x.k === el.dataset.bfF);
        // tidy the money display once the user leaves the field
        if (def && def.type === 'money') { const n = numOrNull(el.value); el.value = n == null ? '' : n.toLocaleString('en-US'); }
        saver.flush();
        const cur = currentOf(ctx, d);
        const stats = root.querySelector('.bf-stats');
        if (stats && cur) { stats.outerHTML = summaryHtml(ctx, d, cur); MPH.icons(); }
      });

      /* ---------- deliverable and usage rows: saved row by row */
      const kindOf = (tr) => (tr.closest('#bf-g-usage') ? 'usage' : 'deliverables');
      const table = { deliverables: 'brief_deliverables', usage: 'brief_usage_rights' };
      const rowTimers = new Map();
      const saveRow = (tr) => {
        const kind = kindOf(tr);
        const row = d[kind].find((r) => r.id === tr.dataset.bfRow);
        if (!row) return;
        tr.querySelectorAll('[data-bf-c]').forEach((el) => {
          const c = el.dataset.bfC;
          if (el.type === 'checkbox') row[c] = el.checked;
          else if (['duration_s', 'term_months'].includes(c)) row[c] = numOrNull(el.value) || null;
          else if (c === 'aspect_ratio') row[c] = RATIOS.includes(el.value) ? el.value : null;
          else row[c] = txt(el.value, 200) || (c === 'name' ? '' : null);
        });
        const patch = kind === 'usage'
          ? { media: row.media, territory: row.territory, term_months: row.term_months }
          : { name: row.name, duration_s: row.duration_s, aspect_ratio: row.aspect_ratio, platform: row.platform, language: row.language, subtitles: row.subtitles, clean_version: row.clean_version };
        clearTimeout(rowTimers.get(row.id));
        rowTimers.set(row.id, setTimeout(async () => {
          const { error } = await ctx.sb.from(table[kind]).update(patch).eq('id', row.id);
          if (error) ctx.toastError(new Error(`That row didn’t save: ${error.message}`));
          else { const cur = currentOf(ctx, d); const stats = root.querySelector('.bf-stats'); if (stats && cur) { stats.outerHTML = summaryHtml(ctx, d, cur); MPH.icons(); } }
        }, 500));
      };
      root.addEventListener('change', (e) => { const tr = e.target.closest('[data-bf-row]'); if (tr && e.target.closest('[data-bf-c]')) saveRow(tr); });
      root.addEventListener('input', (e) => { const tr = e.target.closest('[data-bf-row]'); if (tr && e.target.matches('input:not([type=checkbox])')) saveRow(tr); });

      const addRow = async (kind, btn) => {
        const doc = editDoc();
        if (!doc) return;
        btn.disabled = true;
        const sort = d[kind].filter((r) => r.brief_id === doc.id).reduce((m, r) => Math.max(m, (r.sort || 0) + 1), 0);
        try {
          const row = ctx.api.must(await ctx.sb.from(table[kind]).insert({ brief_id: doc.id, production_id: pid, sort, ...(kind === 'usage' ? { media: 'digital' } : {}) }).select().single());
          d[kind].push(row);
          repaint();
          const first = root.querySelector(`[data-bf-row="${row.id}"] [data-bf-c]`);
          if (first) first.focus();
        } catch (ex) { btn.disabled = false; ctx.toastError(ex); }
      };
      const delRow = async (tr) => {
        const kind = kindOf(tr);
        const id = tr.dataset.bfRow;
        try {
          ctx.api.must(await ctx.sb.from(table[kind]).delete().eq('id', id));
          d[kind] = d[kind].filter((r) => r.id !== id);
          repaint();
        } catch (ex) { ctx.toastError(ex); }
      };

      /* ---------- versions */
      const createVersion = async (btn, from, seed = {}) => {
        if (btn) { btn.disabled = true; btn.innerHTML = `${ui.spinner()}Creating…`; }
        try {
          await saver.flush();
          const version = await ctx.api.nextVersion('briefs', pid);
          const ins = ctx.api.must(await ctx.sb.from('briefs').insert({
            production_id: pid, version, status: 'draft', created_by: ctx.session.user.id,
            fields: from ? from.fields : seed, field_meta: from ? from.field_meta : {},
          }).select().single());
          if (from) {
            const strip = (r) => { const { id, brief_id, created_at, ...rest } = r; void id; void brief_id; void created_at; return { ...rest, brief_id: ins.id }; };
            const dl = rowsOf(d, from, 'deliverables').map(strip), ur = rowsOf(d, from, 'usage').map(strip);
            await Promise.all([
              dl.length ? ctx.sb.from('brief_deliverables').insert(dl).then(ctx.api.must) : null,
              ur.length ? ctx.sb.from('brief_usage_rights').insert(ur).then(ctx.api.must) : null,
            ]);
          }
          S.ver[pid] = ins.version;
          ctx.toast(from ? `Started v${ins.version} from v${from.version}` : 'Brief started. Fill in what the client asked for.', 'file-plus');
          ctx.reload();
        } catch (ex) { ctx.toastError(ex); if (btn && btn.isConnected) repaint(); }
      };
      /* a new production's first brief starts from what the production already knows */
      const startBrief = (btn) => {
        const p = ctx.production;
        const fields = {};
        if (txt(p.client_name)) fields.client_company = txt(p.client_name);
        if (txt(p.agency)) fields.agency = txt(p.agency);
        if (txt(p.format)) fields.format_notes = txt(p.format);
        if (p.delivery) fields.delivery_date = p.delivery;
        createVersion(btn, null, fields);
      };

      /* ---------- send / decide */
      const openSend = (cur) => {
        const miss = missingOf(d, cur);
        const el = ctx.modal(ctx.frame({
          title: `Send v${esc(cur.version)} to the client`,
          sub: esc(ctx.production.client_name || ctx.production.title),
          body: `
            <p>Your client will see brief v${esc(cur.version)} next time they open this production, and can approve it or ask for changes. Once sent, this version is locked; start a new version to change it.</p>
            ${miss.length ? `<div class="callout market">${ui.icon('triangle-alert')}<span class="small">Still missing: ${miss.map(esc).join(', ')}. You can send anyway and ask the client to fill the gaps in their reply.</span></div>` : ''}
            <div class="field"><label for="bf-send-note">Note to the client <span class="faint">(optional)</span></label>
              <textarea id="bf-send-note" class="textarea" rows="3" dir="auto" maxlength="2000" placeholder="For example: here is the brief as we understood it from Sunday’s call. Please check the cutdowns and the budget range."></textarea></div>
            ${emailable().length ? `<label class="check"><input type="checkbox" id="bf-send-email" checked><span>Then email it for approval to the client’s people <span class="tiny faint">· you choose who next</span></span></label>` : `<p class="tiny muted">${ui.icon('mail')} To approve by email, add the client’s approver under People first.</p>`}`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="bf-send-go">${ui.icon('send')}Send v${esc(cur.version)} to the client</button>`,
        }));
        const go = el.querySelector('#bf-send-go');
        go.addEventListener('click', async () => {
          go.disabled = true; go.innerHTML = `${ui.spinner()}Sending`;
          try {
            await saver.flush();
            const note = txt(el.querySelector('#bf-send-note').value, 2000) || null;
            const rows = ctx.api.must(await ctx.sb.from('briefs').update({ status: 'sent', sent_at: new Date().toISOString(), note })
              .eq('id', cur.id).eq('status', 'draft').select('id'));
            if (!rows.length) throw new Error('This version was already sent. Reload to see its status.');
            const thenEmail = el.querySelector('#bf-send-email') && el.querySelector('#bf-send-email').checked;
            ctx.closeOverlay();
            ctx.toast(`Brief v${cur.version} sent to the client`, 'send');
            if (thenEmail) { Object.assign(cur, { status: 'sent', note }); openApproval(cur, note, () => ctx.refreshAll()); }
            else ctx.refreshAll();
          } catch (ex) { go.disabled = false; go.innerHTML = `${ui.icon('send')}Send v${esc(cur.version)} to the client`; MPH.icons(); ctx.toastError(ex); }
        });
      };

      /* ---------- email for approval: choose people and the rule; links go out from the approvals function */
      const emailable = () => (d.stakeholders || []).filter((x) => x.side !== 'internal' && x.email);
      const openApproval = (cur, note, after) => {
        const people = emailable().sort((a, b) => (a.role !== 'approver') - (b.role !== 'approver'));
        const row = (x) => `
          <div class="list-row" data-ap="${esc(x.id)}">
            <input type="checkbox" data-ap-on ${x.role === 'approver' && x.approval_consent ? 'checked' : ''} ${x.approval_consent ? '' : 'disabled'} aria-label="Email ${esc(x.name || x.email)}">
            <div class="grow stack tight" style="gap:0;min-width:0"><span class="small strong" dir="auto">${esc(x.name || x.email)}</span><span class="tiny muted"><span dir="ltr">${esc(x.email)}</span>${x.company ? ` · ${esc(x.company)}` : ''}${x.approval_consent ? '' : ' · opted out of approval emails'}</span></div>
            <select class="select" data-ap-role style="width:auto" ${x.approval_consent ? '' : 'disabled'}>${[['approver', 'Approver'], ['reviewer', 'Reviewer'], ['cc', 'Kept informed']].map(([id, l]) => `<option value="${id}" ${(x.role || 'reviewer') === id ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>`;
        const el = ctx.modal(ctx.frame({
          title: `Email brief v${esc(cur.version)} for approval`,
          sub: 'Each person gets their own link: no login, works once, expires in 7 days. Approvers decide; reviewers and people kept informed can only read.',
          body: people.length ? `
            <div class="list bf-ap-list">${people.map(row).join('')}</div>
            <div class="field"><span class="label">Who has to approve?</span>
              <div class="seg" role="radiogroup"><button type="button" class="on" data-rule="any" aria-checked="true">Any one approver</button><button type="button" data-rule="all" aria-checked="false">All approvers</button></div></div>
            <div class="field"><label for="ap-note">Note in the email <span class="faint">(optional)</span></label><textarea id="ap-note" class="textarea" rows="2" dir="auto" maxlength="2000">${esc(note || '')}</textarea></div>
            <p class="tiny muted">${ui.icon('shield-check')} Emails come from Klaket Approvals and include an opt-out link. Your own team never gets approval emails. Outside production, only the test allowlist receives them.</p>
            <div id="ap-out"></div>`
            : ui.empty('users', 'Nobody to email yet', 'Add the client’s approver under People, with their email.'),
          foot: `<button class="btn btn-ghost" data-close>Close</button>${people.length ? `<button class="btn btn-primary" id="ap-go">${ui.icon('send')}Send approval emails</button>` : ''}`,
        }), { wide: true });
        if (!people.length) return;
        let rule = 'any';
        el.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => {
          rule = b.dataset.rule;
          el.querySelectorAll('[data-rule]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
        }));
        const go = el.querySelector('#ap-go');
        go.addEventListener('click', async () => {
          const recipients = [...el.querySelectorAll('[data-ap]')].filter((r) => r.querySelector('[data-ap-on]').checked)
            .map((r) => ({ stakeholder_id: r.dataset.ap, role: r.querySelector('[data-ap-role]').value }));
          const out = el.querySelector('#ap-out');
          if (!recipients.some((r) => r.role === 'approver')) { out.innerHTML = ui.errorBox('Tick at least one approver.'); return MPH.icons(); }
          go.disabled = true; go.innerHTML = `${ui.spinner()}Sending`;
          try {
            const res = await ctx.api.fn('approvals', 'send', { target_type: 'brief', target_id: cur.id, recipients, rule, note: txt(el.querySelector('#ap-note').value, 2000) || undefined });
            const label = { sent: 'Sent', logged: 'Recorded (no email provider here)', blocked: 'Blocked: not on the test allowlist', failed: 'Not sent', opted_out: 'Opted out', skipped: 'Skipped' };
            out.innerHTML = `<div class="callout ${res.cancelled ? 'danger' : ''}">${ui.icon(res.cancelled ? 'triangle-alert' : 'mail-check')}<div class="stack tight grow">
              <span class="small strong">${res.cancelled ? 'No approver could be emailed, so nothing is waiting.' : 'Approval emails sent.'}</span>
              ${res.recipients.map((r) => `<span class="small">${esc(r.name || r.email || '')}: ${esc(label[r.status] || r.status)}${r.error && r.status !== 'blocked' ? ` (${esc(r.error)})` : ''}</span>`).join('')}</div></div>`;
            MPH.icons();
            go.remove();
            el.querySelector('[data-close]').addEventListener('click', () => (after ? after() : ctx.reload()), { once: true });
          } catch (ex) { go.disabled = false; go.innerHTML = `${ui.icon('send')}Send approval emails`; MPH.icons(); out.innerHTML = ui.errorBox(ex.message); MPH.icons(); }
        });
      };

      const openDecide = (approve) => {
        if (!ctx.realClient) return; // preview: never decide on the client's behalf
        const cur = latestOf(d);
        if (!cur || cur.status !== 'sent') return;
        const label = approve ? 'Approve brief' : 'Send request';
        const el = ctx.modal(ctx.frame({
          title: approve ? `Approve brief v${esc(cur.version)}` : `Request changes to brief v${esc(cur.version)}`,
          sub: esc(ctx.production.title),
          body: approve
            ? `<p>Approving confirms this is what you asked for, and lets your production team start work on it.</p>
               <div class="field"><label for="bf-dec-note">Note to your production team <span class="faint">(optional)</span></label><textarea id="bf-dec-note" class="textarea" rows="3" dir="auto" maxlength="2000" placeholder="For example: all good. Please keep the cinema version under 30 seconds."></textarea></div>`
            : `<div class="field"><label for="bf-dec-note">What should change?</label><textarea id="bf-dec-note" class="textarea" rows="4" dir="auto" maxlength="2000" placeholder="For example: we also need a 6-second bumper, and the budget ceiling is SAR 200,000."></textarea></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${approve ? 'btn-primary' : 'btn-outline'}" id="bf-dec-go">${ui.icon(approve ? 'check' : 'send')}${label}</button>`,
        }));
        const go = el.querySelector('#bf-dec-go');
        go.addEventListener('click', async () => {
          const ta = el.querySelector('#bf-dec-note');
          const note = ta.value.trim();
          if (!approve && !note) { ta.focus(); return ctx.toast('Tell your production team what should change', 'message-square'); }
          go.disabled = true; go.innerHTML = `${ui.spinner()}Sending`;
          try {
            ctx.api.must(await ctx.sb.rpc('decide_brief', { p_id: cur.id, p_decision: approve ? 'approved' : 'changes_requested', p_note: note || null }));
            ctx.closeOverlay();
            ctx.toast(approve ? 'Brief approved. Your production team can see it now.' : 'Change request sent to your production team', approve ? 'check' : 'send');
            ctx.refreshAll();
          } catch (ex) { go.disabled = false; go.innerHTML = `${ui.icon(approve ? 'check' : 'send')}${label}`; MPH.icons(); ctx.toastError(ex); }
        });
      };

      /* ---------- sources: paste or upload, then the AI reads them into suggestions */
      const runExtract = (sourceId, title) => { if (startRead(ctx, pid, sourceId, title)) ctx.reload(); };

      const openAddSource = () => {
        const el = ctx.modal(ctx.frame({
          title: 'Fill the brief from a source',
          sub: 'The AI reads it and fills what it’s sure of. You review everything else.',
          body: `
            <div class="field"><label for="bf-src-text">Paste the client’s email, notes or brief</label>
              <textarea id="bf-src-text" class="textarea" rows="9" dir="auto" maxlength="100000" placeholder="Arabic, English or both. Paste the whole email thread if you have it."></textarea></div>
            <div class="field"><label for="bf-src-files">Or attach files <span class="faint">(PDF, Word, text or images, up to 20 MB each)</span></label>
              <input id="bf-src-files" type="file" class="input" multiple accept=".pdf,.docx,.txt,image/*"></div>
            <div class="field"><label for="bf-src-type">What is it?</label><select id="bf-src-type" class="select">
              <option value="manual">The client’s email, notes or brief</option><option value="meeting">A meeting transcript (for example from Fireflies)</option></select></div>
            <div class="field"><label for="bf-src-title">Name this source <span class="faint">(optional)</span></label>
              <input id="bf-src-title" class="input" dir="auto" maxlength="200" placeholder="For example: Email from Yousef, 20 Oct"></div>
            <p class="tiny muted">${ui.icon('lock')} Sources stay internal: owners and producers can read them, clients never can. Fields a person has edited are never overwritten; new values come in as suggestions.</p>
            <div id="bf-src-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="bf-src-go">${ui.icon('sparkles')}Read and suggest</button>`,
        }), { wide: true });
        const go = el.querySelector('#bf-src-go');
        const err = (m) => { el.querySelector('#bf-src-err').innerHTML = m ? ui.errorBox(m) : ''; MPH.icons(); };
        go.addEventListener('click', async () => {
          const text = el.querySelector('#bf-src-text').value.trim();
          const files = [...el.querySelector('#bf-src-files').files];
          if (!text && !files.length) return err('Paste the client’s email or notes, or attach a file.');
          const bad = files.find((f) => !/\.(pdf|docx|txt|png|jpe?g|webp|gif)$/i.test(f.name));
          if (bad) return err(`${bad.name} isn’t a PDF, Word, text or image file. Export slides as a PDF first.`);
          const big = files.find((f) => f.size > 20 * 1024 * 1024);
          if (big) return err(`${big.name} is over 20 MB. Export a smaller version and try again.`);
          go.disabled = true; go.innerHTML = `${ui.spinner()}Uploading…`; err('');
          const uploaded = [];
          try {
            let raw = text;
            const attachments = [];
            for (const f of files) {
              if (/\.docx$/i.test(f.name)) raw += `\n\n--- ${f.name} ---\n${await MPH.importer.docxText(f)}`;
              else if (/\.txt$/i.test(f.name)) raw += `\n\n--- ${f.name} ---\n${(await f.text()).trim()}`;
              const path = await ctx.api.uploadMedia(pid, f, 'internal', 'briefs');
              uploaded.push(path);
              attachments.push({ path, name: f.name, type: f.type || '' });
            }
            const title = txt(el.querySelector('#bf-src-title').value, 200) || (files[0] ? files[0].name : txt(text.split('\n')[0], 60)) || 'Pasted text';
            const row = ctx.api.must(await ctx.sb.from('brief_sources').insert({
              production_id: pid, type: el.querySelector('#bf-src-type').value === 'meeting' ? 'meeting' : 'manual', title, raw_content: raw.trim().slice(0, 200000) || null, attachments, created_by: ctx.session.user.id,
            }).select('id').single());
            ctx.closeOverlay();
            runExtract(row.id, title);
          } catch (ex) {
            ctx.api.removeMedia(uploaded);
            go.disabled = false; go.innerHTML = `${ui.icon('sparkles')}Read and suggest`; MPH.icons();
            err(ex.message || String(ex));
          }
        });
      };

      const openSource = async (id) => {
        const x = srcOf(d, id);
        if (!x) return;
        const [full, urls] = await Promise.all([
          ctx.sb.from('brief_sources').select('raw_content').eq('id', id).single(),
          ctx.api.mediaUrls((x.attachments || []).map((a) => a.path)),
        ]);
        const raw = full.data ? full.data.raw_content : '';
        const c = (x.extraction && x.extraction.counts) || null;
        const mine = (d.suggestions || []).filter((s) => s.source_id === id);
        const el = ctx.drawer(ctx.frame({
          title: esc(x.title || SRC[x.type][1]),
          sub: `${SRC[x.type][1]} · received ${esc(MPH.date(x.received_at, 'long'))} · internal`,
          body: `
            ${x.status === 'failed' ? ui.errorBox(x.error || 'Reading this source failed.') : ''}
            ${c ? `<p class="small">${plural(c.applied || 0, 'field')} filled, ${plural(c.pending || 0, 'suggestion')} to review${c.conflicts ? `, ${plural(c.conflicts, 'conflict')}` : ''}.</p>` : ''}
            ${(x.attachments || []).length ? `<div class="stack tight">${x.attachments.map((a) => `<a class="bf-link" href="${esc(urls[a.path] || '#')}" target="_blank" rel="noopener noreferrer">${ui.icon('paperclip')}${esc(a.name)}</a>`).join('')}</div>` : ''}
            ${mine.length ? `<h3 class="h3">What the AI took from it</h3><ul class="bf-sugs">${mine.map((sg) => `
              <li class="bf-sug"><div class="bf-sug-main"><div class="row wrap tight"><span class="bf-sug-f">${esc(labelOf(sg.field))}</span><span class="bf-sug-v" dir="auto">${fmtVal(sg.field, sg.value)}</span>
                ${ui.pill({ accepted: sg.auto ? 'Filled' : 'Accepted', rejected: 'Removed', superseded: 'Replaced' }[sg.status] || 'To review', sg.status === 'accepted' ? 'ok' : '')}</div>
                ${sg.source_quote ? `<span class="bf-sug-q" dir="auto">“${esc(sg.source_quote)}”</span>` : ''}</div></li>`).join('')}</ul>` : ''}
            ${raw ? `<h3 class="h3">Text</h3><pre class="bf-raw" dir="auto">${esc(raw)}</pre>` : ''}`,
          foot: `<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-outline" data-bf-rerun="${esc(id)}" ${runs.has(pid) ? 'disabled' : ''}>${ui.icon('rotate-ccw')}Read again</button>`,
        }));
        el.addEventListener('click', (e) => {
          if (!e.target.closest('[data-bf-rerun]')) return;
          ctx.closeOverlay();
          runExtract(id, x.title || SRC[x.type][1]);
        });
      };

      /* ---------- people */
      const personRow = (el) => (d.stakeholders || []).find((x) => x.id === el.closest('[data-person]').dataset.person);
      root.addEventListener('change', async (e) => {
        const el = e.target.closest('[data-pf]');
        if (!el) return;
        const x = personRow(el);
        if (!x) return;
        const f = el.dataset.pf;
        let v = el.value.trim();
        if (f === 'email') {
          v = v.toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return ctx.toast('Enter a full email address', 'mail');
        }
        const patch = { [f]: f === 'role' ? (v || null) : (v || (f === 'side' ? 'client' : null)), reviewed: true };
        if (f === 'email') {
          // a domain that looks like the agency's name puts them on the agency side (the server does the same for new people)
          const label = v.split('@')[1].split('.')[0].replace(/[^a-z0-9]/g, '');
          const agency = String(((latestOf(d) || {}).fields || {}).agency || ctx.production.agency || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (agency.length >= 3 && x.side === 'client' && (label.includes(agency) || agency.includes(label))) patch.side = 'agency';
          if (!x.company) patch.company = v.split('@')[1].split('.')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }
        if (f === 'side' && v === 'internal') patch.role = null;
        try {
          ctx.api.must(await ctx.sb.from('production_stakeholders').update(patch).eq('id', x.id));
          Object.assign(x, patch);
          if (['email', 'side'].includes(f)) repaint();
        } catch (ex) {
          ctx.toastError(/duplicate/.test(ex.message) ? new Error('Someone with that email is already in People. Remove this row instead.') : ex);
          repaint();
        }
      });
      const openPerson = () => {
        const el = ctx.modal(ctx.frame({
          title: 'Add a person',
          sub: 'Someone on the client’s or agency’s side, or your own team.',
          body: `<div class="bf-grid">
              <div class="field"><label for="pp-name">Name</label><input id="pp-name" class="input" dir="auto" maxlength="200"></div>
              <div class="field"><label for="pp-email">Email</label><input id="pp-email" class="input" type="email" dir="ltr" maxlength="200"></div>
              <div class="field"><label for="pp-company">Company</label><input id="pp-company" class="input" dir="auto" maxlength="120"></div>
              <div class="field"><label for="pp-side">Side</label><select id="pp-side" class="select">${SIDES.map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join('')}</select></div>
              <div class="field"><label for="pp-role">Role</label><select id="pp-role" class="select">${ROLES.map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join('')}</select></div>
            </div><div id="pp-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="pp-go">${ui.icon('user-plus')}Add person</button>`,
        }));
        el.querySelector('#pp-go').addEventListener('click', async (e) => {
          const go = e.currentTarget;
          const email = el.querySelector('#pp-email').value.trim().toLowerCase();
          const name = txt(el.querySelector('#pp-name').value, 200);
          const err = (m) => { el.querySelector('#pp-err').innerHTML = ui.errorBox(m); MPH.icons(); };
          if (!name && !email) return err('Enter a name or an email.');
          if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('That email doesn’t look right.');
          const side = el.querySelector('#pp-side').value;
          go.disabled = true;
          try {
            const row = ctx.api.must(await ctx.sb.from('production_stakeholders').insert({
              production_id: pid, name: name || null, email: email || null, company: txt(el.querySelector('#pp-company').value, 120) || null,
              side, role: side === 'internal' ? null : (el.querySelector('#pp-role').value || null), source: 'manual', reviewed: true,
            }).select().single());
            d.stakeholders.push(row);
            ctx.closeOverlay(); repaint();
          } catch (ex) { go.disabled = false; err(/duplicate/.test(ex.message) ? 'That person is already in People.' : ex.message); }
        });
      };

      /* ---------- kickoff meeting: Google Calendar event with a Meet link, booked on the workspace's calendar */
      const CONSENT = 'This meeting will be recorded and transcribed by Fireflies.ai to prepare your brief. Attendees will receive project approval emails from Klaket.';
      const openKickoff = () => {
        const p = ctx.production;
        const f = (latestOf(d) || {}).fields || {};
        const next = new Date(); next.setDate(next.getDate() + 1);
        while ([5, 6].includes(next.getDay())) next.setDate(next.getDate() + 1); // Friday, Saturday
        const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
        const guests = [f.approver && f.approver.email ? `${f.approver.name ? f.approver.name + ' ' : ''}<${f.approver.email}>` : ''].filter(Boolean).join('\n');
        const el = ctx.modal(ctx.frame({
          title: 'Book the kickoff meeting',
          sub: 'A Google Calendar event with a Meet link, on your workspace’s connected calendar. Guests get Google’s invite.',
          body: `
            <div class="field"><label for="ko-title">Title</label><input id="ko-title" class="input" dir="auto" maxlength="200" value="${esc(`Klaket kickoff — ${p.title}${p.code ? ` [${p.code}]` : ''}`)}"><span class="tiny faint">Keep the production code in the title: it helps match Fireflies’ transcript to this production.</span></div>
            <div class="bf-grid">
              <div class="field"><label for="ko-date">Date</label><input id="ko-date" class="input" type="date" value="${iso}"></div>
              <div class="field"><label for="ko-time">Start</label><input id="ko-time" class="input" type="time" value="10:00" step="900"></div>
              <div class="field"><label for="ko-len">Length</label><select id="ko-len" class="select">${[30, 45, 60, 90].map((m) => `<option value="${m}" ${m === 45 ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></div>
            </div>
            <div class="field"><label for="ko-guests">Guests <span class="faint">(one per line: an email, or a name and &lt;email&gt;)</span></label>
              <textarea id="ko-guests" class="textarea" rows="4" dir="ltr" placeholder="Yousef Al-Rashid <yousef@brand.sa>">${esc(guests)}</textarea></div>
            <div class="field"><label for="ko-notes">Agenda <span class="faint">(optional)</span></label><textarea id="ko-notes" class="textarea" rows="2" dir="auto" maxlength="2000"></textarea></div>
            <div class="callout info">${ui.icon('shield-check')}<span class="small"><span class="strong">Every invite says:</span> “${esc(CONSENT)}”</span></div>
            <div id="ko-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ko-go">${ui.icon('calendar-plus')}Book and send invites</button>`,
        }), { wide: true });
        const err = (m, extra = '') => { el.querySelector('#ko-err').innerHTML = m ? ui.errorBox(m) + extra : ''; MPH.icons(); };
        el.querySelector('#ko-go').addEventListener('click', async (e) => {
          const go = e.currentTarget;
          const date = el.querySelector('#ko-date').value, time = el.querySelector('#ko-time').value;
          const start = new Date(`${date}T${time || '10:00'}`);
          if (!date || isNaN(start)) return err('Choose the date and the start time.');
          const end = new Date(start.getTime() + Number(el.querySelector('#ko-len').value) * 60000);
          const attendees = el.querySelector('#ko-guests').value.split(/[\n,;]+/).map((line) => {
            const m = /<([^>]+)>/.exec(line); const email = (m ? m[1] : line).trim();
            return { email, name: m ? txt(line.replace(m[0], ''), 120) : '' };
          }).filter((a) => a.email);
          const bad = attendees.find((a) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email));
          if (bad) return err(`“${bad.email}” isn’t an email address.`);
          go.disabled = true; go.innerHTML = `${ui.spinner()}Booking…`; err('');
          try {
            const out = await ctx.api.integrations('book_kickoff', {
              production_id: pid, title: txt(el.querySelector('#ko-title').value, 200), start: start.toISOString(), end: end.toISOString(),
              attendees, notes: txt(el.querySelector('#ko-notes').value, 2000) || undefined,
            });
            ctx.closeOverlay();
            ctx.toast(`Kickoff booked with a Meet link. ${plural(out.invited.length, 'guest')} invited.`, 'calendar-check');
            if (out.blocked.length) ctx.toastError(new Error(`Not invited (this isn’t production, so invites only go to the test allowlist): ${out.blocked.join(', ')}`));
            ctx.reload();
          } catch (ex) {
            go.disabled = false; go.innerHTML = `${ui.icon('calendar-plus')}Book and send invites`; MPH.icons();
            err(ex.message, /Connect Google Calendar/.test(ex.message) ? `<a class="btn btn-sm btn-outline" href="#team" data-close>${ui.icon('plug')}Open Team → Integrations</a>` : '');
          }
        });
      };

      /* ---------- suggestions: accept, correct, remove (the AI Breakdown's review pattern) */
      const rowKind = (f) => (f === 'deliverable' ? 'deliverables' : f === 'usage_right' ? 'usage' : null);
      const acceptSug = async (sg, value, via) => {
        const target = latestOf(d);
        if (!target || target.status !== 'draft') throw new Error('This version was sent. Start a new version to apply suggestions.');
        await saver.flush();
        const now = new Date().toISOString();
        const kind = rowKind(sg.field);
        if (kind) {
          const sort = d[kind].filter((r) => r.brief_id === target.id).reduce((m, r) => Math.max(m, (r.sort || 0) + 1), 0);
          d[kind].push(ctx.api.must(await ctx.sb.from(table[kind]).insert({ ...value, brief_id: target.id, production_id: pid, sort, suggestion_id: sg.id }).select().single()));
        } else {
          const key = sg.field === 'reference' ? 'references' : sg.field;
          target.fields[key] = sg.field === 'reference' ? [...(Array.isArray(target.fields.references) ? target.fields.references : []), value] : value;
          // accepting is a human decision: later AI suggestions will never overwrite it
          target.field_meta[key] = { by: 'human', via, source_id: sg.source_id, suggestion_id: sg.id, at: now, user: ctx.session.user.id };
          ctx.api.must(await ctx.sb.from('briefs').update({ fields: target.fields, field_meta: target.field_meta }).eq('id', target.id));
        }
        ctx.api.must(await ctx.sb.from('brief_field_suggestions').update({ status: 'accepted', value, decided_by: ctx.session.user.id, decided_at: now }).eq('id', sg.id));
        Object.assign(sg, { status: 'accepted', value, decided_at: now });
        // a field holds one value, so the other open suggestions for it are settled
        if (!kind && sg.field !== 'reference') {
          const rest = d.suggestions.filter((x) => x.status === 'pending' && x.field === sg.field);
          if (rest.length) {
            ctx.api.must(await ctx.sb.from('brief_field_suggestions').update({ status: 'superseded', decided_at: now }).in('id', rest.map((x) => x.id)));
            rest.forEach((x) => { x.status = 'superseded'; });
          }
        }
      };
      const removeSug = async (sg) => {
        ctx.api.must(await ctx.sb.from('brief_field_suggestions').update({ status: 'rejected', decided_by: ctx.session.user.id, decided_at: new Date().toISOString() }).eq('id', sg.id));
        sg.status = 'rejected';
      };
      const readIn = (def, box) => {
        if (def.type === 'approver') {
          const v = { name: txt(box.querySelector('[data-bf-f="approver.name"]').value, 200), email: txt(box.querySelector('[data-bf-f="approver.email"]').value, 200) };
          return isEmpty(v) ? null : v;
        }
        const v = box.querySelector(`[data-bf-f="${def.k}"]`).value;
        if (def.type === 'money' || def.type === 'int') return numOrNull(v);
        return txt(v, def.type === 'area' ? 4000 : 300) || null;
      };
      const openCorrect = (sg) => {
        const def = fieldDef(sg.field);
        const v = sg.value || {};
        const inp = (c, label, val, extra = '') => `<div class="field"><label>${label}</label><input class="input" data-c="${c}" dir="auto" value="${esc(val ?? '')}" ${extra}></div>`;
        const chk = (c, label, on) => `<label class="check"><input type="checkbox" data-c="${c}" ${on ? 'checked' : ''}><span>${label}</span></label>`;
        let body;
        if (def) body = `<div class="field"><label>${esc(def.label)}</label>${fieldInput(def, sg.value)}</div>`;
        else if (sg.field === 'deliverable') {
          body = `<div class="bf-grid">${inp('name', 'Name', v.name)}${inp('duration_s', 'Duration (seconds)', v.duration_s, 'inputmode="numeric"')}
            <div class="field"><label>Aspect ratio</label><select class="select" data-c="aspect_ratio"><option value="">—</option>${RATIOS.map((r) => `<option ${r === v.aspect_ratio ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            ${inp('platform', 'Platform', v.platform)}${inp('language', 'Language', v.language)}</div>
            <div class="row wrap">${chk('subtitles', 'Subtitles', v.subtitles)}${chk('clean_version', 'Clean version', v.clean_version)}</div>`;
        } else if (sg.field === 'usage_right') {
          body = `<div class="bf-grid"><div class="field"><label>Media</label><select class="select" data-c="media">${MEDIA.map(([id, label]) => `<option value="${id}" ${id === v.media ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div>
            ${inp('territory', 'Territory', v.territory)}${inp('term_months', 'Term (months)', v.term_months, 'inputmode="numeric"')}</div>`;
        } else body = `<div class="bf-grid">${inp('label', 'Name', v.label)}${inp('url', 'Link', v.url, 'dir="ltr"')}</div>`;
        const el = ctx.modal(ctx.frame({
          title: `Correct: ${esc(labelOf(sg.field))}`,
          sub: `From ${esc(srcTitle(d, sg.source_id))}`,
          body: `${sg.source_quote ? `<p class="bf-sug-q" dir="auto">“${esc(sg.source_quote)}”</p>` : ''}${body}`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="bf-cor-go">${ui.icon('check')}Accept corrected value</button>`,
        }));
        el.querySelector('#bf-cor-go').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          let value;
          if (def) value = readIn(def, el);
          else {
            value = {};
            el.querySelectorAll('[data-c]').forEach((x) => { value[x.dataset.c] = x.type === 'checkbox' ? x.checked : txt(x.value, 300) || null; });
            ['duration_s', 'term_months'].forEach((k) => { if (k in value) value[k] = numOrNull(value[k]) || null; });
            if (sg.field === 'deliverable') value.name = value.name || '';
          }
          if (isEmpty(value)) return ctx.toast('Enter a value, or remove the suggestion instead', 'pencil');
          btn.disabled = true;
          try { await acceptSug(sg, value, 'corrected'); ctx.closeOverlay(); ctx.toast(`${labelOf(sg.field)} corrected and accepted`, 'check'); repaint(); }
          catch (ex) { btn.disabled = false; ctx.toastError(ex); }
        });
      };
      const acceptHigh = async (btn) => {
        const list = d.suggestions.filter((x) => x.status === 'pending' && x.confidence >= HIGH && !x.conflict);
        btn.disabled = true; btn.innerHTML = `${ui.spinner()}Accepting…`;
        let n = 0;
        try { for (const sg of list) { if (sg.status !== 'pending') continue; await acceptSug(sg, sg.value, 'accepted'); n++; } }
        catch (ex) { ctx.toastError(ex); }
        ctx.toast(`Accepted ${plural(n, 'suggestion')}`, 'check-check');
        repaint();
      };

      root.addEventListener('click', async (e) => {
        const sb = e.target.closest('[data-bf-sug]');
        if (sb) {
          const sg = sugOf(d, sb.closest('[data-sug]').dataset.sug);
          if (!sg || sg.status !== 'pending') return;
          const act = sb.dataset.bfSug;
          if (act === 'correct') return openCorrect(sg);
          sb.disabled = true;
          try {
            if (act === 'accept') { await acceptSug(sg, sg.value, 'accepted'); ctx.toast(`${labelOf(sg.field)} accepted`, 'check'); }
            else await removeSug(sg);
            repaint();
          } catch (ex) { sb.disabled = false; ctx.toastError(ex); }
          return;
        }
        const src = e.target.closest('[data-bf-src]');
        if (src && src.dataset.bfSrc) { e.preventDefault(); return openSource(src.dataset.bfSrc); }
        const rr = e.target.closest('[data-bf-rerun]');
        if (rr) return runExtract(rr.dataset.bfRerun, srcTitle(d, rr.dataset.bfRerun));
        const hd = e.target.closest('[data-bf-hide]');
        if (hd) { S.hide[pid] = hd.dataset.bfHide; return repaint(); }
        const ver = e.target.closest('[data-bf-ver]');
        if (ver) { saver.flush(); S.ver[pid] = Number(ver.dataset.bfVer); repaint(); return; }
        const b = e.target.closest('[data-bf]');
        if (!b) return;
        const act = b.dataset.bf;
        const cur = currentOf(ctx, d);
        if (act === 'start') startBrief(b);
        else if (act === 'new-version') createVersion(b, latestOf(d));
        else if (act === 'send' && cur) openSend(cur);
        else if (act === 'email-approval' && cur) openApproval(cur, cur.note, null);
        else if (act === 'approve') openDecide(true);
        else if (act === 'changes') openDecide(false);
        else if (act === 'del-add') addRow(b.dataset.kind, b);
        else if (act === 'row-del') delRow(b.closest('[data-bf-row]'));
        else if (act === 'add-source') openAddSource();
        else if (act === 'kickoff') openKickoff();
        else if (act === 'notetaker-add') {
          b.disabled = true;
          ctx.api.integrations('notetaker_add', { event_id: b.dataset.ev })
            .then(() => { ctx.toast('Fireflies is on its way to the meeting', 'audio-lines'); ctx.reload(); })
            .catch((ex) => { b.disabled = false; ctx.toastError(ex); ctx.reload(); });
        }
        else if (act === 'person-add') openPerson();
        else if (act === 'person-del') {
          const x = personRow(b);
          if (!x) return;
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('btn-danger'); b.title = 'Click again to remove'; return; }
          ctx.sb.from('production_stakeholders').delete().eq('id', x.id).then(({ error }) => {
            if (error) return ctx.toastError(new Error(error.message));
            d.stakeholders = d.stakeholders.filter((s) => s.id !== x.id); repaint();
          });
        } else if (act === 'people-reviewed') {
          const ids = d.stakeholders.filter((x) => !x.reviewed).map((x) => x.id);
          ctx.sb.from('production_stakeholders').update({ reviewed: true }).in('id', ids).then(({ error }) => {
            if (error) return ctx.toastError(new Error(error.message));
            d.stakeholders.forEach((x) => { x.reviewed = true; }); repaint();
          });
        }
        else if (act === 'accept-high') acceptHigh(b);
      });
    },
  });
})();
