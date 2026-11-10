/* MPH.illus: ask the AI for scene specs (shots, storyboard frames, production covers), save them, and draw them.
   Drawing is instant (MPH.sketch); when the server also painted a Nano Banana picture (spec.image, a media path),
   it is laid over the drawing as soon as its signed link is fetched. A batch takes a few seconds to a minute. */
(function () {
  const BATCH = 4, PARALLEL = 2;
  const STYLES = [
    { id: 'sketch', label: 'Sketch', icon: 'pencil', hint: 'Pencil storyboard panels' },
    { id: 'realistic', label: 'Realistic', icon: 'camera', hint: 'Photoreal film stills' },
    { id: 'animated', label: 'Animated', icon: 'sparkles', hint: 'Animated feature frames' },
  ];
  const oldImages = (rows, key) => (rows || []).map((r) => r[key] && r[key].image).filter(Boolean);

  async function run(ctx, table, key, ids, onProgress) {
    const pid = ctx.production.id;
    const batches = [];
    for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH));
    const specs = {};
    let next = 0, done = 0;
    const worker = async () => {
      while (next < batches.length) {
        const b = batches[next++];
        const { data: before } = await ctx.sb.from(table).select('id, illustration').in('id', b);
        const out = await ctx.api.ai('illustrate', { production_id: pid, [key]: b });
        const replaced = [];
        for (const it of out.items || []) {
          if (!it || !it.id || !it.spec) continue;
          specs[it.id] = it.spec;
          ctx.api.must(await ctx.sb.from(table).update({ illustration: it.spec }).eq('id', it.id));
          replaced.push(...oldImages((before || []).filter((r) => r.id === it.id), 'illustration'));
        }
        ctx.api.removeMedia(replaced).catch(() => {});
        done += b.length;
        if (onProgress) onProgress(done, ids.length, specs);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));
    return specs;
  }

  MPH.illus = {
    /* illustrate shots by id; returns { shotId: spec } */
    shots: (ctx, ids, onProgress) => run(ctx, 'shots', 'shot_ids', ids, onProgress),
    /* illustrate storyboard frames by id */
    frames: (ctx, ids, onProgress) => run(ctx, 'storyboard_frames', 'frame_ids', ids, onProgress),
    /* header image for a production, from its title and description */
    cover: async (ctx, productionId) => {
      const { data: before } = await ctx.sb.from('productions').select('cover').eq('id', productionId);
      const out = await ctx.api.ai('cover', { production_id: productionId });
      if (out && out.spec) {
        ctx.api.must(await ctx.sb.from('productions').update({ cover: out.spec }).eq('id', productionId));
        ctx.api.removeMedia(oldImages(before, 'cover')).catch(() => {});
      }
      return out && out.spec;
    },
    /* draw a spec (or a quiet placeholder when there is none yet) */
    draw: (spec, opts) => spec ? MPH.sketch(spec, opts) : '',
    /* the production's picture style, shared by the shot list, the storyboard and the header picture */
    STYLES,
    style: (ctx) => (STYLES.some((x) => x.id === ctx.production.picture_style) ? ctx.production.picture_style : 'realistic'),
    /* a segmented picker; pictures painted after a change use the new style */
    stylePicker(ctx) {
      const { ui, esc } = ctx;
      const cur = MPH.illus.style(ctx);
      return `<div class="seg pic-style" role="group" aria-label="${esc(ctx.t('Picture style'))}">${STYLES.map((x) => `<button type="button" class="${x.id === cur ? 'on' : ''}" data-picstyle="${x.id}" aria-pressed="${x.id === cur}" title="${esc(ctx.t(x.hint))}" ${ctx.canEdit ? '' : 'disabled'}>${ui.icon(x.icon)}${esc(ctx.t(x.label))}</button>`).join('')}</div>`;
    },
    /* wire every picker inside root: saves the choice on the production and updates the buttons */
    wireStyle(ctx, root) {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-picstyle]');
        if (!b || b.disabled) return;
        const v = b.dataset.picstyle, prev = MPH.illus.style(ctx);
        if (v === prev) return;
        const mark = (id) => root.querySelectorAll('[data-picstyle]').forEach((x) => { x.classList.toggle('on', x.dataset.picstyle === id); x.setAttribute('aria-pressed', x.dataset.picstyle === id); });
        mark(v); ctx.production.picture_style = v;
        try {
          ctx.api.must(await ctx.sb.from('productions').update({ picture_style: v }).eq('id', ctx.production.id));
          ctx.toast(`${ctx.t(STYLES.find((x) => x.id === v).label)}: ${ctx.t('new pictures use this style')}`, 'palette');
        } catch (ex) { mark(prev); ctx.production.picture_style = prev; ctx.toastError(ex); }
      });
    },
  };

  /* fill in the pictures of any drawing put on the page: sign their media paths in one request and set href */
  let queued = false;
  const fill = async () => {
    queued = false;
    const els = [...document.querySelectorAll('svg.sk image[data-media]:not([href])')];
    if (!els.length || !MPH.api || !MPH.api.mediaUrls) return;
    const urls = await MPH.api.mediaUrls(els.map((el) => el.getAttribute('data-media')));
    els.forEach((el) => {
      const url = urls[el.getAttribute('data-media')];
      if (!url) return;
      el.addEventListener('error', () => el.remove(), { once: true }); // a missing file leaves the drawing
      el.setAttribute('href', url);
    });
  };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => fill().catch(() => {})); } })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
