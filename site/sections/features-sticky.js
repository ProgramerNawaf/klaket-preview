/* F2, the sticky split.
   One ScrollTrigger per row owns the reading line, and the drawing on the right
   follows whichever row holds it. The triggers only ever switch the active row on
   enter, never off on leave, so the gap between two rows keeps showing the last
   one rather than blanking the frame. The swap itself is a CSS transition, which
   means prefers-reduced-motion already turns it off.

   The frame is bigger here than in F1, so each drawing carries the layout the
   screen actually has: three columns on the breakdown, the totals rail on the
   board, the confirmation table under the call sheet. */
(function () {
  const VB = '0 0 400 320';

  function bars(x, y, step, widths, cls, op) {
    return widths.map((w, i) =>
      `<rect x="${x}" y="${y + i * step}" width="${w}" height="5" rx="2.5" class="${cls}" fill-opacity="${op}"/>`
    ).join('');
  }

  /* A rounded top band, drawn as a path so no clip path or id is needed: these
     drawings are printed twice on a page and ids would collide. */
  function band(x, y, w, h, r, cls) {
    return `<path d="M${x} ${y + r}a${r} ${r} 0 0 1 ${r}-${r}h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}v${h - r}H${x}z" class="${cls}"/>`;
  }

  /* The app's category tag: its own colour as text, on a 14% fill of it, inside a
     28% border of it. One token at three strengths. */
  function tag(x, y, w, label, cls) {
    return `<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" class="${cls}" fill-opacity=".16"/>
      <rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="none" class="s${cls.slice(1)}" stroke-opacity=".42" stroke-width="1"/>
      <text x="${x + w / 2}" y="${y + 11}" font-size="7.5" text-anchor="middle" class="${cls}">${label}</text>`;
  }

  /* The mono chip the app puts round every scene number, day, shot code, version. */
  function chip(x, y, w, h, label, bg, fg, size) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" class="${bg}"/>
      <text x="${x + w / 2}" y="${y + h / 2 + (size || 9) * 0.35}" font-size="${size || 9}" text-anchor="middle" class="${fg}">${label}</text>`;
  }

  function tick(cx, cy, r, bg) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" class="${bg || 'p-teal'}"/>
      <path d="M${cx - r * 0.42} ${cy}l${r * 0.33} ${r * 0.36} ${r * 0.55}-${r * 0.68}" fill="none" class="s-paper"
        stroke-width="${(r * 0.27).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /* The sheet as it prints, then the half that matters to a producer: who has it.
     The confirmation bar and the status column are the real tracking tab. */
  function callsheet() {
    const dept = (x, y, label, rows) => `
      <text x="${x}" y="${y}" font-size="7" class="p-teal">${label}</text>
      <rect x="${x}" y="${y + 4}" width="140" height="1" class="p-ink" fill-opacity=".2"/>
      ${rows.map(([w, t], i) => `
        <rect x="${x}" y="${y + 14 + i * 14}" width="${w}" height="5" rx="2.5" class="p-ink" fill-opacity=".45"/>
        <text x="${x + 140}" y="${y + 19 + i * 14}" font-size="9" text-anchor="end" class="p-ink">${t}</text>`).join('')}`;

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>
      <rect x="18" y="14" width="364" height="212" rx="6" class="p-paper"/>

      <circle cx="44" cy="40" r="15" fill="none" class="s-teal" stroke-width="2"/>
      <text x="44" y="44" font-size="10" text-anchor="middle" class="p-teal">AT</text>
      <text x="70" y="36" font-size="11" class="p-ink">AL THUMAMAH</text>
      <text x="70" y="48" font-size="7" class="p-ink" fill-opacity=".5">CLIENT · AGENCY · ATH-02</text>
      <text x="366" y="34" font-size="10" text-anchor="end" class="p-teal-deep">DAY 3 OF 7</text>
      <text x="366" y="46" font-size="7" text-anchor="end" class="p-ink" fill-opacity=".5">TUE 4 NOV 2026 · CLEAR 31C</text>

      <rect x="70" y="58" width="104" height="36" rx="5" fill="none" class="s-ink" stroke-width="1.6" stroke-opacity=".85"/>
      <text x="80" y="71" font-size="6.5" class="p-ink" fill-opacity=".6">CREW CALL</text>
      <text x="80" y="88" font-size="18" class="p-teal-deep">06:00</text>
      <rect x="182" y="72" width="82" height="16" rx="8" class="p-teal-deep"/>
      <text x="223" y="83" font-size="7" text-anchor="middle" class="p-paper">SHOOTING 06:40</text>
      ${[['SHOOTING', '06:40'], ['WRAP', '19:00']].map(([l, v], i) => `
        <text x="276" y="${68 + i * 15}" font-size="7" class="p-ink" fill-opacity=".55">${l}</text>
        <text x="366" y="${68 + i * 15}" font-size="9" text-anchor="end" class="p-ink">${v}</text>
        <rect x="276" y="${73 + i * 15}" width="90" height="1" class="p-ink" fill-opacity=".14"/>`).join('')}

      <rect x="32" y="104" width="336" height="2" class="p-ink" fill-opacity=".85"/>

      <path d="M32 114a3 3 0 0 1 3-3h48a3 3 0 0 1 3 3v10H32z" class="p-teal-deep"/>
      <text x="39" y="122" font-size="7" class="p-paper">CREW</text>
      <rect x="32" y="124" width="336" height="88" rx="2" fill="none" class="s-ink" stroke-opacity=".2"/>
      ${dept(44, 140, 'CAMERA', [[86, '06:00'], [70, '06:00'], [96, '06:30']])}
      ${dept(216, 140, 'ART', [[78, '05:30'], [92, '05:30'], [66, '06:00']])}
      <text x="44" y="206" font-size="7" class="p-ink" fill-opacity=".5">V2 · PUBLISHED TUE 4 NOV 06:12</text>

      <rect x="18" y="238" width="364" height="68" rx="6" class="p-surface"/>
      <text x="32" y="256" font-size="14" class="p-text">12 / 18</text>
      <text x="106" y="256" font-size="7" class="p-faint">CONFIRMED FOR DAY 3 · V2</text>
      <rect x="32" y="264" width="336" height="8" rx="4" class="p-text" fill-opacity=".12"/>
      <rect x="32" y="264" width="224" height="8" rx="4" class="p-teal"/>
      <rect x="258" y="264" width="38" height="8" class="p-signal"/>
      <rect x="298" y="264" width="52" height="8" class="p-teal" fill-opacity=".4"/>
      ${[['12 CONFIRMED', 'p-teal'], ['2 CANNOT MAKE IT', 'p-signal'], ['3 VIEWED', 'p-tint'], ['1 NO RESPONSE', 'p-faint']]
        .map(([l, c], i) => {
          const x = 32 + i * 88;
          return `<circle cx="${x + 4}" cy="289" r="4" class="${c}"/>
            <text x="${x + 13}" y="292" font-size="6" class="p-faint">${l}</text>`;
        }).join('')}
    </svg>`;
  }

  /* The board plus the rail that recalculates when a strip moves, and the day
     break with the over-schedule warning the app actually raises. */
  function board() {
    const strips = [
      ['04', 'INT', 150, '1 2/8', 3, 'p-strip'],
      ['07', 'EXT', 128, '2', 2, 'p-strip-2'],
      ['11', 'EXT', 140, '7/8', 4, 'p-strip'],
      ['02', 'INT', 118, '1 4/8', 2, 'p-strip-2'],
    ];
    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>
      <rect x="16" y="14" width="272" height="16" rx="3" class="p-surface"/>
      ${[['SC.', 32], ['I/E', 58], ['SET AND SYNOPSIS', 86], ['PGS', 206], ['CAST', 236]]
        .map(([l, x]) => `<text x="${x}" y="${25}" font-size="6" class="p-faint">${l}</text>`).join('')}

      ${strips.map(([n, ie, w, pg, cast, wash], i) => {
        const y = 34 + i * 36;
        const lift = i === 2;
        return `<g transform="translate(${lift ? 14 : 0} ${lift ? -5 : 0}) rotate(${lift ? -1 : 0} 150 ${y + 15})">
          ${lift ? `<rect x="16" y="${y + 5}" width="272" height="30" rx="3" class="p-ink" fill-opacity=".6"/>` : ''}
          <rect x="16" y="${y}" width="272" height="30" rx="3" class="${wash}"/>
          <rect x="16" y="${y}" width="5" height="30" class="p-teal"/>
          ${chip(28, y + 8, 22, 15, n, 'p-teal', 'p-paper', 9)}
          <text x="58" y="${y + 19}" font-size="7" class="p-text-2">${ie}</text>
          <rect x="86" y="${y + 9}" width="${w}" height="6" rx="3" class="p-text" fill-opacity=".72"/>
          <rect x="86" y="${y + 19}" width="${w - 30}" height="4" rx="2" class="p-text" fill-opacity=".34"/>
          <text x="222" y="${y + 19}" font-size="8" text-anchor="end" class="p-text-2">${pg}</text>
          ${Array.from({ length: cast }, (_, k) =>
            `<circle cx="${240 + k * 14}" cy="${y + 15}" r="6" fill="none" class="s-pale" stroke-opacity=".55"/>
             <text x="${240 + k * 14}" y="${y + 18}" font-size="6" text-anchor="middle" class="p-pale">${k + 1}</text>`).join('')}
        </g>`;
      }).join('')}

      <rect x="16" y="182" width="272" height="30" class="p-break"/>
      <rect x="16" y="182" width="272" height="1" class="p-text" fill-opacity=".18"/>
      <rect x="16" y="211" width="272" height="1" class="p-text" fill-opacity=".18"/>
      <text x="28" y="195" font-size="8" class="p-text">END OF DAY 2 OF 5</text>
      <text x="28" y="206" font-size="6" class="p-faint">4 3/8 PAGES · CALL 06:00 · WRAP 19:00 · EST 9H 30M</text>
      <rect x="196" y="188" width="80" height="16" rx="8" fill="none" class="s-warn" stroke-width="1"/>
      <text x="236" y="199" font-size="6" text-anchor="middle" class="p-warn">! OVER 12 HOURS</text>

      <rect x="16" y="220" width="272" height="30" rx="3" class="p-strip"/>
      <rect x="16" y="220" width="5" height="30" class="p-teal"/>
      ${chip(28, 228, 22, 15, '09', 'p-teal', 'p-paper', 9)}
      <rect x="86" y="232" width="146" height="6" rx="3" class="p-text" fill-opacity=".72"/>

      <rect x="16" y="262" width="272" height="44" rx="4" fill="none" class="s-line" stroke-dasharray="4 3" stroke-width="1.5"/>
      <text x="28" y="280" font-size="7" class="p-faint">BONEYARD · 6 UNSCHEDULED</text>
      <text x="28" y="293" font-size="6" class="p-faint">NOT ON A DAY, SO NOT ON ANY CALL SHEET</text>

      <rect x="300" y="14" width="84" height="292" rx="5" class="p-surface"/>
      <text x="342" y="32" font-size="7" text-anchor="middle" class="p-faint">SCHEDULE TOTALS</text>
      ${[['SHOOT DAYS', '05'], ['SCENES', '12/18'], ['PAGES', '24 2/8'], ['EST. SHOOTING', '11H 20M'], ['CAST DAYS', '11'], ['BUDGET', 'BAND B']]
        .map(([l, v], i) => {
          const y = 48 + i * 42;
          return `<text x="312" y="${y + 10}" font-size="6" class="p-faint">${l}</text>
            <text x="312" y="${y + 27}" font-size="12" class="p-pale">${v}</text>
            <rect x="312" y="${y + 34}" width="60" height="1" class="p-text" fill-opacity=".12"/>`;
        }).join('')}
    </svg>`;
  }

  /* The real three columns: the scene rail, the script, the breakdown sheet. An
     accepted tag is a tinted run under a 2px rule; an unreviewed suggestion is
     the same rule with a dashed outline and no fill. */
  function breakdown() {
    const hl = (x, y, w, dashed) => `
      ${dashed ? '' : `<rect x="${x}" y="${y - 8}" width="${w}" height="12" rx="2" class="p-teal" fill-opacity=".18"/>`}
      ${dashed ? `<rect x="${x - 1}" y="${y - 9}" width="${w + 2}" height="14" rx="2" fill="none" class="s-teal"
          stroke-dasharray="3 2" stroke-opacity=".7" stroke-width="1"/>` : ''}
      <rect x="${x}" y="${y + 3}" width="${w}" height="2" class="p-teal"/>`;

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>

      <rect x="12" y="14" width="76" height="292" rx="5" class="p-surface"/>
      <text x="22" y="30" font-size="6.5" class="p-faint">SCENES</text>
      ${[1, 2, 3, 4, 5, 6].map((n, i) => {
        const y = 40 + i * 30;
        const on = n === 4;
        return `${on ? `<rect x="12" y="${y - 6}" width="76" height="28" class="p-teal" fill-opacity=".14"/>
          <rect x="12" y="${y - 6}" width="3" height="28" class="p-teal"/>` : ''}
          ${chip(22, y - 2, 18, 16, '0' + n, on ? 'p-teal' : 'p-raised-2', on ? 'p-paper' : 'p-text', 8)}
          <rect x="46" y="${y + 3}" width="${30 - (i % 3) * 5}" height="4" rx="2" class="p-text" fill-opacity="${on ? '.6' : '.3'}"/>
          ${n < 4 ? tick(78, y + 6, 5) : `<text x="78" y="${y + 9}" font-size="7" text-anchor="middle" class="p-warn">3</text>`}`;
      }).join('')}

      <rect x="96" y="14" width="186" height="292" rx="5" class="p-paper"/>
      ${chip(108, 26, 22, 18, '04', 'p-teal', 'p-paper', 9)}
      <text x="136" y="40" font-size="9" class="p-ink">INT. MAJLIS - NIGHT</text>
      <text x="108" y="58" font-size="7" class="p-ink" fill-opacity=".5">1 2/8 PG · ABOUT 1H 30M TO SHOOT</text>
      <rect x="108" y="64" width="162" height="1" class="p-ink" fill-opacity=".18"/>
      ${bars(108, 78, 15, [160, 144], 'p-ink', '.3')}
      <rect x="108" y="108" width="44" height="5" rx="2.5" class="p-ink" fill-opacity=".3"/>
      ${hl(158, 113, 46, false)}
      <rect x="210" y="108" width="30" height="5" rx="2.5" class="p-ink" fill-opacity=".3"/>
      ${bars(108, 123, 15, [156], 'p-ink', '.3')}
      ${hl(108, 143, 54, false)}
      <rect x="168" y="138" width="58" height="5" rx="2.5" class="p-ink" fill-opacity=".3"/>
      ${bars(108, 153, 15, [150], 'p-ink', '.3')}
      <rect x="108" y="168" width="36" height="5" rx="2.5" class="p-ink" fill-opacity=".3"/>
      ${hl(150, 173, 42, true)}
      ${bars(108, 183, 15, [162, 140, 156, 148], 'p-ink', '.3')}
      <text x="108" y="286" font-size="7" class="p-ink" fill-opacity=".5">SELECT ANY WORDS TO TAG THEM</text>

      <rect x="290" y="14" width="98" height="292" rx="5" class="p-surface"/>
      <text x="300" y="30" font-size="6.5" class="p-faint">BREAKDOWN SHEET</text>
      <text x="300" y="46" font-size="11" class="p-text">12 ELEMENTS</text>
      <text x="300" y="58" font-size="6.5" class="p-warn">! 3 TO REVIEW</text>
      <rect x="300" y="64" width="78" height="1" class="p-text" fill-opacity=".14"/>
      ${[['CAST', 42, 'p-pale', '9'], ['PROPS', 46, 'p-tint', '14'], ['LOCATIONS', 60, 'p-pale', '2']]
        .map(([l, w, c, n], i) => {
          const y = 76 + i * 40;
          return `${tag(300, y, w, l, c)}
            <text x="378" y="${y + 11}" font-size="7" text-anchor="end" class="p-faint">${n}</text>
            <circle cx="304" cy="${y + 27}" r="3.5" class="${c}"/>
            <rect x="313" y="${y + 24}" width="54" height="5" rx="2.5" class="p-text" fill-opacity=".45"/>`;
        }).join('')}
      <rect x="296" y="196" width="86" height="72" rx="5" fill="none" class="s-warn" stroke-dasharray="3 2" stroke-width="1"/>
      <text x="304" y="210" font-size="6.5" class="p-accent">AI · 87%</text>
      <rect x="304" y="216" width="52" height="4" rx="2" class="p-text" fill-opacity=".4"/>
      <rect x="304" y="226" width="1.8" height="22" class="p-text" fill-opacity=".3"/>
      ${bars(312, 230, 10, [58, 46], 'p-text', '.35')}
      ${[['p-teal', 26], ['p-raised', 26], ['p-raised', 24]].map(([c, w], i) =>
        `<rect x="${304 + i * 28}" y="254" width="${w}" height="10" rx="3" class="${c}"/>`).join('')}
      <text x="300" y="290" font-size="6" class="p-faint">DASHED MEANS NOBODY HAS REVIEWED IT</text>
    </svg>`;
  }

  /* The link a client opens, and the versions kept behind it. No comment pin is
     drawn: the product takes one note per version, not notes on a frame. */
  function approvals() {
    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>
      <rect x="24" y="14" width="352" height="196" rx="7" class="p-surface"/>
      ${band(24, 14, 352, 46, 7, 'p-teal')}
      <rect x="40" y="26" width="56" height="16" rx="3" class="p-paper" fill-opacity=".9"/>
      <text x="40" y="54" font-size="7" class="p-pale">AL THUMAMAH FILMS</text>
      <text x="360" y="40" font-size="10" text-anchor="end" class="p-paper">TREATMENT V2</text>

      ${[['CLIENT', 84], ['OBJECTIVE', 140], ['KEY MESSAGE', 118], ['DELIVERY', 72], ['REVISION ROUNDS', 36]]
        .map(([l, w], i) => {
          const y = 80 + i * 20;
          return `<text x="42" y="${y}" font-size="7" class="p-faint">${l}</text>
            <rect x="146" y="${y - 5}" width="${w}" height="5" rx="2.5" class="p-text" fill-opacity=".45"/>`;
        }).join('')}
      <rect x="42" y="166" width="150" height="30" rx="6" class="p-teal"/>
      <text x="117" y="185" font-size="9" text-anchor="middle" class="p-paper">APPROVE</text>
      <rect x="202" y="166" width="156" height="30" rx="6" fill="none" class="s-tint" stroke-width="1.8"/>
      <text x="280" y="185" font-size="9" text-anchor="middle" class="p-tint">REQUEST CHANGES</text>

      <rect x="24" y="222" width="352" height="38" rx="7" class="p-surface"/>
      <rect x="24" y="222" width="3" height="38" class="p-teal"/>
      ${['v1', 'v2', 'v3'].map((v, i) => `
        <rect x="${42 + i * 38}" y="232" width="34" height="18" rx="5" class="${i === 1 ? 'p-raised-2' : 'p-raised'}"/>
        <circle cx="${50 + i * 38}" cy="241" r="3.5" class="${['p-teal', 'p-tint', 'p-faint'][i]}"/>
        <text x="${64 + i * 38}" y="245" font-size="8" text-anchor="middle" class="${i === 1 ? 'p-text' : 'p-faint'}">${v}</text>`).join('')}
      <rect x="166" y="233" width="56" height="16" rx="8" class="p-teal" fill-opacity=".18"/>
      <text x="194" y="244" font-size="7" text-anchor="middle" class="p-accent">SENT</text>
      <text x="236" y="238" font-size="6.5" class="p-faint">WAITING FOR THEIR DECISION</text>
      <text x="236" y="249" font-size="6.5" class="p-faint">SENT VERSIONS ARE LOCKED</text>

      <rect x="24" y="270" width="352" height="36" rx="6" class="p-raised"/>
      <rect x="38" y="278" width="1.8" height="20" class="p-text" fill-opacity=".3"/>
      <text x="48" y="286" font-size="6.5" class="p-faint">CLIENT NOTE ON V2</text>
      ${bars(48, 291, 9, [196], 'p-text', '.42')}
      ${tick(358, 288, 8)}
    </svg>`;
  }

  /* What arrived against what came out, with the evidence the AI quotes for every
     field it filled. */
  function brief() {
    const wave = Array.from({ length: 18 }, (_, i) => {
      const h = 5 + Math.abs(Math.sin(i * 1.05)) * 20;
      return `<rect x="${72 + i * 6}" y="${(58 - h / 2).toFixed(1)}" width="3" height="${h.toFixed(1)}" rx="1.5"
        class="p-pale" fill-opacity=".7"/>`;
    }).join('');

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>

      <rect x="18" y="30" width="162" height="58" rx="7" class="p-raised"/>
      <path d="M32 40v10M32 46a5 5 0 0 0 10 0" fill="none" class="s-tint" stroke-width="1.6" stroke-linecap="round"/>
      <text x="50" y="50" font-size="10" class="p-text">01:12</text>
      ${wave}
      <text x="30" y="79" font-size="6.5" class="p-faint">VOICE MEMO · KICKOFF CALL</text>

      <rect x="18" y="98" width="162" height="70" rx="7" class="p-raised"/>
      ${bars(30, 112, 13, [132, 118, 138, 104], 'p-text', '.38')}
      <text x="30" y="160" font-size="6.5" class="p-faint">EMAIL FROM YOUSEF · 20 OCT</text>

      <rect x="18" y="178" width="162" height="62" rx="7" class="p-teal" fill-opacity=".16"/>
      <text x="30" y="196" font-size="7.5" class="p-accent">9 FIELDS FILLED</text>
      <text x="30" y="210" font-size="7.5" class="p-warn">! 4 TO REVIEW · 1 CONFLICT</text>
      <text x="30" y="224" font-size="6.5" class="p-faint">STILL MISSING: BUDGET</text>
      <text x="30" y="235" font-size="6.5" class="p-faint">INTERNAL · CLIENTS NEVER SEE SOURCES</text>

      <rect x="18" y="250" width="162" height="56" rx="7" class="p-surface"/>
      <text x="30" y="266" font-size="6.5" class="p-faint">BUDGET RANGE</text>
      <text x="30" y="284" font-size="13" class="p-pale">SAR 280K TO 320K</text>
      <text x="30" y="298" font-size="6.5" class="p-faint">DELIVERY 4 NOV · IN 27 DAYS</text>

      <path d="M190 158h20M202 150l10 8-10 8" fill="none" class="s-tint" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

      <rect x="222" y="14" width="164" height="132" rx="8" class="p-surface"/>
      <text x="236" y="32" font-size="7.5" class="p-accent">GOAL</text>
      ${[['OBJECTIVE', 76], ['KEY MESSAGE', 62], ['AUDIENCE', 68], ['TONE', 50], ['KPI', 56]].map(([l, w], i) => {
        const y = 50 + i * 19;
        return `<text x="236" y="${y}" font-size="6.5" class="p-faint">${l}</text>
          <rect x="236" y="${y + 5}" width="${w}" height="5" rx="2.5" class="p-text" fill-opacity=".45"/>
          <text x="374" y="${y}" font-size="6" text-anchor="end" class="p-accent">AI</text>`;
      }).join('')}

      ${[0, 1].map((k) => {
        const y = 158 + k * 78;
        const conflict = k === 1;
        return `<rect x="222" y="${y}" width="164" height="70" rx="7" class="p-bg"/>
          <rect x="222" y="${y}" width="164" height="70" rx="7" fill="none"
            class="${conflict ? 's-warn' : 's-line'}" stroke-width="${conflict ? 1.4 : 1}"/>
          <text x="236" y="${y + 16}" font-size="6.5" class="p-faint">${conflict ? 'BUDGET' : 'DELIVERY DATE'}</text>
          <text x="236" y="${y + 30}" font-size="10" class="p-text">${conflict ? 'SAR 320,000' : '4 NOV 2026'}</text>
          <rect x="236" y="${y + 36}" width="1.8" height="18" class="p-text" fill-opacity=".3"/>
          ${bars(244, 40 + y, 9, [104, 84], 'p-text', '.35')}
          <rect x="236" y="${y + 58}" width="34" height="12" rx="6" class="${conflict ? 'p-raised' : 'p-teal'}" fill-opacity="${conflict ? 1 : 0.22}"/>
          <text x="253" y="${y + 67}" font-size="6.5" text-anchor="middle" class="${conflict ? 'p-warn' : 'p-accent'}">${conflict ? '! 62%' : '87%'}</text>
          ${[['p-teal', 30], ['p-raised', 30], ['p-raised', 26]].map(([c, w], i) =>
            `<rect x="${278 + i * 34}" y="${y + 58}" width="${w}" height="12" rx="3" class="${c}"/>`).join('')}`;
      }).join('')}
    </svg>`;
  }

  /* The shot list as it is worked: the teal day band, the scene header with its
     own tick-off count, the storyboard thumbnail, the mono code, the size chip,
     the round setup counter, and a done row at half strength with the description
     struck through. No take counter is drawn: there is not one in the product. */
  function shots() {
    const sketch = (k) => [
      '<path d="M4 34h62" class="s-tint" stroke-width="1.3" stroke-opacity=".8"/><rect x="28" y="18" width="9" height="16" class="p-pale" fill-opacity=".8"/><rect x="48" y="24" width="6" height="10" class="p-pale" fill-opacity=".5"/>',
      '<circle cx="35" cy="19" r="8" class="p-pale" fill-opacity=".8"/><path d="M22 38c0-8 6-13 13-13s13 5 13 13z" class="p-pale" fill-opacity=".45"/>',
      '<circle cx="35" cy="22" r="15" class="p-pale" fill-opacity=".28"/><circle cx="35" cy="22" r="5" class="p-tint"/>',
      '<path d="M4 20h62" class="s-tint" stroke-width="1.3" stroke-opacity=".5"/><rect x="14" y="20" width="16" height="16" class="p-pale" fill-opacity=".6"/><circle cx="50" cy="26" r="7" class="p-pale" fill-opacity=".8"/>',
    ][k % 4];

    const rows = [['4A', 'WS', '1', 1], ['4B', 'MS', '2', 1], ['4C', 'CU', '2', 0], ['4D', 'OTS', '3', 0]];

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="400" height="320" class="p-deep"/>
      ${[['48', 'SHOTS'], ['19', 'SETUPS'], ['11H 20M', 'EST.'], ['62%', 'DONE']].map(([v, l], i) => {
        const x = 16 + i * 94;
        return `<rect x="${x}" y="14" width="88" height="38" rx="5" class="p-surface"/>
          <text x="${x + 12}" y="32" font-size="12" class="p-text">${v}</text>
          <text x="${x + 12}" y="44" font-size="6.5" class="p-faint">${l}</text>`;
      }).join('')}

      <rect x="16" y="62" width="368" height="22" class="p-raised"/>
      ${chip(28, 66, 38, 14, 'DAY 2', 'p-teal', 'p-paper', 8)}
      <text x="74" y="76" font-size="8" class="p-text">TUE 4 NOV</text>
      <text x="372" y="76" font-size="7" text-anchor="end" class="p-faint">3 SHOOT DAYS</text>

      <rect x="16" y="86" width="368" height="20" class="p-bg"/>
      <text x="28" y="99" font-size="8" class="p-accent">SC. 4</text>
      <text x="62" y="99" font-size="8" class="p-text-2">INT. MAJLIS - NIGHT</text>
      <text x="294" y="99" font-size="7" text-anchor="end" class="p-faint">2/4</text>
      <rect x="302" y="93" width="70" height="6" rx="3" class="p-text" fill-opacity=".16"/>
      <rect x="302" y="93" width="35" height="6" rx="3" class="p-teal"/>

      ${rows.map(([code, size, setup, done], i) => {
        const y = 110 + i * 50;
        const o = done ? '.5' : '1';
        return `<g opacity="${o}">
          <rect x="16" y="${y}" width="368" height="48" class="p-surface"/>
          <rect x="16" y="${y + 47}" width="368" height="1" class="p-text" fill-opacity=".1"/>
          ${done ? tick(36, y + 24, 7) : `<circle cx="36" cy="${y + 24}" r="7" fill="none" class="s-line" stroke-width="1.5"/>`}
          <rect x="54" y="${y + 9}" width="70" height="30" rx="4" class="p-frame"/>
          <g transform="translate(54 ${y + 9}) scale(0.9)" fill="none">${sketch(i)}</g>
          <text x="136" y="${y + 28}" font-size="9" class="p-text">${code}</text>
          ${chip(164, y + 17, 30, 15, size, 'p-accent-soft', 'p-accent', 8)}
          <rect x="206" y="${y + 22}" width="${118 - i * 10}" height="5" rx="2.5" class="p-text" fill-opacity=".42"/>
          ${done ? `<rect x="206" y="${y + 24}" width="${118 - i * 10}" height="1" class="p-faint"/>` : ''}
          <text x="344" y="${y + 28}" font-size="7" text-anchor="end" class="p-faint">35MM</text>
          <circle cx="368" cy="${y + 24}" r="9" class="p-raised-2"/>
          <text x="368" y="${y + 27}" font-size="8" text-anchor="middle" class="p-text">${setup}</text>
        </g>`;
      }).join('')}
    </svg>`;
  }

  const PICS = { callsheet, board, breakdown, approvals, brief, shots };

  function build() {
    const root = document.querySelector('.fstick');
    const D = window.KLDATA;
    if (!root || !D) return;
    const items = D.features.items;
    const pic = (f) => (PICS[f.key] || PICS.callsheet)();

    root.innerHTML = `
      <div class="wrap">
        <div class="fstick__head" data-reveal="up">
          <h2 class="fstick__title" id="fstick-title">${D.features.title}</h2>
        </div>

        <div class="fstick__grid">
          <ol class="fstick__list">
            ${items.map((f, i) => `
              <li class="fstick__row${i === 0 ? ' is-on' : ''}" data-i="${i}">
                <div class="fstick__inline" aria-hidden="true">${pic(f)}</div>
                <button class="fstick__btn" type="button" data-i="${i}"${i === 0 ? ' aria-current="true"' : ''}>
                  <span class="fstick__n">${String(i + 1).padStart(2, '0')}</span>
                  <span class="fstick__name">${f.title}</span>
                </button>
                <p class="fstick__body">${f.body}</p>
              </li>`).join('')}
          </ol>

          <div class="fstick__vis" aria-hidden="true">
            <div class="fstick__stack">
              ${items.map((f, i) => `<div class="fstick__shot${i === 0 ? ' is-on' : ''}" data-i="${i}">${pic(f)}</div>`).join('')}
            </div>
            <p class="fstick__cap"><b class="fstick__cap-n">01</b><span class="fstick__cap-name">${items[0].title}</span></p>
          </div>
        </div>
      </div>`;

    const rows = [...root.querySelectorAll('.fstick__row')];
    const btns = [...root.querySelectorAll('.fstick__btn')];
    const shotEls = [...root.querySelectorAll('.fstick__shot')];
    const capN = root.querySelector('.fstick__cap-n');
    const capName = root.querySelector('.fstick__cap-name');

    let active = 0;
    function setActive(i) {
      if (i === active) return;
      active = i;
      rows.forEach((r, j) => r.classList.toggle('is-on', j === i));
      shotEls.forEach((s, j) => s.classList.toggle('is-on', j === i));
      btns.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      capN.textContent = String(i + 1).padStart(2, '0');
      capName.textContent = items[i].title;
    }

    /* The titles are buttons so the frame can be driven from the keyboard as well
       as from the scroll. Pressing one brings its row to the reading line. */
    btns.forEach((b, i) => {
      b.addEventListener('click', () => {
        setActive(i);
        const lenis = window.KL && KL.lenis;
        if (lenis) lenis.scrollTo(rows[i], { offset: -window.innerHeight * 0.3 });
        else rows[i].scrollIntoView({ block: 'center', behavior: window.KL && KL.reduced ? 'auto' : 'smooth' });
      });
    });

    if (!window.KL || !KL.ScrollTrigger || KL.reduced) {
      /* No scroll driver: every row becomes its own still, with its own picture. */
      root.classList.add('fstick--still');
      rows.forEach((r) => r.classList.add('is-on'));
      return;
    }

    rows.forEach((row, i) => {
      KL.ScrollTrigger.create({
        trigger: row,
        start: 'top 58%',
        end: 'bottom 58%',
        onToggle: (self) => { if (self.isActive) setActive(i); },
      });
    });

    KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
