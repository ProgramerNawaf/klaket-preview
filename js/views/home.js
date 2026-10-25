/* Home: what's running, the next step on each production, and (owners and producers) updates from connected
   services and meetings the notetaker (Fireflies) recorded that matched no production. */
MPH.view('home', {
  mount(root, ctx) {
    root.addEventListener('click', async (e) => {
      const note = e.target.closest('[data-note]');
      if (note) { ctx.sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', note.dataset.note).is('read_at', null).then(() => {}); return; }
      const req = e.target.closest('[data-request]');
      if (req) {
        const id = req.dataset.request;
        const btn = e.target.closest('button');
        if (!btn) return;
        const title = req.querySelector('.strong').textContent;
        const read = (pid, src) => { if (MPH.briefs && MPH.briefs.read) MPH.briefs.read(ctx, pid, src, title); ctx.go(`#p.${pid}.brief`); };
        try {
          if (btn.matches('[data-request-dismiss]')) { ctx.api.must(await ctx.sb.from('unassigned_emails').update({ status: 'dismissed' }).eq('id', id)); ctx.toast('Request dismissed'); return ctx.reload(); }
          if (btn.matches('[data-request-create]')) {
            btn.disabled = true; btn.innerHTML = `${ctx.ui.spinner()}Creating…`;
            const out = await ctx.api.fn('email-intake', 'create_from_email', { email_id: id });
            ctx.toast('Production created. Reading the email into its brief…', 'plus');
            MPH.clearCache();
            return read(out.production_id, out.source_id);
          }
          if (btn.matches('[data-request-link]')) {
            const pid = req.querySelector('[data-request-prod]').value;
            if (!pid) return ctx.toast('Choose the production this email belongs to', 'list');
            btn.disabled = true;
            const out = await ctx.api.fn('email-intake', 'link_email', { email_id: id, production_id: pid });
            ctx.toast('Filed. Reading the email into the brief…', 'link');
            return read(pid, out.source_id);
          }
        } catch (ex) { btn.disabled = false; ctx.toastError(ex); ctx.reload(); }
        return;
      }
      const row = e.target.closest('[data-meeting]');
      if (!row) return;
      const id = row.dataset.meeting;
      if (e.target.closest('[data-meeting-dismiss]')) {
        try { ctx.api.must(await ctx.sb.from('unassigned_meetings').update({ status: 'dismissed' }).eq('id', id)); ctx.toast('Meeting dismissed'); ctx.reload(); }
        catch (ex) { ctx.toastError(ex); }
        return;
      }
      const btn = e.target.closest('[data-meeting-link]');
      if (!btn) return;
      const pid = row.querySelector('[data-meeting-prod]').value;
      if (!pid) return ctx.toast('Choose the production this meeting was about', 'list');
      btn.disabled = true;
      try {
        const src = ctx.api.must(await ctx.sb.rpc('link_meeting', { p_meeting: id, p_production: pid }));
        ctx.api.integrations('sync_people', { source_id: src }).catch(() => {}); // attendees become stakeholders
        const title = row.querySelector('.strong').textContent;
        if (MPH.briefs && MPH.briefs.read) MPH.briefs.read(ctx, pid, src, title);
        ctx.toast('Linked. Reading the transcript into the brief…', 'link');
        ctx.go(`#p.${pid}.brief`);
      } catch (ex) { btn.disabled = false; ctx.toastError(ex); }
    });
  },

  async load(ctx) {
    const manager = ['owner', 'producer'].includes(ctx.session.role);
    const none = Promise.resolve({ data: [], error: null });
    const [pr, nt, um, ue] = await Promise.all([
      ctx.sb.from('productions').select('*').order('updated_at', { ascending: false }),
      manager ? ctx.sb.from('notifications').select('*').eq('org_id', ctx.session.org.id).order('created_at', { ascending: false }).limit(8) : none,
      manager ? ctx.sb.from('unassigned_meetings').select('id, title, start_time, participants, report_url').eq('org_id', ctx.session.org.id).eq('status', 'open').order('received_at', { ascending: false }) : none,
      manager ? ctx.sb.from('unassigned_emails').select('id, subject, from_name, from_email, received_at, attachments, raw_content').eq('org_id', ctx.session.org.id).eq('status', 'open').order('received_at', { ascending: false }) : none,
    ]);
    const prods = ctx.api.must(pr);
    const notes = ctx.api.must(nt), meetings = ctx.api.must(um), requests = ctx.api.must(ue);
    const ids = prods.map((p) => p.id);
    if (!ids.length) return { prods, stats: {}, notes, meetings, requests };
    const [scripts, pending, shots, sheets] = await Promise.all([
      ctx.sb.from('scripts').select('production_id, breakdown_status').in('production_id', ids),
      ctx.sb.from('elements').select('production_id', { count: 'exact', head: false }).in('production_id', ids).eq('status', 'suggested'),
      ctx.sb.from('shots').select('production_id').in('production_id', ids),
      ctx.sb.from('call_sheets').select('production_id, status').in('production_id', ids),
    ]);
    const by = (rows, pid) => (rows.data || []).filter((r) => r.production_id === pid);
    const stats = {};
    prods.forEach((p) => {
      stats[p.id] = {
        scripts: by(scripts, p.id).length,
        broken: by(scripts, p.id).some((s) => s.breakdown_status === 'done'),
        pending: by(pending, p.id).length,
        shots: by(shots, p.id).length,
        sheets: by(sheets, p.id).filter((s) => s.status === 'published').length,
      };
    });
    return { prods, stats, notes, meetings, requests };
  },

  render(ctx, { prods, stats, notes = [], meetings = [], requests = [] }) {
    const { ui, esc } = ctx;
    const s = ctx.session;
    const name = (s.profile.full_name || s.profile.email || '').split(' ')[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const clientOnly = !s.orgs.length;
    const canCreate = ['owner', 'producer'].includes(s.role);

    const next = (p) => {
      const st = stats[p.id] || {};
      if (clientOnly) return ['Open', `p.${p.id}.overview`, 'arrow-right'];
      if (!st.scripts) return ['Add the script', `p.${p.id}.script`, 'file-up'];
      if (!st.broken) return ['Run the AI breakdown', `p.${p.id}.breakdown`, 'sparkles'];
      if (st.pending) return [`Review ${st.pending} AI suggestions`, `p.${p.id}.breakdown`, 'scan-text'];
      if (!st.shots) return ['Build the shot list', `p.${p.id}.shotlist`, 'list-video'];
      if (!st.sheets) return ['Schedule and send call sheets', `p.${p.id}.stripboard`, 'rows-3'];
      return ['Open', `p.${p.id}.overview`, 'arrow-right'];
    };

    const card = (p) => {
      const [label, href, icon] = next(p);
      return `
        <div class="card">
          <a class="row" href="#p.${p.id}.overview">${ui.prodThumb(p, 36)}<div class="stack tight grow" style="gap:0"><span class="strong truncate">${esc(p.title)}</span><span class="tiny muted truncate">${esc(p.client_name || 'No client yet')}${p.format ? ' · ' + esc(p.format) : ''}</span></div></a>
          <div class="row between">${ui.statusPill(p.status)}<span class="tiny muted">${p.shoot_start ? (MPH.daysUntil(p.shoot_start) > 0 ? `Shoot in ${MPH.daysUntil(p.shoot_start)} days` : `Shoot ${MPH.date(p.shoot_start)}`) : 'Shoot dates TBC'}</span></div>
          <a class="btn btn-sm btn-outline" href="#${href}">${ui.icon(icon)}${esc(label)}</a>
        </div>`;
    };

    return `
      <div class="page">
        ${ui.pageHead({
          eyebrow: MPH.date(MPH.today(), 'long'),
          title: `${greet}${name ? ', ' + esc(name) : ''}`,
          sub: clientOnly ? 'Productions shared with you.' : `${esc(s.org.name)} · ${prods.length} production${prods.length === 1 ? '' : 's'}`,
          actions: canCreate ? `<a class="btn btn-primary" href="#productions.new">${ui.icon('plus')}${ctx.t('New production')}</a>` : '',
        })}
        ${prods.length ? `<div class="cards">${prods.map(card).join('')}</div>` : ui.panel({ body: ui.empty('clapperboard', 'No productions yet',
          clientOnly ? 'When a company shares a production with you, it appears here.' : 'Create your first production, add its script, and the AI drafts the breakdown for you to review.',
          canCreate ? `<a class="btn btn-primary" href="#productions.new">${ui.icon('plus')}${ctx.t('New production')}</a>` : '') })}
        ${requests.length ? ui.panel({ title: `New requests · ${requests.length}`, icon: 'inbox', flush: true, actions: ui.lockNote('Internal'), body: `
          <div class="list">${requests.map((m) => {
            const body = String(m.raw_content || '').split('\n\n').slice(1).join(' ').replace(/\s+/g, ' ').slice(0, 160);
            return `
            <div class="list-row" data-request="${m.id}">${ui.icon('mail')}
              <div class="grow stack tight" style="gap:0;min-width:0"><span class="small strong truncate" dir="auto">${esc(m.subject || '(no subject)')}</span>
                <span class="tiny muted truncate" dir="auto">${esc(m.from_name ? `${m.from_name} <${m.from_email}>` : m.from_email || 'Unknown sender')} · ${esc(MPH.date(m.received_at))}${(m.attachments || []).length ? ` · ${(m.attachments || []).length} attachment${m.attachments.length === 1 ? '' : 's'}` : ''}</span>
                ${body ? `<span class="tiny faint truncate" dir="auto">${esc(body)}</span>` : ''}</div>
              <button class="btn btn-sm btn-primary" data-request-create>${ui.icon('plus')}Create production</button>
              <select class="select" data-request-prod aria-label="Production for this email" style="width:auto;max-width:200px"><option value="">Or file under…</option>${prods.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>
              <button class="btn btn-sm btn-outline" data-request-link>${ui.icon('link')}File</button>
              <button class="btn btn-sm btn-ghost" data-request-dismiss>Dismiss</button>
            </div>`;
          }).join('')}</div>` }) : ''}
        ${meetings.length ? ui.panel({ title: `Unassigned meetings · ${meetings.length}`, icon: 'audio-lines', flush: true, actions: ui.lockNote('Internal'), body: `
          <div class="list">${meetings.map((m) => `
            <div class="list-row" data-meeting="${m.id}">${ui.icon('video')}
              <div class="grow stack tight" style="gap:0;min-width:0"><span class="small strong truncate" dir="auto">${esc(m.title || 'Meeting')}</span>
                <span class="tiny muted">${m.start_time ? esc(MPH.date(m.start_time, 'long')) + ' · ' : ''}${(m.participants || []).length} attended · Klaket couldn’t tell which production it was about.</span></div>
              <select class="select" data-meeting-prod aria-label="Production for this meeting" style="width:auto;max-width:220px"><option value="">Choose a production…</option>${prods.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>
              <button class="btn btn-sm btn-primary" data-meeting-link>${ui.icon('link')}Link and read</button>
              <button class="btn btn-sm btn-ghost" data-meeting-dismiss>Dismiss</button>
            </div>`).join('')}</div>` }) : ''}
        ${notes.length ? ui.panel({ title: 'Updates', icon: 'bell', flush: true, body: `
          <div class="list">${notes.map((n, ni) => `
            <a class="list-row ${n.read_at ? '' : 'strong'}" href="${esc(/^#[\w.\-]+$/.test(n.link || '') ? n.link : '#home')}" data-note="${n.id}">${MPH.logo({ variant: 'app-icon', size: 24, decorative: true })}${ni === 0 ? ui.bubble({ brief_updated: 'files', meeting_unassigned: 'message', new_request: 'message', extraction_failed: 'waiting', notetaker_error: 'waiting', gmail_confirmation: 'waiting' }[n.kind] || 'message', 'ink') : '' /* one talking bubble per screen: the newest update */}
              <div class="grow stack tight" style="gap:0;min-width:0"><span class="small truncate" dir="auto">${esc(n.title)}</span>${n.body ? `<span class="tiny muted" dir="auto">${esc(n.body)}</span>` : ''}</div>
              <span class="tiny faint nowrap">${esc(MPH.date(n.created_at))}</span></a>`).join('')}</div>` }) : ''}
        ${clientOnly ? '' : `
        <div class="callout">${ui.icon('route')}<div class="stack tight"><span class="strong small">How Phase 1 works</span>
          <span class="small muted">Script → AI breakdown (accept or correct each suggestion) → shot list → stripboard → budget and client bid → crew → call sheets sent by link. Invite your team and clients from <a class="accent" href="#team">Team</a>.</span></div></div>`}
      </div>`;
  },
});
