/* Klaket logo, "The Talking Slate" (identity 25.10.2026): the slate-bubble mark and the custom-drawn كلاكيت KLAKET
   wordmark. Stand-alone (no other app file needed), so the public pages (approve.html) can use it too.
   Every piece is an image file in brand/ (rules: docs/brand/README.md), so the official brand kit drops in as a file
   replacement. The wordmark is never typed.

   MPH.logo({ variant, size, tone, decorative })
     variant     'mark' | 'horizontal' (mark + wordmark; the mark leads in the reading direction) | 'vertical' | 'app-icon'
     size        the mark's height in px (minimums: app icon 24, mark 32, full logo 120 wide)
     tone        'auto' (default: on-light in light mode, on-dark in dark mode) | 'on-light' | 'on-dark' | 'on-teal' | 'mono'
                 (mono takes the surrounding text colour; its stripes and dots are empty space)
     decorative  true for a repeat of a logo already named on the page: hidden from screen readers */
(function () {
  const MPH = (window.MPH = window.MPH || {});
  const NAME = { en: 'Klaket', ar: 'كلاكيت' };
  const TITLE = 'Klaket | كلاكيت';
  const BASE = (document.currentScript && document.currentScript.src.replace(/js\/brand\.js.*$/, '')) || '';
  const file = (f) => `${BASE}brand/${f}`;

  // which file each piece uses in each tone (the guide's colour versions)
  const MARK = { 'on-light': 'klaket-mark-on-light.svg', 'on-dark': 'klaket-mark-on-dark.svg', 'on-teal': 'klaket-mark-on-teal.svg' };
  const WORD = { 'on-light': 'klaket-wordmark-ink.svg', 'on-dark': 'klaket-wordmark-cream.svg', 'on-teal': 'klaket-wordmark-cream.svg' };
  const ICON = { 'on-light': 'klaket-app-icon.svg', 'on-dark': 'klaket-app-icon-dark.svg', 'on-teal': 'klaket-app-icon.svg' };
  const MIN = { mark: 32, 'app-icon': 24, horizontal: 32, vertical: 32 };

  const img = (f, cls) => `<img class="${cls}" src="${file(f)}" alt="" draggable="false">`;
  const mono = (f, cls) => `<span class="${cls} kl-monofill" style="--kl-src:url('${file(f)}')"></span>`;
  /* one piece in one tone; 'auto' renders the light and the dark version and CSS shows the one that fits the theme */
  function piece(map, monoFile, tone, cls) {
    if (tone === 'mono') return mono(monoFile, cls);
    if (tone === 'auto') return img(map['on-light'], `${cls} kl-for-light`) + img(map['on-dark'], `${cls} kl-for-dark`);
    return img(map[tone] || map['on-light'], cls);
  }

  MPH.logo = ({ variant = 'horizontal', size = 32, tone = 'auto', decorative = false } = {}) => {
    const h = Math.max(MIN[variant] || 32, Number(size) || 32);
    const name = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${NAME.en} — ${NAME.ar}"`;
    const t = ['auto', 'on-light', 'on-dark', 'on-teal', 'mono'].includes(tone) ? tone : 'auto';
    if (variant === 'app-icon') {
      return `<span class="kl-logo kl-app-icon kl-${t}" style="--kl-h:${h}px" ${name}>${piece(ICON, 'klaket-mark-mono.svg', t === 'mono' ? 'auto' : t, 'kl-icon')}</span>`;
    }
    const mark = piece(MARK, 'klaket-mark-mono.svg', t, 'kl-mark');
    const word = variant === 'mark' ? '' : piece(WORD, 'klaket-wordmark-mono.svg', t, 'kl-word');
    return `<span class="kl-logo kl-${variant} kl-${t}" style="--kl-h:${h}px" ${name}>${mark}${word}</span>`;
  };
  MPH.logo.NAME = NAME;
  MPH.logo.TITLE = TITLE;
  MPH.logo.file = file;
})();
