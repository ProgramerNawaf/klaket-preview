/* Every word on the site lives here, so 24 variants never drift apart on copy
   and a wording change is one edit. Arabic sits beside English, never as a
   literal translation: the Arabic is what a crew would actually say. */
window.KLDATA = {

  /* ---------------------------------------------------------------- hero */
  hero: {
    slogan:   'Every production starts with a clap.',
    sloganAr: 'كل شغل يبدأ بكلاكيت.',   /* "every job begins with a clapperboard" */
    lede: 'Klaket is the production platform for film crews. Brief, breakdown, schedule, call sheet and wrap, in one place the whole crew already understands.',
    ledeAr: 'منصة الإنتاج لطواقم التصوير. البريف والتفصيل والجدول والكول شيت، في مكان واحد يفهمه الفريق كله.',
    primary:   { label: 'Request Demo', href: '../demo/' },
    secondary: { label: 'Sign in', href: '../../index.html' },
  },

  /* ----------------------------------------------------------- nav items
     Each carries the still shown in the island's preview panel. */
  nav: [
    { id: 'value',    label: 'Why Klaket',   caption: 'What the scattered thread costs you', still: 'thread' },
    { id: 'journey',  label: 'How it works', caption: 'Brief to wrap, one continuous take',  still: 'route' },
    { id: 'features', label: 'Features',     caption: 'What the crew gets on the day',       still: 'callsheet' },
    { id: 'faq',      label: 'Questions',    caption: 'Pricing, data, languages, rollout',   still: 'slate' },
    { id: 'blog',     label: 'Journal',      caption: 'Notes from the set',                  still: 'journal', href: '../blog/' },
  ],

  /* --------------------------------------------------------------- value
     The split-headline reel: the problem reads across the gap, the cards
     fall through it, and the headline resolves. */
  value: {
    problem: ['The note that never', 'reached the set.'],
    answer:  ['Klaket caught it.', 'One call sheet.'],
    phases: ['SCATTERED', 'SYNCED', 'SHOT'],
    cards: [
      { app: 'WhatsApp', who: 'Line Producer', time: '23:41', body: 'Location moved to the north gate. Tell the camera team.' },
      { app: 'Email',    who: 'Client',        time: '08:02', body: 'Approved the treatment, but scene 4 is out. Latest deck attached (v7-FINAL-2).' },
      { app: 'Excel',    who: 'schedule_v11.xlsx', time: 'Yesterday', body: 'Day 2, 6 scenes, 14 crew, call 05:30. Last edited by someone.' },
      { app: 'PDF',      who: 'callsheet_FINAL.pdf', time: 'Mon', body: 'Printed before the location changed.' },
    ],
    resolved: { app: 'Klaket', who: 'Call sheet · Day 2', time: 'Now', body: 'North gate. Call 05:30. Sent to 14 crew, read by 14.' },

    /* The messy reading of the same argument. Eight channels rather than four,
       each with the icon people actually recognise it by, plus the scraps of
       paper a production leaves behind. */
    mess: {
      channels: [
        { icon: '💬', app: 'WhatsApp',   who: 'Line Producer', time: '23:41',     body: 'Location moved to the north gate. Tell the camera team.' },
        { icon: '✉️', app: 'Gmail',      who: 'Client',        time: '08:02',     body: 'Approved the treatment, but scene 4 is out. Latest deck attached (v7-FINAL-2).' },
        { icon: '📊', app: 'Excel',      who: 'schedule_v11.xlsx', time: 'Yesterday', body: 'Day 2, 6 scenes, 14 crew, call 05:30. Last edited by someone.' },
        { icon: '📄', app: 'PDF',        who: 'callsheet_FINAL.pdf', time: 'Mon',  body: 'Printed before the location changed.' },
        { icon: '📞', app: 'Missed call', who: 'Director',     time: '23:58',     body: 'Twice. No voicemail.' },
        { icon: '🎙️', app: 'Voice note', who: '1st AD',        time: '00:14',     body: '0:47. Nobody has listened to it.' },
        { icon: '📌', app: 'Sticky note', who: 'On the monitor', time: 'Somewhere', body: 'NORTH GATE!! tell cam' },
        { icon: '🖨️', app: 'Printed',    who: '14 copies',     time: '05:05',     body: 'All of them say the old location.' },
      ],
      /* What falls out of the pile while nobody is looking. */
      scraps: ['Scene 4 is out', 'Call 05:30', 'North gate', 'v7-FINAL-2', 'Ask the AD', 'Print 14 copies', 'Day 2', 'Tell camera', 'Which version?'],
      phases: ['SCATTERED', 'CAUGHT', 'SHOT'],
    },
    pillars: [
      { title: 'One thread the crew already reads', body: 'The call sheet, the schedule and the brief live in the same place, in Arabic and English, and the crew gets them where they already look.' },
      { title: 'The breakdown writes itself', body: 'Drop in a script and Klaket pulls the scenes, cast, props, locations and the day count, then hands you the list to correct rather than to build.' },
      { title: 'Approvals that leave a trail', body: 'Clients approve a treatment or a cut on a link. Every version is kept, so nobody shoots last week’s plan.' },
      { title: 'Built by people who shoot', body: 'Every screen comes from a real production day, not from a project-management template with film words pasted on it.' },
    ],

    /* Used by the slate treatment only: the four fields a real board carries,
       in board order, so each claim is read where a crew expects to read it.
       PRODUCTION holds the one place, SCENE the breakdown, TAKE the versions,
       DIRECTOR the people. */
    slateFields: ['PRODUCTION', 'SCENE', 'TAKE', 'DIRECTOR'],

    /* Used by the counter treatment only. Every figure here is true by
       construction and the line says what it counts. Klaket has published no
       usage numbers, so nothing here may imply a measured result. */
    counters: {
      title: 'The whole production, counted.',
      items: [
        { n: 6, unit: 'STEPS', line: 'Brief, breakdown, board, call sheet, shoot, wrap. That is the whole route, and it is the only one.' },
        { n: 0, unit: 'SIGN-UPS ON SET', line: 'The crew opens the call sheet on a link. Nobody on the day makes an account.' },
        { n: 2, unit: 'LANGUAGES', line: 'Every call sheet goes out in Arabic and English, and each crew member reads the one they chose.' },
        { n: 1, unit: 'VERSION', line: 'One plan, one thread, one sheet. Move the location and the whole crew has the new one.' },
      ],
    },
  },

  /* -------------------------------------------------------------- agents
     The chain a production actually runs through. Every node is real: the four
     queued agents are the ones the schema allows (agent in 'brief', 'creative',
     'script', 'treatment'), the client's pick is concept_sets.selected_concept_id,
     and the budget is the ai function's own 'budget' action. */
  agents: {
    title: 'The whole crew, in one conversation.',
    steps: [
      { icon: 'inbox',  label: 'Briefing agent' },
      { icon: 'bulb',   label: 'Creative agent' },
      { icon: 'check',  label: 'Client approves', human: true },
      { icon: 'script', label: 'Script agent', live: true },
      { icon: 'slate',  label: 'Director\u2019s treatment' },
      { icon: 'chart',  label: 'Budgeting agent' },
    ],
  },

  /* ------------------------------------------------------------- journey
     Six waypoints. The camera flies the 3D set between them. */
  journey: {
    title: 'One continuous take, brief to wrap.',
    steps: [
      { n: '01', title: 'The brief lands',     body: 'A client sends a deck, a voice note or a paragraph. Klaket reads it and writes the brief back as scenes, deliverables and a budget band for you to correct.' },
      { n: '02', title: 'The script breaks down', body: 'Scenes, cast, props, wardrobe, locations and stunts come out of the script tagged, counted and costed. You fix what the machine got wrong instead of typing it all.' },
      { n: '03', title: 'The board gets built', body: 'Strips order themselves by location, daylight and cast availability. Move one and the day count, the call times and the budget move with it.' },
      { n: '04', title: 'The call sheet goes out', body: 'One tap sends the sheet to the crew in the language each of them reads, and tells you who has opened it and who has confirmed. Change the location at 23:41 and everyone has the new one by 23:42.' },
      { n: '05', title: 'Action',               body: 'On the day the slate is live: the shot list is ticked off setup by setup, so anyone can see what is in the can and what is still owed before the light goes.' },
      { n: '06', title: "That's a wrap",        body: 'Dailies, costs and the actual against the plan close themselves out, and the next production starts from what this one learned.' },
    ],
  },

  /* ------------------------------------------------------------ features */
  features: {
    title: 'What the crew gets on the day.',
    items: [
      { key: 'callsheet', title: 'Call sheets',       body: 'Built from the schedule, published in Arabic and English, and every crew member can view, confirm or decline, so you know who actually has it. Reissue in one tap when the day moves.' },
      { key: 'board',     title: 'Stripboard',        body: 'Drag a strip and the whole plan recalculates: day count, call times, cast days and the cost that follows them.' },
      { key: 'breakdown', title: 'Script breakdown',  body: 'Scenes, cast, props, locations and stunts tagged out of the script, with the page count and the day estimate attached.' },
      { key: 'approvals', title: 'Client approvals',  body: 'Treatments and cuts go out on a link with no account to create. The client approves or asks for changes, signs with their name, and the note they leave stays attached to the version it was about.' },
      { key: 'brief',     title: 'AI brief',          body: 'A deck, a voice note or a WhatsApp paragraph becomes a structured brief with scenes, deliverables and a budget band.' },
      { key: 'shots',     title: 'Shot lists',        body: 'Shots carry size, angle, movement and lens, group into setups with a time estimate, and come drawn as storyboard frames the crew ticks off on the day.' },
    ],
  },

  /* ----------------------------------------------------------------- faq */
  faq: {
    title: 'Questions crews ask first.',
    items: [
      { q: 'Does the crew need an account?', a: 'No. Call sheets, approvals and shot lists open on a link, on a phone, with no sign-up. Accounts are for the people who build the plan, not for everyone who reads it.' },
      { q: 'Does it work in Arabic?', a: 'The whole platform runs in Arabic and English, right to left or left to right, and each crew member reads it in the language they chose. Call sheets go out in both.' },
      { q: 'What happens to our data?', a: 'Your productions are yours. Data sits in the region you pick, nothing is used to train anything, and you can export every production as files you own at any time.' },
      { q: 'How much does it cost?', a: 'Pricing is per production, not per seat, so putting the whole crew on it costs nothing extra. Request a demo and we price it against the slate you actually shoot.' },
      { q: 'Can we bring our old productions in?', a: 'Yes. Scripts, schedules and call sheets come in as files, and Klaket breaks them down the same way it breaks down a new one.' },
      { q: 'What does the AI actually do?', a: 'It reads scripts and briefs, drafts the breakdown, suggests the schedule order and drafts the shot list. It never sends anything to a client or a crew on its own: a person approves every outgoing thing.' },
    ],
  },

  /* ----------------------------------------------------- companies strip
     TODO(nawaf): PLACEHOLDERS. These are not the founders' real employers.
     Replace this array with the real names before this page is shown to anyone
     outside the team. Grep for PLACEHOLDER-COMPANIES to find every use. */
  companies: {
    placeholder: true,
    label: 'The crew behind it has shipped at',
    label2: 'Still the same crew, still on the same side of the camera',
    names: ['NORTHLIGHT', 'STUDIO ONE', 'ATLAS PICTURES', 'MERIDIAN', 'REDLINE FILMS', 'HARBOUR', 'SIXTH STAGE', 'LONGFORM'],
  },

  /* -------------------------------------------------------------- footer */
  footer: {
    cta: 'See it on your own production.',
    ctaSub: 'A 30 minute demo against your real slate, not a sandbox.',
    columns: [
      { title: 'Platform', links: [['Why Klaket', '#value'], ['How it works', '#journey'], ['Features', '#features'], ['Questions', '#faq']] },
      { title: 'Company',  links: [['Journal', '../blog/'], ['Request a demo', '../demo/'], ['Sign in', '../../index.html']] },
    ],
    legal: '© 2026 Klaket',
  },
};
