/* MPH.approve: the client's decision on the Brief, Concepts, Script and Treatment, two ways.
     onBehalf  an owner or producer records the client's approval inside the app (they said yes on a call, on WhatsApp,
               in a meeting): which client person, and their words. approve_on_behalf() has the same effect as the
               client deciding (the brief's approval copies, the Script Agent queued by the pick, the script locked,
               the Treatment Agent queued by an approved script).
     email     signed single-use links to the client's people (the approvals function), as before.
   Each screen passes what it's approving; both dialogs read the production's people from the Brief's People list. */
(function () {
  const esc = MPH.esc;
  const LABEL = { brief: 'brief', concepts: 'idea', script: 'script', treatment: 'treatment' };

  async function people(ctx) {
    const { data } = await ctx.sb.from('production_stakeholders').select('*').eq('production_id', ctx.production.id);
    return (data || []).filter((x) => x.side !== 'internal').sort((a, c) => (a.role !== 'approver') - (c.role !== 'approver'));
  }

  /* o: { type: 'brief' | 'concepts' | 'script' | 'treatment', id, title, ideas?: [{ id, title }], onDone } */
  async function onBehalf(ctx, o) {
    const { ui } = ctx;
    const folks = await people(ctx);
    const what = LABEL[o.type];
    const el = ctx.modal(ctx.frame({
      title: o.type === 'concepts' ? 'Record the client’s choice' : `Approve the ${what} on behalf of the client`,
      sub: `${esc(o.title || ctx.production.title)} · recorded as approved by the client, entered by you`,
      body: `
        ${o.type === 'concepts' ? `<div class="field"><span class="label">Which idea did the client choose?</span>
          <div class="stack tight">${(o.ideas || []).map((c, i) => `<label class="row" style="gap:8px"><input type="radio" name="ob-idea" value="${esc(c.id)}" ${i === 0 ? 'checked' : ''}><span class="small" dir="auto">${esc(c.title)}</span></label>`).join('')}</div></div>` : ''}
        <div class="field"><label for="ob-who">Who approved it?</label>
          ${folks.length ? `<select id="ob-who" class="select">${folks.map((x) => `<option value="${esc(x.name || x.email)}">${esc(x.name || x.email)}${x.role === 'approver' ? ' · approver' : ''}</option>`).join('')}<option value="">Someone else…</option></select>` : ''}
          <input id="ob-name" class="input" dir="auto" maxlength="200" placeholder="The client person’s name" ${folks.length ? 'hidden' : ''}></div>
        <div class="field"><label for="ob-note">${o.type === 'concepts' ? 'Their comment' : 'Their words, or how they approved'} <span class="faint">(optional)</span></label>
          <textarea id="ob-note" class="textarea" rows="3" dir="auto" maxlength="2000" placeholder="${o.type === 'concepts' ? 'For example: keep the grandmother’s hands as the hero' : 'For example: approved on the call, 31 Oct'}"></textarea></div>
        <p class="tiny muted">${ui.icon('info')} This counts as the client’s approval${o.type === 'script' ? ' and locks this version' : ''}. It records the client’s name, your name and the time.${o.type === 'concepts' ? ' The Script Agent starts writing from the chosen idea.' : o.type === 'script' ? ' The Treatment Agent starts writing the deck.' : ''}</p>
        <div id="ob-err"></div>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ob-go">${ui.icon('badge-check')}${o.type === 'concepts' ? 'Record the choice' : 'Approve on behalf'}</button>`,
    }));
    const who = el.querySelector('#ob-who'), name = el.querySelector('#ob-name');
    if (who) who.addEventListener('change', () => { name.hidden = who.value !== ''; if (!name.hidden) name.focus(); });
    const go = el.querySelector('#ob-go');
    go.addEventListener('click', async () => {
      const client = (who && who.value) || name.value.trim();
      const err = (m) => { el.querySelector('#ob-err').innerHTML = ui.errorBox(m); MPH.icons(); };
      if (!client) return err('Say which client person approved it.');
      const concept = o.type === 'concepts' ? (el.querySelector('input[name="ob-idea"]:checked') || {}).value : null;
      go.disabled = true;
      const { error } = await ctx.sb.rpc('approve_on_behalf', { p_type: o.type, p_id: o.id, p_client_name: client, p_note: el.querySelector('#ob-note').value.trim() || null, p_concept: concept || null });
      if (error) { go.disabled = false; return err(error.message); }
      ctx.closeOverlay();
      ctx.toast(o.type === 'concepts' ? `Recorded: ${client} chose the idea` : `Approved on behalf of ${client}`, 'badge-check');
      if (['concepts', 'script'].includes(o.type)) ctx.api.fn('agents', 'kick', {}).catch(() => {});
      if (o.onDone) o.onDone(); else ctx.reload();
    });
  }

  /* o: { type, id, title, note?: string } — signed links to the client's people (one per person; the approver decides) */
  async function email(ctx, o) {
    const { ui } = ctx;
    const folks = (await people(ctx)).filter((x) => x.email);
    const el = ctx.modal(ctx.frame({
      title: `Email the ${LABEL[o.type]} for approval`,
      sub: 'Each person gets their own link: no login, works once, expires in 7 days. Sending locks this version.',
      body: `${folks.length ? `<div class="list bf-ap-list">${folks.map((x) => `<div class="list-row" data-ap="${esc(x.id)}"><input type="checkbox" data-ap-on ${x.role === 'approver' && x.approval_consent !== false ? 'checked' : ''} ${x.approval_consent === false ? 'disabled' : ''}><div class="grow stack tight" style="gap:0"><span class="small strong" dir="auto">${esc(x.name || x.email)}</span><span class="tiny muted" dir="ltr">${esc(x.email)}</span></div><select class="select" data-ap-role style="width:auto">${[['approver', 'Approver'], ['reviewer', 'Reviewer'], ['cc', 'Kept informed']].map(([id, l]) => `<option value="${id}" ${(x.role || 'reviewer') === id ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>
        <div class="field"><label for="ae-note">Note in the email <span class="faint">(optional)</span></label><textarea id="ae-note" class="textarea" rows="2" dir="auto" maxlength="2000">${esc(o.note || '')}</textarea></div>` : ui.empty('users', 'Nobody to email yet', 'Add the client’s approver on the Brief, under People.')}<div id="ae-out"></div>`,
      foot: `<button class="btn btn-ghost" data-close>Close</button>${folks.length ? `<button class="btn btn-primary" id="ae-go">${ui.icon('send')}Send</button>` : ''}`,
    }), { wide: true });
    const go = el.querySelector('#ae-go');
    if (!go) return;
    go.addEventListener('click', async () => {
      const recipients = [...el.querySelectorAll('[data-ap]')].filter((r) => r.querySelector('[data-ap-on]').checked).map((r) => ({ stakeholder_id: r.dataset.ap, role: r.querySelector('[data-ap-role]').value }));
      const out = el.querySelector('#ae-out');
      if (!recipients.some((r) => r.role === 'approver')) { out.innerHTML = ui.errorBox('Tick at least one approver.'); return MPH.icons(); }
      go.disabled = true;
      try {
        const res = await ctx.api.fn('approvals', 'send', { target_type: o.type, target_id: o.id, recipients, note: el.querySelector('#ae-note').value.trim() || undefined });
        out.innerHTML = `<div class="callout ${res.cancelled ? 'danger' : ''}">${ui.icon(res.cancelled ? 'triangle-alert' : 'mail-check')}<span class="small">${res.cancelled ? 'Nobody could be emailed.' : 'Sent.'} ${(res.recipients || []).map((r) => `${esc(r.name || r.email || '')}: ${esc(r.status)}`).join(' · ')}</span></div>`;
        MPH.icons(); go.remove(); el.querySelector('[data-close]').addEventListener('click', () => ctx.reload(), { once: true });
      } catch (ex) { go.disabled = false; out.innerHTML = ui.errorBox(ex.message); MPH.icons(); }
    });
  }

  /* who decided, for a status line: "Approved by Reem Al-Harbi, recorded by Faisal · 31 Oct" */
  const decidedLine = (row) => !row || !row.decided_at ? '' : `${row.status === 'approved' ? 'Approved' : 'Changes requested'}${row.decided_by_name ? ` by ${esc(row.decided_by_name)}` : ''}${row.approved_via === 'on_behalf' ? ' (recorded on their behalf)' : row.approved_via === 'email' ? ' (by email)' : ''} · ${esc(MPH.date(row.decided_at, 'long'))}`;

  MPH.approve = { onBehalf, email, decidedLine };
})();
