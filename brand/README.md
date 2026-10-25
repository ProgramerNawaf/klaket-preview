# Klaket | كلاكيت: brand in the platform ("Scene Identity", 25.10.2026)

**The idea, "The Talking Slate":** the clapperboard has become a speech bubble.
- The three red dots mean someone is typing.
- The clap is the moment everyone hears "Action".
- Together they stand for the whole crew in one conversation, all the way to shoot day.

This identity replaces the earlier SiFi theme and the classic-clapperboard logo. The checkpoint before the change is git tag `pre-klaket-identity`.

**Where the files came from:** they were extracted from the identity page (`docs/brand/identity-source/`). The official brand kit (SVG, PNG and MP4) will **replace them file for file**. The code points only at the file names below.

## Files (`docs/brand/`)
| File | What it is |
|---|---|
| `klaket-mark-on-light.svg` | mark on light backgrounds: teal body, ink and teal stripes, red dots ("on paper") |
| `klaket-mark-on-dark.svg` | mark on ink: teal body, cream stripes, red dots |
| `klaket-mark-on-teal.svg` | the primary version, on teal: ink body, cream stripes, red dots |
| `klaket-mark-mono.svg` | one colour. The stripes and dots are cut out; it takes the surrounding text colour (used as a mask) |
| `klaket-wordmark-ink.svg`, `-cream.svg`, `-mono.svg` | the custom كلاكيت KLAKET lettering. **It is never typed.** |
| `klaket-app-icon.svg`, `klaket-app-icon-dark.svg` | app icon on teal, and on ink |
| `favicon.svg` | the app icon. It switches to the dark icon when the browser is in dark mode. |
| `favicon.ico`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-dark-192/512.png` | raster icons made from the app icons |
| `klaket-email@2x.png`, `klaket-email-dark@2x.png` | the horizontal lockup for emails, 122 × 61 at 2×. The dark one is used by mail apps that support dark mode. |

## The logo component: `MPH.logo()` (`docs/js/brand.js`)
- **`variant`:**
  - `mark` (the slate bubble alone)
  - `horizontal` (mark plus wordmark; the mark leads in the reading direction, so it sits on the right in Arabic)
  - `vertical`
  - `app-icon`
- **`tone`:**
  - `auto` (the default) shows the on-light version in light mode and the on-dark version in dark mode, switching with the theme.
  - The others are `on-light`, `on-dark`, `on-teal` and `mono`.
- **Clear space:** 2X on every side, where X is the thickness of the slate bar. The component builds this in as padding.
- **Minimum sizes:** app icon 24px, mark alone 32px, full logo 120px wide. The component enforces them.
- **Where it's used:**

  | Place | Version |
  |---|---|
  | Collapsed rail (desktop) and mobile header | mark |
  | Sign-in, sign-up, client sign-in | vertical |
  | Approval page header | horizontal, on teal |
  | Emails | horizontal PNG at 2× |
  | Notifications | app icon |
  | Splash | mark plus typing dots |

  The full lockup can't fit the 76px rail or the 56px mobile header and still keep its required clear space, so those use the mark.
- **Don't:** stretch, rotate, recolour or add effects. The only allowed colour changes are the guide's own versions above.

## Colours: four only
| Token | Hex | Role |
|---|---|---|
| `--teal` | `#0F5C57` | Technicolor, the brand colour: primary actions, active nav, brand panels, approved |
| `--teal-deep` | `#0A3F3C` | hover and pressed teal, dark brand panels |
| `--ink` | `#121212` | text in light mode, the canvas in dark mode |
| `--paper` | `#F6EBD9` | warm surface in light mode, text in dark mode |
| `--signal` | `#F2483A` | the **one** thing the eye should find first. At most one per screen. |

### Semantic tokens, light and dark (`docs/css/app.css`)
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FBF5EC` | `#121212` |
| `--surface` | `#FFFFFF` | `#1C1C1C` |
| `--surface-brand` | `#0F5C57` | `#0A3F3C` |
| `--raised` / `--raised-2` | `#F3E7D3` / `#EADBC2` (paper) | `#262523` / `#312F2B` |
| `--text` | `#121212` | `#F6EBD9` |
| `--muted` | `#6B6865` (ink 62%) | `#A69F93` (paper 65%) |
| `--faint` | `#66625E` | `#969085` |
| `--line` / `--line-2` | ink 10% / 18% | paper 12% / 22% |
| `--primary` / `--on-primary` (fills) | `#0F5C57` / `#F6EBD9` | same |
| `--accent` / `--link` (teal as **text**) | `#0F5C57` | **`#5FA8A1`**, a teal tint, because `#0F5C57` on ink is 2.4:1 |
| `--signal` / `--on-signal` | `#F2483A` / `#121212` | same |
| status | approved: teal · attention: signal (`#B8352A` as text on light) · **warning: an ink outline with a mono "!"** · draft: paper or ink tints | approved `#5FA8A1` · attention `#F2483A` · warning: a paper outline |

**How dark mode is chosen:**
- The theme is set on `<html data-theme>` by `docs/js/theme.js`, before the page paints.
- **System** is the default and follows the device. Light / Dark / System can be chosen under **Account → Appearance** and in the preview dock.
- The choice is saved per user on this device.

**What's never themed:** images, photos, storyboard and lookbook frames, drawings (`art.js`, `sketch.js`) and emoji. Only the chrome around them changes.

### Contrast (WCAG AA, checked in both modes)
**Light:**
- text 17.3
- muted 5.1 (4.5 on raised paper)
- faint 5.6 (4.9 on raised paper)
- teal link 7.2
- paper on teal 6.6
- danger text 5.4
- **ink on signal 5.1**

**Dark:**
- text 15.9
- muted 7.1
- faint 5.4 on the surface
- teal-tint link 6.8
- signal 4.7 on the surface
- paper on teal 6.6

**Brand band (teal-deep):**
- text 9.9
- muted 5.7
- accent 5.8

**What I changed to pass:**
- **White on signal is 3.6:1**, so red buttons and badges use ink text.
- **Signal as text on the light canvas is 3.4:1**, so red text is never used on light. Danger text uses the shade `#B8352A`.
- Teal text in dark mode is the tint `#5FA8A1`.
- `--faint` was darkened to `#66625E`.

### Breakdown categories and calendar event types: folded into the four (decided 2026-10-25)
They use seven shades and tints of the brand colours. Some categories share a colour; the label and icon tell them apart.
**Red is only where it means "careful":** Stunts and the Delivery deadline.

| Role | Light (text on a 14% tint, ≥ 4.5) | Dark | Used by |
|---|---|---|---|
| teal-deep | `#0A3F3C` | `#B5DDD8` | cast, VFX · casting |
| teal | `#0F5C57` | `#5FA8A1` | props, location · prep, shoot |
| teal-mid | `#266862` | `#8CCBC3` | extras, animals · recce, post |
| ink | `#121212` | `#F6EBD9` | vehicles · meeting |
| ink 70% | `#4A4744` | `#CFC6B8` | wardrobe, SFX · fitting, review |
| ink 55% | `#625E5A` | `#A69F93` | makeup, equipment, sound · travel, other |
| signal (shade or tint) | `#8E2A21` | `#F78B80` | stunts · delivery |

### Colours that remain outside the four
- **Stripboard strip colours** (INT/EXT, day, night, dawn): the industry-standard code.
- **The call-sheet paper preview** (`.cs-*`): it shows the printed document.
- **WhatsApp green**, used on the WhatsApp share button.
- **The drawings** (`art.js`, `sketch.js`): pictures, left untouched by rule.

## Type: four free Google Fonts (SIL OFL)
| Use | Family | Weights |
|---|---|---|
| Headlines (Arabic and English), bubble words | Cairo | 700, 900 |
| Arabic text and UI | IBM Plex Sans Arabic | 400, 600 |
| English text and UI | IBM Plex Sans | 400, 600 |
| Data: scene and take numbers, times, codes, department tags, eyebrows | IBM Plex Mono | 500 |

The Arabic pages switch the body to Plex Sans Arabic (`html[lang="ar"]`).

## Voice: "the bubble talks like the crew"
**Bubble words:** `ui.bubble(key, tone)` uses the official word list. Each is 1–2 words in Cairo Black, English in capitals.
- **Where they're used:**
  - The approved status (brief and treatment): تم الاعتماد / APPROVED
  - The production statuses Shooting and Delivered: يوم التصوير / SHOOT DAY and خلصنا / THAT'S A WRAP
  - The newest notification
  - The empty-state call to action: أكشن / ACTION
- **One talking bubble per screen.** Notifications come "from the slate": the app icon, then the bubble word.

| Key | Arabic | English |
|---|---|---|
| message | رسالة جديدة | New message |
| approved | تم الاعتماد | Approved |
| waiting | بانتظارك | Waiting on you |
| scene | مشهد جاهز | Scene ready |
| files | وصلت الملفات | Files are in |
| shoot | يوم التصوير | Shoot day |
| callsheet | كول شيت | Call sheet |
| schedule | الجدول تمام | Schedule's set |
| script | السكربت جاهز | Script's ready |
| wrap | خلصنا | That's a wrap |
| action | أكشن | Action |

## Motion
The splash plays **once per browser session and after each sign-in**, and takes **3 seconds** so it can be read: the slate appears, the dots type, a short flash, then "أكشن · ACTION".
- It's skipped entirely with `prefers-reduced-motion`.
- The full official 4-second motion (with the stick opening and the clap) needs the MP4 from the brand kit, or the mark's parts as separate files.
- Everywhere else, loading uses the plain typing-dots loader (`.kl-dots`).

## Style packs for the stakeholder review
There are **five switchable layouts on this one identity**, in `docs/css/styles.css`, chosen with the **PREVIEW** dock at the bottom of every screen: N26, Workable, Intercom, Customer.io and GitButler (see `ui-direction.md`). Once stakeholders pick one, its rules move into `app.css`, and the other four and the dock are removed.
