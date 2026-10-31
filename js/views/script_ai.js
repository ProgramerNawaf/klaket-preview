/* AI-written scripts (the Script Agent): the version's structured scenes in five views.
     AV           time | visual | audio, the standard for commercials (team and client)
     Screenplay   slugline, action, centred character and dialogue (team and client)
     Shots        every shot per scene (team)
     Blueprint    look, characters, locations, props/vehicles and key frames with image prompts, read-only (team)
     Checks       the code's validation, risks, cast, assumptions, compliance (team)
   A draft can be edited scene by scene (an edited scene is protected: regenerating asks first); one scene or the
   whole script can be regenerated with an instruction (always as a new version); a draft is sent for approval with
   the generic approvals; the client approves or asks for changes in the portal or by email. On approval the
   version locks, the blueprint is ready for treatment images and the breakdown is built from the scenes.
   script.js hands an AI version over to MPH.scriptAI.render / mount. */
(function () {
  const { esc } = MPH;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const ar = () => MPH.state.lang === 'ar';
  const tc = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const STATUS = { draft: ['Draft · internal', '', 'pencil'], sent: ['Sent to the client', 'info', 'send'], approved: ['Approved', 'ok', 'badge-check'], changes_requested: ['Changes requested', 'warn', 'message-square-warning'] };
  const VIEWS_TEAM = [['av', 'AV', 'columns-2'], ['screenplay', 'Screenplay', 'file-text'], ['shots', 'Shots', 'clapperboard'], ['blueprint', 'Visual blueprint', 'image'], ['checks', 'Checks', 'list-checks']];
  const VIEWS_CLIENT = [['av', 'AV', 'columns-2'], ['screenplay', 'Screenplay', 'file-text']];
  const S = { view: {} };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const nameOf = (d, id) => {
    const all = [...((d.blueprint && d.blueprint.characters) || []), ...((d.blueprint && d.blueprint.locations) || []), ...((d.blueprint && d.blueprint.props_vehicles) || [])];
    const x = all.find((c) => c.id === id);
    return x ? x.name : (d.clientNames && d.clientNames[id]) || String(id || '').replace(/^(char|loc|veh|prop)_/, '').replace(/_/g, ' ');
  };
  const slug = (d, s) => `${esc(s.int_ext || '')}. ${esc(nameOf(d, s.location_id)).toUpperCase()} – ${esc(String(s.time_of_day || '').toUpperCase())}${s.is_flashback ? ' · FLASHBACK' : ''}`;
  const both = (a, e, cls = '') => `${a ? `<p class="sa-ar ${cls}" dir="rtl" lang="ar">${esc(a)}</p>` : ''}${e ? `<p class="sa-en ${cls}" dir="ltr" lang="en">${esc(e)}</p>` : ''}`;

  /* ------------------------------------------------------------ views */
  function avView(ctx, d, st) {
    const { ui } = ctx;
    const team = !ctx.isClient, draft = d.script.status === 'draft' && team && ctx.canEdit;
    const rows = (st.scenes || []).map((s) => `
      <tr class="sa-row ${s.edited ? 'is-edited' : ''}" data-scene-n="${esc(s.number)}">
        <td class="sa-time"><span class="mono" dir="ltr">${tc(s.start_s)}–${tc(s.end_s)}</span><span class="tiny muted">${Math.round((s.end_s - s.start_s) * 10) / 10}s</span></td>
        <td class="sa-visual">
          <p class="sa-slug mono"><b>${esc(s.number)}</b> ${slug(d, s)}</p>
          ${both(s.action_ar, s.action_en)}
          ${team && (s.shots || []).length ? `<ul class="sa-shots-mini">${s.shots.map((x) => `<li><span class="mono">${esc(x.shot_id)}</span> ${esc(x.size)} · ${esc(x.movement)} · ${esc(x.duration_s)}s${x.addresses_comment ? ` <span class="pill sa-cm" title="${esc(x.addresses_comment)}">${ui.icon('message-square-quote')}Client comment</span>` : ''}</li>`).join('')}</ul>` : ''}
          ${team && d.notes && d.notes.scene_notes && d.notes.scene_notes[String(s.number)] ? `<p class="tiny muted sa-note" dir="auto">${ui.icon('notebook-pen')} ${esc(d.notes.scene_notes[String(s.number)])}</p>` : ''}
          ${team && (s.edited || s.regenerated) ? `<span class="tiny muted">${s.edited ? `${ui.icon('pencil')} Edited by hand` : `${ui.icon('rotate-ccw')} Rewritten by the agent`}</span>` : ''}
        </td>
        <td class="sa-audio">
          ${(s.dialogue || []).map((l) => `<div class="sa-line"><span class="sa-who">${esc(nameOf(d, l.character_id))}</span>${both(l.text_ar, l.text_en)}${team && l.delivery_note ? `<span class="tiny muted">(${esc(l.delivery_note)})</span>` : ''}</div>`).join('')}
          ${s.vo ? `<div class="sa-line"><span class="sa-who">VO</span>${both(s.vo.text_ar, s.vo.text_en)}</div>` : ''}
          ${(s.supers || []).map((x) => `<div class="sa-super">${ui.icon('type')}<span dir="auto">${esc(x.text)}</span> <span class="tiny muted">${esc(x.position || '')}</span></div>`).join('')}
          ${s.music_sfx ? `<p class="tiny muted sa-music">${ui.icon('music')} ${esc(s.music_sfx)}</p>` : ''}
        </td>
        ${draft ? `<td class="sa-act"><button class="btn btn-xs btn-ghost" data-sa="edit" data-n="${esc(s.number)}" title="Edit this scene">${ui.icon('pencil')}</button><button class="btn btn-xs btn-ghost" data-sa="regen" data-n="${esc(s.number)}" title="Regenerate this scene">${ui.icon('rotate-ccw')}</button></td>` : team ? '<td></td>' : ''}
      </tr>`).join('');
    const ef = st.end_frame;
    const end = ef ? `<tr class="sa-row sa-end"><td class="sa-time"><span class="mono">End</span></td><td class="sa-visual"><p class="sa-slug mono"><b>★</b> END FRAME</p><p>${ef.logo ? `${ui.icon('badge-check')} Logo` : ''}</p></td>
      <td class="sa-audio"><div class="sa-super sa-cta">${ui.icon('type')}<span dir="auto">${esc(ef.cta_text || '')}</span></div>${ef.vo ? `<div class="sa-line"><span class="sa-who">VO</span>${both(ef.vo.text_ar, ef.vo.text_en)}</div>` : ''}</td>${team ? '<td></td>' : ''}</tr>` : '';
    const cuts = (st.cutdowns || []).length ? `<section class="sa-cuts"><p class="eyebrow">Cutdowns</p>${st.cutdowns.map((c) => `<div class="sa-cut"><span class="strong">${esc(c.deliverable)}</span> · scenes ${(c.scenes || []).map(esc).join(', ')}<p class="small muted" dir="auto">${esc(c.notes || '')}</p>${c.reframing_notes ? `<p class="small" dir="auto">${ui.icon('smartphone')} ${esc(c.reframing_notes)}</p>` : ''}</div>`).join('')}</section>` : '';
    return `<div class="sa-wrap"><table class="table sa-av"><thead><tr><th>${ctx.t('Time')}</th><th>${ctx.t('Visual')}</th><th>${ctx.t('Audio')}</th>${team ? '<th></th>' : ''}</tr></thead><tbody>${rows}${end}</tbody></table></div>${team ? cuts : ''}`;
  }

  function screenplayView(ctx, d, st) {
    return `<article class="sa-play">${(st.scenes || []).map((s) => `
      <section class="sa-ps"><p class="sa-ps-slug mono">${esc(s.number)}. ${slug(d, s)}</p>
        ${both(s.action_ar, s.action_en, 'sa-ps-action')}
        ${(s.dialogue || []).map((l) => `<div class="sa-ps-line"><p class="sa-ps-who">${esc(nameOf(d, l.character_id)).toUpperCase()}</p>${l.delivery_note && !ctx.isClient ? `<p class="sa-ps-paren">(${esc(l.delivery_note)})</p>` : ''}${both(l.text_ar, l.text_en)}</div>`).join('')}
        ${s.vo ? `<div class="sa-ps-line"><p class="sa-ps-who">VO</p>${both(s.vo.text_ar, s.vo.text_en)}</div>` : ''}
        ${(s.supers || []).map((x) => `<p class="sa-ps-super mono">SUPER: <span dir="auto">${esc(x.text)}</span></p>`).join('')}
      </section>`).join('')}
      ${st.end_frame ? `<section class="sa-ps"><p class="sa-ps-slug mono">END FRAME</p><p class="sa-ps-super mono">${st.end_frame.logo ? 'LOGO · ' : ''}<span dir="auto">${esc(st.end_frame.cta_text || '')}</span></p></section>` : ''}
    </article>`;
  }

  function shotsView(ctx, d, st) {
    const { ui } = ctx;
    return `<div class="stack">${(st.scenes || []).map((s) => `
      <section class="panel"><header class="panel-head"><span class="mono strong">${esc(s.number)}</span><span class="grow small" dir="auto">${slug(d, s)}</span><span class="mono small muted" dir="ltr">${tc(s.start_s)}–${tc(s.end_s)}</span></header>
        <div class="bf-table-wrap"><table class="table"><thead><tr><th>Shot</th><th>Size</th><th>Angle</th><th>Movement</th><th>Lens</th><th class="r">Sec</th><th>Description</th></tr></thead><tbody>
          ${(s.shots || []).map((x) => `<tr><td class="mono strong">${esc(x.shot_id)}</td><td>${esc(x.size)}</td><td>${esc(x.angle)}</td><td>${esc(x.movement)}${x.movement === 'drone' ? ` ${ui.icon('plane')}` : ''}</td><td class="mono">${esc(x.lens_hint)}</td><td class="r mono">${esc(x.duration_s)}</td>
            <td dir="auto">${esc(x.description)}${x.addresses_comment ? `<br><span class="pill sa-cm">${ui.icon('message-square-quote')}Answers: “${esc(x.addresses_comment)}”</span>` : ''}</td></tr>`).join('')}
        </tbody></table></div></section>`).join('')}</div>`;
  }

  function blueprintView(ctx, d) {
    const { ui } = ctx;
    const b = d.blueprint;
    if (!b) return ui.empty('image', 'No visual blueprint', 'The Script Agent writes one with every AI script.');
    const anchors = (list) => (list || []).length ? `<div class="sa-anchors">${list.map((a) => `<span class="chip">${ui.icon('pin')}${esc(a)}</span>`).join('')}</div>` : '';
    const look = b.look || {};
    return `
      <div class="callout ${b.ready_for_treatment ? 'ok' : ''}">${ui.icon(b.ready_for_treatment ? 'badge-check' : 'lock')}<span class="small grow">${b.ready_for_treatment ? `<span class="strong">Ready for treatment images</span> since ${esc(MPH.date(b.ready_at, 'long'))}. The Treatment Image Agent (next) reads this blueprint.` : '<span class="strong">Read-only.</span> It becomes ready for treatment images when the client approves the script.'}</span>${ui.lockNote('Internal: clients never see this')}</div>
      <section class="panel"><header class="panel-head">${ui.icon('palette')}<h3 class="h3">Look</h3></header><div class="panel-body sa-look">
        <div><p class="eyebrow">Palette</p><div class="sa-anchors">${(look.palette || []).map((p) => `<span class="chip">${esc(p)}</span>`).join('')}</div></div>
        <dl class="cc-facts"><dt>Lighting</dt><dd>${esc(look.lighting || '')}</dd><dt>Camera</dt><dd>${esc(look.camera_style || '')}</dd><dt>Grade</dt><dd>${esc(look.grade || '')}</dd>
        ${(look.references_text || []).length ? `<dt>References</dt><dd>${look.references_text.map(esc).join(' · ')}</dd>` : ''}</dl></div></section>
      <section><p class="eyebrow">${ui.icon('users')} Characters · ${(b.characters || []).length}</p><div class="sa-cards">${(b.characters || []).map((c) => `
        <article class="sa-card"><header><span class="strong">${esc(c.name)}</span><span class="mono tiny muted">${esc(c.id)}</span></header>
          <p class="small muted">${esc(c.role)} · ${esc(c.age)}${Number(c.age) < 18 ? ` ${ui.pill('Child', 'warn')}` : ''}</p><p class="small">${esc(c.appearance)}</p><p class="small muted">${esc(c.wardrobe)}</p>${anchors(c.consistency_anchors)}</article>`).join('')}</div></section>
      <section><p class="eyebrow">${ui.icon('map-pin')} Locations · ${(b.locations || []).length}</p><div class="sa-cards">${(b.locations || []).map((l) => `
        <article class="sa-card"><header><span class="strong">${esc(l.name)}</span><span class="mono tiny muted">${esc(l.id)}</span></header>
          <p class="small muted">${esc(l.time_period || '')}</p><p class="small">${esc(l.description)}</p>${anchors(l.consistency_anchors)}</article>`).join('')}</div></section>
      ${(b.props_vehicles || []).length ? `<section><p class="eyebrow">${ui.icon('car')} Props and vehicles · ${b.props_vehicles.length}</p><div class="sa-cards">${b.props_vehicles.map((x) => `
        <article class="sa-card"><header><span class="strong">${esc(x.name || x.id)}</span><span class="mono tiny muted">${esc(x.id)}</span></header><p class="small">${esc(x.description)}</p>${anchors(x.consistency_anchors)}</article>`).join('')}</div></section>` : ''}
      <section><p class="eyebrow">${ui.icon('frame')} Key frames · ${(b.key_frames || []).length}</p><div class="sa-frames">${(b.key_frames || []).map((f) => `
        <article class="sa-frame"><header><span class="mono strong">${esc(f.frame_id)}</span><span class="small muted">Scene ${esc(f.scene)} · shot ${esc(f.shot_id)}</span><span class="spacer"></span>${(f.aspect_ratios || []).map((r) => `<span class="pill mono">${esc(r)}</span>`).join('')}</header>
          <p class="small"><span class="strong">${esc(f.purpose)}.</span> ${esc(f.composition)} <span class="muted">· ${esc(f.mood)} · ${esc(f.time_of_day)}</span></p>
          <p class="tiny muted">${[...(f.characters || []).map((c) => nameOf(d, c)), nameOf(d, f.location_id)].map(esc).join(' · ')}</p>
          <pre class="sa-prompt">${esc(f.image_prompt_en)}</pre>
          ${(f.negative_notes || []).length ? `<p class="tiny muted">${ui.icon('ban')} ${f.negative_notes.map(esc).join(' · ')}</p>` : ''}</article>`).join('')}</div></section>`;
  }

  function checksView(ctx, d) {
    const { ui } = ctx;
    const n = d.notes || {};
    const checks = n.checks || [];
    const pn = n.production_notes || {}, cp = n.compliance || {};
    const icon = { ok: 'circle-check', warn: 'triangle-alert', fail: 'circle-x' };
    const bad = checks.filter((c) => !c.ok).length;
    return `
      ${d.script.edited_after_checks ? `<div class="callout market">${ui.icon('pencil')}<span class="small">Scenes were edited by hand after these checks ran; regenerate or re-check before sending.</span></div>` : ''}
      <section class="panel"><header class="panel-head">${ui.icon('list-checks')}<h3 class="h3">Checks</h3><span class="count">${checks.length}</span><span class="spacer"></span>${bad ? ui.pill(`${bad} to look at`, 'warn') : ui.pill('All green', 'ok')}</header>
        <ul class="sa-checks">${checks.map((c) => `<li class="${esc(c.level)}">${ui.icon(icon[c.level] || 'circle')}<span class="small"><span class="strong">${esc(c.id.replace(/_/g, ' '))}</span> · <span dir="auto">${esc(c.detail)}</span></span></li>`).join('')}</ul></section>
      <section class="panel"><header class="panel-head">${ui.icon('shield-alert')}<h3 class="h3">Risks and mitigations</h3>${ui.lockNote('Internal')}</header>
        <ul class="sa-risks">${(pn.risks || []).map((r) => `<li><span class="pill">${esc(String(r.type || '').replace(/_/g, ' '))}</span><span class="small"><span class="strong" dir="auto">${esc(r.detail)}</span><br><span class="muted" dir="auto">${ui.icon('arrow-right')} ${esc(r.mitigation)}</span></span></li>`).join('')}</ul></section>
      <div class="grid-2">
        <section class="panel"><header class="panel-head">${ui.icon('users')}<h3 class="h3">Cast and shoot</h3></header><div class="panel-body small">
          <p>${plural(pn.estimated_shoot_days || 0, 'shoot day')} · ${plural((pn.cast_summary || []).length, 'role')}, ${(pn.cast_summary || []).filter((c) => c.is_child).length} child(ren), ${(pn.cast_summary || []).filter((c) => c.speaking).length} speaking</p>
          <ul>${(pn.cast_summary || []).map((c) => `<li>${esc(nameOf(d, c.character_id))} · ${esc(c.age)}${c.is_child ? ' · child' : ''}${c.speaking ? ' · speaks' : ''}</li>`).join('')}</ul>
          ${(pn.locations_summary || []).length ? `<p class="eyebrow">Locations</p><ul>${pn.locations_summary.map((l) => `<li dir="auto">${esc(l)}</li>`).join('')}</ul>` : ''}</div></section>
        <section class="panel"><header class="panel-head">${ui.icon('message-square-quote')}<h3 class="h3">Client comments</h3></header><div class="panel-body small">
          <ul class="sa-checks">${(cp.client_comments_addressed || []).map((c) => `<li class="${c.done ? 'ok' : 'warn'}">${ui.icon(c.done ? 'circle-check' : 'triangle-alert')}<span><span class="strong" dir="auto">“${esc(c.comment)}”</span>${c.scene ? ` · scene ${esc(c.scene)}` : ''}<br><span class="muted" dir="auto">${esc(c.how)}</span></span></li>`).join('') || '<li class="muted">No client comments.</li>'}</ul>
          <p class="eyebrow">Mandatories</p><ul class="sa-checks">${(cp.mandatories || []).map((m) => `<li class="${m.covered ? 'ok' : 'fail'}">${ui.icon(m.covered ? 'circle-check' : 'circle-x')}<span dir="auto">${esc(m.mandatory)} <span class="muted">· ${esc(m.where)}</span></span></li>`).join('')}</ul>
          <p class="eyebrow">Forbidden content</p><ul class="sa-checks">${(cp.forbidden_content_check || []).map((f) => `<li class="${f.passed ? 'ok' : 'fail'}">${ui.icon(f.passed ? 'circle-check' : 'circle-x')}<span dir="auto">${esc(f.rule)}${f.note ? ` <span class="muted">· ${esc(f.note)}</span>` : ''}</span></li>`).join('')}</ul></div></section>
      </div>
      ${(pn.assumptions || []).length ? `<section class="cc-assume"><p class="eyebrow">Assumptions the agent made</p><ul class="small muted">${pn.assumptions.map((a) => `<li dir="auto">${esc(a)}</li>`).join('')}</ul></section>` : ''}`;
  }

  /* ------------------------------------------------------------ page */
  function render(ctx, d, h) {
    const { ui, production: p } = ctx;
    const s = d.script, st = s.structured || {};
    const team = !ctx.isClient;
    const views = team ? VIEWS_TEAM : VIEWS_CLIENT;
    const view = views.some(([id]) => id === S.view[s.id]) ? S.view[s.id] : 'av';
    const job = d.scriptJob;
    const busy = job && ['queued', 'waiting', 'running'].includes(job.status);
    const statusOf = STATUS[s.status] || STATUS.draft;
    const total = (st.scenes || []).reduce((t, x) => t + (x.end_s - x.start_s), 0);
    const bad = ((d.notes && d.notes.checks) || []).filter((c) => !c.ok).length;
    const isLatest = s.id === d.latest.id;
    let top = '';
    if (busy) top += `<div class="callout info" role="status"><span class="spin"></span><span class="small"><span class="strong">The Script Agent is writing${job.input && job.input.mode === 'scene' ? ` scene ${esc(job.input.scene_number)}` : ' the script'}…</span> A few minutes. It saves a new version; nothing here is replaced.${job.status === 'waiting' ? ` Waiting to retry: ${esc(job.last_error || '')}` : ''}</span></div>`;
    else if (team && job && job.status === 'failed') top += `<div class="callout danger">${ui.icon('triangle-alert')}<span class="small"><span class="strong">The Script Agent failed.</span> ${esc(job.last_error || '')} Nothing was saved.</span></div>`;
    if (s.status === 'changes_requested' && s.client_note) top += `<div class="callout market">${ui.icon('message-square-warning')}<span class="small grow"><span class="strong">${esc(s.decided_by_name || 'The client')} asked for changes:</span> <span dir="auto">“${esc(s.client_note)}”</span></span>${team && ctx.canEdit && isLatest ? `<button class="btn btn-sm btn-primary" data-sa="regen-all" data-ins="${esc(s.client_note)}">${ui.icon('rotate-ccw')}Regenerate with this</button>` : ''}</div>`;
    if (s.status === 'approved') top += `<div class="callout ok">${ui.icon('badge-check')}<span class="small grow"><span class="strong">Approved${s.decided_by_name ? ` by ${esc(s.decided_by_name)}` : ''}${s.approved_via ? ` (${esc(s.approved_via)})` : ''}.</span> Locked and the current script.${team ? ' The breakdown is built from its scenes, and the visual blueprint is ready for treatment images.' : ''}</span>${team ? `<a class="btn btn-sm btn-outline" href="#p.${esc(p.id)}.breakdown">${ui.icon('scan-text')}Open breakdown</a>` : ''}</div>`;
    if (!ctx.isClient && s.status === 'sent') top += `<div class="callout info">${ui.icon('send')}<span class="small">Sent to the client${s.sent_at ? ` on ${esc(MPH.date(s.sent_at, 'long'))}` : ''}. Locked while they decide.</span></div>`;
    if (ctx.isClient && s.status === 'sent' && ctx.realClient) top += `<div class="callout info">${ui.icon('clipboard-check')}<span class="small grow"><span class="strong">This script is waiting for your decision.</span> Approving tells the team to go ahead with it.</span><button class="btn btn-sm btn-primary" data-sa="approve">${ui.icon('check')}Approve script</button><button class="btn btn-sm btn-outline" data-sa="changes">${ui.icon('message-square')}Request changes</button></div>`;
    const versions = team ? `<div class="seg sc-vers" role="tablist" aria-label="Script version">${d.list.map((v) => `<button class="${v.id === s.id ? 'on' : ''}" data-sa-ver="${v.version}" title="${esc(v.title || `Version ${v.version}`)}">${v.locked ? ui.icon('lock') : ''}v${v.version}</button>`).join('')}</div>` : '';
    const actions = !team || !ctx.canEdit ? '' : `
      <button class="btn btn-sm btn-outline" data-sa="regen-all" ${busy ? 'disabled title="The agent is already writing"' : ''}>${ui.icon('sparkles')}Regenerate</button>
      ${s.status === 'draft' && isLatest ? `<button class="btn btn-sm btn-primary" data-sa="send">${ui.icon('send')}Send for approval</button>` : ''}`;
    return `
      <div class="page sc-page sa-page">
        ${ui.pageHead({
          eyebrow: team ? 'Story · Script · written by the Script Agent' : 'Story · Script',
          title: `<span dir="auto">${esc((ar() && st.meta && st.meta.title_ar) || s.title || p.title)}</span>`,
          sub: `v${s.version} · ${tc(total)} (${Math.round(total)}s${s.target_duration_s ? ` of ${s.target_duration_s}s` : ''}) · ${plural((st.scenes || []).length, 'scene')}${team && st.meta ? ` · ${esc(st.meta.dialect || '')}` : ''}`,
          actions,
        })}
        <div class="sc-toolbar">${versions}${ui.pill(statusOf[0], statusOf[1], statusOf[2])}
          <span class="sep"></span><div class="seg" role="tablist" aria-label="View">${views.map(([id, l, i]) => `<button class="${view === id ? 'on' : ''}" role="tab" aria-selected="${view === id}" data-sa-view="${id}">${ui.icon(i)}${ctx.t(l)}${id === 'checks' && bad ? ` <span class="sa-badge">${bad}</span>` : ''}</button>`).join('')}</div>
          <span class="spacer"></span>${team && view !== 'checks' ? ui.lockNote(s.status === 'draft' ? 'Internal draft' : 'The client sees AV and screenplay only') : ''}</div>
        ${top}
        ${view === 'av' ? avView(ctx, d, st) : view === 'screenplay' ? screenplayView(ctx, d, st) : view === 'shots' ? shotsView(ctx, d, st) : view === 'blueprint' ? blueprintView(ctx, d) : checksView(ctx, d)}
      </div>`;
  }

  /* the generate panel when the client has chosen an idea and there's no AI script yet (or it's being written) */
  function generatePanel(ctx, d) {
    const { ui } = ctx;
    const job = d.scriptJob, busy = job && ['queued', 'waiting', 'running'].includes(job.status);
    if (busy) return `<div class="page">${ui.empty('loader', 'The Script Agent is writing the script', `From “${esc(d.chosen ? d.chosen.title : 'the chosen idea')}”. It takes a few minutes: outline, scenes, visual blueprint, key frames, cutdowns and checks.`)}</div>`;
    const failed = job && job.status === 'failed';
    return `<div class="page">${ui.empty('sparkles', 'Write the script from the chosen idea', `${failed ? `The last run failed: ${esc(job.last_error || '')}. ` : ''}The client chose “${esc(d.chosen ? d.chosen.title : '')}”. The Script Agent writes the scenes, cutdowns and a visual blueprint, as a draft.`,
      ctx.canEdit ? `<button class="btn btn-primary" data-sa="regen-all">${ui.icon('sparkles')}Generate script</button>` : '')}</div>`;
  }

  /* ------------------------------------------------------------ actions */
  function mount(root, ctx, d, h) {
    const { ui } = ctx;
    const pid = ctx.production.id;
    const s = d.script;
    const job = d.scriptJob;
    if (job && ['queued', 'waiting', 'running'].includes(job.status)) {
      setTimeout(() => { if (location.hash.startsWith(`#p.${pid}.script`) && document.body.contains(root)) ctx.reload(); }, 7000);
    }
    const sceneOf = (n) => (s.structured.scenes || []).find((x) => String(x.number) === String(n));
    const follow = async (jobId, label) => {
      ctx.toast(`${label}: the Script Agent is writing. It saves a new version.`, 'sparkles');
      ctx.reload();
      void jobId;
    };
    const generate = async (instruction, target, replace) => {
      try {
        const r = await ctx.api.fn('agents', 'generate_script', { production_id: pid, instruction, target_s: target, replace_edited: !!replace });
        ctx.closeOverlay(); follow(r.job.id, 'Regenerating');
      } catch (err) {
        let info = null; try { info = JSON.parse(err.message); } catch (e) { /* plain message */ }
        if (info && info.edited_scenes) {
          // S4: a person's edits are never replaced without asking
          const el = ctx.modal(ctx.frame({ title: 'Replace edited scenes?', sub: esc(info.message),
            body: `<p class="small">The new version won't keep the hand edits in scene ${info.edited_scenes.map(esc).join(', ')}. The current version stays as it is. To change one scene only, use its regenerate button instead.</p>`,
            foot: `<button class="btn btn-ghost" data-close>Keep my edits</button><button class="btn btn-danger" id="sa-yes">${ui.icon('rotate-ccw')}Regenerate anyway</button>` }));
          el.querySelector('#sa-yes').addEventListener('click', () => generate(instruction, target, true));
        } else ctx.toastError(err);
      }
    };
    const regenAllModal = (ins = '') => {
      const el = ctx.modal(ctx.frame({ title: s ? 'Regenerate the script' : 'Generate the script', sub: s ? 'A new version from the chosen idea; this one is kept.' : 'From the idea the client chose.',
        body: `<div class="field"><label for="sa-ins">Instruction <span class="faint">(optional)</span></label><textarea id="sa-ins" class="textarea" rows="3" dir="auto" maxlength="1000" placeholder="For example: make the ending warmer">${esc(ins)}</textarea></div>
          <div class="field"><label for="sa-dur">Target length (seconds)</label><input id="sa-dur" class="input" type="number" min="5" max="600" value="${esc((s && s.target_duration_s) || d.defaultTarget || 60)}" style="width:120px"></div>`,
        foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="sa-go">${ui.icon('sparkles')}Write</button>` }));
      el.querySelector('#sa-go').addEventListener('click', (e) => { e.target.disabled = true; generate(el.querySelector('#sa-ins').value.trim(), Number(el.querySelector('#sa-dur').value) || null, false); });
    };
    root.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-sa-view]');
      if (v) { S.view[s.id] = v.dataset.saView; return MPH.render(); }
      const ver = e.target.closest('[data-sa-ver]');
      if (ver) { h.setVersion(Number(ver.dataset.saVer)); return ctx.reload(); }
      const b = e.target.closest('[data-sa]');
      if (!b) return;
      const act = b.dataset.sa;
      if (act === 'regen-all') return regenAllModal(b.dataset.ins || '');
      if (act === 'regen') {
        const sc = sceneOf(b.dataset.n);
        const el = ctx.modal(ctx.frame({ title: `Regenerate scene ${esc(b.dataset.n)}`, sub: 'Only this scene changes, in a new version. Every other scene, edited or not, stays as it is.',
          body: `${sc && sc.edited ? `<div class="callout market">${ui.icon('pencil')}<span class="small">This scene was edited by hand; the new version replaces those edits for this scene.</span></div>` : ''}
            <div class="field"><label for="sa-ins">Instruction</label><textarea id="sa-ins" class="textarea" rows="3" dir="auto" maxlength="1000" placeholder="For example: make the father's line shorter"></textarea></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="sa-go">${ui.icon('rotate-ccw')}Rewrite scene</button>` }));
        el.querySelector('#sa-go').addEventListener('click', async (ev) => {
          ev.target.disabled = true;
          try { const r = await ctx.api.fn('agents', 'regenerate_scene', { script_id: s.id, scene_number: Number(b.dataset.n), instruction: el.querySelector('#sa-ins').value.trim() }); ctx.closeOverlay(); follow(r.job.id, `Scene ${b.dataset.n}`); }
          catch (err) { ev.target.disabled = false; ctx.toastError(err); }
        });
        return;
      }
      if (act === 'edit') {
        const sc = sceneOf(b.dataset.n);
        const lines = sc.dialogue || [];
        const el = ctx.modal(ctx.frame({ title: `Edit scene ${esc(sc.number)}`, sub: 'Your edit is kept: regenerating the script asks before replacing an edited scene.',
          body: `<div class="grid-2"><div class="field"><label>Action (English)</label><textarea class="textarea" id="se-ae" rows="4">${esc(sc.action_en)}</textarea></div><div class="field"><label>الحدث (عربي)</label><textarea class="textarea" id="se-aa" rows="4" dir="rtl">${esc(sc.action_ar)}</textarea></div></div>
            ${lines.map((l, i) => `<div class="grid-2"><div class="field"><label>${esc(nameOf(d, l.character_id))} (English)</label><textarea class="textarea" data-le="${i}" rows="2">${esc(l.text_en)}</textarea></div><div class="field"><label>${esc(nameOf(d, l.character_id))} (عربي)</label><textarea class="textarea" data-la="${i}" rows="2" dir="rtl">${esc(l.text_ar)}</textarea></div></div>`).join('')}
            ${sc.vo ? `<div class="grid-2"><div class="field"><label>VO (English)</label><textarea class="textarea" id="se-ve" rows="2">${esc(sc.vo.text_en)}</textarea></div><div class="field"><label>VO (عربي)</label><textarea class="textarea" id="se-va" rows="2" dir="rtl">${esc(sc.vo.text_ar)}</textarea></div></div>` : ''}<div id="se-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="se-go">${ui.icon('check')}Save</button>` }), { wide: true });
        el.querySelector('#se-go').addEventListener('click', async () => {
          const q = (sel) => el.querySelector(sel);
          const next = { ...sc, action_en: q('#se-ae').value.trim(), action_ar: q('#se-aa').value.trim(), edited: true,
            dialogue: lines.map((l, i) => ({ ...l, text_en: q(`[data-le="${i}"]`).value.trim(), text_ar: q(`[data-la="${i}"]`).value.trim() })),
            vo: sc.vo ? { text_en: q('#se-ve').value.trim(), text_ar: q('#se-va').value.trim() } : null };
          const structured = { ...s.structured, scenes: s.structured.scenes.map((x) => (x.number === sc.number ? next : x)) };
          const { error } = await ctx.sb.from('scripts').update({ structured }).eq('id', s.id).eq('status', 'draft');
          if (error) { q('#se-err').innerHTML = ui.errorBox(error.message); return MPH.icons(); }
          ctx.closeOverlay(); ctx.toast(`Scene ${sc.number} saved`, 'check'); ctx.reload();
        });
        return;
      }
      if (act === 'send') {
        const people = (d.stakeholders || []).filter((x) => x.side !== 'internal' && x.email).sort((a, c) => (a.role !== 'approver') - (c.role !== 'approver'));
        const bad = ((d.notes && d.notes.checks) || []).filter((c) => c.level === 'fail').length;
        const el = ctx.modal(ctx.frame({ title: `Send script v${esc(s.version)} for approval`, sub: 'Sending locks this version. The client reads the AV view and the screenplay, never the checks, AI notes or image prompts.',
          body: `${bad ? `<div class="callout danger">${ui.icon('triangle-alert')}<span class="small">${plural(bad, 'check')} failed. Look at Checks before sending.</span></div>` : ''}
            ${people.length ? `<div class="list bf-ap-list">${people.map((x) => `<div class="list-row" data-ap="${esc(x.id)}"><input type="checkbox" data-ap-on ${x.role === 'approver' && x.approval_consent ? 'checked' : ''} ${x.approval_consent ? '' : 'disabled'}><div class="grow stack tight" style="gap:0"><span class="small strong" dir="auto">${esc(x.name || x.email)}</span><span class="tiny muted" dir="ltr">${esc(x.email)}</span></div><select class="select" data-ap-role style="width:auto">${[['approver', 'Approver'], ['reviewer', 'Reviewer'], ['cc', 'Kept informed']].map(([id, l]) => `<option value="${id}" ${(x.role || 'reviewer') === id ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>
            <div class="field"><label for="ss-note">Note in the email <span class="faint">(optional)</span></label><textarea id="ss-note" class="textarea" rows="2" dir="auto" maxlength="2000"></textarea></div>` : ui.empty('users', 'Nobody to email yet', 'Add the client’s approver on the Brief, under People.')}<div id="ss-out"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Close</button>${people.length ? `<button class="btn btn-primary" id="ss-go">${ui.icon('send')}Send</button>` : ''}` }), { wide: true });
        const go = el.querySelector('#ss-go');
        if (go) go.addEventListener('click', async () => {
          const recipients = [...el.querySelectorAll('[data-ap]')].filter((r) => r.querySelector('[data-ap-on]').checked).map((r) => ({ stakeholder_id: r.dataset.ap, role: r.querySelector('[data-ap-role]').value }));
          const out = el.querySelector('#ss-out');
          if (!recipients.some((r) => r.role === 'approver')) { out.innerHTML = ui.errorBox('Tick at least one approver.'); return MPH.icons(); }
          go.disabled = true;
          try {
            const res = await ctx.api.fn('approvals', 'send', { target_type: 'script', target_id: s.id, recipients, note: el.querySelector('#ss-note').value.trim() || undefined });
            out.innerHTML = `<div class="callout ${res.cancelled ? 'danger' : ''}">${ui.icon(res.cancelled ? 'triangle-alert' : 'mail-check')}<span class="small">${res.cancelled ? 'Nobody could be emailed.' : 'Sent. This version is locked.'} ${res.recipients.map((r) => `${esc(r.name || r.email || '')}: ${esc(r.status)}`).join(' · ')}</span></div>`;
            MPH.icons(); go.remove(); el.querySelector('[data-close]').addEventListener('click', () => ctx.reload(), { once: true });
          } catch (err) { go.disabled = false; out.innerHTML = ui.errorBox(err.message); MPH.icons(); }
        });
        return;
      }
      if (act === 'approve' || act === 'changes') {
        const approve = act === 'approve';
        const el = ctx.modal(ctx.frame({ title: approve ? `Approve script v${esc(s.version)}` : `Request changes to script v${esc(s.version)}`, sub: esc(ctx.production.title),
          body: `<div class="field"><label for="sd-note">${approve ? 'A note for the team (optional)' : 'What should change?'}</label><textarea id="sd-note" class="textarea" rows="3" dir="auto" maxlength="2000"></textarea></div><div id="sd-err"></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="sd-go">${ui.icon(approve ? 'check' : 'send')}${approve ? 'Approve' : 'Send request'}</button>` }));
        el.querySelector('#sd-go').addEventListener('click', async () => {
          const { error } = await ctx.sb.rpc('decide_script', { p_id: s.id, p_decision: approve ? 'approved' : 'changes_requested', p_note: el.querySelector('#sd-note').value.trim() || null });
          if (error) { el.querySelector('#sd-err').innerHTML = ui.errorBox(error.message); return MPH.icons(); }
          ctx.closeOverlay(); ctx.reload();
        });
      }
    });
    void wait;
  }

  /* the extra data an AI script needs (team: notes, blueprint, the latest script job, people) */
  async function load(ctx, d) {
    const pid = ctx.production.id;
    const team = ctx.canSeeInternal && !ctx.isClient;
    const none = Promise.resolve({ data: null });
    const [notes, bp, job, people, set] = await Promise.all([
      team && d.script ? ctx.sb.from('script_agent_notes').select('*').eq('script_id', d.script.id).maybeSingle() : none,
      team && d.script ? ctx.sb.from('script_visual_blueprints').select('*').eq('script_id', d.script.id).maybeSingle() : none,
      team ? ctx.sb.from('agent_jobs').select('id, status, last_error, input, created_at').eq('production_id', pid).eq('agent', 'script').order('created_at', { ascending: false }).limit(1).maybeSingle() : none,
      team ? ctx.sb.from('production_stakeholders').select('*').eq('production_id', pid) : none,
      ctx.sb.from('concept_sets').select('id, status, selected_concept_id').eq('production_id', pid).eq('status', 'selected').order('version', { ascending: false }).limit(1).maybeSingle(),
    ]);
    let chosen = null;
    if (set.data && set.data.selected_concept_id) {
      const { data: c } = await ctx.sb.from('concepts').select('data').eq('id', set.data.selected_concept_id).maybeSingle();
      if (c) chosen = { title: c.data.title_en, title_ar: c.data.title_ar };
    }
    Object.assign(d, { notes: notes.data, blueprint: bp.data, scriptJob: job.data, stakeholders: people.data || [], chosen, selected: !!set.data });
    if (d.script && d.script.structured && d.notes && d.script.structured.scenes.some((x) => x.edited)) d.script.edited_after_checks = true;
    return d;
  }

  MPH.scriptAI = { render, mount, load, generatePanel };
})();
