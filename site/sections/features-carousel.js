/* F1, the features carousel.
   The rail is a plain overflow-x container with scroll-snap, so the browser owns
   the physics. Everything here only moves the scroll position to a snap point the
   CSS already defined: the arrows, the arrow keys and a mouse drag all end in the
   same go(i). Touch and trackpad are left native.

   The six drawings are the real screens, carrying the app's own signatures: the
   mono chip for anything numbered, the coloured left spine on a strip, the 2px
   underline on a tagged run of script, the dashed outline for an AI suggestion
   nobody has reviewed yet, and the left-rule quote that is the AI showing its
   evidence. Two things the copy promises are not drawn because they are not
   built: comment pins on a frame, and take logging. See the note in the report. */
(function () {
  const VB = '0 0 320 240';

  function bars(x, y, step, widths, cls, op) {
    return widths.map((w, i) =>
      `<rect x="${x}" y="${y + i * step}" width="${w}" height="4" rx="2" class="${cls}" fill-opacity="${op}"/>`
    ).join('');
  }

  /* A category tag. The app draws these as the colour's own text on a 14% fill of
     it inside a 28% border of it, which is one token at three strengths. */
  function tag(x, y, w, label, cls) {
    return `<rect x="${x}" y="${y}" width="${w}" height="13" rx="6.5" class="${cls}" fill-opacity=".16"/>
      <rect x="${x}" y="${y}" width="${w}" height="13" rx="6.5" fill="none" class="s${cls.slice(1)}" stroke-opacity=".42" stroke-width="1"/>
      <text x="${x + w / 2}" y="${y + 9}" font-size="6.5" text-anchor="middle" class="${cls}">${label}</text>`;
  }

  /* A mono chip: the shape the app puts round every scene number, day number,
     shot code and version. */
  function chip(x, y, w, h, label, bg, fg, size) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="${bg}"/>
      <text x="${x + w / 2}" y="${y + h / 2 + (size || 8) * 0.35}" font-size="${size || 8}" text-anchor="middle" class="${fg}">${label}</text>`;
  }

  function tick(cx, cy, r, bg) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" class="${bg || 'p-teal'}"/>
      <path d="M${cx - r * 0.42} ${cy}l${r * 0.33} ${r * 0.36} ${r * 0.55}-${r * 0.68}" fill="none" class="s-paper"
        stroke-width="${(r * 0.27).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /* The paper call sheet, drawn the way it prints: the 2px ink rule under the
     header, the boxed crew call, DAY 3 OF 7, the department tab sitting on the
     table, and the confirmation bar that says who actually has it. */
  function callsheet() {
    const dept = (x, y, rows) => `<text x="${x}" y="${y}" font-size="6" class="p-teal">${rows.label}</text>
      <rect x="${x}" y="${y + 3}" width="110" height="1" class="p-ink" fill-opacity=".2"/>
      ${rows.n.map((w, i) => `<rect x="${x}" y="${y + 11 + i * 12}" width="${w}" height="4" rx="2" class="p-ink" fill-opacity=".45"/>
        <text x="${x + 110}" y="${y + 15 + i * 12}" font-size="7.5" text-anchor="end" class="p-ink">${rows.t[i]}</text>`).join('')}`;

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>
      <rect x="18" y="12" width="284" height="216" rx="6" class="p-paper"/>

      <circle cx="38" cy="33" r="12" fill="none" class="s-teal" stroke-width="1.8"/>
      <text x="38" y="36" font-size="8" text-anchor="middle" class="p-teal">AT</text>
      <text x="58" y="30" font-size="9" class="p-ink">AL THUMAMAH</text>
      <text x="58" y="41" font-size="6" class="p-ink" fill-opacity=".5">CLIENT · AGENCY · ATH-02</text>
      <text x="290" y="28" font-size="8.5" text-anchor="end" class="p-teal-deep">DAY 3 OF 7</text>
      <text x="290" y="39" font-size="6" text-anchor="end" class="p-ink" fill-opacity=".5">TUE 4 NOV 2026</text>

      <rect x="58" y="50" width="88" height="30" rx="4" fill="none" class="s-ink" stroke-width="1.5" stroke-opacity=".85"/>
      <text x="66" y="61" font-size="5.5" class="p-ink" fill-opacity=".6">CREW CALL</text>
      <text x="66" y="75" font-size="15" class="p-teal-deep">06:00</text>
      ${[['SHOOTING', '06:40'], ['EST. WRAP', '19:00']].map(([l, v], i) => `
        <text x="206" y="${58 + i * 13}" font-size="6" class="p-ink" fill-opacity=".55">${l}</text>
        <text x="290" y="${58 + i * 13}" font-size="7.5" text-anchor="end" class="p-ink">${v}</text>
        <rect x="206" y="${62 + i * 13}" width="84" height="1" class="p-ink" fill-opacity=".14"/>`).join('')}

      <rect x="30" y="88" width="260" height="2" class="p-ink" fill-opacity=".85"/>

      <path d="M30 97a3 3 0 0 1 3-3h40a3 3 0 0 1 3 3v9H30z" class="p-teal-deep"/>
      <text x="36" y="104" font-size="6" class="p-paper">CREW</text>
      <rect x="30" y="106" width="260" height="76" rx="2" fill="none" class="s-ink" stroke-opacity=".2"/>
      ${dept(40, 118, { label: 'CAMERA', n: [62, 54, 70], t: ['06:00', '06:00', '06:30'] })}
      ${dept(170, 118, { label: 'ART', n: [58, 66, 50], t: ['05:30', '05:30', '06:00'] })}

      <rect x="30" y="192" width="260" height="8" rx="4" class="p-ink" fill-opacity=".12"/>
      <rect x="30" y="192" width="174" height="8" rx="4" class="p-teal"/>
      <rect x="206" y="192" width="20" height="8" class="p-signal"/>
      <rect x="228" y="192" width="30" height="8" class="p-teal" fill-opacity=".4"/>
      <text x="30" y="214" font-size="9" class="p-ink">12 / 18</text>
      <text x="76" y="214" font-size="6" class="p-ink" fill-opacity=".55">CONFIRMED · 2 CANNOT · 3 VIEWED</text>
    </svg>`;
  }

  /* The board. A strip is a pale wash of its colour with a saturated spine down
     its leading edge, a mono scene chip, the set name in caps, the page count in
     eighths and the cast numbers as small circles. One strip is off the stack,
     because a stripboard is a thing you move. */
  function board() {
    const strips = [
      ['04', 'INT', 164, '1 2/8', 3, 'p-strip'],
      ['07', 'EXT', 138, '2', 2, 'p-strip-2'],
      ['11', 'EXT', 152, '7/8', 4, 'p-strip'],
      ['02', 'INT', 128, '1 4/8', 2, 'p-strip-2'],
    ];
    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>
      <rect x="16" y="14" width="288" height="14" rx="2" class="p-surface"/>
      ${['SC.', 'I/E', 'SET AND SYNOPSIS', 'PGS', 'CAST'].map((l, i) =>
        `<text x="${[30, 52, 78, 214, 248][i]}" y="${24}" font-size="5.5" class="p-faint">${l}</text>`).join('')}

      ${strips.map(([n, ie, w, pg, cast, wash], i) => {
        const y = 32 + i * 34;
        const lift = i === 2;
        return `<g transform="translate(${lift ? 12 : 0} ${lift ? -4 : 0}) rotate(${lift ? -1 : 0} 160 ${y + 14})">
          ${lift ? `<rect x="16" y="${y + 4}" width="288" height="28" rx="3" class="p-ink" fill-opacity=".6"/>` : ''}
          <rect x="16" y="${y}" width="288" height="28" rx="3" class="${wash}"/>
          <rect x="16" y="${y}" width="5" height="28" class="p-teal"/>
          ${chip(27, y + 7, 20, 14, n, 'p-teal', 'p-paper', 8)}
          <text x="52" y="${y + 17}" font-size="6.5" class="p-text-2">${ie}</text>
          <rect x="78" y="${y + 8}" width="${w}" height="5" rx="2.5" class="p-text" fill-opacity=".72"/>
          <rect x="78" y="${y + 17}" width="${w - 28}" height="4" rx="2" class="p-text" fill-opacity=".34"/>
          <text x="226" y="${y + 17}" font-size="7" text-anchor="end" class="p-text-2">${pg}</text>
          ${Array.from({ length: cast }, (_, k) =>
            `<circle cx="${248 + k * 13}" cy="${y + 14}" r="5.5" fill="none" class="s-pale" stroke-opacity=".55"/>
             <text x="${248 + k * 13}" y="${y + 16.5}" font-size="5.5" text-anchor="middle" class="p-pale">${k + 1}</text>`).join('')}
        </g>`;
      }).join('')}

      <rect x="16" y="170" width="288" height="26" class="p-break"/>
      <rect x="16" y="170" width="288" height="1" class="p-text" fill-opacity=".18"/>
      <rect x="16" y="195" width="288" height="1" class="p-text" fill-opacity=".18"/>
      <text x="28" y="182" font-size="7" class="p-text">END OF DAY 2 OF 5</text>
      <text x="28" y="191" font-size="5.5" class="p-faint">4 3/8 PAGES · CALL 06:00 · WRAP 19:00 · EST 9H 30M</text>
      <rect x="236" y="176" width="56" height="13" rx="6.5" class="p-teal"/>
      <text x="264" y="185" font-size="5.5" text-anchor="middle" class="p-paper">CALL SHEET</text>

      <rect x="16" y="202" width="288" height="26" rx="3" class="p-strip"/>
      <rect x="16" y="202" width="5" height="26" class="p-teal"/>
      ${chip(27, 208, 20, 14, '09', 'p-teal', 'p-paper', 8)}
      <rect x="78" y="210" width="150" height="5" rx="2.5" class="p-text" fill-opacity=".72"/>
    </svg>`;
  }

  /* The script with the elements tagged out of it. An accepted tag is a tinted run
     under a 2px rule; a suggestion nobody has reviewed is the same rule with a
     dashed outline and no fill, exactly as the app draws it. */
  function breakdown() {
    const hl = (x, y, w, dashed) => `
      ${dashed ? '' : `<rect x="${x}" y="${y - 7}" width="${w}" height="10" rx="1.5" class="p-teal" fill-opacity=".18"/>`}
      ${dashed ? `<rect x="${x - 1}" y="${y - 8}" width="${w + 2}" height="12" rx="1.5" fill="none" class="s-teal"
          stroke-dasharray="3 2" stroke-opacity=".7" stroke-width="1"/>` : ''}
      <rect x="${x}" y="${y + 2}" width="${w}" height="2" class="p-teal"/>`;

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>
      <rect x="16" y="14" width="184" height="212" rx="5" class="p-paper"/>
      ${chip(26, 24, 18, 14, '04', 'p-teal', 'p-paper', 8)}
      <text x="50" y="35" font-size="8" class="p-ink">INT. MAJLIS - NIGHT</text>
      <text x="26" y="52" font-size="6" class="p-ink" fill-opacity=".5">1 2/8 PG · ABOUT 1H 30M</text>
      <rect x="26" y="58" width="164" height="1" class="p-ink" fill-opacity=".18"/>
      ${bars(26, 70, 13, [162, 148], 'p-ink', '.3')}
      <rect x="26" y="96" width="46" height="4" rx="2" class="p-ink" fill-opacity=".3"/>
      ${hl(78, 100, 44, false)}
      <rect x="128" y="96" width="34" height="4" rx="2" class="p-ink" fill-opacity=".3"/>
      ${bars(26, 109, 13, [158], 'p-ink', '.3')}
      ${hl(26, 126, 52, false)}
      <rect x="84" y="122" width="62" height="4" rx="2" class="p-ink" fill-opacity=".3"/>
      ${bars(26, 135, 13, [150], 'p-ink', '.3')}
      <rect x="26" y="148" width="38" height="4" rx="2" class="p-ink" fill-opacity=".3"/>
      ${hl(70, 152, 40, true)}
      ${bars(26, 161, 13, [164, 142, 158], 'p-ink', '.3')}
      <text x="26" y="214" font-size="6" class="p-ink" fill-opacity=".5">SELECT ANY WORDS TO TAG THEM</text>

      <rect x="208" y="14" width="96" height="212" rx="5" class="p-surface"/>
      <text x="218" y="28" font-size="6.5" class="p-faint">BREAKDOWN SHEET</text>
      <text x="218" y="40" font-size="9" class="p-text">12 ELEMENTS</text>
      <text x="218" y="50" font-size="6" class="p-warn">3 TO REVIEW</text>
      <rect x="218" y="56" width="78" height="1" class="p-text" fill-opacity=".14"/>
      ${[['CAST', 44, 'p-pale'], ['PROPS', 42, 'p-tint'], ['LOCATIONS', 56, 'p-pale']].map(([l, w, c], i) => {
        const y = 66 + i * 32;
        return `${tag(218, y, w, l, c)}
          <circle cx="222" cy="${y + 24}" r="3" class="${c}"/>
          <rect x="230" y="${y + 22}" width="52" height="4" rx="2" class="p-text" fill-opacity=".45"/>`;
      }).join('')}
      <rect x="214" y="164" width="84" height="52" rx="4" fill="none" class="s-warn" stroke-dasharray="3 2" stroke-width="1"/>
      <text x="220" y="176" font-size="6" class="p-accent">AI · 87%</text>
      <rect x="252" y="172" width="40" height="4" rx="2" class="p-text" fill-opacity=".4"/>
      <rect x="220" y="182" width="1.6" height="20" class="p-text" fill-opacity=".3"/>
      ${bars(226, 186, 8, [60, 48], 'p-text', '.35')}
      ${[['ACCEPT', 'p-teal'], ['CORRECT', 'p-raised'], ['REMOVE', 'p-raised']].map(([l, c], i) =>
        `<rect x="${220 + i * 26}" y="${206}" width="24" height="9" rx="2" class="${c}"/>`).join('')}
    </svg>`;
  }

  /* The link a client opens: the teal header, the brief on paper cards, and the
     one pair of buttons that is the whole feature. Underneath, the version bar
     with its status spine, because a kept version is the other half of it. */
  function approvals() {
    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>
      <rect x="20" y="12" width="280" height="150" rx="6" class="p-surface"/>
      <path d="M20 18a6 6 0 0 1 6-6h268a6 6 0 0 1 6 6v30H20z" class="p-teal"/>
      <rect x="32" y="22" width="44" height="12" rx="2" class="p-paper" fill-opacity=".9"/>
      <text x="32" y="43" font-size="6" class="p-pale">AL THUMAMAH FILMS</text>
      <text x="288" y="33" font-size="8" text-anchor="end" class="p-paper">TREATMENT V2</text>

      ${[['CLIENT', 70], ['OBJECTIVE', 108], ['DELIVERY', 62], ['REVISIONS', 40]].map(([l, w], i) => {
        const y = 60 + i * 15;
        return `<text x="34" y="${y}" font-size="6" class="p-faint">${l}</text>
          <rect x="106" y="${y - 4}" width="${w}" height="4.5" rx="2.25" class="p-text" fill-opacity=".45"/>`;
      }).join('')}
      <rect x="34" y="122" width="118" height="24" rx="5" class="p-teal"/>
      <text x="93" y="137" font-size="7.5" text-anchor="middle" class="p-paper">APPROVE</text>
      <rect x="160" y="122" width="126" height="24" rx="5" fill="none" class="s-tint" stroke-width="1.6"/>
      <text x="223" y="137" font-size="7.5" text-anchor="middle" class="p-tint">REQUEST CHANGES</text>

      <rect x="20" y="172" width="280" height="30" rx="6" class="p-surface"/>
      <rect x="20" y="172" width="3" height="30" class="p-teal"/>
      ${['v1', 'v2', 'v3'].map((v, i) => `
        <rect x="${34 + i * 32}" y="${179}" width="28" height="16" rx="4" class="${i === 1 ? 'p-raised-2' : 'p-raised'}"/>
        <circle cx="${40 + i * 32}" cy="187" r="3" class="${['p-teal', 'p-tint', 'p-faint'][i]}"/>
        <text x="${52 + i * 32}" y="190" font-size="7" text-anchor="middle" class="${i === 1 ? 'p-text' : 'p-faint'}">${v}</text>`).join('')}
      <rect x="138" y="181" width="58" height="12" rx="6" class="p-teal" fill-opacity=".18"/>
      <text x="167" y="190" font-size="6" text-anchor="middle" class="p-accent">SENT</text>
      <text x="210" y="190" font-size="6" class="p-faint">LOCKED ON SEND</text>

      <rect x="20" y="208" width="280" height="22" rx="5" class="p-raised"/>
      <rect x="30" y="212" width="1.6" height="14" class="p-text" fill-opacity=".3"/>
      <text x="38" y="218" font-size="6" class="p-faint">CLIENT NOTE ON V2</text>
      <rect x="38" y="221" width="150" height="4" rx="2" class="p-text" fill-opacity=".4"/>
    </svg>`;
  }

  /* What arrived against what came out. The suggestion row is the app's own: the
     field, the value, the quote on a left rule, and how sure it is. */
  function brief() {
    const wave = Array.from({ length: 15 }, (_, i) => {
      const h = 4 + Math.abs(Math.sin(i * 1.15)) * 14;
      return `<rect x="${58 + i * 5}" y="${(50 - h / 2).toFixed(1)}" width="2.5" height="${h.toFixed(1)}" rx="1.25"
        class="p-pale" fill-opacity=".7"/>`;
    }).join('');

    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>

      <rect x="16" y="26" width="120" height="48" rx="5" class="p-raised"/>
      <path d="M26 34v8M26 38a4 4 0 0 0 8 0" fill="none" class="s-tint" stroke-width="1.4" stroke-linecap="round"/>
      <text x="40" y="41" font-size="8" class="p-text">01:12</text>
      ${wave}
      <text x="26" y="66" font-size="5.5" class="p-faint">VOICE MEMO · KICKOFF CALL</text>

      <rect x="16" y="82" width="120" height="56" rx="5" class="p-raised"/>
      ${bars(26, 94, 10, [96, 84, 100, 72], 'p-text', '.38')}
      <text x="26" y="132" font-size="5.5" class="p-faint">EMAIL FROM YOUSEF · 20 OCT</text>

      <rect x="16" y="146" width="120" height="44" rx="5" class="p-teal" fill-opacity=".16"/>
      <text x="26" y="160" font-size="6" class="p-accent">9 FIELDS FILLED</text>
      <text x="26" y="171" font-size="6" class="p-warn">4 TO REVIEW · 1 CONFLICT</text>
      <text x="26" y="183" font-size="5.5" class="p-faint">STILL MISSING: BUDGET</text>

      <path d="M144 108h16M154 101l8 7-8 7" fill="none" class="s-tint" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

      <rect x="170" y="14" width="134" height="112" rx="6" class="p-surface"/>
      <text x="182" y="30" font-size="6.5" class="p-accent">GOAL</text>
      ${[['OBJECTIVE', 62], ['KEY MESSAGE', 48], ['AUDIENCE', 54], ['TONE', 40]].map(([l, w], i) => {
        const y = 46 + i * 18;
        return `<text x="182" y="${y}" font-size="5.5" class="p-faint">${l}</text>
          <rect x="182" y="${y + 4}" width="${w}" height="4" rx="2" class="p-text" fill-opacity=".45"/>
          <text x="292" y="${y}" font-size="5" text-anchor="end" class="p-accent">AI</text>`;
      }).join('')}
      <text x="182" y="118" font-size="7.5" class="p-text">SAR 280K TO 320K</text>

      <rect x="170" y="134" width="134" height="94" rx="6" class="p-surface"/>
      <text x="182" y="148" font-size="5.5" class="p-faint">DELIVERY DATE</text>
      <text x="182" y="162" font-size="9" class="p-text">4 NOV</text>
      <rect x="182" y="170" width="1.6" height="22" class="p-text" fill-opacity=".3"/>
      ${bars(190, 174, 9, [86, 72], 'p-text', '.35')}
      <text x="190" y="200" font-size="5" class="p-faint">YOUSEF · 14:02</text>
      <rect x="182" y="206" width="30" height="12" rx="6" class="p-teal" fill-opacity=".2"/>
      <text x="197" y="215" font-size="6" text-anchor="middle" class="p-accent">87%</text>
      ${[['ACCEPT', 'p-teal'], ['CORRECT', 'p-raised'], ['REMOVE', 'p-raised']].map(([, c], i) =>
        `<rect x="${218 + i * 28}" y="206" width="26" height="12" rx="3" class="${c}"/>`).join('')}
    </svg>`;
  }

  /* The shot list as it is worked: the storyboard thumbnail, the mono code, the
     size chip, the setup counter, and a done row struck through at half strength. */
  function shots() {
    const sketch = (k) => [
      '<path d="M4 26h48" class="s-tint" stroke-width="1.2" stroke-opacity=".8"/><rect x="22" y="14" width="7" height="12" class="p-pale" fill-opacity=".8"/>',
      '<circle cx="28" cy="15" r="6" class="p-pale" fill-opacity=".8"/><path d="M18 30c0-6 4.4-10 10-10s10 4 10 10z" class="p-pale" fill-opacity=".45"/>',
      '<circle cx="28" cy="17" r="12" class="p-pale" fill-opacity=".28"/><circle cx="28" cy="17" r="4" class="p-tint"/>',
    ][k % 3];

    const rows = [
      ['4A', 'WS', '1', 1], ['4B', 'MS', '2', 1], ['4C', 'CU', '2', 0], ['4D', 'OTS', '3', 0],
    ];
    return `<svg viewBox="${VB}" aria-hidden="true">
      <rect width="320" height="240" class="p-deep"/>
      <rect x="16" y="12" width="288" height="18" class="p-raised"/>
      ${chip(26, 15, 32, 12, 'DAY 2', 'p-teal', 'p-paper', 7)}
      <text x="66" y="24" font-size="7" class="p-text">TUE 4 NOV</text>
      <text x="294" y="24" font-size="6" text-anchor="end" class="p-faint">3 SHOOT DAYS</text>

      <rect x="16" y="34" width="288" height="16" class="p-bg"/>
      <text x="26" y="45" font-size="7" class="p-accent">SC. 4</text>
      <text x="56" y="45" font-size="7" class="p-text-2">INT. MAJLIS - NIGHT</text>
      <text x="238" y="45" font-size="6.5" text-anchor="end" class="p-faint">2/4</text>
      <rect x="244" y="40" width="50" height="5" rx="2.5" class="p-text" fill-opacity=".16"/>
      <rect x="244" y="40" width="25" height="5" rx="2.5" class="p-teal"/>

      ${rows.map(([code, size, setup, done], i) => {
        const y = 54 + i * 44;
        const o = done ? '.5' : '1';
        return `<g fill-opacity="${o}" opacity="${o}">
          <rect x="16" y="${y}" width="288" height="42" class="p-surface"/>
          <rect x="16" y="${y + 41}" width="288" height="1" class="p-text" fill-opacity=".1"/>
          ${done ? tick(32, y + 21, 6) : `<circle cx="32" cy="${y + 21}" r="6" fill="none" class="s-line" stroke-width="1.4"/>`}
          <rect x="46" y="${y + 8}" width="46" height="26" rx="3" class="p-frame"/>
          <g transform="translate(46 ${y + 8}) scale(0.82)" fill="none">${sketch(i)}</g>
          <text x="104" y="${y + 24}" font-size="8" class="p-text">${code}</text>
          ${chip(126, y + 14, 26, 13, size, 'p-accent-soft', 'p-accent', 7)}
          <rect x="162" y="${y + 19}" width="${96 - i * 8}" height="4" rx="2" class="p-text" fill-opacity=".42"/>
          ${done ? `<rect x="162" y="${y + 20}" width="${96 - i * 8}" height="1" class="p-faint"/>` : ''}
          <circle cx="278" cy="${y + 21}" r="8" class="p-raised-2"/>
          <text x="278" y="${y + 24}" font-size="7.5" text-anchor="middle" class="p-text">${setup}</text>
        </g>`;
      }).join('')}
    </svg>`;
  }

  const PICS = { callsheet, board, breakdown, approvals, brief, shots };

  const ARROW = (dir) => `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="${dir < 0 ? 'M13 8H2M6 4L2 8l4 4' : 'M3 8h11M10 4l4 4-4 4'}"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function build() {
    const root = document.querySelector('.fcar');
    const D = window.KLDATA;
    if (!root || !D) return;
    const items = D.features.items;

    root.innerHTML = `
      <div class="fcar__head wrap" data-reveal="up">
        <h2 class="fcar__title" id="fcar-title">${D.features.title}</h2>
        <div class="fcar__arrows">
          <button class="fcar__arrow" type="button" data-dir="-1" aria-label="Previous feature" disabled>${ARROW(-1)}</button>
          <button class="fcar__arrow" type="button" data-dir="1" aria-label="Next feature">${ARROW(1)}</button>
        </div>
      </div>

      <div class="fcar__rail" role="group" aria-labelledby="fcar-title" tabindex="0">
        ${items.map((f, i) => `
          <article class="fcar__card" aria-roledescription="slide" aria-label="${i + 1} of ${items.length}, ${f.title}">
            <div class="fcar__pic">${(PICS[f.key] || PICS.callsheet)()}</div>
            <h3 class="fcar__name">${f.title}</h3>
            <p class="fcar__body">${f.body}</p>
          </article>`).join('')}
      </div>

      <div class="fcar__count wrap" aria-live="polite">
        <span class="fcar__count-n">01</span>
        <span class="fcar__count-of">/ ${String(items.length).padStart(2, '0')}</span>
        <span class="fcar__count-name">${items[0].title}</span>
      </div>`;

    const rail = root.querySelector('.fcar__rail');
    const cards = [...root.querySelectorAll('.fcar__card')];
    const arrows = [...root.querySelectorAll('.fcar__arrow')];
    const nEl = root.querySelector('.fcar__count-n');
    const nameEl = root.querySelector('.fcar__count-name');
    const smooth = window.KL && KL.reduced ? 'auto' : 'smooth';

    /* Where a snapped card's leading edge sits, in client coordinates. */
    function originX() {
      const pad = parseFloat(getComputedStyle(rail).paddingInlineStart) || 0;
      return rail.getBoundingClientRect().left + pad;
    }

    function activeIndex() {
      const x = originX();
      let best = 0;
      let d = Infinity;
      cards.forEach((c, i) => {
        const dist = Math.abs(c.getBoundingClientRect().left - x);
        if (dist < d) { d = dist; best = i; }
      });
      return best;
    }

    function go(i) {
      const n = Math.max(0, Math.min(cards.length - 1, i));
      const left = rail.scrollLeft + (cards[n].getBoundingClientRect().left - originX());
      rail.scrollTo({ left, behavior: smooth });
    }

    let shown = -1;
    function sync() {
      const i = activeIndex();
      if (i !== shown) {
        shown = i;
        nEl.textContent = String(i + 1).padStart(2, '0');
        nameEl.textContent = items[i].title;
      }
      const max = rail.scrollWidth - rail.clientWidth;
      arrows[0].disabled = rail.scrollLeft <= 1;
      arrows[1].disabled = rail.scrollLeft >= max - 1;
    }

    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    arrows.forEach((b) => b.addEventListener('click', () => go(activeIndex() + Number(b.dataset.dir))));

    rail.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in map) { e.preventDefault(); go(activeIndex() + map[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(cards.length - 1); }
    });

    /* Lenis takes every wheel event on the window and preventDefaults it, which
       would eat a sideways trackpad swipe before the rail ever sees it. A
       horizontal gesture is stopped here so the native scroll survives; a
       vertical one is left alone and still scrolls the page. */
    rail.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
    }, { passive: true });

    /* Mouse drag only. Touch already scrolls this container natively, and
       handling both is how a carousel ends up fighting itself. */
    let id = null;
    let x0 = 0;
    let s0 = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      id = e.pointerId; x0 = e.clientX; s0 = rail.scrollLeft;
    });
    rail.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (!rail.classList.contains('is-dragging')) {
        if (Math.abs(dx) < 4) return;
        rail.classList.add('is-dragging');
        rail.setPointerCapture(id);
      }
      rail.scrollLeft = s0 - dx;
    });
    function endDrag(e) {
      if (id === null || (e && e.pointerId !== id)) return;
      id = null;
      if (rail.classList.contains('is-dragging')) {
        rail.classList.remove('is-dragging');
        go(activeIndex());   /* snapping was off during the drag, so land it here */
      }
    }
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);

    if (window.KL && KL.autoReveal) KL.autoReveal(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
