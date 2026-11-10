/* Call Sheets: one sheet per shoot day, built from the stripboard (day + scenes), the breakdown (cast) and Crew & Talent.
   Routes: #p.<id>.callsheets                    list of shoot days and their sheets
           #p.<id>.callsheets.new.<shootDayId>   create (or open) the working draft for a day
           #p.<id>.callsheets.<callSheetId>      builder (draft) or published sheet with share & tracking
   Publishing writes a snapshot into call_sheets.content with names, roles, call times and key-contact phones only:
   never rates, costs or emails. The crew page (callsheet.html) renders that snapshot by share token.
   A new version keeps the same share link: the token moves to the newest row, so links already sent on WhatsApp
   always open the latest version, and older rows stay in history.
   Export PDF (drafts and published versions): a print window with the sheet on A4 in Klaket colours, the Klaket
   wordmark in its footer and DRAFT across an unpublished one; the browser's Save as PDF makes the file. */
(function () {
  const { esc } = MPH;

  const S = { tab: {}, justPublished: null };
  const DEFAULT_KINDS = ['crew', 'talent', 'extra'];
  const DEPT_FALLBACK = { talent: 'Cast', extra: 'Extras', client: 'Client', vendor: 'Vendors', crew: 'Crew' };
  const DEPT_ORDER = ['production', 'direction', 'camera', 'grip & electric', 'lighting', 'grip', 'electric', 'sound', 'art', 'wardrobe', 'hair & makeup', 'makeup', 'transport', 'catering', 'extras', 'client', 'agency', 'vendors'];

  const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
  const toMin = (t) => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
  const fmt = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const uniq = (a) => [...new Set(a)];
  const deptOf = (p) => (p.dept && p.dept.trim()) || DEPT_FALLBACK[p.kind] || 'Crew';
  const deptRank = (dname) => { const i = DEPT_ORDER.indexOf(norm(dname)); return i < 0 ? 50 : i; };
  const byDept = (a, b) => (deptRank(a) - deptRank(b)) || a.localeCompare(b);
  const shareUrl = (token) => `${location.origin}${location.pathname.replace(/index\.html$/, '')}callsheet.html#${token}`;
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));
  const randHex = (bytes = 16) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  /* ------------------------------------------------------------ sunrise, sunset and weather (Open-Meteo, no key)
     The place is looked up by name; the forecast covers about 16 days ahead, and outside it sunrise and sunset are
     worked out with the sunrise equation (to within a couple of minutes). */
  const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorms', 96: 'Thunderstorms with hail', 99: 'Thunderstorms with hail' };
  const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`The weather service answered ${r.status}. Try again later.`); return r.json(); };
  const tzOffset = (tz, date) => {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(`${date}T12:00:00Z`)).find((x) => x.type === 'timeZoneName');
      const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ? part.value : '');
      return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 180;
    } catch (e) { return 180; }
  };
  function sunEquation(lat, lon, date, offsetMin) {
    const rad = Math.PI / 180;
    const J = Date.parse(`${date}T12:00:00Z`) / 86400000 + 2440587.5;
    const n = Math.ceil(J - 2451545 + 0.0008);
    const Js = n - lon / 360;
    const M = ((357.5291 + 0.98560028 * Js) % 360) * rad;
    const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
    const L = ((M / rad + C + 180 + 102.9372) % 360) * rad;
    const Jt = 2451545 + Js + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const dec = Math.asin(Math.sin(L) * Math.sin(23.4397 * rad));
    const cw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (cw < -1 || cw > 1) return {};
    const w = Math.acos(cw) / rad;
    const at = (j) => fmt(Math.round(((j - 2440587.5) * 86400000 % 86400000) / 60000) + offsetMin);
    return { sunrise: at(Jt - w / 360), sunset: at(Jt + w / 360) };
  }
  MPH.sunAndWeather = async (place, date) => {
    if (!date) throw new Error('Set the shoot day’s date first.');
    const tries = uniq([place, ...String(place).split(/[,،]/).map((x) => x.trim()).reverse()].filter(Boolean));
    let g = null;
    for (const q of tries) {
      const out = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(q)}`);
      if (out.results && out.results.length) { g = out.results[0]; break; }
    }
    if (!g) throw new Error(`Couldn’t find “${place}” on the map. Type the city or district name as the set location.`);
    const where = [g.name, g.admin1, g.country].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ');
    const days = (Date.parse(date) - Date.now()) / 86400000;
    if (days > -90 && days < 15) {
      const f = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&timezone=auto&start_date=${date}&end_date=${date}&daily=sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max`);
      const x = f.daily || {};
      const v = (k) => (x[k] && x[k][0] != null ? x[k][0] : null);
      const parts = [WMO[v('weather_code')] || '', v('temperature_2m_max') != null ? `${Math.round(v('temperature_2m_max'))}°C high` : '', v('temperature_2m_min') != null ? `${Math.round(v('temperature_2m_min'))}°C low` : '',
        v('wind_speed_10m_max') != null ? `wind ${Math.round(v('wind_speed_10m_max'))} km/h` : '', v('precipitation_probability_max') ? `${v('precipitation_probability_max')}% chance of rain` : ''].filter(Boolean);
      return { place: where, sunrise: String(v('sunrise') || '').slice(11, 16), sunset: String(v('sunset') || '').slice(11, 16), weather: parts.join(', ') };
    }
    return Object.assign({ place: where, weather: '' }, sunEquation(g.latitude, g.longitude, date, tzOffset(g.timezone, date)));
  };

  /* ------------------------------------------------------------ Export PDF
     A print window holding the sheet on A4 in Klaket colours. Works for a draft (DRAFT watermark, "not shared")
     and for a published version; the browser's print dialog saves it as a PDF. */
  function exportPdf(snap, meta, title) {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Allow pop-ups for this site to export the PDF.');
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .filter((l) => /fonts\.googleapis|\/app\.css|\/platform\.css|budget-callsheets\.css/.test(l.href))
      .map((l) => `<link rel="stylesheet" href="${esc(l.href)}">`).join('');
    // draw the icons here (the print window has no icon library), then hand over the finished markup
    const tmp = document.createElement('div');
    tmp.innerHTML = sheetDoc(snap, Object.assign({}, meta, { klaket: base + 'brand/klaket-wordmark-ink.svg' }));
    MPH.icons(tmp);
    const doc = tmp.innerHTML;
    w.document.write(`<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><title>${esc(title)}</title>${css}
      <style>@page{size:A4 portrait;margin:9mm}html,body{margin:0;background:#fff}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .cs-paper-wrap{border:0;border-radius:0;padding:0;background:none}.cs-doc{box-shadow:none;max-width:none;border-radius:0}</style></head>
      <body><div class="cs-paper-wrap cs-print">${doc.replace('class="cs-doc', 'class="cs-doc cs-kl')}</div></body></html>`);
    w.document.close();
    const fonts = w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve();
    const imgs = [...w.document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    Promise.race([Promise.all([fonts, ...imgs]), new Promise((r) => setTimeout(r, 4000))]).then(() => setTimeout(() => { w.focus(); w.print(); }, 250));
    return w;
  }

  /* ------------------------------------------------------------ snapshot (what the crew page renders) */
  const suggestedContacts = (people) => people
    .filter((p) => p.phone && /producer|1st a(d|ssistant director)|first a(d|ssistant)|production manager|coordinator|unit manager/i.test(p.role || ''))
    .slice(0, 4).map((p) => p.id);

  const onSheet = (p, roster) => (roster[p.id] && typeof roster[p.id].on === 'boolean' ? roster[p.id].on : DEFAULT_KINDS.includes(p.kind));
  const defaultCall = (p, day) => hhmm(p.default_call) || hhmm(day.crew_call) || '';
  const callOf = (p, roster, day) => (roster[p.id] && roster[p.id].call) || defaultCall(p, day);

  /* ------------------------------------------------------------ templates, timing and safety */
  const TEMPLATES = [
    { id: 'short', label: 'Short', hint: 'One page: crew and timings, locations with hospitals, the schedule and safety numbers' },
    { id: 'standard', label: 'Standard', hint: 'Adds notes, the cast and key contacts' },
    { id: 'expanded', label: 'Expanded', hint: 'Adds scene synopses, parking and the props, wardrobe and production breakdown' },
  ];
  const templateOf = (edits) => (TEMPLATES.some((x) => x.id === edits.template) ? edits.template : 'standard');
  // Saudi public emergency numbers, printed on every sheet
  const EMERGENCY = [
    { label: 'Unified emergency', num: '911' }, { label: 'Ambulance (Red Crescent)', num: '997' }, { label: 'Police', num: '999' },
    { label: 'Civil Defense (fire)', num: '998' }, { label: 'Road security', num: '996' },
  ];
  const PREPS = [15, 20, 30];
  const prepOf = (edits) => (PREPS.includes(Number(edits.prep)) ? Number(edits.prep) : 15);
  const moveOf = (edits) => (Number(edits.move) >= 15 && Number(edits.move) <= 120 ? Number(edits.move) : 30);
  const BREAKDOWN = { props: ['props'], wardrobe: ['wardrobe', 'makeup'], production: ['vehicles', 'equipment', 'sfx', 'animals', 'stunts', 'sound', 'vfx', 'extras'] };
  const CAT_NAMES = { makeup: 'Hair & makeup', vehicles: 'Vehicles', equipment: 'Equipment', sfx: 'SFX', animals: 'Animals', stunts: 'Stunts', sound: 'Sound', vfx: 'VFX', extras: 'Extras' };
  const hospitalSearch = (place) => mapsUrl(`hospital near ${place}`);

  /* every place the day shoots at: the set location, then each scene's location in shooting order. Hospital and
     parking are kept per place (edits.loc, keyed by the place's name); the old single hospital/parking fields
     belong to the first place. */
  function locationsOf(d, day, edits, scenes) {
    const first = (edits.set_location || '').trim() || day.location || '';
    const names = [];
    [first, ...scenes.map((s) => s.location || '')].forEach((n) => { const t = String(n || '').trim(); if (t && !names.some((x) => norm(x) === norm(t))) names.push(t); });
    const loc = edits.loc || {};
    return names.map((name, i) => {
      const e = loc[norm(name)] || {};
      return {
        name, hospital: e.hospital != null ? e.hospital : (i === 0 ? edits.hospital || '' : ''),
        parking: e.parking != null ? e.parking : (i === 0 ? edits.parking || '' : ''),
        scenes: scenes.filter((s) => norm(s.location || first) === norm(name) || (!s.location && i === 0)).map((s) => s.num),
      };
    });
  }

  function buildSnapshot(ctx, d, day, edits) {
    const p = ctx.production;
    const org = (ctx.session.orgs || []).find((o) => o.id === p.org_id);
    const roster = edits.roster || {};
    const scenes = d.scenes.filter((s) => s.shoot_day_id === day.id).sort((a, b) => (a.day_sort - b.day_sort) || (a.sort - b.sort));
    const castBy = {};
    d.cast.forEach((e) => { (castBy[e.scene_id] = castBy[e.scene_id] || []).push(e.name); });
    const elsBy = {};
    (d.elements || []).forEach((e) => { const m = (elsBy[e.scene_id] = elsBy[e.scene_id] || {}); (m[e.category] = m[e.category] || []).push(e.name); });

    const people = d.people.filter((x) => onSheet(x, roster)).map((x) => ({
      id: x.id, name: x.name, role: x.role || '', dept: deptOf(x), kind: x.kind, call: callOf(x, roster, day),
    }));

    // scenes in shooting order with their times: a prep gap between scenes on the same set, a longer one to move
    const prep = prepOf(edits), move = moveOf(edits);
    const crewMin = toMin(day.crew_call);
    let t = toMin(edits.shoot_call);
    const estimated = t == null && crewMin != null;
    if (estimated) t = crewMin + 60; // no first-shot time yet: an hour after crew call
    const placeOf = (s) => norm(s.location || edits.set_location || day.location);
    const schedule = scenes.map((s, i) => {
      let prep_before = null;
      if (i > 0 && t != null) {
        const moving = placeOf(s) !== placeOf(scenes[i - 1]);
        const mins = moving ? move : prep;
        prep_before = { minutes: mins, label: moving ? 'Company move and set-up' : 'Prep and reset', time: fmt(t), end: fmt(t + mins) };
        t += mins;
      }
      const els = elsBy[s.id] || {};
      const pick = (cats) => uniq(cats.flatMap((c) => (els[c] || []).map((n) => (CAT_NAMES[c] && cats.length > 1 && c !== cats[0] ? `${n} (${CAT_NAMES[c].toLowerCase()})` : n))));
      const row = {
        num: s.num, heading: s.heading || '', int_ext: s.int_ext || '', day_night: s.day_night || '', location: s.location || '',
        synopsis: s.synopsis || '', pages_eighths: s.pages_eighths || 0, est_minutes: s.est_minutes || 0,
        cast: uniq(castBy[s.id] || []), time: t != null ? fmt(t) : '', end: t != null ? fmt(t + (s.est_minutes || 60)) : '', prep_before,
        props: pick(BREAKDOWN.props), wardrobe: pick(BREAKDOWN.wardrobe),
        production: uniq(BREAKDOWN.production.flatMap((c) => (els[c] || []).map((n) => `${CAT_NAMES[c]}: ${n}`))),
      };
      if (t != null) t += s.est_minutes || 60;
      return row;
    });
    const lastEnd = schedule.length && schedule[schedule.length - 1].end;

    const talent = people.filter((x) => x.kind === 'talent');
    const used = new Set();
    const cast = uniq(schedule.flatMap((s) => s.cast)).map((character, i) => {
      const c = norm(character);
      const loose = (x) => { const r = norm(x.role); return !!(r && c && (r.includes(c) || c.includes(r))); };
      const m = talent.find((x) => !used.has(x.id) && norm(x.role) === c) || talent.find((x) => !used.has(x.id) && loose(x));
      if (m) used.add(m.id);
      const sc = schedule.filter((s) => s.cast.includes(character)).map((s) => s.num);
      return { no: i + 1, character, talent: m ? m.name : '', person_id: m ? m.id : null, call: m ? m.call : '', scenes: sc };
    });
    talent.filter((x) => !used.has(x.id)).forEach((x) => cast.push({ no: cast.length + 1, character: x.role || 'Talent', talent: x.name, person_id: x.id, call: x.call, scenes: [] }));

    const contactIds = Array.isArray(edits.contacts) ? edits.contacts : suggestedContacts(d.people);
    const contacts = contactIds.map((id) => d.people.find((x) => x.id === id)).filter(Boolean)
      .map((x) => ({ name: x.name, role: x.role || '', phone: x.phone || '' }));

    const locations = locationsOf(d, day, edits, scenes);
    const total = Math.max(d.days.length, ...d.days.map((x) => x.day_no || 0));
    return {
      v: 2,
      template: templateOf(edits),
      house: org ? org.name : '',
      production: { title: p.title, title_ar: p.title_ar || '', client: p.client_name || '', agency: p.agency || '', code: p.code || '' },
      day: {
        day_no: day.day_no, total, date: day.date || '', crew_call: hhmm(day.crew_call), wrap: hhmm(day.wrap) || lastEnd || '',
        shoot_call: edits.shoot_call || (estimated && schedule.length ? schedule[0].time : ''), shoot_call_estimated: estimated && !!schedule.length,
        notes: day.notes || '', sunrise: edits.sunrise || '', sunset: edits.sunset || '', prep, move,
      },
      location: locations[0] ? locations[0].name : '',
      locations,
      parking: locations[0] ? locations[0].parking : '',
      hospital: locations[0] ? locations[0].hospital : '',
      weather: edits.weather || '',
      notes: edits.notes || '',
      schedule,
      pages_eighths: schedule.reduce((s, x) => s + (x.pages_eighths || 0), 0),
      cast,
      people,
      contacts,
      emergency: EMERGENCY,
      edits: clone(edits),
    };
  }

  /* ------------------------------------------------------------ the paper call sheet (renders a snapshot)
     Top left: the crew with their positions and call times. Middle: the production and the crew call.
     Top right: the day, its timings, sunrise, sunset and weather. Then locations (each with its nearest hospital),
     the schedule with prep and moves between scenes, the cast, the breakdown and the safety numbers, as the
     sheet's template (short, standard, expanded) asks. Snapshots from before templates render as standard. */
  function sheetDoc(snap, meta) {
    const { ui } = MPH;
    const c = snap;
    const day = c.day || {};
    const tpl = TEMPLATES.some((x) => x.id === c.template) ? c.template : 'standard';
    const std = tpl !== 'short', full = tpl === 'expanded';
    const draft = meta.status !== 'published';
    const notes = [...String(c.notes || '').split('\n'), ...String(day.notes || '').split('\n')].map((s) => s.trim()).filter(Boolean);
    const crew = (c.people || []).filter((x) => x.kind !== 'talent');
    const depts = uniq(crew.map((x) => x.dept)).sort(byDept);
    const contacts = c.contacts || [];
    const locations = Array.isArray(c.locations) && c.locations.length ? c.locations
      : (c.location ? [{ name: c.location, hospital: c.hospital || '', parking: c.parking || '', scenes: [] }] : []);
    const emergency = Array.isArray(c.emergency) && c.emergency.length ? c.emergency : EMERGENCY;
    const schedule = c.schedule || [];
    const hasTimes = schedule.some((s) => s.time);
    const initials = ui.initials(c.house || 'Klaket');
    const list = (a) => (a && a.length ? esc(a.join(', ')) : '<span class="cs-muted">—</span>');
    const timeRow = (k, v, cls = '') => (v ? `<tr class="${cls}"><th>${k}</th><td class="num">${esc(v)}</td></tr>` : '');
    const breakdown = full && schedule.some((s) => (s.props || []).length || (s.wardrobe || []).length || (s.production || []).length);
    return `
      <article class="cs-doc cs-tpl-${tpl} ${draft ? 'is-draft' : ''}" dir="ltr" lang="en" aria-label="Call sheet day ${esc(day.day_no)}">
        ${draft ? '<div class="cs-watermark" aria-hidden="true">DRAFT</div>' : ''}
        <header class="cs-doc-head">
          <div class="cs-doc-co">
            <div class="cs-k cs-k-head">Crew · position · call</div>
            ${crew.length ? `<div class="cs-headcrew">${depts.map((dn) => `
              <div class="cs-hc-dept">${esc(dn)}</div>
              ${crew.filter((x) => x.dept === dn).map((x) => `<div class="cs-hc-row ${meta.me === x.id ? 'me' : ''}"><span class="cs-hc-name">${esc(x.name)}<span class="cs-hc-role">${esc(x.role || '—')}</span></span><span class="num strong">${esc(x.call || day.crew_call || '')}</span></div>`).join('')}`).join('')}</div>`
              : '<div class="cs-muted">No crew on this sheet yet</div>'}
          </div>
          <div class="cs-doc-mid">
            <div class="cs-logo"><span>${esc(initials)}</span></div>
            ${c.house ? `<div class="strong">${esc(c.house)}</div>` : ''}
            <div class="cs-title">${esc(String(c.production?.title || '').toUpperCase())}${c.production?.title_ar ? ` <span class="ar">${esc(c.production.title_ar)}</span>` : ''}</div>
            <div class="cs-muted">${[c.production?.client, c.production?.agency, c.production?.code].filter(Boolean).map(esc).join(' · ')}</div>
            <div class="cs-your">
              <span class="cs-k">Crew call</span>
              <span class="cs-your-t num">${esc(day.crew_call || 'TBC')}</span>
            </div>
            ${day.shoot_call ? `<div class="cs-general">Shooting call <span class="strong num">${esc(day.shoot_call)}</span>${day.shoot_call_estimated ? ' (est.)' : ''}</div>` : ''}
          </div>
          <div class="cs-doc-day">
            <div class="cs-dayof">DAY ${esc(day.day_no)} OF ${esc(day.total || day.day_no)}</div>
            <div class="strong">${day.date ? esc(MPH.date(day.date, 'long')) : 'Date TBC'}</div>
            <table class="cs-times"><tbody>
              <tr><th>Crew call</th><td class="num">${esc(day.crew_call || 'TBC')}</td></tr>
              ${timeRow('Shooting call', day.shoot_call)}
              <tr><th>Est. wrap</th><td class="num">${esc(day.wrap || 'TBC')}</td></tr>
              ${timeRow(`${ui.icon('sunrise')}Sunrise`, day.sunrise, 'cs-sun')}
              ${timeRow(`${ui.icon('sunset')}Sunset`, day.sunset, 'cs-sun')}
            </tbody></table>
            ${c.weather ? `<div class="cs-weather">${ui.icon('cloud-sun')}<span>${esc(c.weather)}</span></div>` : ''}
          </div>
        </header>

        ${std && notes.length ? `<section class="cs-notes"><div class="cs-sec-t">Notes</div><ul>${notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}

        <section class="cs-sec">
          <div class="cs-sec-t">Locations · ${locations.length || 0}</div>
          ${locations.length ? `<div class="cs-scroll"><table class="cs-t"><thead><tr><th>#</th><th>Location</th>${full ? '<th>Parking</th>' : ''}<th>Nearest hospital</th></tr></thead><tbody>
            ${locations.map((l, i) => `<tr>
              <td class="num strong">${i + 1}</td>
              <td><div class="strong">${esc(l.name)}</div>${(l.scenes || []).length ? `<div class="cs-muted">Sc. ${esc(l.scenes.join(', '))}</div>` : ''}<a class="cs-link" href="${esc(mapsUrl(l.name))}" target="_blank" rel="noopener">${ui.icon('map-pin')}Open in Maps</a></td>
              ${full ? `<td class="cs-pre">${l.parking ? esc(l.parking) : '<span class="cs-muted">—</span>'}</td>` : ''}
              <td>${l.hospital ? `<div class="strong">${esc(l.hospital)}</div><a class="cs-link" href="${esc(mapsUrl(l.hospital))}" target="_blank" rel="noopener">${ui.icon('navigation')}Directions</a>` : `<span class="cs-muted">TBC</span> <a class="cs-link" href="${esc(hospitalSearch(l.name))}" target="_blank" rel="noopener">${ui.icon('search')}Find nearest</a>`}</td>
            </tr>`).join('')}
          </tbody></table></div>` : '<div class="cs-empty">No location set for this day yet.</div>'}
        </section>

        <section class="cs-sec">
          <div class="cs-sec-t">Shooting schedule</div>
          ${schedule.length ? `<div class="cs-scroll"><table class="cs-t cs-sched"><thead><tr>${hasTimes ? '<th>Time</th>' : ''}<th>Sc.</th><th>Set & description</th><th>D/N</th>${std ? '<th>Pages</th>' : ''}<th>Cast</th></tr></thead><tbody>
            ${schedule.map((s) => `${s.prep_before && hasTimes ? `<tr class="cs-prep"><td class="num">${esc(s.prep_before.time)}–${esc(s.prep_before.end)}</td><td></td><td colspan="${std ? 4 : 3}">${ui.icon(s.prep_before.label.startsWith('Company') ? 'truck' : 'timer')}${esc(s.prep_before.label)} · ${esc(s.prep_before.minutes)} min</td></tr>` : ''}<tr>
              ${hasTimes ? `<td class="num strong nowrap">${esc(s.time)}${s.end ? `<span class="cs-muted">–${esc(s.end)}</span>` : ''}</td>` : ''}
              <td class="strong">${esc(s.num)}</td>
              <td><div class="strong">${esc(s.heading || s.location || '')}</div>${full && s.synopsis ? `<div class="cs-muted">${esc(s.synopsis)}</div>` : ''}</td>
              <td>${esc(s.day_night || '')}</td>
              ${std ? `<td class="num">${esc(MPH.eighths(s.pages_eighths))}</td>` : ''}
              <td>${esc((s.cast || []).join(', ') || '—')}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="cs-muted cs-sum">${schedule.length} scene${schedule.length === 1 ? '' : 's'} · ${esc(MPH.eighths(c.pages_eighths))} pages${hasTimes ? ` · ${esc(day.prep || 15)} min prep between scenes, ${esc(day.move || 30)} min for a company move · times are estimates from scene lengths` : ''}</div>`
          : '<div class="cs-empty">No scenes scheduled for this day yet.</div>'}
        </section>

        ${std && (c.cast || []).length ? `<section class="cs-sec">
          <div class="cs-sec-t">Cast</div>
          <div class="cs-scroll"><table class="cs-t"><thead><tr><th>#</th><th>Character</th><th>Talent</th><th>Scenes</th><th>Call</th></tr></thead><tbody>
            ${c.cast.map((r) => `<tr class="${meta.me && r.person_id === meta.me ? 'cs-me' : ''}"><td class="num strong">${esc(r.no)}</td><td class="strong">${esc(r.character)}</td><td>${r.talent ? esc(r.talent) : '<span class="cs-muted">TBC</span>'}</td><td class="num">${esc((r.scenes || []).join(', ') || '—')}</td><td class="num strong">${esc(r.call || '')}</td></tr>`).join('')}
          </tbody></table></div>
        </section>` : ''}

        ${breakdown ? `<section class="cs-sec">
          <div class="cs-sec-t">Breakdown · props, wardrobe and production</div>
          <div class="cs-scroll"><table class="cs-t"><thead><tr><th>Sc.</th><th>Cast</th><th>Props</th><th>Wardrobe & makeup</th><th>Production</th></tr></thead><tbody>
            ${schedule.map((s) => `<tr><td class="strong">${esc(s.num)}</td><td>${list(s.cast)}</td><td>${list(s.props)}</td><td>${list(s.wardrobe)}</td><td>${list(s.production)}</td></tr>`).join('')}
          </tbody></table></div>
        </section>` : ''}

        <section class="cs-sec cs-safety-sec">
          <div class="cs-sec-t">Safety and contacts</div>
          <div class="cs-safety">
            <div class="cs-sos">${emergency.map((e) => `<div class="cs-sos-n"><span class="num">${esc(e.num)}</span><span>${esc(e.label)}</span></div>`).join('')}</div>
            ${std ? `<div class="cs-keyc">${contacts.length ? contacts.map((k) => `<div><span class="cs-k">${esc(k.role || 'Contact')}</span> ${esc(k.name)}${k.phone ? ` · <span class="num strong">${esc(k.phone)}</span>` : ''}</div>`).join('') : '<div class="cs-muted">No key contacts listed</div>'}</div>` : ''}
          </div>
        </section>

        <footer class="cs-doc-foot">
          ${meta.klaket ? `<span class="cs-kl-brand"><img src="${esc(meta.klaket)}" alt="Klaket" width="54" height="34"></span>` : ''}
          <span>v${esc(meta.version)} · ${esc(TEMPLATES.find((x) => x.id === tpl).label.toLowerCase())} sheet${draft ? ' · draft, not shared' : meta.published_at ? ` · published ${esc(MPH.date(meta.published_at, 'long'))} ${esc(MPH.date(meta.published_at, 'time'))}` : ''}</span>
          <span>Confirm your attendance from the link you received</span>
        </footer>
      </article>`;
  }

  /* ------------------------------------------------------------ tracking */
  function trackingOf(sheet, responses) {
    const rs = responses.filter((r) => r.call_sheet_id === sheet.id).sort((a, b) => String(a.responded_at).localeCompare(String(b.responded_at)));
    const people = (sheet.content && sheet.content.people) || [];
    const by = {};
    people.forEach((p) => { by[p.id] = { person: p, status: 'none', at: null }; });
    const others = {};
    let anonViews = 0;
    rs.forEach((r) => {
      let key = r.person_id && by[r.person_id] ? r.person_id : null;
      if (!key && r.name) { const m = people.find((p) => norm(p.name) === norm(r.name)); if (m) key = m.id; }
      if (!key) {
        if (!r.name) { if (r.status === 'viewed') anonViews += 1; return; }
        const k = norm(r.name);
        const e = (others[k] = others[k] || { name: r.name, status: 'none', at: null });
        if (r.status === 'viewed') { if (e.status === 'none') { e.status = 'viewed'; e.at = r.responded_at; } } else { e.status = r.status; e.at = r.responded_at; }
        return;
      }
      const e = by[key];
      if (r.status === 'viewed') { if (e.status === 'none') { e.status = 'viewed'; e.at = r.responded_at; } } else { e.status = r.status; e.at = r.responded_at; }
    });
    const list = Object.values(by);
    const count = (st) => list.filter((e) => e.status === st).length;
    return { rs, list, others: Object.values(others), anonViews, total: list.length, confirmed: count('confirmed'), declined: count('declined'), viewed: count('viewed'), none: count('none') };
  }

  const respPill = (st) => {
    const { ui } = MPH;
    return {
      confirmed: ui.pill('Confirmed', 'ok', 'check'),
      declined: ui.pill('Can’t make it', 'danger', 'x'),
      viewed: ui.pill('Viewed', 'info', 'eye'),
      none: ui.pill('No response'),
    }[st] || ui.pill(st);
  };
  const when = (iso) => (iso ? `${MPH.date(iso)} ${MPH.date(iso, 'time')}` : '');

  /* ------------------------------------------------------------ list */
  function renderList(ctx, d) {
    const { ui, production: p } = ctx;
    const head = ui.pageHead({
      eyebrow: 'Shoot', title: 'Call Sheets',
      sub: 'One sheet per shoot day, built from the stripboard and Crew & Talent. Crew open it by link, no account needed, and confirm in one tap.',
    });
    if (!d.days.length) {
      return `<div class="page">${head}
        <div class="panel">${ui.empty('clipboard-list', 'No shoot days yet', 'Add shoot days on the stripboard and schedule scenes into them. Each day then gets its own call sheet here.',
          `<a class="btn btn-primary btn-sm" href="#p.${p.id}.stripboard">${ui.icon('rows-3')}Open stripboard</a>`)}</div></div>`;
    }
    const noPeople = !d.people.length;
    return `
      <div class="page">
        ${head}
        ${noPeople ? `<div class="callout market">${ui.icon('users')}<div class="grow small"><span class="strong">No crew or talent yet.</span> <span class="muted">Add people in Crew & Talent so each call sheet lists everyone with their call time.</span></div><a class="btn btn-sm btn-outline" href="#p.${p.id}.crew">Open Crew & Talent</a></div>` : ''}
        <section class="panel flush">
          <header class="panel-head">${ui.icon('calendar-days')}<h3 class="h3">Shoot days · ${d.days.length}</h3></header>
          <div class="list">${d.days.map((day) => {
            const sheets = d.sheets.filter((s) => s.shoot_day_id === day.id).sort((a, b) => b.version - a.version);
            const pub = sheets.find((s) => s.status === 'published');
            const draft = sheets.find((s) => s.status === 'draft');
            const sc = d.scenes.filter((s) => s.shoot_day_id === day.id).length;
            const tr = pub ? trackingOf(pub, d.responses) : null;
            return `
              <div class="list-row cs-dayrow">
                <span class="cs-day-num"><span class="tiny">Day</span><span class="strong">${esc(day.day_no)}</span></span>
                <div class="grow stack" style="gap:3px">
                  <span class="row wrap" style="gap:8px"><span class="small strong">${day.date ? esc(MPH.date(day.date, 'long')) : 'Date TBC'}</span>
                    ${pub ? ui.pill(`v${pub.version} published`, 'ok', 'send') : ''}${draft ? ui.pill(`v${draft.version} draft`, '', 'file-pen-line') : ''}${!sheets.length ? '<span class="tiny faint">No call sheet yet</span>' : ''}</span>
                  <span class="tiny muted truncate">${esc(day.location || 'Location TBC')} · crew call ${esc(hhmm(day.crew_call) || 'TBC')} · ${sc} scene${sc === 1 ? '' : 's'}${pub && pub.published_at ? ` · published ${esc(when(pub.published_at))}` : ''}</span>
                  ${tr ? `<span class="row wrap cs-counts" style="gap:12px">
                    <span class="tiny" title="Confirmed"><span class="dot" style="color:var(--ok)"></span> ${tr.confirmed} confirmed</span>
                    <span class="tiny" title="Declined"><span class="dot" style="color:var(--danger)"></span> ${tr.declined} declined</span>
                    <span class="tiny" title="Viewed, no answer yet"><span class="dot" style="color:var(--info)"></span> ${tr.viewed} viewed</span>
                    <span class="tiny faint">of ${tr.total}</span></span>` : ''}
                  ${sheets.length > 1 ? `<span class="tiny faint">Versions: ${sheets.slice().reverse().map((s) => `<a class="cs-vlink" href="#p.${p.id}.callsheets.${s.id}">v${esc(s.version)}${s.status === 'draft' ? ' draft' : ''}</a>`).join(' · ')}</span>` : ''}
                </div>
                <div class="row wrap" style="gap:6px;justify-content:flex-end">
                  ${pub ? `<a class="btn btn-sm btn-outline" href="#p.${p.id}.callsheets.${pub.id}">${ui.icon('eye')}Open v${esc(pub.version)}</a>` : ''}
                  ${draft ? `<a class="btn btn-sm ${pub ? '' : 'btn-primary'}" href="#p.${p.id}.callsheets.${draft.id}">${ui.icon('pencil')}${pub ? `Edit v${esc(draft.version)}` : 'Continue draft'}</a>` : ''}
                  ${!sheets.length && ctx.canEdit ? `<a class="btn btn-sm btn-primary" href="#p.${p.id}.callsheets.new.${day.id}">${ui.icon('plus')}Create call sheet</a>` : ''}
                </div>
              </div>`;
          }).join('')}</div>
        </section>
      </div>`;
  }

  /* ------------------------------------------------------------ sheet page */
  function sheetHead(ctx, d, sheet, day) {
    const { ui, production: p } = ctx;
    const versions = d.sheets.filter((s) => s.shoot_day_id === sheet.shoot_day_id).sort((a, b) => a.version - b.version);
    const dayLinks = d.days.map((x) => {
      const ss = d.sheets.filter((s) => s.shoot_day_id === x.id).sort((a, b) => b.version - a.version);
      const target = ss.find((s) => s.status === 'draft') || ss[0];
      const href = target ? `#p.${p.id}.callsheets.${target.id}` : (ctx.canEdit ? `#p.${p.id}.callsheets.new.${x.id}` : null);
      const on = x.id === sheet.shoot_day_id;
      return href ? `<a class="${on ? 'on' : ''}" href="${href}" aria-current="${on ? 'page' : 'false'}">Day ${esc(x.day_no)}${ss.length ? '' : ' <span class="faint">+</span>'}</a>` : `<span class="cs-daylink-off">Day ${esc(x.day_no)}</span>`;
    }).join('');
    return `
      <div class="cs-top">
        <a class="btn btn-ghost btn-sm" href="#p.${p.id}.callsheets">${ui.icon('arrow-left', 'cs-back')}All call sheets</a>
        <nav class="cs-daylinks" aria-label="Shoot days">${dayLinks}</nav>
      </div>
      ${ui.pageHead({
        eyebrow: `Call sheet · Day ${esc(day ? day.day_no : '?')}${day && day.date ? ' · ' + esc(MPH.date(day.date, 'long')) : ''}`,
        title: `Day ${esc(day ? day.day_no : '?')} call sheet <span class="cs-vtag">v${esc(sheet.version)}</span> ${sheet.status === 'published' ? ui.pill('Published', 'ok', 'send') : ui.pill('Draft', '', 'file-pen-line')}`,
        sub: sheet.status === 'published'
          ? `Published ${esc(when(sheet.published_at))}. This version is a fixed snapshot; start a new version to change it.`
          : 'Working draft. The preview updates as you edit and reflects the stripboard and crew list right now. Nothing is shared until you publish.',
        actions: versions.length > 1 ? `<div class="seg" role="group" aria-label="Versions">${versions.map((v) => `<a class="cs-seg-a ${v.id === sheet.id ? 'on' : ''}" href="#p.${p.id}.callsheets.${v.id}">v${esc(v.version)}${v.status === 'draft' ? ' draft' : ''}</a>`).join('')}</div>` : '',
      })}`;
  }

  /* one block per location of the day: its nearest hospital and its parking */
  function locsForm(d, day, edits, scenes) {
    const { ui } = MPH;
    const locs = locationsOf(d, day, edits, scenes);
    if (!locs.length) return '<p class="small muted">No location yet. Set the day’s location above, or add locations to the scenes in the breakdown.</p>';
    return locs.map((l, i) => `
      <div class="cs-locf">
        <div class="row" style="gap:8px;align-items:baseline"><span class="cs-locf-n num">${i + 1}</span><span class="small strong grow">${esc(l.name)}</span>${l.scenes.length ? `<span class="tiny muted">Sc. ${esc(l.scenes.join(', '))}</span>` : ''}</div>
        <div class="field"><label class="tiny" for="cs-h-${i}">Nearest hospital</label>
          <div class="row" style="gap:6px"><input id="cs-h-${i}" class="input grow" data-loc="${esc(norm(l.name))}" data-lf="hospital" value="${esc(l.hospital)}" placeholder="Hospital name and district">
          <a class="btn btn-sm btn-ghost" href="${esc(hospitalSearch(l.name))}" target="_blank" rel="noopener" title="Search hospitals near ${esc(l.name)} in Google Maps">${ui.icon('search')}Find</a></div></div>
        <div class="field"><label class="tiny" for="cs-p-${i}">Parking</label><input id="cs-p-${i}" class="input" data-loc="${esc(norm(l.name))}" data-lf="parking" value="${esc(l.parking)}" placeholder="e.g. Crew parking in the north lot"></div>
      </div>`).join('');
  }

  function builderForm(ctx, d, sheet, day, edits) {
    const { ui, production: p } = ctx;
    const roster = edits.roster || {};
    const scenes = d.scenes.filter((s) => s.shoot_day_id === day.id).sort((a, b) => (a.day_sort - b.day_sort) || (a.sort - b.sort));
    const contacts = Array.isArray(edits.contacts) ? edits.contacts : suggestedContacts(d.people);
    const depts = uniq(d.people.map(deptOf)).sort(byDept);
    const onCount = d.people.filter((x) => onSheet(x, roster)).length;
    const castBy = {};
    d.cast.forEach((e) => { (castBy[e.scene_id] = castBy[e.scene_id] || []).push(e.name); });
    return `
      <fieldset class="cs-build stack" ${ctx.canEdit ? '' : 'disabled'}>
        ${ctx.canEdit ? '' : `<div class="callout info">${ui.icon('lock')}<span class="small">Read only. Owners, producers and heads of department can edit call sheets.</span></div>`}
        ${ui.panel({ title: 'Shoot day', icon: 'calendar-days', actions: `<a class="btn btn-ghost btn-xs" href="#p.${p.id}.stripboard">${ui.icon('rows-3')}Change in Stripboard</a>`, body: `
          <dl class="kv">
            <dt>Date</dt><dd>${day.date ? esc(MPH.date(day.date, 'long')) : '<span class="cs-warn">Not set</span>'}</dd>
            <dt>Location</dt><dd>${esc(day.location || '—')}</dd>
            <dt>Crew call</dt><dd class="num">${hhmm(day.crew_call) ? esc(hhmm(day.crew_call)) : '<span class="cs-warn">Not set</span>'}</dd>
            <dt>Wrap</dt><dd class="num">${esc(hhmm(day.wrap) || '—')}</dd>
          </dl>` })}

        ${ui.panel({ title: 'Template', icon: 'layout-template', body: `
          <div class="stack tight">
            <div class="seg cs-tpl-seg" role="group" aria-label="Call sheet template">${TEMPLATES.map((x) => `<button type="button" class="${templateOf(edits) === x.id ? 'on' : ''}" data-tpl="${x.id}" aria-pressed="${templateOf(edits) === x.id}">${esc(x.label)}</button>`).join('')}</div>
            <span class="tiny muted" data-tpl-hint>${esc(TEMPLATES.find((x) => x.id === templateOf(edits)).hint)}.</span>
          </div>` })}

        ${ui.panel({ title: 'Timing and weather', icon: 'clock', body: `
          <div class="stack">
            <div class="grid-2">
              <div class="field"><label for="cs-e-shoot">Shooting call (first shot)</label><input id="cs-e-shoot" class="input" type="time" data-e="shoot_call" value="${esc(edits.shoot_call || '')}">
                <span class="tiny faint">Empty: an hour after crew call.</span></div>
              <div class="field"><label for="cs-e-prep">Prep between scenes</label><select id="cs-e-prep" class="select" data-e="prep">${PREPS.map((m) => `<option value="${m}" ${prepOf(edits) === m ? 'selected' : ''}>${m} min</option>`).join('')}</select>
                <span class="tiny faint">A company move to a new location takes</span>
                <select class="select" data-e="move" aria-label="Company move time">${[20, 30, 45, 60, 90].map((m) => `<option value="${m}" ${moveOf(edits) === m ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
            </div>
            <div class="grid-2">
              <div class="field"><label for="cs-e-rise">Sunrise</label><input id="cs-e-rise" class="input" type="time" data-e="sunrise" value="${esc(edits.sunrise || '')}"></div>
              <div class="field"><label for="cs-e-set">Sunset</label><input id="cs-e-set" class="input" type="time" data-e="sunset" value="${esc(edits.sunset || '')}"></div>
            </div>
            <div class="field"><label for="cs-e-weather">Weather</label><input id="cs-e-weather" class="input" data-e="weather" value="${esc(edits.weather || '')}" placeholder="e.g. Clear, 38°C high, wind 20 km/h"></div>
            <div class="row wrap" style="gap:8px;align-items:center"><button type="button" class="btn btn-sm btn-outline" data-cs="sun" ${day.date ? '' : 'disabled title="Set the shoot day’s date on the stripboard first"'}>${ui.icon('cloud-sun')}Fill sunrise, sunset and weather</button>
              <span class="tiny faint" data-sun-note>From Open-Meteo for the first location. The weather forecast reaches 16 days ahead.</span></div>
          </div>` })}

        ${ui.panel({ title: 'Locations and hospitals', icon: 'map-pin', body: `
          <div class="stack">
            <div class="field"><label for="cs-e-loc">Set location</label><input id="cs-e-loc" class="input" data-e="set_location" data-relocs value="${esc(edits.set_location || '')}" placeholder="${esc(day.location || 'Address or place name')}">
              <span class="tiny faint">The day’s main location. Scene locations from the breakdown are added after it.</span></div>
            <div class="stack" data-locs>${locsForm(d, day, edits, scenes)}</div>
          </div>` })}

        ${ui.panel({ title: 'Notes', icon: 'notebook-pen', body: `
          <div class="field"><label for="cs-e-notes">General notes</label><textarea id="cs-e-notes" class="textarea" rows="4" data-e="notes" placeholder="One note per line, e.g. Shoes off in the majlis.">${esc(edits.notes || '')}</textarea>
            <span class="tiny faint">Each line becomes a bullet on the standard and expanded sheets.${day.notes ? ' Day notes from the stripboard are added below them.' : ''}</span></div>` })}

        ${ui.panel({ title: `Scenes · ${scenes.length}`, icon: 'clapperboard', flush: true, body: scenes.length ? `<div class="list">${scenes.map((s) => `
            <div class="list-row cs-scene"><span class="mono small strong">${esc(s.num)}</span>
              <div class="grow stack" style="gap:1px"><span class="small truncate">${esc(s.heading || s.location || 'Untitled scene')}</span>
                <span class="tiny muted">${esc([s.day_night, MPH.eighths(s.pages_eighths) + ' pg', (castBy[s.id] || []).join(', ')].filter(Boolean).join(' · '))}</span></div></div>`).join('')}</div>`
          : `<div class="panel-body"><p class="small muted">No scenes scheduled for this day. <a class="accent" href="#p.${p.id}.stripboard">Schedule scenes on the stripboard</a>; they appear here in shooting order.</p></div>` })}

        ${ui.panel({ title: `People & call times · ${onCount} of ${d.people.length}`, icon: 'users', flush: true, body: d.people.length ? `
          <div class="cs-roster">${depts.map((dn) => `
            <div class="cs-roster-dept">${esc(dn)}</div>
            ${d.people.filter((x) => deptOf(x) === dn).map((x) => {
              const on = onSheet(x, roster);
              const call = callOf(x, roster, day);
              const changed = roster[x.id] && roster[x.id].call && roster[x.id].call !== defaultCall(x, day);
              return `<div class="cs-roster-row ${on ? '' : 'off'}">
                <label class="check grow" style="min-width:0"><input type="checkbox" data-on="${x.id}" ${on ? 'checked' : ''}>
                  <span class="stack" style="gap:0;min-width:0"><span class="small strong truncate">${esc(x.name)}</span><span class="tiny muted truncate">${esc(x.role || x.kind)}</span></span></label>
                <input class="cell-input num cs-call ${changed ? 'changed' : ''}" type="time" data-call="${x.id}" value="${esc(call)}" aria-label="Call time for ${esc(x.name)}" ${on ? '' : 'disabled'}>
              </div>`;
            }).join('')}`).join('')}
          </div>
          <p class="tiny faint cs-roster-foot">Call times default to each person’s default call from Crew & Talent, else the crew call. Changes apply to this sheet only.</p>`
          : `<div class="panel-body"><p class="small muted">No people yet. <a class="accent" href="#p.${p.id}.crew">Add crew and talent</a> to list them with call times.</p></div>` })}

        ${ui.panel({ title: 'Key contacts', icon: 'phone', flush: true, body: d.people.length ? `<div class="cs-contacts">${d.people.map((x) => `
            <label class="check cs-contact"><input type="checkbox" data-contact="${x.id}" ${contacts.includes(x.id) ? 'checked' : ''}>
              <span class="grow small truncate">${esc(x.name)} <span class="muted">· ${esc(x.role || x.kind)}</span></span>
              <span class="tiny num ${x.phone ? 'muted' : 'faint'}">${esc(x.phone || 'no phone')}</span></label>`).join('')}</div>
            <p class="tiny faint cs-roster-foot">Shown with phone numbers at the top of the sheet. Other people’s phone numbers are never included.</p>`
          : '<div class="panel-body"><p class="small muted">Add people in Crew & Talent first.</p></div>' })}
      </fieldset>`;
  }

  function sharePanel(ctx, sheet, snap) {
    const { ui } = ctx;
    const url = shareUrl(sheet.share_token);
    const title = snap.production?.title || ctx.production.title;
    const day = snap.day || {};
    const date = day.date ? MPH.date(day.date, 'long') : '';
    const msg = `ورقة الاستدعاء · ${title} · اليوم ${day.day_no}${date ? ' · ' + day.date : ''}\nالحضور ${day.crew_call || '—'} · أكّد حضورك من الرابط\n\nCall sheet · ${title} · Day ${day.day_no}${date ? ' · ' + date : ''}\nCrew call ${day.crew_call || 'TBC'}. Please confirm from the link.\n${url}`;
    return ui.panel({ title: 'Share with the crew', icon: 'link', body: `
      <div class="stack">
        <div class="cs-share-row"><input class="input mono small" readonly value="${esc(url)}" id="cs-url" aria-label="Call sheet link"><button class="btn btn-sm btn-outline" data-cs="copy">${ui.icon('copy')}Copy</button></div>
        <div class="row wrap">
          <a class="btn btn-sm btn-outline" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ui.wa(14)}Share on WhatsApp</a>
          <a class="btn btn-sm btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">${ui.icon('external-link')}Open crew page</a>
        </div>
        <p class="tiny muted">Anyone with this link sees the sheet without an account: names, roles, call times and key contact phones. No rates, costs or emails. When you publish a new version, this same link opens the new one.</p>
      </div>` });
  }

  function trackingTab(ctx, d, sheet) {
    const { ui } = ctx;
    const snap = sheet.content || {};
    const tr = trackingOf(sheet, d.responses);
    const url = shareUrl(sheet.share_token);
    const title = snap.production?.title || ctx.production.title;
    const day = snap.day || {};
    const pPhone = (id) => (d.people.find((x) => x.id === id) || {}).phone || '';
    const personMsg = (x) => `${x.name}، موعد حضورك ${x.call || day.crew_call || ''} · ${title} · اليوم ${day.day_no}\n${x.name}, your call time is ${x.call || day.crew_call || 'TBC'} · ${title} · Day ${day.day_no}${day.date ? ', ' + MPH.date(day.date, 'long') : ''}.\nPlease confirm: ${url}`;
    const pct = (k) => (tr.total ? (k / tr.total) : 0);
    // confirmations are per version: show what the previous version collected so nobody is forgotten
    const prevSheet = d.sheets.filter((s) => s.shoot_day_id === sheet.shoot_day_id && s.status === 'published' && s.version < sheet.version).sort((a, b) => b.version - a.version)[0];
    const prevTr = prevSheet ? trackingOf(prevSheet, d.responses) : null;
    const prevBy = {};
    if (prevTr) prevTr.list.forEach((e) => { prevBy[e.person.id] = e.status; });
    return `
      <div class="stack">
        ${sharePanel(ctx, sheet, snap)}
        ${prevTr && prevTr.rs.length ? `<div class="callout info">${ui.icon('history')}<span class="small">v${esc(prevSheet.version)} had ${prevTr.confirmed} confirmed and ${prevTr.declined} can’t make it. People confirm each version separately, so send v${esc(sheet.version)} to anyone it affects.</span></div>` : ''}
        <div class="cs-track-sum">
          <div class="stack tight grow">
            <span class="row wrap" style="gap:10px"><span class="h2 num">${tr.confirmed}/${tr.total}</span><span class="muted small">confirmed for Day ${esc(day.day_no)} · v${esc(sheet.version)}</span></span>
            <div class="cs-stack-bar" role="img" aria-label="${tr.confirmed} confirmed, ${tr.declined} declined, ${tr.viewed} viewed, ${tr.none} no response">
              <span class="ok" style="flex:${pct(tr.confirmed)}"></span><span class="danger" style="flex:${pct(tr.declined)}"></span><span class="info" style="flex:${pct(tr.viewed)}"></span><span class="none" style="flex:${pct(tr.none)}"></span>
            </div>
            <span class="row wrap tiny muted" style="gap:14px">
              <span><span class="dot" style="color:var(--ok)"></span> ${tr.confirmed} confirmed</span>
              <span><span class="dot" style="color:var(--danger)"></span> ${tr.declined} can’t make it</span>
              <span><span class="dot" style="color:var(--info)"></span> ${tr.viewed} viewed</span>
              <span><span class="dot" style="color:var(--faint)"></span> ${tr.none} no response</span>
              ${tr.anonViews ? `<span>${tr.anonViews} anonymous open${tr.anonViews === 1 ? '' : 's'}</span>` : ''}
            </span>
          </div>
          <button class="btn btn-sm btn-ghost" data-cs="refresh">${ui.icon('refresh-cw')}Refresh</button>
        </div>

        ${ui.panel({ title: 'Checklist', icon: 'list-checks', flush: true, body: tr.list.length ? `<div class="table-wrap"><table class="table cs-check">
          <thead><tr><th>Person</th><th>Call</th><th>Status</th><th>When</th><th class="r">Send</th></tr></thead>
          <tbody>${tr.list.sort((a, b) => ({ declined: 0, none: 1, viewed: 2, confirmed: 3 }[a.status] - { declined: 0, none: 1, viewed: 2, confirmed: 3 }[b.status]) || a.person.name.localeCompare(b.person.name)).map((e) => {
            const ph = pPhone(e.person.id);
            return `<tr class="${e.status === 'declined' ? 'cs-attn-d' : e.status === 'none' ? 'cs-attn' : ''}">
              <td><div class="row" style="gap:10px">${ui.av(e.person.name, 'sm')}<div class="stack" style="gap:0;min-width:0"><span class="small strong truncate">${esc(e.person.name)}</span><span class="tiny muted truncate">${esc(e.person.role || '')}${e.person.dept ? ' · ' + esc(e.person.dept) : ''}</span></div></div></td>
              <td class="num small">${esc(e.person.call || '')}</td>
              <td><div class="stack" style="gap:2px;align-items:flex-start">${respPill(e.status)}${e.status === 'none' && prevBy[e.person.id] && prevBy[e.person.id] !== 'none' ? `<span class="tiny faint">${esc({ confirmed: 'Confirmed', declined: 'Declined', viewed: 'Viewed' }[prevBy[e.person.id]])} v${esc(prevSheet.version)}</span>` : ''}</div></td>
              <td class="small muted nowrap">${esc(when(e.at))}</td>
              <td class="r">${ph ? `<a class="btn btn-xs btn-outline" href="${esc(ui.waLink(ph, personMsg(e.person)))}" target="_blank" rel="noopener" title="WhatsApp ${esc(e.person.name)} their call time and the link">${ui.wa(12)}${e.status === 'none' ? 'Send' : 'Message'}</a>` : '<span class="tiny faint">No phone</span>'}</td>
            </tr>`;
          }).join('')}</tbody></table></div>` : `<div class="panel-body"><p class="small muted">No people were on this version of the sheet.</p></div>` })}

        ${tr.others.length ? ui.panel({ title: 'Also responded', icon: 'user-round-plus', flush: true, body: `<div class="list">${tr.others.map((o) => `
          <div class="list-row">${ui.av(o.name, 'sm')}<span class="grow small">${esc(o.name)} <span class="tiny faint">typed their own name</span></span>${respPill(o.status)}<span class="tiny muted nowrap">${esc(when(o.at))}</span></div>`).join('')}</div>` }) : ''}

        ${ui.panel({ title: `All responses · ${tr.rs.length}`, icon: 'activity', flush: true, body: tr.rs.length ? `<div class="table-wrap cs-resp-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Response</th><th>Time</th></tr></thead>
          <tbody>${tr.rs.slice().reverse().map((r) => `<tr><td class="small">${r.name ? esc(r.name) : '<span class="faint">Anonymous</span>'}</td><td>${respPill(r.status)}</td><td class="small muted nowrap">${esc(when(r.responded_at))}</td></tr>`).join('')}</tbody>
          </table></div>` : `<div class="panel-body"><p class="small muted">No responses yet. Share the link; opens and answers appear here.</p></div>` })}
      </div>`;
  }

  function renderSheet(ctx, d) {
    const { ui, production: p } = ctx;
    const sheet = d.sheet;
    const day = d.days.find((x) => x.id === sheet.shoot_day_id);
    if (!day) {
      return `<div class="page">${ui.empty('calendar-x', 'This shoot day was removed', 'The call sheet’s shoot day no longer exists on the stripboard.', `<a class="btn btn-outline btn-sm" href="#p.${p.id}.callsheets">All call sheets</a>`)}</div>`;
    }
    const versions = d.sheets.filter((s) => s.shoot_day_id === sheet.shoot_day_id);
    const maxV = versions.reduce((m, s) => Math.max(m, s.version), 0);
    const openDraft = versions.find((s) => s.status === 'draft');
    const latestPub = versions.filter((s) => s.status === 'published').sort((a, b) => b.version - a.version)[0];

    if (sheet.status !== 'published') {
      const edits = d.edits;
      const snap = buildSnapshot(ctx, d, day, edits);
      return `
        <div class="page full cs-page">
          ${sheetHead(ctx, d, sheet, day)}
          <div class="cs-bar">
            <span class="tiny muted" id="cs-save" aria-live="polite">${ctx.canEdit ? 'Changes save automatically' : ''}</span>
            <span class="spacer"></span>
            <button class="btn btn-sm btn-outline" data-cs="pdf" title="A PDF of this draft, marked DRAFT. Nothing is shared.">${ui.icon('file-down')}Export PDF</button>
            ${ctx.canEdit ? `<button class="btn btn-sm btn-ghost" data-cs="del-draft">${ui.icon('trash-2')}Delete draft</button>
              <button class="btn btn-sm btn-primary" data-cs="publish">${ui.icon('send')}Publish v${esc(sheet.version)}</button>` : ''}
          </div>
          <div class="cs-builder">
            <div class="cs-build-col">${builderForm(ctx, d, sheet, day, edits)}</div>
            <div class="cs-prev-col"><div class="cs-paper-wrap" id="cs-preview">${sheetDoc(snap, { status: 'draft', version: sheet.version })}</div></div>
          </div>
        </div>`;
    }

    const tab = S.tab[sheet.id] || 'preview';
    const tr = trackingOf(sheet, d.responses);
    const isLatest = !!latestPub && latestPub.id === sheet.id;
    const just = S.justPublished === sheet.id;
    return `
      <div class="page full cs-page">
        ${sheetHead(ctx, d, sheet, day)}
        ${just ? `<div class="callout">${ui.icon('circle-check')}<div class="grow small"><span class="strong">v${esc(sheet.version)} is live.</span> <span class="muted">Share the link below on WhatsApp, or message each person their own call time from the checklist.</span></div></div>` : ''}
        <div class="cs-bar">
          <div class="tabs" role="tablist">
            <button role="tab" aria-selected="${tab === 'preview'}" class="${tab === 'preview' ? 'on' : ''}" data-cs="tab" data-t="preview">${ui.icon('file-text')}Preview</button>
            <button role="tab" aria-selected="${tab === 'tracking'}" class="${tab === 'tracking' ? 'on' : ''}" data-cs="tab" data-t="tracking">${ui.icon('users')}Share & tracking <span class="count">${tr.confirmed}/${tr.total}</span></button>
          </div>
          <div class="toolbar">
            <button class="btn btn-sm btn-outline" data-cs="pdf">${ui.icon('file-down')}Export PDF</button>
            <button class="btn btn-sm btn-outline" data-cs="copy">${ui.icon('copy')}Copy link</button>
            ${ctx.canEdit && isLatest ? (openDraft && openDraft.version > sheet.version
              ? `<a class="btn btn-sm btn-primary" href="#p.${p.id}.callsheets.${openDraft.id}">${ui.icon('pencil')}Open draft v${esc(openDraft.version)}</a>`
              : `<button class="btn btn-sm btn-primary" data-cs="new-version">${ui.icon('file-plus-2')}Start v${esc(maxV + 1)}</button>`) : ''}
          </div>
        </div>
        ${!isLatest ? `<div class="callout info">${ui.icon('history')}<span class="small">This is an older version kept for the record. Its responses stay here; the crew link now opens the latest version.</span></div>` : ''}
        ${tab === 'preview'
          ? `<div class="cs-paper-wrap">${sheetDoc(sheet.content || {}, { status: 'published', version: sheet.version, published_at: sheet.published_at })}</div>`
          : trackingTab(ctx, d, sheet)}
      </div>`;
  }

  /* ------------------------------------------------------------ view */
  MPH.callSheetPdf = { exportPdf, sheetDoc };
  MPH.view('callsheets', {
    async load(ctx) {
      const pid = ctx.production.id;
      const { must } = ctx.api;
      const sb = ctx.sb;
      // one round trip for everything the list and the editor need (responses ride along with their call sheets)
      const [days, sheets, scenes, cast, people] = await Promise.all([
        sb.from('shoot_days').select('id, day_no, date, location, crew_call, wrap, notes').eq('production_id', pid).order('day_no'),
        sb.from('call_sheets').select('id, shoot_day_id, version, status, share_token, content, notes, published_at, created_at, call_sheet_responses(id, call_sheet_id, person_id, name, status, responded_at)').eq('production_id', pid).order('version', { ascending: false }),
        sb.from('active_scenes').select('id, num, heading, int_ext, day_night, location, synopsis, pages_eighths, est_minutes, sort, shoot_day_id, day_sort').eq('production_id', pid),
        // cast, plus what the expanded sheet breaks down per scene (props, wardrobe and production); removed ones stay off
        sb.from('elements').select('scene_id, name, category, status').eq('production_id', pid).in('category', ['cast', ...BREAKDOWN.props, ...BREAKDOWN.wardrobe, ...BREAKDOWN.production]),
        // deliberately no day_rate: nothing about money is needed (or loaded) here
        sb.from('people').select('id, name, role, dept, kind, phone, default_call, status').eq('production_id', pid).order('name'),
      ]);
      const d = { days: must(days) || [], sheets: must(sheets) || [] };
      const responses = [];
      d.sheets.forEach((s) => { responses.push(...(s.call_sheet_responses || [])); delete s.call_sheet_responses; });
      responses.sort((a, b) => String(a.responded_at || '').localeCompare(String(b.responded_at || '')));

      // new.<shootDayId>: open the day's working draft, creating it if needed (carries edits from the latest version)
      if (ctx.params[0] === 'new') {
        const day = d.days.find((x) => x.id === ctx.params[1]);
        if (!day) return { redirect: `p.${pid}.callsheets`, msg: 'That shoot day no longer exists.' };
        const mine = d.sheets.filter((s) => s.shoot_day_id === day.id).sort((a, b) => b.version - a.version);
        const draft = mine.find((s) => s.status === 'draft');
        if (draft) return { redirect: `p.${pid}.callsheets.${draft.id}` };
        if (!ctx.canEdit) return { redirect: `p.${pid}.callsheets`, msg: 'Only owners, producers and heads of department can create call sheets.' };
        const latest = mine[0];
        const row = must(await sb.from('call_sheets').insert({
          production_id: pid, shoot_day_id: day.id, version: (latest ? latest.version : 0) + 1, status: 'draft',
          content: { edits: latest && latest.content && latest.content.edits ? clone(latest.content.edits) : {} },
        }).select('id').single());
        return { redirect: `p.${pid}.callsheets.${row.id}` };
      }

      const sheetId = ctx.params[0];
      const els = must(cast) || [];
      Object.assign(d, {
        scenes: must(scenes) || [], people: must(people) || [], responses,
        cast: els.filter((e) => e.category === 'cast'),
        elements: els.filter((e) => e.category !== 'cast' && e.status === 'accepted'),
      });
      if (sheetId) {
        d.sheet = d.sheets.find((s) => s.id === sheetId) || null;
        if (d.sheet) d.edits = clone((d.sheet.content && d.sheet.content.edits) || {});
      }
      return d;
    },

    render(ctx, d) {
      const { ui, production: p } = ctx;
      if (d.redirect) return ui.loading('Opening the call sheet…');
      if (ctx.params[0] && ctx.params[0] !== 'new') {
        if (!d.sheet) return `<div class="page">${ui.empty('file-question', 'Call sheet not found', 'It may have been deleted. Pick a shoot day to open or create its call sheet.', `<a class="btn btn-outline btn-sm" href="#p.${p.id}.callsheets">All call sheets</a>`)}</div>`;
        return renderSheet(ctx, d);
      }
      return renderList(ctx, d);
    },

    mount(root, ctx, d) {
      const { ui, sb, api } = ctx;
      const pid = ctx.production.id;
      if (d.redirect) { if (d.msg) ctx.toast(d.msg, 'info'); location.replace('#' + d.redirect); return; }
      const sheet = d.sheet;
      if (sheet && S.justPublished === sheet.id) S.justPublished = null; // the "is live" banner shows once
      const copy = async (text) => {
        try { await navigator.clipboard.writeText(text); ctx.toast('Link copied'); } catch (e) {
          const i = root.querySelector('#cs-url'); if (i) i.select(); ctx.toast('Select the link and copy it', 'info');
        }
      };

      root.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-cs]');
        if (!el || el.disabled) return;
        const a = el.dataset.cs;
        try {
          if (a === 'tab') { S.tab[sheet.id] = el.dataset.t; S.justPublished = null; return rerenderSheet(); }
          if (a === 'copy') return copy(shareUrl(sheet.share_token));
          if (a === 'refresh') return ctx.reload();
          if (a === 'publish') return openPublish();
          if (a === 'pdf') return exportSheet();
          if (a === 'sun') return await fillSun(el);
          if (a === 'del-draft') return await delDraft(el);
          if (a === 'new-version') return await newVersion(el);
        } catch (ex) { ctx.toastError(ex); }
      });

      function rerenderSheet() { root.innerHTML = renderSheet(ctx, d); MPH.icons(); }

      /* Export PDF: a draft exports what the preview shows right now (marked DRAFT); a published version its snapshot */
      function exportSheet() {
        const dday = d.days.find((x) => x.id === sheet.shoot_day_id);
        const pub = sheet.status === 'published';
        const snap = pub ? (sheet.content || {}) : buildSnapshot(ctx, d, dday, d.edits || {});
        const n = (snap.day && snap.day.day_no) || (dday && dday.day_no) || '';
        const title = `${ctx.production.title || 'Call sheet'} · Day ${n} call sheet v${sheet.version}${pub ? '' : ' (draft)'}`;
        exportPdf(snap, pub ? { status: 'published', version: sheet.version, published_at: sheet.published_at } : { status: 'draft', version: sheet.version }, title);
        ctx.toast(pub ? 'Choose “Save as PDF” in the print window' : 'Draft PDF: choose “Save as PDF” in the print window', 'file-down');
      }

      /* published sheet → start the next version as a draft (copies this version's sheet details and call times) */
      async function newVersion(el) {
        if (!ctx.canEdit) return;
        el.disabled = true;
        try {
          const versions = d.sheets.filter((s) => s.shoot_day_id === sheet.shoot_day_id);
          const existing = versions.find((s) => s.status === 'draft');
          if (existing) { location.hash = `#p.${pid}.callsheets.${existing.id}`; return; }
          const maxV = versions.reduce((m, s) => Math.max(m, s.version), 0);
          const row = api.must(await sb.from('call_sheets').insert({
            production_id: pid, shoot_day_id: sheet.shoot_day_id, version: maxV + 1, status: 'draft',
            content: { edits: clone((sheet.content && sheet.content.edits) || {}) },
          }).select('id').single());
          ctx.toast(`Draft v${maxV + 1} started from v${sheet.version}`, 'file-plus-2');
          location.hash = `#p.${pid}.callsheets.${row.id}`;
        } catch (ex) { el.disabled = false; throw ex; }
      }

      if (!sheet || sheet.status === 'published' || !ctx.canEdit) return;

      /* ---------------- draft builder: live preview + autosave */
      const day = d.days.find((x) => x.id === sheet.shoot_day_id);
      if (!day) return;
      const edits = d.edits;
      edits.roster = edits.roster || {};
      const saveEl = () => root.querySelector('#cs-save');
      let saving = null;
      let dirty = false;
      const setSave = (txt) => { const s = saveEl(); if (s) s.textContent = txt; };
      const refreshPreview = () => {
        const box = root.querySelector('#cs-preview');
        if (box) { box.innerHTML = sheetDoc(buildSnapshot(ctx, d, day, edits), { status: 'draft', version: sheet.version }); MPH.icons(); }
      };
      const save = async () => {
        if (saving) { dirty = true; return; }
        dirty = false;
        setSave('Saving…');
        const content = Object.assign({}, sheet.content || {}, { edits: clone(edits) });
        saving = sb.from('call_sheets').update({ content }).eq('id', sheet.id).eq('status', 'draft');
        try {
          api.must(await saving);
          sheet.content = content;
          setSave('All changes saved');
        } catch (ex) { setSave('Not saved'); ctx.toastError(ex); }
        saving = null;
        if (dirty) save();
      };
      const saveSoon = MPH.debounce(save, 700);
      const previewSoon = MPH.debounce(refreshPreview, 200);
      const changed = () => { setSave('Unsaved changes'); previewSoon(); saveSoon(); };

      root.addEventListener('input', (e) => {
        const t = e.target;
        if (t.dataset.loc) {
          const all = edits.loc = edits.loc || {};
          const one = all[t.dataset.loc] = all[t.dataset.loc] || {};
          one[t.dataset.lf] = t.value;
          return changed();
        }
        const f = t.dataset.e;
        if (!f) return;
        edits[f] = t.value;
        changed();
      });
      // a new set location renames the first place: redraw the per-location fields
      root.addEventListener('focusout', (e) => {
        if (!e.target.matches('[data-relocs]')) return;
        const box = root.querySelector('[data-locs]');
        const scenes = d.scenes.filter((s) => s.shoot_day_id === day.id).sort((a, b) => (a.day_sort - b.day_sort) || (a.sort - b.sort));
        if (box) { box.innerHTML = locsForm(d, day, edits, scenes); MPH.icons(); }
      });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tpl]');
        if (!b) return;
        edits.template = b.dataset.tpl;
        root.querySelectorAll('[data-tpl]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        const hint = root.querySelector('[data-tpl-hint]');
        if (hint) hint.textContent = `${TEMPLATES.find((x) => x.id === edits.template).hint}.`;
        changed();
      });

      /* sunrise, sunset and the forecast for the day's first location, from Open-Meteo (no key; only the place name
         and the date are sent). Sunrise and sunset are worked out here when the date is past the forecast's reach. */
      async function fillSun(el) {
        const snap = buildSnapshot(ctx, d, day, edits);
        const place = snap.locations[0] && snap.locations[0].name;
        const note = root.querySelector('[data-sun-note]');
        if (!place) return ctx.toast('Set the day’s location first', 'map-pin');
        el.disabled = true; const label = el.innerHTML; el.innerHTML = `${ui.spinner()}Looking up ${esc(place)}`;
        try {
          const out = await MPH.sunAndWeather(place, day.date);
          if (out.sunrise) edits.sunrise = out.sunrise;
          if (out.sunset) edits.sunset = out.sunset;
          if (out.weather) edits.weather = out.weather;
          ['sunrise', 'sunset', 'weather'].forEach((k) => { const i = root.querySelector(`[data-e="${k}"]`); if (i) i.value = edits[k] || ''; });
          if (note) note.textContent = `${out.place}${out.weather ? '' : '. No forecast yet for this date (it reaches 16 days ahead); sunrise and sunset are calculated'}.`;
          changed();
        } catch (ex) { ctx.toastError(ex); }
        el.disabled = false; el.innerHTML = label; MPH.icons();
      }
      root.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.on) {
          const id = t.dataset.on;
          const person = d.people.find((x) => x.id === id);
          const def = person && DEFAULT_KINDS.includes(person.kind);
          const r = edits.roster[id] = edits.roster[id] || {};
          if (t.checked === def) delete r.on; else r.on = t.checked;
          if (!Object.keys(r).length) delete edits.roster[id];
          const row = t.closest('.cs-roster-row');
          if (row) { row.classList.toggle('off', !t.checked); const ci = row.querySelector('[data-call]'); if (ci) ci.disabled = !t.checked; }
          const h = t.closest('.panel') && t.closest('.panel').querySelector('.panel-head .h3');
          if (h) h.textContent = `People & call times · ${d.people.filter((x) => onSheet(x, edits.roster)).length} of ${d.people.length}`;
          return changed();
        }
        if (t.dataset.call) {
          const id = t.dataset.call;
          const person = d.people.find((x) => x.id === id);
          const def = person ? defaultCall(person, day) : '';
          const r = edits.roster[id] = edits.roster[id] || {};
          if (!t.value || t.value === def) { delete r.call; if (!t.value) t.value = def; } else r.call = t.value;
          if (!Object.keys(r).length) delete edits.roster[id];
          t.classList.toggle('changed', !!r.call);
          return changed();
        }
        if (t.dataset.contact) {
          const cur = Array.isArray(edits.contacts) ? edits.contacts : suggestedContacts(d.people);
          const set = new Set(cur);
          if (t.checked) set.add(t.dataset.contact); else set.delete(t.dataset.contact);
          edits.contacts = d.people.map((x) => x.id).filter((id) => set.has(id));
          return changed();
        }
      });

      async function delDraft(el) {
        if (el.dataset.armed !== '1') {
          el.dataset.armed = '1'; el.classList.add('btn-danger'); el.innerHTML = `${ui.icon('trash-2')}Delete this draft?`; MPH.icons();
          setTimeout(() => { if (el.isConnected && el.dataset.armed === '1') { el.dataset.armed = ''; el.classList.remove('btn-danger'); el.innerHTML = `${ui.icon('trash-2')}Delete draft`; MPH.icons(); } }, 3000);
          return;
        }
        api.must(await sb.from('call_sheets').delete().eq('id', sheet.id).eq('status', 'draft'));
        ctx.toast(`Draft v${sheet.version} deleted`, 'trash-2');
        location.replace(`#p.${pid}.callsheets`);
      }

      function openPublish() {
        const snap = buildSnapshot(ctx, d, day, edits);
        const prev = d.sheets.filter((s) => s.shoot_day_id === day.id && s.status === 'published' && s.id !== sheet.id).sort((a, b) => b.version - a.version)[0];
        const warn = [];
        if (!day.date) warn.push('The shoot day has no date.');
        if (!snap.day.crew_call) warn.push('There’s no crew call time.');
        if (!snap.schedule.length) warn.push('No scenes are scheduled for this day.');
        if (!snap.people.length) warn.push('Nobody is on the sheet.');
        if (!snap.contacts.length) warn.push('No key contacts are listed.');
        if (!snap.location) warn.push('No set location.');
        const dlg = ctx.modal(ctx.frame({
          title: `Publish Day ${esc(day.day_no)} call sheet v${esc(sheet.version)}`,
          sub: `${day.date ? esc(MPH.date(day.date, 'long')) : 'Date TBC'} · ${esc(snap.location || 'Location TBC')}`,
          body: `
            <dl class="kv">
              <dt>People</dt><dd>${snap.people.length} with personal call times</dd>
              <dt>Scenes</dt><dd>${snap.schedule.length} · ${esc(MPH.eighths(snap.pages_eighths))} pages</dd>
              <dt>Crew call</dt><dd class="num">${esc(snap.day.crew_call || 'TBC')}</dd>
              <dt>Link</dt><dd>${prev ? `Same link as v${esc(prev.version)}. Anyone who has it sees v${esc(sheet.version)} from now on.` : 'A new link you can share on WhatsApp.'}</dd>
            </dl>
            ${warn.length ? `<div class="callout market">${ui.icon('triangle-alert')}<div class="stack tight"><span class="small strong">Check before you publish</span><ul class="cs-warnlist">${warn.map((w) => `<li class="small">${esc(w)}</li>`).join('')}</ul></div></div>` : ''}
            <div class="callout info">${ui.icon('lock')}<span class="small">The published sheet holds names, roles, call times and key contact phones only. No rates, costs or emails. It’s a fixed snapshot: later changes on the stripboard or crew list need a new version.</span></div>`,
          foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="cs-pub-go">${ui.icon('send')}Publish v${esc(sheet.version)}</button>`,
        }));
        const go = dlg.querySelector('#cs-pub-go');
        go.addEventListener('click', async () => {
          go.disabled = true; go.innerHTML = `${ui.spinner()} Publishing`;
          const content = buildSnapshot(ctx, d, day, edits);
          const now = new Date().toISOString();
          let moved = null;
          try {
            if (prev) {
              // carry the crew link forward: retire the old token, then give it to this version (share_token is unique)
              const retired = randHex(16);
              api.must(await sb.from('call_sheets').update({ share_token: retired }).eq('id', prev.id));
              moved = { id: prev.id, token: prev.share_token, retired };
            }
            const upd = { status: 'published', published_at: now, content };
            if (moved) upd.share_token = moved.token;
            api.must(await sb.from('call_sheets').update(upd).eq('id', sheet.id).select('id').single());
            S.tab[sheet.id] = 'tracking';
            S.justPublished = sheet.id;
            ctx.closeOverlay();
            ctx.toast(`Day ${day.day_no} v${sheet.version} published`, 'send');
            ctx.reload();
          } catch (ex) {
            if (moved) { try { await sb.from('call_sheets').update({ share_token: moved.token }).eq('id', moved.id); } catch (e2) { /* best effort */ } }
            go.disabled = false; go.innerHTML = `${ui.icon('send')}Publish v${esc(sheet.version)}`; MPH.icons();
            ctx.toastError(ex);
          }
        });
      }
    },
  });

})();
