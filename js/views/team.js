/* Team: workspace members and roles, client access per production, invite links, connected services. */

/* Google Calendar (kickoff meetings with a Meet link) and Fireflies.ai (the notetaker: meeting transcripts into the brief) */
function integrationsPanel(ctx, d) {
  const { ui, esc } = ctx;
  const get = (p) => d.integrations.find((i) => i.provider === p);
  const g = get('google_calendar'), r = get('fireflies');
  const last = r && r.settings && r.settings.last_received_at;
  const gRow = `
    <div class="list-row">${ui.icon('calendar-plus')}
      <div class="grow stack tight" style="gap:2px"><span class="small strong">Google Calendar</span>
        <span class="tiny muted">${g ? `Connected as ${esc(g.account_email || 'your Google account')} since ${MPH.date(g.connected_at)}. “Book kickoff meeting” on a brief creates the event and its Meet link on this calendar.` : 'Connect the calendar kickoff meetings are booked on. Klaket asks only to create and edit calendar events.'}</span></div>
      ${g ? `${ui.pill('Connected', 'ok', 'check')}<button class="btn btn-xs btn-ghost" data-int-off="google_calendar">Disconnect</button>` : `<button class="btn btn-sm btn-primary" data-int="google">${ui.icon('link')}Connect Google Calendar</button>`}
    </div>`;
  const rs = (r && r.settings) || {};
  const rState = !r ? '' : rs.error ? ui.pill('Needs attention', 'danger', 'triangle-alert') : !r.token_hash ? ui.pill('No webhook URL', 'warn')
    : !rs.has_key ? ui.pill('No API key', 'warn') : last ? ui.pill(`Last meeting ${MPH.date(last)}`, 'ok', 'check') : ui.pill('Waiting for the first meeting', 'info');
  const rRow = `
    <div class="list-row">${ui.icon('audio-lines')}
      <div class="grow stack tight" style="gap:2px"><span class="small strong">Fireflies.ai</span>
        <span class="tiny muted">${r && r.account_email ? `API key of ${esc(r.account_email)}. ` : ''}Fireflies joins the kickoff from your calendar and records it. When the transcript is ready, Klaket matches it to the production and fills the brief, quoting who said what and when.
          ${rs.language ? `Meeting language: ${esc(rs.language)}.` : 'Meeting language: Fireflies’ own setting.'}</span>
        ${rs.error ? `<span class="tiny" style="color:var(--danger)">${ui.icon('triangle-alert')} ${esc(rs.error)}</span>` : ''}
        ${r && r.token_hash && !rs.has_secret ? `<span class="tiny" style="color:var(--warn)">${ui.icon('triangle-alert')} No signing secret saved: deliveries are rejected until you add the one you set on Fireflies’ webhook page.</span>` : ''}</div>
      ${rState}
      <button class="btn btn-xs btn-outline" data-int="ff-url">${ui.icon('link')}${r && r.token_hash ? 'New webhook URL' : 'Create webhook URL'}</button>
      <button class="btn btn-xs btn-outline" data-int="ff-keys">${ui.icon('key-round')}${rs.has_key ? 'Replace keys' : 'Add API key'}</button>
      ${r ? `<button class="btn btn-xs btn-ghost" data-int-off="fireflies">Disconnect</button>` : ''}
    </div>`;
  const mail = get('inbound_email'), gm = get('gmail');
  const code = mail && mail.settings && mail.settings.gmail_confirmation;
  const mRow = `
    <div class="list-row">${ui.icon('mail-plus')}
      <div class="grow stack tight" style="gap:4px;min-width:0"><span class="small strong">Forwarding address for client emails</span>
        ${mail ? `<span class="row tight wrap"><code class="mono small" dir="ltr">${esc(mail.account_email)}</code><button class="btn btn-xs btn-ghost" data-int-copy="${esc(mail.account_email)}">${ui.icon('copy')}Copy</button></span>
          <span class="tiny muted">Forward a client’s email here, or let Gmail do it: Settings → Forwarding and POP/IMAP → Add a forwarding address, then a filter that forwards the client’s emails. Klaket files each email under its production by thread, sender domain or production code, and reads it into the brief. Anything it can’t place shows up on Home as a New request.</span>
          ${code ? `<span class="small">${ui.icon('key-round')} Gmail’s confirmation code: <span class="strong mono">${esc(code.code)}</span> <span class="tiny muted">(received ${esc(MPH.date(code.at))}${code.for ? ` for ${esc(code.for)}` : ''})</span></span>` : ''}`
        : `<span class="tiny muted">${d.features.inbound ? 'Get an address to forward client emails to. Attachments (PDF, Word, images) are read too.' : 'Email receiving isn’t set up on the server yet: it needs a Resend receiving domain (MPH_INBOUND_DOMAIN).'}</span>`}
      </div>
      ${mail ? `<button class="btn btn-xs btn-ghost" data-int="inbound-renew" title="Creates a new address; the old one stops working">New address</button>` : `<button class="btn btn-sm btn-primary" data-int="inbound" ${d.features.inbound ? '' : 'disabled'}>${ui.icon('mail-plus')}Create address</button>`}
    </div>`;
  const gmRow = !d.features.gmail ? '' : `
    <div class="list-row">${ui.icon('mail')}
      <div class="grow stack tight" style="gap:2px"><span class="small strong">Gmail <span class="pill">Beta</span></span>
        <span class="tiny muted">${gm ? `Connected as ${esc(gm.account_email || 'your Gmail')}. Emails you label <span class="mono">MPH/Briefs</span> are read into briefs.${gm.settings && gm.settings.watch_expiration ? ` Watch renews by ${esc(MPH.date(gm.settings.watch_expiration))}.` : ''}` : 'Read emails you label MPH/Briefs straight from Gmail. Google lets only listed test users connect until the app is verified.'}</span></div>
      ${gm ? `<button class="btn btn-xs btn-outline" data-int="gmail-watch">${ui.icon('refresh-cw')}Renew watch</button><button class="btn btn-xs btn-outline" data-int="gmail-push">${ui.icon('link')}Push URL</button><button class="btn btn-xs btn-ghost" data-int-off="gmail">Disconnect</button>` : `<button class="btn btn-sm btn-outline" data-int="gmail">${ui.icon('link')}Connect Gmail</button>`}
    </div>`;
  return ui.panel({ title: 'Integrations', icon: 'plug', flush: true, actions: ui.lockNote('Secrets are stored encrypted on the server'), body: `<div class="list">${gRow}${rRow}${mRow}${gmRow}</div>` });
}
MPH.view('team', {
  async load(ctx) {
    const org = ctx.session.org;
    const members = ctx.api.must(await ctx.sb.from('org_members').select('user_id, role, created_at').eq('org_id', org.id));
    const prods = ctx.api.must(await ctx.sb.from('productions').select('id, title').eq('org_id', org.id).order('created_at', { ascending: false }));
    const clients = prods.length ? ctx.api.must(await ctx.sb.from('production_members').select('production_id, user_id, role').in('production_id', prods.map((p) => p.id))) : [];
    const ids = [...new Set([...members.map((m) => m.user_id), ...clients.map((c) => c.user_id)])];
    const profiles = ids.length ? ctx.api.must(await ctx.sb.from('profiles').select('id, email, full_name, phone').in('id', ids)) : [];
    const canInvite = ['owner', 'producer'].includes(org.role);
    const invites = canInvite ? ctx.api.must(await ctx.sb.from('invites').select('*').is('claimed_at', null).order('created_at', { ascending: false })) : [];
    // connected services (owners and producers; secrets never leave the server)
    const [integrations, features] = canInvite ? await Promise.all([
      ctx.sb.from('integrations').select('provider, status, account_email, settings, connected_at, token_hash, secret_ref').eq('org_id', org.id).then(ctx.api.must),
      ctx.api.integrations('features', {}).catch(() => ({ gmail: false, inbound: false })),
    ]) : [[], {}];
    return { members, prods, clients, profiles, invites, canInvite, integrations, features };
  },

  render(ctx, d) {
    const { ui, esc } = ctx;
    const org = ctx.session.org;
    const isOwner = org.role === 'owner';
    const prof = (id) => d.profiles.find((p) => p.id === id) || { email: 'Unknown user' };
    const ROLE = { owner: 'Owner', producer: 'Producer', hod: 'Head of department', crew: 'Crew', client: 'Client' };
    const tierNote = {
      owner: 'Everything, including billing and internal cost.',
      producer: 'Runs productions. Sees internal cost, margin and rates.',
      hod: 'Edits schedules, shots and crew. No internal budget.',
      crew: 'Reads production detail. No budget.',
      client: 'One production: script, overview and the bid sent to them. Never internal cost.',
    };
    const inviteUrl = (tok) => `${location.origin}${location.pathname}#invite.${tok}`;

    return `
      <div class="page">
        ${ui.pageHead({ title: 'Team', sub: `${esc(org.name)}${org.name_ar ? ` · <span class="ar">${esc(org.name_ar)}</span>` : ''} · unlimited seats. Everyone gets exactly the access their role allows, enforced by the database.`,
          actions: `${isOwner ? `<button class="btn btn-outline" data-rename>${ui.icon('pencil')}Rename workspace</button>` : ''}${d.canInvite ? `<button class="btn btn-primary" data-invite>${ui.icon('user-plus')}Invite someone</button>` : ''}` })}

        ${ui.panel({ title: `Members · ${d.members.length}`, icon: 'users-round', flush: true, body: `<div class="table-wrap"><table class="table">
          <thead><tr><th>Person</th><th>Role</th><th>Access</th><th></th></tr></thead>
          <tbody>${d.members.map((m) => {
            const p = prof(m.user_id); const me = m.user_id === ctx.session.user.id;
            return `<tr>
              <td><div class="row">${ui.av(p, 'sm')}<div class="stack tight" style="gap:0"><span class="strong small">${esc(p.full_name || p.email)}${me ? ' <span class="faint">(you)</span>' : ''}</span><span class="tiny muted">${esc(p.email || '')}</span></div></div></td>
              <td>${isOwner && !me ? `<select class="cell-input" data-role="${m.user_id}" style="width:auto">${['owner', 'producer', 'hod', 'crew'].map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE[r]}</option>`).join('')}</select>` : ui.pill(ROLE[m.role], m.role === 'owner' ? 'accent' : '')}</td>
              <td class="small muted">${tierNote[m.role]}</td>
              <td class="r">${isOwner && !me ? `<button class="btn btn-xs btn-ghost" data-remove="${m.user_id}">${ui.icon('user-minus')}Remove</button>` : ''}</td>
            </tr>`;
          }).join('')}</tbody></table></div>` })}

        ${ui.panel({ title: 'Clients by production', icon: 'eye', flush: true, body: d.clients.length ? `<div class="list">${d.clients.map((c) => {
            const p = prof(c.user_id); const prod = d.prods.find((x) => x.id === c.production_id);
            return `<div class="list-row">${ui.av(p, 'sm')}<div class="grow stack tight" style="gap:0"><span class="small strong">${esc(p.full_name || p.email)}</span><span class="tiny muted">${esc(p.email || '')}</span></div>
              <span class="small muted">${esc(prod?.title || '')}</span>
              ${d.canInvite ? `<button class="btn btn-xs btn-ghost" data-unclient="${c.production_id}|${c.user_id}">${ui.icon('x')}Remove access</button>` : ''}</div>`;
          }).join('')}</div>` : `<div class="panel-body">${ui.empty('eye', 'No clients yet', 'Invite a client to a production. They see the overview, the script and any bid you send them. Nothing else.')}</div>` })}

        ${d.canInvite ? ui.panel({ title: `Pending invites · ${d.invites.length}`, icon: 'send', flush: true, body: d.invites.length ? `<div class="list">${d.invites.map((i) => {
            const prod = d.prods.find((x) => x.id === i.production_id);
            return `<div class="list-row">${ui.icon('mail')}<div class="grow stack tight" style="gap:0"><span class="small strong">${esc(i.email)}</span>
              <span class="tiny muted">${ROLE[i.role]}${prod ? ' · ' + esc(prod.title) : ''} · created ${MPH.date(i.created_at)}</span></div>
              <button class="btn btn-xs btn-outline" data-copy="${esc(inviteUrl(i.token))}">${ui.icon('copy')}Copy link</button>
              <button class="btn btn-xs btn-ghost" data-revoke="${i.id}">${ui.icon('trash-2')}Revoke</button></div>`;
          }).join('')}</div>` : `<div class="panel-body"><p class="small muted">No pending invites.</p></div>` }) : ''}

        ${d.canInvite ? integrationsPanel(ctx, d) : ''}
      </div>`;
  },

  mount(root, ctx, d) {
    const { ui, esc } = ctx;
    // back from Google's consent screen
    const back = new URLSearchParams(location.search).get('google');
    if (back) {
      const msg = { connected: 'Google Calendar connected', gmail_connected: 'Gmail connected. Label client emails MPH/Briefs to read them into briefs.', gmail_watch_failed: 'Gmail connected, but watching the MPH/Briefs label failed. Check GMAIL_PUBSUB_TOPIC, then Renew watch.', cancelled: 'Google Calendar wasn’t connected: access was cancelled', missing_scope: 'Google Calendar wasn’t connected: the calendar permission was left unticked. Connect again and tick “View and edit events on all your calendars”.', no_refresh_token: 'Google didn’t grant offline access. Remove MPH from your Google account’s third-party access and connect again.' }[back] || `Google Calendar wasn’t connected (${back}). Try again.`;
      /connected$/.test(back) ? ctx.toast(msg, 'calendar-check') : ctx.toastError(new Error(msg));
      const u = new URL(location.href); u.searchParams.delete('google'); history.replaceState(null, '', u.toString());
    }
    const org = ctx.session.org;
    root.addEventListener('click', async (e) => {
      const cp = e.target.closest('[data-int-copy]');
      if (cp) { try { await navigator.clipboard.writeText(cp.dataset.intCopy); ctx.toast('Address copied'); } catch (ex) { ctx.toast('Select the address and copy it'); } return; }
      const b = e.target.closest('[data-int], [data-int-off]');
      if (!b) return;
      b.disabled = true;
      try {
        if (b.dataset.intOff) {
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.disabled = false; b.textContent = 'Click again to disconnect'; return; }
          await ctx.api.integrations('disconnect', { org_id: org.id, provider: b.dataset.intOff });
          ctx.toast('Disconnected'); return ctx.reload();
        }
        const act = b.dataset.int;
        if (act === 'google') { const { url } = await ctx.api.integrations('google_start', { org_id: org.id }); location.href = url; return; }
        if (act === 'gmail') { const { url } = await ctx.api.integrations('gmail_start', { org_id: org.id }); location.href = url; return; }
        if (act === 'gmail-watch') { const w = await ctx.api.integrations('gmail_watch', { org_id: org.id }); ctx.toast(`Watching MPH/Briefs until ${MPH.date(w.expires)}`, 'refresh-cw'); return ctx.reload(); }
        if (act === 'gmail-push') {
          const { url, topic } = await ctx.api.integrations('gmail_push_url', { org_id: org.id });
          b.disabled = false;
          ctx.modal(ctx.frame({ title: 'Gmail push URL', sub: 'For the Pub/Sub push subscription that delivers Gmail notifications to MPH.',
            body: `<input class="input mono small" readonly value="${esc(url)}"><p class="small">In Google Cloud → Pub/Sub, create a <span class="strong">push</span> subscription on ${topic ? `<span class="mono">${esc(topic)}</span>` : 'your Gmail topic'} with this endpoint URL. Keep it private: it identifies your workspace.</p>`,
            foot: '<button class="btn btn-primary" data-close>Done</button>' }));
          return;
        }
        if (act === 'inbound' || act === 'inbound-renew') {
          if (act === 'inbound-renew' && !b.dataset.armed) { b.dataset.armed = '1'; b.disabled = false; b.textContent = 'The old address stops working. Click again'; return; }
          const { address } = await ctx.api.integrations('inbound_setup', { org_id: org.id, renew: act === 'inbound-renew' });
          ctx.toast(`Forward client emails to ${address}`, 'mail-plus'); return ctx.reload();
        }
        if (act === 'ff-url') {
          const { url } = await ctx.api.integrations('fireflies_setup', { org_id: org.id });
          const dlg = ctx.modal(ctx.frame({
            title: 'Your Fireflies webhook URL',
            sub: 'Shown once. Creating a new one stops the old URL from working.',
            body: `<input class="input mono small" readonly value="${esc(url)}" id="ff-url">
              <ol class="small" style="margin:0;padding-inline-start:18px;display:grid;gap:4px">
                <li>In Fireflies open <span class="mono">app.fireflies.ai/integrations/api/webhook</span> (Webhooks V2).</li>
                <li>Paste this URL, type a long random <b>signing secret</b>, and tick <span class="mono">meeting.transcribed</span>, <span class="mono">meeting.summarized</span> and <span class="mono">meeting.bot_joined</span>.</li>
                <li>Save, then add the same signing secret and your API key here with “Add API key”. Then click “Send Test Event” in Fireflies.</li></ol>`,
            foot: `<button class="btn btn-ghost" data-close>Done</button><button class="btn btn-primary" id="ff-copy">${ui.icon('copy')}Copy URL</button>`,
          }));
          dlg.querySelector('#ff-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); ctx.toast('Webhook URL copied'); } catch (ex) { dlg.querySelector('#ff-url').select(); } });
          return ctx.reload();
        }
        if (act === 'ff-keys') {
          b.disabled = false;
          const cur = (d.integrations.find((i) => i.provider === 'fireflies') || {}).settings || {};
          const dlg = ctx.modal(ctx.frame({
            title: 'Fireflies keys',
            sub: 'Stored encrypted; nobody can read them back. Leave a field empty to keep what’s saved.',
            body: `<div class="field"><label for="ff-key">API key</label><input id="ff-key" name="ff-api-key" class="input mono" type="password" autocomplete="new-password" data-lpignore="true" data-1p-ignore spellcheck="false" placeholder="${cur.has_key ? 'Saved' : 'Fireflies → Settings → Developer settings'}"></div>
              <div class="field"><label for="ff-sec">Webhook signing secret</label><input id="ff-sec" name="ff-signing-secret" class="input mono" type="password" autocomplete="new-password" data-lpignore="true" data-1p-ignore spellcheck="false" placeholder="${cur.has_secret ? 'Saved' : 'The one you typed on Fireflies’ webhook page'}"></div>
              <div class="field"><label for="ff-lang">Meeting language for “Add Fireflies”</label><select id="ff-lang" class="select">
                ${[['', 'Fireflies’ own setting (use Multi-Language Mode for Arabic + English)'], ['ar', 'Arabic'], ['en', 'English']].map(([v, l]) => `<option value="${v}" ${(cur.language || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              <div id="ff-err"></div>`,
            foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ff-save">${ui.icon('key-round')}Save</button>`,
          }));
          setTimeout(() => { for (const id of ['#ff-key', '#ff-sec']) { const f = dlg.querySelector(id); if (f && document.activeElement !== f) f.value = ''; } }, 300); // drop any browser autofill
          dlg.querySelector('#ff-save').addEventListener('click', async (ev) => {
            const go = ev.currentTarget; go.disabled = true;
            const key = dlg.querySelector('#ff-key').value.trim(), sec = dlg.querySelector('#ff-sec').value.trim();
            try {
              await ctx.api.integrations('fireflies_keys', { org_id: org.id, ...(key ? { api_key: key } : {}), ...(sec ? { signing_secret: sec } : {}), language: dlg.querySelector('#ff-lang').value });
              ctx.closeOverlay(); ctx.toast(key ? 'Fireflies API key checked and saved.' : 'Fireflies settings saved.', 'shield-check'); ctx.reload();
            } catch (ex) { go.disabled = false; dlg.querySelector('#ff-err').innerHTML = ui.errorBox(ex.message); MPH.icons(); }
          });
          return;
        }
      } catch (ex) { b.disabled = false; ctx.toastError(ex); }
    });
    const copy = async (text) => {
      try { await navigator.clipboard.writeText(text); ctx.toast('Invite link copied'); }
      catch (e) { ctx.toast('Select the link and copy it'); }
    };
    root.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-role]');
      if (!sel) return;
      try { ctx.api.must(await ctx.sb.from('org_members').update({ role: sel.value }).eq('org_id', ctx.session.org.id).eq('user_id', sel.dataset.role)); ctx.toast('Role updated'); }
      catch (ex) { ctx.toastError(ex); ctx.reload(); }
    });
    root.addEventListener('click', async (e) => {
      const t = (s) => e.target.closest(s);
      let el;
      if ((el = t('[data-copy]'))) return copy(el.dataset.copy);
      try {
        if ((el = t('[data-revoke]'))) { ctx.api.must(await ctx.sb.from('invites').delete().eq('id', el.dataset.revoke)); ctx.toast('Invite revoked'); return ctx.reload(); }
        if ((el = t('[data-remove]'))) { ctx.api.must(await ctx.sb.from('org_members').delete().eq('org_id', ctx.session.org.id).eq('user_id', el.dataset.remove)); ctx.toast('Removed from the workspace'); return ctx.reload(); }
        if ((el = t('[data-unclient]'))) { const [pid, uid] = el.dataset.unclient.split('|'); ctx.api.must(await ctx.sb.from('production_members').delete().eq('production_id', pid).eq('user_id', uid)); ctx.toast('Client access removed'); return ctx.reload(); }
      } catch (ex) { return ctx.toastError(ex); }
      if (t('[data-rename]')) {
        const org = ctx.session.org;
        const dlg = ctx.modal(ctx.frame({
          title: 'Rename workspace',
          body: `<div class="field"><label for="rn-name">Workspace name</label><input id="rn-name" class="input" value="${esc(org.name)}"></div>
                 <div class="field"><label for="rn-name-ar">Arabic name</label><input id="rn-name-ar" class="input ar" dir="rtl" value="${esc(org.name_ar || '')}"></div>
                 <div class="field"><label for="rn-city">City</label><input id="rn-city" class="input" value="${esc(org.city || '')}"></div>
                 <div id="rn-error" hidden></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="rn-save">Save</button>`,
        }));
        dlg.querySelector('#rn-save').addEventListener('click', async () => {
          const name = dlg.querySelector('#rn-name').value.trim();
          const out = dlg.querySelector('#rn-error');
          if (!name) { out.hidden = false; out.innerHTML = ui.errorBox('The workspace needs a name.'); return MPH.icons(); }
          try {
            ctx.api.must(await ctx.sb.from('orgs').update({ name, name_ar: dlg.querySelector('#rn-name-ar').value.trim() || null, city: dlg.querySelector('#rn-city').value.trim() || null }).eq('id', org.id));
            await ctx.api.loadSession();
            ctx.closeOverlay(); ctx.toast(`Renamed to ${name}`); ctx.refreshAll();
          } catch (ex) { out.hidden = false; out.innerHTML = ui.errorBox(ex.message); MPH.icons(); }
        });
        return;
      }
      if (!t('[data-invite]')) return;

      const dlg = ctx.modal(ctx.frame({
        title: 'Invite someone',
        sub: 'You’ll get a private link to send them, by WhatsApp or email. It works once.',
        body: `
          <div class="field"><label for="iv-email">Their email</label><input id="iv-email" class="input" type="email" placeholder="name@company.com"></div>
          <div class="field"><label for="iv-role">Role</label><select id="iv-role" class="select">
            <option value="producer">Producer: runs productions, sees internal cost</option>
            <option value="hod">Head of department: schedules, shots, crew; no budget</option>
            <option value="crew">Crew: reads production detail; no budget</option>
            <option value="client">Client: one production, bid and script only</option>
            ${ctx.session.org.role === 'owner' ? '<option value="owner">Owner: everything</option>' : ''}
          </select></div>
          <div class="field" id="iv-prod-wrap" hidden><label for="iv-prod">Production</label><select id="iv-prod" class="select">${d.prods.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
          <div id="iv-result" hidden></div>`,
        foot: `<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-primary" id="iv-create">${ui.icon('link')}Create invite link</button>`,
      }));
      const roleSel = dlg.querySelector('#iv-role');
      roleSel.addEventListener('change', () => { dlg.querySelector('#iv-prod-wrap').hidden = roleSel.value !== 'client'; });
      dlg.querySelector('#iv-create').addEventListener('click', async () => {
        const email = dlg.querySelector('#iv-email').value.trim();
        const role = roleSel.value;
        const out = dlg.querySelector('#iv-result');
        if (!/^\S+@\S+\.\S+$/.test(email)) { out.hidden = false; out.innerHTML = ui.errorBox('Enter a valid email address.'); return MPH.icons(); }
        if (role === 'client' && !d.prods.length) { out.hidden = false; out.innerHTML = ui.errorBox('Create a production first, then invite its client.'); return MPH.icons(); }
        try {
          const row = { email, role, invited_by: ctx.session.user.id };
          if (role === 'client') row.production_id = dlg.querySelector('#iv-prod').value; else row.org_id = ctx.session.org.id;
          const inv = ctx.api.must(await ctx.sb.from('invites').insert(row).select().single());
          const url = `${location.origin}${location.pathname}#invite.${inv.token}`;
          const msg = `You're invited to ${ctx.session.org.name} on ${window.MPH_CONFIG.brand}. Open this link to join: ${url}`;
          out.hidden = false;
          out.innerHTML = `<div class="callout">${ui.icon('link')}<div class="stack tight grow" style="min-width:0">
            <span class="small strong">Invite link ready</span>
            <input class="input mono small" readonly value="${esc(url)}" id="iv-url">
            <div class="row wrap"><button class="btn btn-sm btn-outline" id="iv-copy">${ui.icon('copy')}Copy link</button>
              <a class="btn btn-sm btn-outline" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ui.wa(14)}Share on WhatsApp</a>
              <a class="btn btn-sm btn-ghost" href="mailto:${esc(email)}?subject=${encodeURIComponent('Invite to ' + ctx.session.org.name)}&body=${encodeURIComponent(msg)}">${ui.icon('mail')}Email</a></div>
            <span class="tiny faint">They must sign up or sign in with ${esc(email)}, then open the link.</span></div></div>`;
          MPH.icons();
          out.querySelector('#iv-copy').addEventListener('click', () => { copy(url); out.querySelector('#iv-url').select(); });
          dlg.querySelector('#iv-create').disabled = true;
          ctx.reload();
        } catch (ex) { out.hidden = false; out.innerHTML = ui.errorBox(ex.message); MPH.icons(); }
      });
    });
  },
});
