/* Klaket Motion Lab.
   Every default below is the value the real page runs on today, read out of the
   repo, so the lab opens on the shipped motion and any change you see is yours. */
(function () {
  var KEY = 'klaket.motion.v1';
  var EASES = ['none','power1.out','power2.out','power3.out','power4.out',
               'power1.in','power2.in','power3.in','power4.in',
               'power2.inOut','power3.inOut','power4.inOut',
               'expo.out','circ.out','sine.inOut','back.out(1.7)','back.out(2.6)',
               'elastic.out(1, 0.4)','elastic.out(1, 0.75)'];

  var SPEED = 1;

  /* ---------------------------------------------------------------- helpers */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function words(s) {
    return s.split(' ').map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-up');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('is-up'); }, 1400);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied'); },
        function () { toast('Select the snippet and copy'); });
    } else {
      toast('Select the snippet and copy');
    }
  }

  /* The clapperboard, drawn flat. The same shape the pages use, so the timing
     reads the same even though the real one has depth. */
  function boardSVG() {
    var fields = [['SCENE','01'],['TAKE','01'],['ROLL','A']];
    var cells = fields.map(function (f, i) {
      var x = 16 + i * 108;
      return '<text x="' + x + '" y="112" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.6" fill="rgba(246,235,217,.55)">' + f[0] + '</text>' +
             '<text x="' + x + '" y="140" font-family="Cairo, sans-serif" font-weight="900" font-size="26" fill="#F6EBD9">' + f[1] + '</text>' +
             '<line x1="' + x + '" y1="149" x2="' + (x + 86) + '" y2="149" stroke="rgba(246,235,217,.3)" stroke-width="1.5"/>';
    }).join('');
    return '<svg viewBox="0 0 352 210" aria-hidden="true">' +
      '<defs><pattern id="lab-st" width="26" height="26" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
      '<rect width="13" height="26" fill="#F6EBD9"/><rect x="13" width="13" height="26" fill="#121212"/></pattern></defs>' +
      '<rect x="0" y="56" width="352" height="154" rx="7" fill="#0F5C57"/>' +
      '<text x="16" y="80" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.6" fill="rgba(246,235,217,.55)">PRODUCTION</text>' +
      '<text x="104" y="80" font-family="Cairo, sans-serif" font-weight="900" font-size="15" fill="#F6EBD9">KLAKET</text>' +
      cells +
      '<rect x="0" y="30" width="352" height="26" rx="4" fill="url(#lab-st)"/>' +
      '<g class="stick" style="transform-origin:4px 46px"><rect x="0" y="2" width="352" height="26" rx="4" fill="url(#lab-st)"/></g>' +
      '</svg>';
  }

  /* --------------------------------------------------------------- modules */
  var MODULES = [

  { id:'clap', name:'The clap', where:'heroes/h1-clap.js',
    blurb:'The opening sequence. The board swings in, the stick falls under its own weight, the screen takes a single frame of white, and the headline lands on that frame rather than on page load. Everything downstream is timed off the impact.',
    controls:[
      {g:'Board'},
      {k:'entryDur', label:'Swing in', min:.2, max:2.5, step:.05, def:1.1, unit:'s'},
      {k:'entryEase', label:'Swing ease', type:'ease', def:'power3.out'},
      {g:'Stick'},
      {k:'stickAt', label:'Starts at', min:0, max:1.6, step:.02, def:.62, unit:'s'},
      {k:'stickDur', label:'Falls over', min:.08, max:1.2, step:.02, def:.42, unit:'s'},
      {k:'stickEase', label:'Fall ease', type:'ease', def:'power3.in'},
      {g:'Flash'},
      {k:'flashPeak', label:'Brightness', min:0, max:1, step:.05, def:.55, unit:''},
      {k:'flashIn', label:'In', min:.01, max:.3, step:.01, def:.05, unit:'s'},
      {k:'flashOut', label:'Out', min:.05, max:1, step:.05, def:.3, unit:'s'},
      {g:'Settle'},
      {k:'ringDur', label:'Ring out', min:.1, max:1.6, step:.05, def:.6, unit:'s'},
      {k:'ringEase', label:'Ring ease', type:'ease', def:'elastic.out(1, 0.4)'},
      {g:'Headline'},
      {k:'wordDur', label:'Word rise', min:.2, max:1.6, step:.05, def:.7, unit:'s'},
      {k:'wordStagger', label:'Word stagger', min:0, max:.2, step:.005, def:.045, unit:'s'},
      {k:'wordY', label:'Word distance', min:0, max:90, step:2, def:34, unit:'px'},
      {k:'restStagger', label:'Rest stagger', min:0, max:.3, step:.01, def:.08, unit:'s'},
    ],
    stage: function (s) {
      s.appendChild(el('div','board', boardSVG() + '<div class="flash"></div>'));
      s.appendChild(el('p','hl', words('Every production starts with a clap.')));
      s.appendChild(el('p','sub','\u0643\u0644 \u0634\u063a\u0644 \u064a\u0628\u062f\u0623 \u0628\u0643\u0644\u0627\u0643\u064a\u062a.'));
      return {
        board: s.querySelector('.board'), stick: s.querySelector('.stick'),
        flash: s.querySelector('.flash'), ws: s.querySelectorAll('.w'),
        rest: [s.querySelector('.sub')],
      };
    },
    play: function (d, v) {
      var tl = gsap.timeline();
      tl.timeScale(SPEED);
      gsap.set(d.stick, { rotation: -34 });
      gsap.set(d.flash, { opacity: 0 });
      tl.from(d.board, { x: 70, y: 40, rotation: 7, opacity: 0, duration: v.entryDur, ease: v.entryEase }, 0)
        .to(d.stick, { rotation: 0, duration: v.stickDur, ease: v.stickEase }, v.stickAt);
      var hit = v.stickAt + v.stickDur;
      tl.to(d.flash, { opacity: v.flashPeak, duration: v.flashIn, ease: 'none' }, hit)
        .to(d.flash, { opacity: 0, duration: v.flashOut, ease: 'power2.out' }, hit + v.flashIn)
        .fromTo(d.board, { rotation: 0 }, { rotation: 0, duration: v.ringDur, ease: v.ringEase,
          startAt: { rotation: 1.6 } }, hit)
        .from(d.ws, { y: v.wordY, opacity: 0, duration: v.wordDur, stagger: v.wordStagger, ease: 'power3.out' }, hit)
        .from(d.rest, { y: 18, opacity: 0, duration: v.wordDur, stagger: v.restStagger, ease: 'power3.out' }, hit + 0.14);
      return tl;
    },
    snippet: function (v) {
      return 'heroes/h1-clap.js\n' +
        '  tl.from(slate.position, { duration: ' + v.entryDur + ", ease: '" + v.entryEase + "' }, 0)\n" +
        '    .to(state, { t: 1, duration: ' + v.stickDur + ", ease: '" + v.stickEase + "' }, " + v.stickAt + ')\n' +
        '    .to(flash, { opacity: ' + v.flashPeak + ', duration: ' + v.flashIn + " }, " + (v.stickAt + v.stickDur).toFixed(2) + ')\n' +
        '    .to(flash, { opacity: 0, duration: ' + v.flashOut + " })\n" +
        '    .to(slate.rotation, { z: 0, duration: ' + v.ringDur + ", ease: '" + v.ringEase + "' })\n" +
        '  settle(): y: ' + v.wordY + ', duration: ' + v.wordDur + ', stagger: ' + v.wordStagger + '\n' +
        '            rest stagger: ' + v.restStagger;
    } },

  { id:'reveal', name:'Reveals', where:'core/boot.js, KL.reveal',
    blurb:'One helper does every entrance on the site, which is why the whole page feels like one hand made it. Change it here and every section changes together.',
    controls:[
      {k:'dur', label:'Duration', min:.2, max:2, step:.05, def:.9, unit:'s'},
      {k:'ease', label:'Ease', type:'ease', def:'power3.out'},
      {k:'stagger', label:'Stagger', min:0, max:.4, step:.01, def:.06, unit:'s'},
      {k:'y', label:'Distance', min:0, max:100, step:2, def:28, unit:'px'},
    ],
    stage: function (s) {
      var c = el('div','cards');
      [['One thread the crew already reads','Call sheet, schedule and brief in one place'],
       ['The breakdown writes itself','Scenes, cast, props and locations, tagged'],
       ['Approvals that leave a trail','Every version kept, nothing shot from last week'],
       ['Built by people who shoot','Every screen comes from a real production day']
      ].forEach(function (r) { c.appendChild(el('div','card','<b>' + r[0] + '</b><span>' + r[1] + '</span>')); });
      s.appendChild(c);
      return { items: c.children };
    },
    play: function (d, v) {
      var tl = gsap.timeline(); tl.timeScale(SPEED);
      tl.from(d.items, { y: v.y, opacity: 0, duration: v.dur, stagger: v.stagger, ease: v.ease });
      return tl;
    },
    snippet: function (v) {
      return 'core/boot.js\n' +
        '  REVEALS.up = { y: ' + v.y + ', opacity: 0 }\n' +
        '  reveal(): duration: ' + v.dur + ", ease: '" + v.ease + "', stagger: " + v.stagger;
    } },

  { id:'island', name:'The island nav', where:'core/nav.js',
    blurb:'The pill grows into a card. The width and the radius move on one tween while the panel opens on another, which is what makes the eye read it as one object changing shape rather than two things moving.',
    controls:[
      {k:'morphDur', label:'Morph', min:.15, max:1.6, step:.02, def:.62, unit:'s'},
      {k:'openEase', label:'Open ease', type:'ease', def:'power3.out'},
      {k:'closeEase', label:'Close ease', type:'ease', def:'power3.inOut'},
      {k:'linkDur', label:'Link rise', min:.1, max:1.2, step:.05, def:.5, unit:'s'},
      {k:'linkStagger', label:'Link stagger', min:0, max:.25, step:.005, def:.05, unit:'s'},
      {k:'linkDelay', label:'Link delay', min:0, max:.6, step:.02, def:.1, unit:'s'},
    ],
    stage: function (s) {
      var i = el('div','island',
        '<div class="island-bar"><span class="m"></span><b>KLAKET</b><span class="mi">Menu</span><span class="cta">Request Demo</span></div>' +
        '<div class="island-panel"><ul><li>Why Klaket</li><li>How it works</li><li>Features</li><li>Questions</li><li>Journal</li></ul></div>');
      s.appendChild(i);
      return { island: i, bar: i.querySelector('.island-bar'), panel: i.querySelector('.island-panel'), links: i.querySelectorAll('li'), open: false };
    },
    play: function (d, v) {
      var tl = gsap.timeline(); tl.timeScale(SPEED);
      var barW = d.bar.scrollWidth + 2;
      var openW = Math.min(360, d.island.parentElement.clientWidth - 32);
      /* Open, hold, close, so one replay shows the whole behaviour. */
      tl.set(d.island, { width: barW, borderRadius: 999 })
        .set(d.panel, { height: 0, paddingTop: 0, paddingBottom: 0 })
        .to(d.island, { width: openW, borderRadius: 18, duration: v.morphDur, ease: v.openEase }, 0)
        .to(d.panel, { height: 'auto', paddingTop: 12, paddingBottom: 14, duration: v.morphDur, ease: v.openEase }, 0)
        .fromTo(d.links, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: v.linkDur, stagger: v.linkStagger, ease: 'power3.out' }, v.linkDelay)
        .to({}, { duration: 1.1 })
        .to(d.panel, { height: 0, paddingTop: 0, paddingBottom: 0, duration: v.morphDur, ease: v.closeEase })
        .to(d.island, { width: barW, borderRadius: 999, duration: v.morphDur, ease: v.closeEase }, '<');
      return tl;
    },
    snippet: function (v) {
      return 'core/nav.js, setOpen()\n' +
        '  shell: duration: ' + v.morphDur + ", ease: open ? '" + v.openEase + "' : '" + v.closeEase + "'\n" +
        '  panel: duration: ' + v.morphDur + ' (same tween length, or the two separate)\n' +
        '  links: duration: ' + v.linkDur + ', stagger: ' + v.linkStagger + ', delay: ' + v.linkDelay;
    } },

  { id:'rolling', name:'Things that never stop', where:'core/companies.js, core/footer.js',
    blurb:'The trust strip and the footer tape are both paced by distance per second rather than by a duration, so a long list and a short one travel at the same speed. Hover a name and the strip eases to a stop instead of halting, because a hard stop on a moving row reads as a bug.',
    controls:[
      {g:'Trust strip'},
      {k:'marquee', label:'Speed', min:20, max:200, step:5, def:70, unit:'px/s'},
      {k:'stopDur', label:'Ease to stop', min:.05, max:1.5, step:.05, def:.45, unit:'s'},
      {k:'stopEase', label:'Stop ease', type:'ease', def:'power2.out'},
      {g:'Footer tape'},
      {k:'tape', label:'Speed', min:20, max:200, step:5, def:58, unit:'px/s'},
      {k:'frame', label:'Frame width', min:60, max:200, step:4, def:108, unit:'px'},
    ],
    stage: function (s) {
      var names = ['NORTHLIGHT','STUDIO ONE','ATLAS PICTURES','MERIDIAN','REDLINE FILMS','HARBOUR'];
      var r = el('div','roll','<div class="roll-track">' +
        names.concat(names).map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>');
      var frames = '';
      for (var i = 0; i < 18; i++) {
        frames += '<svg width="54" height="60" viewBox="0 0 108 120" aria-hidden="true">' +
          '<rect width="108" height="120" fill="#1A1917" stroke="#0B0B0B" stroke-width="2"/>' +
          [8, 104].map(function (y) {
            var h = ''; for (var k = 0; k < 5; k++) h += '<rect x="' + (9 + k * 20) + '" y="' + y + '" width="10" height="8" rx="2" fill="#0B0B0B"/>';
            return h;
          }).join('') +
          '<rect x="12" y="34" width="84" height="52" rx="2" fill="' + (i % 2 ? '#262523' : '#0F5C57') + '"/></svg>';
      }
      var t = el('div','tape','<div class="tape-track">' + frames + frames + '</div>');
      var reels = el('div','reels',
        '<svg viewBox="0 0 60 60"><g class="rl" style="transform-origin:30px 30px"><circle cx="30" cy="30" r="26" fill="none" stroke="#5FA8A1" stroke-width="2.4"/><circle cx="30" cy="30" r="6" fill="none" stroke="#5FA8A1" stroke-width="2.4"/><path d="M30 4V16M30 44V56M4 30H16M44 30H56" stroke="#5FA8A1" stroke-width="2.4"/></g></svg>' +
        '<svg viewBox="0 0 60 60"><g class="rl" style="transform-origin:30px 30px"><circle cx="30" cy="30" r="26" fill="none" stroke="#5FA8A1" stroke-width="2.4"/><circle cx="30" cy="30" r="6" fill="none" stroke="#5FA8A1" stroke-width="2.4"/><path d="M30 4V16M30 44V56M4 30H16M44 30H56" stroke="#5FA8A1" stroke-width="2.4"/></g></svg>');
      var box = el('div', null); box.style.width = '100%';
      box.appendChild(r); box.appendChild(t); box.appendChild(reels);
      s.appendChild(box);
      return { rollTrack: r.querySelector('.roll-track'), tapeTrack: t.querySelector('.tape-track'),
               reels: reels.querySelectorAll('.rl'), names: r.querySelectorAll('span'), loops: [] };
    },
    play: function (d, v) {
      d.loops.forEach(function (l) { l.kill(); });
      d.loops = [];
      gsap.set([d.rollTrack, d.tapeTrack], { x: 0 });
      var rh = d.rollTrack.scrollWidth / 2;
      var th = d.tapeTrack.scrollWidth / 2;
      var roll = gsap.to(d.rollTrack, { x: -rh, duration: rh / v.marquee, ease: 'none', repeat: -1 });
      var tape = gsap.to(d.tapeTrack, { x: -th, duration: th / v.tape, ease: 'none', repeat: -1 });
      var turn = gsap.to(d.reels, { rotation: 360, duration: (v.frame / v.tape) * 4, ease: 'none', repeat: -1 });
      [roll, tape, turn].forEach(function (l) { l.timeScale(SPEED); d.loops.push(l); });
      d.names.forEach(function (n) {
        n.onpointerenter = function () { gsap.to(roll, { timeScale: 0, duration: v.stopDur, ease: v.stopEase, overwrite: true }); };
        n.onpointerleave = function () { gsap.to(roll, { timeScale: SPEED, duration: v.stopDur, ease: v.stopEase, overwrite: true }); };
      });
      return null;
    },
    snippet: function (v) {
      return 'core/companies.js\n' +
        '  duration: half / ' + v.marquee + '        // px per second\n' +
        '  ease(): duration: ' + v.stopDur + ", ease: '" + v.stopEase + "'\n\n" +
        'core/footer.js\n' +
        '  const SPEED = ' + v.tape + ';\n' +
        '  turn: duration: (' + v.frame + ' / SPEED) * 4';
    } },

  { id:'focus', name:'The reel in focus', where:'sections/value-reel.js',
    blurb:'The cards falling through the gap in the headline are weighted every frame by how near they are to the middle of the screen. That weighting is the whole effect: it is what makes one card feel in focus and the rest feel like noise going past. Drag the scrubber to move the reel.',
    controls:[
      {k:'width', label:'Focus band', min:.15, max:1, step:.01, def:.42, unit:'× height'},
      {k:'blur', label:'Blur at the edge', min:0, max:14, step:.5, def:5, unit:'px'},
      {k:'opacity', label:'Dimmest', min:0, max:.6, step:.01, def:.08, unit:''},
      {k:'scale', label:'Smallest', min:.6, max:1, step:.01, def:.9, unit:'×'},
      {g:'Scroll feel'},
      {k:'scrub', label:'Scrub lag', min:0, max:2, step:.05, def:.6, unit:'s'},
      {k:'screens', label:'Pin length', min:1, max:6, step:.1, def:3.2, unit:'screens'},
    ],
    stage: function (s) {
      var wrap = el('div', null); wrap.style.width = '100%';
      var stack = el('div','reel-stack');
      [['WhatsApp','Location moved to the north gate. Tell camera.'],
       ['Email','Approved, but scene 4 is out. Deck attached (v7-FINAL-2).'],
       ['schedule_v11.xlsx','Day 2, 6 scenes, 14 crew. Last edited by someone.'],
       ['callsheet_FINAL.pdf','Printed before the location changed.'],
       ['Klaket','North gate. Call 05:30. Read by 14 of 14.']
      ].forEach(function (r, i) {
        stack.appendChild(el('div','rc' + (i === 4 ? ' is-k' : ''), '<b>' + r[0] + '</b><span>' + r[1] + '</span>'));
      });
      var scrub = el('input'); scrub.type = 'range'; scrub.min = 0; scrub.max = 1; scrub.step = 0.001; scrub.value = 0.5;
      scrub.setAttribute('aria-label', 'Scrub the reel');
      scrub.style.cssText = 'width:100%;margin-top:.9rem;accent-color:var(--accent)';
      wrap.appendChild(stack); wrap.appendChild(scrub);
      s.appendChild(wrap);
      return { stack: stack, cards: stack.children, scrub: scrub, host: s };
    },
    play: function (d, v) {
      function paint() {
        var p = parseFloat(d.scrub.value);
        var box = d.host.getBoundingClientRect();
        var mid = box.top + box.height / 2;
        var travel = d.stack.scrollHeight + box.height * 0.8;
        gsap.set(d.stack, { y: box.height * 0.45 - p * travel });
        for (var i = 0; i < d.cards.length; i++) {
          var c = d.cards[i], r = c.getBoundingClientRect();
          var dist = Math.abs(r.top + r.height / 2 - mid) / (box.height * v.width);
          var k = Math.max(0, 1 - dist * dist);
          c.style.opacity = String(v.opacity + k * (1 - v.opacity));
          c.style.filter = k > 0.92 ? 'none' : 'blur(' + ((1 - k) * v.blur).toFixed(2) + 'px)';
          c.style.transform = 'scale(' + (v.scale + k * (1 - v.scale)).toFixed(3) + ')';
        }
      }
      d.scrub.oninput = paint;
      paint();
      return null;
    },
    snippet: function (v) {
      return 'sections/value-reel.js\n' +
        '  scrollTrigger: { scrub: ' + v.scrub + ", end: '+=' + window.innerHeight * " + v.screens + ' }\n' +
        '  const d = ... / (window.innerHeight * ' + v.width + ');\n' +
        '  const k = Math.max(0, 1 - d * d);\n' +
        '  opacity = ' + v.opacity + ' + k * ' + (1 - v.opacity).toFixed(2) + ';\n' +
        '  blur    = (1 - k) * ' + v.blur + ';\n' +
        '  scale   = ' + v.scale + ' + k * ' + (1 - v.scale).toFixed(2) + ';';
    } },

  { id:'faq', name:'The questions list', where:'core/faq.js',
    blurb:'One open at a time, on a height tween. Small, but it is the motion people touch most, so it is worth getting the weight right.',
    controls:[
      {k:'dur', label:'Open and close', min:.1, max:1.2, step:.05, def:.45, unit:'s'},
      {k:'ease', label:'Ease', type:'ease', def:'power3.inOut'},
    ],
    stage: function (s) {
      var f = el('div','faq');
      [['Does the crew need an account?','No. Call sheets, approvals and shot lists open on a link, on a phone, with no sign-up.'],
       ['Does it work in Arabic?','The whole platform runs in Arabic and English, and call sheets go out in both.'],
       ['What happens to our data?','Your productions are yours. Export every one as files you own, at any time.']
      ].forEach(function (r, i) {
        var it = el('div','faq-i',
          '<button type="button" class="faq-q"><span>' + r[0] + '</span></button>' +
          '<div class="faq-a"><p>' + r[1] + '</p></div>');
        f.appendChild(it);
      });
      s.appendChild(f);
      return { items: f.querySelectorAll('.faq-i') };
    },
    play: function (d, v) {
      var open = -1;
      d.items.forEach(function (it, i) {
        var panel = it.querySelector('.faq-a');
        gsap.set(panel, { height: 0 });
        it.querySelector('.faq-q').onclick = function () {
          d.items.forEach(function (o, j) {
            if (j !== i) gsap.to(o.querySelector('.faq-a'), { height: 0, duration: v.dur, ease: v.ease, overwrite: true });
          });
          var to = open === i ? 0 : 'auto';
          open = open === i ? -1 : i;
          gsap.to(panel, { height: to, duration: v.dur, ease: v.ease, overwrite: true });
        };
      });
      /* Open the first one so a replay shows the motion without a click. */
      var first = d.items[0].querySelector('.faq-a');
      gsap.set(first, { height: 0 });
      gsap.to(first, { height: 'auto', duration: v.dur, ease: v.ease, delay: .2 });
      open = 0;
      return null;
    },
    snippet: function (v) {
      return 'core/faq.js, set()\n' +
        '  g.to(panel, { height: open ? \'auto\' : 0, duration: ' + v.dur + ", ease: '" + v.ease + "' })";
    } },
  ];

  /* ----------------------------------------------------------------- state */
  var state = {};
  function defaults(m) {
    var o = {};
    m.controls.forEach(function (c) { if (c.k) o[c.k] = c.def; });
    return o;
  }
  function load() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    MODULES.forEach(function (m) {
      state[m.id] = Object.assign(defaults(m), saved[m.id] || {});
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ------------------------------------------------------------------ build */
  var live = {};

  function buildModule(m) {
    var sec = el('section','mod');
    sec.id = 'm-' + m.id;
    var head = el('div','mod-head',
      '<h2>' + m.name + '</h2><span class="where">' + m.where + '</span><p>' + m.blurb + '</p>');
    sec.appendChild(head);

    var body = el('div','mod-body');
    var stage = el('div','stage');
    stage.appendChild(el('span','stage-tag mono', m.id));
    var replay = el('button','btn replay','Replay');
    replay.type = 'button';
    stage.appendChild(replay);
    var mount = el('div', null);
    mount.style.cssText = 'width:100%;display:grid;place-items:center';
    stage.appendChild(mount);

    var panel = el('div','panel');
    m.controls.forEach(function (c) {
      if (c.g) { panel.appendChild(el('div','grp', c.g)); return; }
      var row = el('div','ctl' + (c.type === 'ease' ? ' ctl--sel' : ''));
      var id = m.id + '-' + c.k;
      row.appendChild(el('label', null, c.label)).setAttribute('for', id);
      var out = el('output', null, '');
      row.appendChild(out);
      var input;
      if (c.type === 'ease') {
        input = el('select');
        EASES.forEach(function (e) {
          var o = el('option', null, e);
          o.value = e;
          input.appendChild(o);
        });
      } else {
        input = el('input');
        input.type = 'range';
        input.min = c.min; input.max = c.max; input.step = c.step;
      }
      input.id = id;
      input.value = state[m.id][c.k];
      function show() {
        out.textContent = c.type === 'ease' ? '' : input.value + (c.unit ? ' ' + c.unit : '');
      }
      show();
      input.addEventListener('input', function () {
        state[m.id][c.k] = c.type === 'ease' ? input.value : parseFloat(input.value);
        show(); save(); run(m); writeSnippet(m);
      });
      row.appendChild(input);
      panel.appendChild(row);
    });

    var reset = el('button','btn','Reset this one');
    reset.type = 'button';
    reset.style.marginTop = '.85rem';
    reset.addEventListener('click', function () {
      state[m.id] = defaults(m);
      save();
      panel.querySelectorAll('input,select').forEach(function (i) {
        var k = i.id.slice(m.id.length + 1);
        i.value = state[m.id][k];
        i.dispatchEvent(new Event('input'));
      });
    });
    panel.appendChild(reset);

    body.appendChild(stage); body.appendChild(panel);
    sec.appendChild(body);

    var snip = el('details','snip','<summary>Where this lives in the code</summary><pre></pre>');
    var copyBtn = el('button','btn','Copy this block');
    copyBtn.type = 'button';
    copyBtn.style.marginTop = '.6rem';
    copyBtn.addEventListener('click', function () { copy(m.snippet(state[m.id])); });
    snip.appendChild(copyBtn);
    sec.appendChild(snip);

    document.getElementById('mods').appendChild(sec);

    live[m.id] = { m: m, mount: mount, snip: snip.querySelector('pre'), tl: null, d: null };
    live[m.id].d = m.stage(mount);
    replay.addEventListener('click', function () { run(m); });
    writeSnippet(m);
    return sec;
  }

  function writeSnippet(m) {
    live[m.id].snip.textContent = m.snippet(state[m.id]);
  }

  function run(m) {
    var L = live[m.id];
    if (L.tl) { L.tl.kill(); L.tl = null; }
    L.tl = m.play(L.d, state[m.id]);
  }

  function runAll() { MODULES.forEach(run); }

  /* ------------------------------------------------------------------- boot */
  load();
  MODULES.forEach(buildModule);
  runAll();

  document.getElementById('playAll').addEventListener('click', runAll);
  document.getElementById('resetAll').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });
  document.getElementById('speed').addEventListener('change', function (e) {
    SPEED = parseFloat(e.target.value);
    runAll();
  });
  document.getElementById('copyAll').addEventListener('click', function () {
    var out = ['Klaket motion values', 'Paths are relative to docs/site/', ''];
    MODULES.forEach(function (m) { out.push(m.snippet(state[m.id]), ''); });
    copy(out.join('\n'));
  });

  /* A lab is motion, so it cannot be silent under reduced motion, but it can
     stop replaying by itself: only the first paint runs, the rest is on demand. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.globalTimeline.timeScale(1);
  }
})();
