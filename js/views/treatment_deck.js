/* MPH.trDeck: the treatment deck the Treatment Agent writes (treatments.deck), drawn in the house layout the production
   companies send clients: cover, about the project, deliverables, the scenes, a page per scene (title, description,
   voice-over) and per shot (a line over a 16:9 frame), look & mood, colours, thank you. Arabic first, English on a
   toggle. One renderer for the page, Present (MPH.trShow) and the PDF export (a print window, one slide per page).
   Slides scale with their width (container units), so the same markup works at any size. */
(function () {
  const esc = MPH.esc;
  const L = {
    ar: { eyebrow: 'المعالجة الإخراجية', about: 'عن المشروع', deliverables: 'مخرجات الفيديو', scenes: 'المشاهد', scene: 'مشهد', vo: 'التعليق الصوتي:', look: 'الطابع البصري والجو العام', palette: 'مرجع الألوان', by: 'معالجة', thanks: 'شكراً!', sec: 'ث' },
    en: { eyebrow: 'Director’s treatment', about: 'About the project', deliverables: 'Video deliverables', scenes: 'The scenes', scene: 'Scene', vo: 'Voice-over:', look: 'Look & mood', palette: 'Colour reference', by: 'Treatment by', thanks: 'Thank you!', sec: 's' },
  };
  const safeHex = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : '#808080');
  const pick = (o, k, lang) => (o ? o[`${k}_${lang}`] || o[`${k}_${lang === 'ar' ? 'en' : 'ar'}`] || '' : '');
  // the agent sometimes writes the "Scene 1 -" prefix into the title too; the page adds its own
  const sceneTitle = (s, lang) => pick(s, 'title', lang).replace(/^\s*(مشهد|scene)\s*[\d٠-٩]+\s*[-–—:·]\s*/i, '');
  const num = (n, lang) => (lang === 'ar' ? String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));

  /* one frame: the picture, or its state (painting, failed, waiting) */
  function frame(key, o) {
    const url = o.urls[key];
    const f = o.frames ? o.frames[key] : null;
    const tools = o.editable && f ? `<span class="dk-tools">
        <button type="button" class="dk-tool" data-dk="repaint" data-dk-key="${esc(key)}" title="Paint this frame again">${MPH.ui.icon('wand-sparkles')}</button>
        <label class="dk-tool" title="Use your own picture">${MPH.ui.icon('upload')}<input type="file" accept="image/*" data-dk-upload="${esc(key)}" hidden></label></span>` : '';
    if (url) return `<div class="dk-frame"><img src="${esc(url)}" alt="" loading="${o.eager ? 'eager' : 'lazy'}" draggable="false">${tools}</div>`;
    const st = f ? f.status : 'pending';
    const msg = st === 'failed' ? `${MPH.ui.icon('image-off')}<span>${esc((f && f.error) || 'This frame failed.')}</span>` : st === 'running' ? `<span class="dk-spin"></span><span>${o.lang === 'ar' ? 'جارٍ رسم اللقطة…' : 'Painting…'}</span>` : `${MPH.ui.icon('image')}<span>${o.lang === 'ar' ? 'بانتظار الرسم' : 'Waiting to be painted'}</span>`;
    return `<div class="dk-frame is-empty k-${esc(st)}"><span class="dk-ph">${msg}</span>${tools}</div>`;
  }
  const slide = (cls, inner, o) => `<section class="dk-slide ${cls}" dir="${o.lang === 'ar' ? 'rtl' : 'ltr'}" lang="${o.lang}"><div class="dk-in">${inner}</div><span class="dk-n">${num(o.n++, o.lang)}</span></section>`;

  /* the deck → slide HTML strings. o: { lang, urls: key → signed url, frames: key → { status, error }, editable,
     eager (load every picture now: the print window prints only once they're all in) } */
  function slides(deck, opts) {
    const o = { lang: 'ar', urls: {}, frames: null, editable: false, ...opts, n: 1 };
    const t = L[o.lang];
    const by = o.lang === 'ar' ? (deck.by && (deck.by.name_ar || deck.by.name)) : (deck.by && (deck.by.name || deck.by.name_ar));
    const out = [];
    const c = deck.cover || {};
    out.push(slide('dk-cover', `${frame('cover', o)}<div class="dk-shade"></div>
      <div class="dk-cover-t"><span class="dk-eyebrow">${esc(t.eyebrow)}</span><h1>${esc(pick(c, 'title', o.lang))}</h1><p>${esc(pick(c, 'subtitle', o.lang))}</p></div>
      ${by ? `<span class="dk-by">${esc(t.by)} · ${esc(by)}</span>` : ''}`, o));
    const a = deck.about || {};
    out.push(slide('dk-dark dk-about', `<header><h2>${esc(t.about)}</h2><p>${esc(pick(a, 'body', o.lang))}</p></header>
      <div class="dk-pair">${(a.frames || []).map((k) => frame(k, o)).join('')}</div>`, o));
    if ((deck.deliverables || []).length) {
      out.push(slide('dk-light dk-deliv', `<h2>${esc(t.deliverables)}</h2><div class="dk-boxes${deck.deliverables.length > 3 ? ' many' : ''}">${deck.deliverables.map((d) =>
        `<div class="dk-box"><strong dir="auto">${esc(d.name || '')}</strong><span>${[d.duration_s ? `${num(d.duration_s, o.lang)}${t.sec}` : '', d.aspect_ratio, d.platform].filter(Boolean).map(esc).join(' · ')}</span></div>`).join('')}</div>`, o));
    }
    const si = deck.scenes_intro || {};
    out.push(slide('dk-full', `${frame(si.frame || 'scenes', o)}<div class="dk-shade side"></div><div class="dk-side-t"><h2>${esc(t.scenes)}</h2><p>${esc(pick(si, 'body', o.lang))}</p></div>`, o));
    for (const s of deck.scenes || []) {
      const vo = pick(s, 'vo', o.lang);
      out.push(slide('dk-light dk-scene', `${frame(s.frame, o)}<div class="dk-scene-t"><h2>${esc(t.scene)} ${num(s.number, o.lang)} - ${esc(sceneTitle(s, o.lang))}</h2>
        <p>${esc(pick(s, 'body', o.lang))}</p>${vo ? `<p class="dk-vo"><b>${esc(t.vo)}</b> ${esc(vo)}</p>` : ''}</div>`, o));
      for (const x of s.shots || []) {
        const line = pick(x, 'line', o.lang);
        out.push(slide('dk-dark dk-shot', `<p class="dk-cap">${esc(pick(x, 'caption', o.lang))}${line ? `<br><b class="dk-line">${esc(line)}</b>` : ''}</p>${frame(x.frame, o)}`, o));
      }
    }
    const lk = deck.look || {};
    const lf = lk.frames || [];
    out.push(slide('dk-full', `${frame(lf[0], o)}<div class="dk-shade side"></div><div class="dk-side-t"><h2>${esc(t.look)}</h2><p>${esc(pick(lk, 'body', o.lang))}</p></div>`, o));
    out.push(slide('dk-dark dk-moods', `<h3>${esc(t.palette)}</h3><div class="dk-grid">${lf.map((k) => frame(k, o)).join('')}</div>
      <div class="dk-sw">${(lk.palette || []).map((p) => `<span style="--sw:${safeHex(p.hex)}" title="${esc(p.name || '')}"><i></i><em dir="auto">${esc(p.name || '')}</em></span>`).join('')}</div>`, o));
    out.push(slide('dk-dark dk-end', `<h1>${esc(o.lang === 'ar' ? (deck.closing && deck.closing.line_ar) || t.thanks : (deck.closing && deck.closing.line_en) || t.thanks)}</h1>${by ? `<span>${esc(by)}</span>` : ''}`, o));
    return out;
  }

  /* the PDF: a print window with one slide per landscape page (the browser's Save as PDF) */
  function print(deck, opts, title) {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Allow pop-ups for this site to export the PDF.');
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].filter((l) => /fonts\.googleapis|deck\.css/.test(l.href)).map((l) => `<link rel="stylesheet" href="${esc(l.href)}">`).join('');
    w.document.write(`<!doctype html><html lang="${opts.lang}"><head><meta charset="utf-8"><title>${esc(title)}</title>${css}
      <style>@page{size:1600px 900px;margin:0}html,body{margin:0;background:#111}.dk-print .dk-slide{width:1600px;break-after:page;border-radius:0;box-shadow:none;margin:0}.dk-tools{display:none!important}</style></head>
      <body class="dk-print">${slides(deck, { ...opts, editable: false, eager: true }).join('')}</body></html>`);
    w.document.close();
    const imgs = [...w.document.images];
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => { w.focus(); w.print(); }, 300));
  }

  MPH.trDeck = { slides, print, frameKeys: (deck) => [
    'cover', ...((deck.about && deck.about.frames) || []), (deck.scenes_intro && deck.scenes_intro.frame) || 'scenes',
    ...(deck.scenes || []).flatMap((s) => [s.frame, ...(s.shots || []).map((x) => x.frame)]), ...((deck.look && deck.look.frames) || []),
  ] };
})();
