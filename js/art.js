/* MPH illustrations, in the pitch-deck style: flat solid shapes, no outlines, lime / apricot / teal / cream on forest.
   MPH.art.step(id) returns an SVG for a production step; MPH.art.set() returns the animated film-set hero scene.
   Animated parts carry .a-* classes (see css/views/overview.css). */
(function () {
  const C = { lime: '#3FA34D', limeD: '#34893F', apricot: '#FAB771', apricotD: '#E89A55', teal: '#4E8A7E', tealL: '#7FB2A6',
    cream: '#F5F4EF', creamD: '#D9DDD6', ink: '#0E2422', line: '#9DB3AB', forest: '#13312F' };
  /* the step drawings use the app's deep-green theme: darker green, sand and cream shapes on a deep-green tile
     (C stays as it was for the treatment cover art and storyboard placeholders) */
  const G = { lime: '#3FA34D', limeD: '#34893F', apricot: '#E1E1D1', apricotD: '#C9C9B6', teal: '#4C6B60', tealL: '#A9C2B5',
    cream: '#F6F6EE', creamD: '#D3D3C3', ink: '#141D1A', line: '#B9BFB4', forest: '#2F473F' };
  const svg = (body, vb = '0 0 160 110') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
  const star = (cx, cy, R, r, fill, cls = '') => {
    const pts = [];
    for (let k = 0; k < 10; k++) { const a = (-90 + 36 * k) * Math.PI / 180; const rad = k % 2 ? r : R; pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`); }
    return `<polygon class="${cls}" style="transform-origin:${cx}px ${cy}px" points="${pts.join(' ')}" fill="${fill}"/>`;
  };
  const sparkle = (cx, cy, s, fill, cls = '') => `<path class="${cls}" style="transform-origin:${cx}px ${cy}px" d="M${cx} ${cy - s} Q${cx + s * .18} ${cy - s * .18} ${cx + s} ${cy} Q${cx + s * .18} ${cy + s * .18} ${cx} ${cy + s} Q${cx - s * .18} ${cy + s * .18} ${cx - s} ${cy} Q${cx - s * .18} ${cy - s * .18} ${cx} ${cy - s}Z" fill="${fill}"/>`;
  const doc = (x, y, w, h, fill = G.cream) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}"/>`;
  const lines = (x, y, widths, gap = 11, fill = G.line) => widths.map((w, i) => `<rect x="${x}" y="${y + i * gap}" width="${w}" height="5" rx="2.5" fill="${fill}"/>`).join('');
  const person = (x, y, s, fill, cls = '') => `<g class="${cls}" style="transform-origin:${x}px ${y + s * 2}px"><circle cx="${x}" cy="${y}" r="${s * .55}" fill="${fill}"/><rect x="${x - s * .7}" y="${y + s * .75}" width="${s * 1.4}" height="${s * 1.7}" rx="${s * .7}" fill="${fill}"/></g>`;

  const STEPS = {
    treatment: () => svg(`${doc(24, 18, 40, 30, G.teal)}${doc(70, 18, 40, 30, G.apricot)}${doc(24, 54, 40, 30, G.lime)}${doc(70, 54, 40, 30, G.cream)}
      <circle cx="98" cy="30" r="6" fill="${G.cream}"/><path d="M28 44 l10 -12 l8 8 l6 -6 l8 10z" fill="${G.cream}" opacity=".8"/>${sparkle(124, 30, 9, G.lime, 'a-twinkle')}`),
    script: () => svg(`${doc(40, 12, 62, 84)}${lines(50, 26, [36, 44, 40, 30, 38])}${star(106, 76, 17, 7.5, G.lime, 'a-spin')}`),
    docs: () => svg(`<path d="M30 30 h30 l8 8 h52 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-84 a6 6 0 0 1 -6 -6 v-52 a6 6 0 0 1 6 -6z" fill="${G.apricot}"/>
      ${doc(44, 22, 56, 40)}${lines(52, 32, [30, 38])}<path d="M24 50 h112 v38 a6 6 0 0 1 -6 6 h-100 a6 6 0 0 1 -6 -6z" fill="${G.apricotD}"/>`),
    breakdown: () => svg(`${doc(34, 12, 70, 86)}
      <rect class="a-sweep" style="animation-delay:0s" x="44" y="26" width="42" height="8" rx="3" fill="${G.lime}"/>${lines(44, 40, [50])}
      <rect class="a-sweep" style="animation-delay:.5s" x="44" y="52" width="30" height="8" rx="3" fill="${G.apricot}"/>${lines(78, 54, [16])}
      <rect class="a-sweep" style="animation-delay:1s" x="44" y="66" width="46" height="8" rx="3" fill="${G.tealL}"/>${lines(44, 80, [36])}
      ${sparkle(114, 26, 11, G.lime, 'a-twinkle')}${sparkle(124, 48, 6, G.apricot, 'a-twinkle d2')}`),
    shotlist: () => svg(`<rect x="22" y="22" width="70" height="52" rx="7" fill="${G.teal}"/><circle cx="74" cy="38" r="7" fill="${G.apricot}" class="a-pulse"/>
      <path d="M28 70 l18 -22 l12 12 l8 -8 l20 18z" fill="${G.cream}"/>
      ${[30, 46, 62].map((y, i) => `<rect x="102" y="${y}" width="9" height="9" rx="2" fill="${i === 0 ? G.lime : G.creamD}"/><rect x="116" y="${y + 2}" width="${[24, 18, 22][i]}" height="5" rx="2.5" fill="${G.line}"/>`).join('')}
      <rect x="22" y="80" width="70" height="6" rx="3" fill="${G.limeD}" opacity=".6"/>`),
    storyboard: () => svg(`${[[26, 20, G.teal], [84, 20, G.apricot], [26, 60, G.lime], [84, 60, G.tealL]].map(([x, y, f]) => `<rect x="${x}" y="${y}" width="50" height="32" rx="6" fill="${f}"/><path d="M${x + 6} ${y + 28} l12 -14 l9 9 l7 -6 l12 11z" fill="${G.cream}" opacity=".85"/>`).join('')}`),
    stripboard: () => svg(`${[[20, G.cream], [36, G.lime], [52, G.apricot], [68, G.tealL]].map(([y, f], i) => `<g class="a-slide" style="animation-delay:${i * .25}s"><rect x="22" y="${y}" width="116" height="12" rx="4" fill="${f}"/><rect x="26" y="${y + 3}" width="10" height="6" rx="2" fill="${G.ink}" opacity=".55"/><rect x="42" y="${y + 4}" width="${[52, 40, 60, 34][i]}" height="4" rx="2" fill="${G.ink}" opacity=".35"/></g>`).join('')}
      <rect x="22" y="86" width="116" height="7" rx="3" fill="${G.ink}"/>`),
    budget: () => svg(`${[[34, 44], [56, 30], [78, 52], [100, 66]].map(([x, h], i) => `<rect class="a-grow" style="animation-delay:${i * .15}s;transform-origin:${x + 8}px 94px" x="${x}" y="${94 - h}" width="16" height="${h}" rx="4" fill="${i === 3 ? G.lime : [G.limeD, G.lime, G.limeD][i]}"/>`).join('')}
      <rect x="26" y="94" width="104" height="4" rx="2" fill="${G.line}"/><circle cx="122" cy="26" r="13" fill="${G.apricot}"/><circle cx="122" cy="26" r="8" fill="none" stroke="${G.apricotD}" stroke-width="3"/>`),
    calendar: () => svg(`${doc(32, 18, 96, 76)}<rect x="32" y="18" width="96" height="16" rx="7" fill="${G.lime}"/><rect x="32" y="28" width="96" height="6" fill="${G.lime}"/>
      ${[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => `<rect x="${40 + c * 22}" y="${42 + r * 16}" width="16" height="11" rx="2" fill="${c === 2 && r === 1 ? G.apricot : G.creamD}"/>`).join('')).join('')}`),
    crew: () => svg(`${person(50, 38, 16, G.apricot, 'a-bob')}${person(80, 32, 18, G.tealL, 'a-bob d2')}${person(110, 40, 15, G.lime, 'a-bob d3')}<rect x="26" y="92" width="108" height="5" rx="2.5" fill="${G.line}" opacity=".6"/>`),
    locations: () => svg(`<path d="M16 92 Q48 62 80 80 T144 72 V96 H16z" fill="${G.teal}"/><path d="M16 96 Q60 78 100 90 T144 88 V98 H16z" fill="${G.tealL}"/>
      <g class="a-drop"><path d="M80 18 a18 18 0 0 1 18 18 c0 14 -18 34 -18 34 s-18 -20 -18 -34 a18 18 0 0 1 18 -18z" fill="${G.apricot}"/><circle cx="80" cy="36" r="7" fill="${G.cream}"/></g>`),
    callsheets: () => svg(`${doc(36, 16, 62, 80)}<rect x="36" y="16" width="62" height="10" rx="5" fill="${G.apricot}"/><rect x="36" y="22" width="62" height="4" fill="${G.apricot}"/>
      ${lines(46, 36, [42, 34, 40, 28])}<circle cx="110" cy="72" r="17" fill="${G.lime}"/><path class="a-draw" d="M102 72 l6 6 l11 -12" fill="none" stroke="${G.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
    shootday: () => svg(`<rect x="34" y="44" width="80" height="48" rx="6" fill="${G.ink}"/><g class="a-clap" style="transform-origin:36px 44px"><rect x="34" y="30" width="80" height="13" rx="3" fill="${G.cream}"/>
      ${[0, 1, 2, 3].map((i) => `<polygon points="${44 + i * 18},30 ${52 + i * 18},30 ${46 + i * 18},43 ${38 + i * 18},43" fill="${G.ink}"/>`).join('')}</g>
      ${lines(44, 58, [40, 30], 12, G.tealL)}<circle cx="126" cy="28" r="8" fill="#F07A6A" class="a-pulse"/>`),
    dailies: () => svg(`<circle cx="70" cy="56" r="34" fill="${G.cream}"/><g class="a-spin-slow" style="transform-origin:70px 56px">${[0, 60, 120, 180, 240, 300].map((a) => { const r = a * Math.PI / 180; return `<circle cx="${(70 + 19 * Math.cos(r)).toFixed(1)}" cy="${(56 + 19 * Math.sin(r)).toFixed(1)}" r="6" fill="${G.teal}"/>`; }).join('')}</g>
      <circle cx="70" cy="56" r="5" fill="${G.ink}"/><rect x="100" y="80" width="40" height="8" rx="4" fill="${G.tealL}"/>`),
    edit: () => svg(`<rect x="20" y="26" width="120" height="14" rx="4" fill="${G.tealL}"/><rect x="20" y="46" width="60" height="14" rx="4" fill="${G.lime}"/><rect x="84" y="46" width="56" height="14" rx="4" fill="${G.teal}"/>
      <rect x="20" y="66" width="88" height="10" rx="4" fill="${G.creamD}"/><g class="a-playhead"><rect x="62" y="16" width="3" height="70" rx="1.5" fill="${G.cream}"/><circle cx="63.5" cy="16" r="5" fill="${G.cream}"/></g>`),
    review: () => svg(`<path d="M22 24 h72 a8 8 0 0 1 8 8 v30 a8 8 0 0 1 -8 8 h-50 l-14 12 v-12 h-8 a8 8 0 0 1 -8 -8 v-30 a8 8 0 0 1 8 -8z" fill="${G.cream}"/>${lines(32, 36, [50, 40, 28])}
      <circle cx="116" cy="70" r="18" fill="${G.lime}"/><path class="a-draw" d="M107 70 l7 7 l12 -13" fill="none" stroke="${G.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
    finishing: () => svg(`<rect x="36" y="70" width="80" height="8" rx="4" transform="rotate(-35 76 74)" fill="${G.cream}"/>${sparkle(110, 34, 14, G.lime, 'a-twinkle')}${sparkle(80, 22, 8, G.apricot, 'a-twinkle d2')}${sparkle(128, 62, 7, G.tealL, 'a-twinkle d3')}`),
    deliverables: () => svg(`<rect x="28" y="54" width="44" height="38" rx="5" fill="${G.creamD}"/><rect x="42" y="46" width="16" height="10" rx="3" fill="${G.creamD}"/>
      <rect x="80" y="44" width="52" height="48" rx="5" fill="${G.line}"/><rect x="98" y="36" width="16" height="10" rx="3" fill="${G.line}"/>${lines(34, 26, [90, 70], 9, G.cream)}`),
    wrap: () => svg(`${doc(36, 14, 66, 84)}${lines(46, 26, [36, 44])}${[[48, 22], [62, 34], [76, 28], [90, 42]].map(([x, h], i) => `<rect class="a-grow" style="animation-delay:${i * .15}s;transform-origin:${x + 4}px 86px" x="${x}" y="${86 - h}" width="9" height="${h}" rx="2" fill="${i % 2 ? G.lime : G.tealL}"/>`).join('')}
      ${star(116, 30, 12, 5, G.apricot, 'a-spin')}`),
  };
  const step = (id) => (STEPS[id] || STEPS.script)();

  /* film-set hero scene: two light stands with breathing beams on a camera, crew, a chair, stars and a rolling film strip.
     Drawn in the app's deep greens (SiFi theme): cream and soft bright-green beams on a deep-green night. */
  const set = () => {
    const stars = Array.from({ length: 26 }, (_, i) => {
      const x = 360 + ((i * 137) % 580), y = 12 + ((i * 53) % 150), r = (i % 3) * .5 + .8;
      return `<circle class="a-star" style="animation-delay:${(i % 7) * .6}s" cx="${x}" cy="${y}" r="${r}" fill="${C.cream}"/>`;
    }).join('');
    const holes = Array.from({ length: 70 }, (_, i) => `<rect x="${i * 28}" y="0" width="14" height="5" rx="1.5" fill="#2F473F"/>`).join('');
    return svg(`
      <defs>
        <linearGradient id="set-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B2622"/><stop offset=".55" stop-color="#253932"/><stop offset="1" stop-color="#2F473F"/></linearGradient>
        <linearGradient id="beam-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F6EE" stop-opacity=".6"/><stop offset="1" stop-color="#F6F6EE" stop-opacity=".12"/></linearGradient>
        <linearGradient id="beam-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55B05F" stop-opacity=".5"/><stop offset="1" stop-color="#55B05F" stop-opacity=".12"/></linearGradient>
      </defs>
      <rect width="960" height="300" fill="url(#set-sky)"/>
      ${stars}
      <polygon class="a-beam" style="transform-origin:760px 96px" points="748,96 772,96 640,282 400,282" fill="url(#beam-l)"/>
      <polygon class="a-beam d2" style="transform-origin:905px 110px" points="895,110 915,110 830,282 640,282" fill="url(#beam-a)"/>
      <g fill="#141D1A">
        <polygon points="736,72 784,72 777,96 743,96"/><rect x="758" y="96" width="4" height="186"/><path d="M760 282 l-26 0 l26 -34 l26 34z" opacity=".9"/>
        <polygon points="890,88 922,88 917,110 895,110"/><rect x="904" y="110" width="3" height="172"/><path d="M905 282 l-20 0 l20 -28 l20 28z" opacity=".9"/>
        <path d="M760 190 L838 238" stroke="#141D1A" stroke-width="3"/><circle cx="760" cy="190" r="5"/>
        <g class="a-cam" style="transform-origin:622px 212px">
          <circle cx="604" cy="196" r="12"/><circle cx="634" cy="194" r="14"/><rect x="592" y="206" width="58" height="30" rx="4"/><polygon points="650,212 676,202 676,240 650,230"/>
        </g>
        <path d="M622 236 l-24 46 h4 l20 -38 l20 38 h4z"/><rect x="620" y="236" width="4" height="46"/>
        <circle cx="560" cy="210" r="10"/><rect x="547" y="222" width="26" height="60" rx="11"/>
        <circle cx="826" cy="228" r="9"/><rect x="814" y="239" width="24" height="43" rx="10"/>
        <rect x="462" y="226" width="40" height="5" rx="2"/><rect x="466" y="250" width="34" height="5" rx="2"/><rect x="466" y="250" width="3" height="32"/><rect x="497" y="250" width="3" height="32"/>
      </g>
      <rect y="282" width="960" height="18" fill="#141D1A"/>
      <g class="a-film" transform="translate(0 290)">${holes}</g>`, '0 0 960 300').replace('<svg ', '<svg preserveAspectRatio="xMaxYMax slice" ');
  };

  MPH.art = { step, set, colors: C };
})();
