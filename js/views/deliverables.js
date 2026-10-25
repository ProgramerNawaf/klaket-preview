/* Deliverables (#p.<id>.deliverables): Post-production, team only.
   Read-only for now: the films the active brief (latest approved, else latest) asks for, with their usage rights.
   Edit them on the Brief. Tracking each file through finishing and delivery comes later. */
(function () {
  const esc = MPH.esc;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const MEDIA = { digital: 'Digital', tv: 'TV', cinema: 'Cinema', ooh: 'Outdoor (OOH)', all: 'All media' };

  MPH.view('deliverables', {
    async load(ctx) {
      return { brief: await MPH.briefs.active(ctx) };
    },

    render(ctx, d) {
      const { ui } = ctx;
      const p = ctx.production;
      const b = d.brief;
      const head = (sub) => ui.pageHead({
        eyebrow: 'Finish & deliver',
        title: ctx.t('Deliverables'),
        sub,
        actions: `<a class="btn btn-sm btn-outline" href="#p.${p.id}.brief">${ui.icon('clipboard-list')}Open the brief</a>`,
      });
      if (!b || !b.deliverables.length) {
        return `<div class="page">${head('Every film this production owes the client, from the brief.')}
          ${ui.panel({ body: ui.empty('package-check', 'No deliverables yet', 'List the hero film and each cutdown in the brief’s Deliverables table, with length, ratio and platform. They appear here for delivery.', `<a class="btn btn-primary" href="#p.${p.id}.brief">${ui.icon('clipboard-list')}Go to the brief</a>`) })}</div>`;
      }
      const st = MPH.briefs.STATUS[b.brief.status] || MPH.briefs.STATUS.draft;
      const f = b.brief.fields || {};
      const notApproved = b.brief.status !== 'approved'
        ? `<div class="callout market">${ui.icon('triangle-alert')}<span class="small">This list comes from brief v${esc(b.brief.version)}, which the client hasn’t approved yet. It may still change.</span></div>` : '';
      return `<div class="page">
        ${head(`${plural(b.deliverables.length, 'film')} from brief v${esc(b.brief.version)}${f.delivery_date ? ` · due ${esc(MPH.date(f.delivery_date, 'long'))}` : ''}`)}
        ${notApproved}
        ${ui.panel({ title: 'Films to deliver', icon: 'package-check', actions: ui.pill(`Brief v${b.brief.version} · ${st.label}`, st.kind, st.icon), flush: true, body: `
          <div class="bf-table-wrap"><table class="table bf-table">
            <thead><tr><th>#</th><th>Name</th><th class="r">Duration</th><th>Ratio</th><th>Platform</th><th>Language</th><th class="c">Subtitles</th><th class="c">Clean</th></tr></thead>
            <tbody>${b.deliverables.map((x, i) => `
              <tr>
                <td class="num muted">${i + 1}</td>
                <td class="strong" dir="auto">${esc(x.name || 'Untitled')}</td>
                <td class="num r">${esc(MPH.briefs.durLabel(x.duration_s))}</td>
                <td>${x.aspect_ratio ? `<span class="bf-ratio">${esc(x.aspect_ratio)}</span>` : ''}</td>
                <td dir="auto">${esc(x.platform || '')}</td>
                <td dir="auto">${esc(x.language || '')}</td>
                <td class="c">${x.subtitles ? ui.icon('check') : '<span class="faint">—</span>'}</td>
                <td class="c">${x.clean_version ? ui.icon('check') : '<span class="faint">—</span>'}</td>
              </tr>`).join('')}</tbody>
          </table></div>` })}
        ${b.usage.length ? ui.panel({ title: 'Usage rights', icon: 'scale', body: `<dl class="kv">${b.usage.map((u) => `<dt>${esc(MEDIA[u.media] || u.media)}</dt><dd dir="auto">${esc(u.territory || 'Territory not given')}${u.term_months ? ` · ${plural(u.term_months, 'month')}` : ''}</dd>`).join('')}</dl>` }) : ''}
      </div>`;
    },
  });
})();
