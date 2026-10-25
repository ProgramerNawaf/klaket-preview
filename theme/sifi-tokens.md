> **Replaced on 2026-10-25** by the official Klaket identity ("Scene Identity"): see `docs/brand/README.md`. This file records the earlier SiFi-style theme (tag `pre-klaket-identity`).

# SiFi-style theme for MPH: final tokens

**Source:** read from sifi.app/en and sifi.app/ar on 2026-10-25, using computed styles in the browser.

**What changes:** the visual theme only, applied through the CSS variables in `docs/css/app.css`, which are the app's design tokens. Images, illustrations, storyboard and lookbook pictures, the sign-in picture, and emoji are untouched.

## What was confirmed on sifi.app
| Item | sifi.app | Notes |
|---|---|---|
| Primary | `#2F473F`, white text, 14px/400, padding 8px 16px, 8px radius | "Get started for free" |
| Strong secondary | `#000000`, white text, same shape | "Take a tour" |
| Soft secondary | `#E8E8DC`, black text, 14px/500, pill radius | "View more" |
| Selected / pressed sand | `#E1E1D1` | "View more →" chip; also its 1px border colour |
| Accent CTA | `#59DB59`, black text, 12px, pill, "→" | "Claim perks"; used sparingly |
| Page / section backgrounds | `#FFFFFF` (main canvas) and `#F6F6EE` (cream sections) | |
| Dark sections | `#252E2A` (section), `#253932` (raised) | "Safe and Secure" band |
| Text | `#000000`; `#2C2C30` secondary headings; `#3F4047` chip text | |
| Muted greys | `#575757`, `#595959`, `#6B6B6B`, `#888888`, `#8B8B8B` | the lighter two fail AA on cream: see contrast |
| Primary text variant | `rgba(47,71,63,0.85)` | |
| Body font | Inter 400, 16px/24px; long text 300, 20px/28px | |
| Heading font | Inter Tight 500; h1 48px/1.1, letter-spacing -0.01em (-0.48px); h2 36px/40px | **h1 is 48px, not 36px.** 36px is the section heading. |
| Arabic font | **IBM Plex Sans Arabic** 300/400/500, for body and headings | free (Open Font License); MPH already loads it |
| Arabic headings | 48px with line-height 70px (≈1.45) | Arabic needs taller lines than Latin |
| Radius | `--radius: .5rem` (8px) on buttons and inputs; cards 12px (most common) and 16px; one 32px hero block; pills 9999px | |
| Borders | 1px `#E1E1D1` (most common), 1px `#E5E5E5` | thin and light |
| Shadows | floating only: `0 8px 24px -4px rgba(24,39,75,.35)` (with a 2px white ring); small: `0 2px 8px -6px rgba(24,39,75,.26)` | almost none elsewhere |
| Inputs | 40px high, 8px radius, 16px text, sitting on white | |

## Tokens (the `:root` block in `docs/css/app.css`)
### Surfaces
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F6EE` | page (cream) |
| `--bg-2` | `#FFFFFF` | rail, top bar, production header, inputs |
| `--surface` | `#FFFFFF` | cards, panels, modals, drawers |
| `--raised` | `#E8E8DC` | sand: soft buttons, chips, neutral pills, hover rows |
| `--raised-2` | `#E1E1D1` | sand, strong: selected chip, pressed, active nav |
| `--line` | `#E8E8DC` | hairlines between rows and areas |
| `--line-2` | `#D3D3C3` | input and outline-button borders, dividers |
| `--fill-1` / `--fill-2` | `rgba(47,71,63,.035)` / `rgba(47,71,63,.06)` | subtle hover fills (replace the dark theme's white overlays) |
| `--dark` / `--dark-2` | `#252E2A` / `#253932` | toasts and dark bands |

### Text
| Token | Value | Notes |
|---|---|---|
| `--text` | `#000000` | |
| `--text-2` | `#2C2C30` | |
| `--muted` | `#575757` | descriptions, labels |
| `--faint` | `#6B6B6B` | captions, placeholders. SiFi's `#8B8B8B` is 3.1:1 on cream, so darkened |

### Brand
| Token | Value | Use |
|---|---|---|
| `--accent` | `#2F473F` | the **primary**: primary buttons, active nav, links, focus, progress |
| `--accent-2` | `#263B34` | primary hover (about 8% darker) |
| `--accent-ink` | `#FFFFFF` | text on primary |
| `--accent-soft` / `--accent-line` | `rgba(47,71,63,.08)` / `rgba(47,71,63,.28)` | tints, focus ring |
| `--highlight` | `#3FA34D` | a darker green than SiFi's `#59DB59` (changed 2026-10-24 at the user's request: no light greens): the storyboard drop overlay's glow, `.btn-accent`, `.pill.highlight`. Never used as text |
| `--highlight-ink` | `#000000` | text on highlight |

The token is named `--accent` because every component already uses it for "the primary colour". Keeping the name means only one place changes. SiFi's own "accent" green is `--highlight`.

### Status (same meaning as before; text colours chosen for AA on their tints)
| Token | Text | Tint | Meaning |
|---|---|---|---|
| `--ok` | `#1D7A36` | `rgba(89,219,89,.18)` | approved, success, high confidence |
| `--warn` | `#8A5A00` | `rgba(245,166,35,.18)` | sent / waiting, warnings, medium confidence |
| `--danger` | `#B42318` | `rgba(220,53,40,.10)` | changes requested, errors, low confidence |
| `--info` | `#1D5F8A` | `rgba(29,95,138,.09)` | client view, informational |
| `--market` | `#9A4F14` | `rgba(242,153,74,.16)` | marketplace, notes needing attention |
| neutral | `--text-2` | `--raised` (sand) | draft |

### Phases
- `--phase-band` `#2F473F`: one deep green for every phase on the overview bands and the production header stepper (changed 2026-10-24 at the user's request). White on it is 10:1.
- `--phase-pre` `#3E7A2A` · `--phase-prod` `#A65A16` · `--phase-post` `#1F6E64` are still used where phases must be told apart: the calendar's phase colours and the shoot-day accents.

### Breakdown categories (darkened for text on a 14% tint; all ≥ 4.5:1 on white and on cream)
cast `#AE3020` · extras `#336716` · props `#6D4BC4` · wardrobe `#166577` · makeup `#A32870` · vehicles `#755A00` · location `#984806` · sfx `#285E9C` · equipment `#6F5F3E` · animals `#80522E` · sound `#55625D` · vfx `#106454` · stunts `#984313`

### Shape, depth, type
| Token | Value |
|---|---|
| `--radius` | `8px` (buttons, inputs, small cards) |
| `--radius-sm` | `6px` |
| `--radius-lg` | `16px` (panels, cards, modals) |
| `--radius-xl` | `24px` (large feature surfaces: the sign-in card, the treatment paper) |
| `--radius-pill` | `9999px` (chips, tags, status pills, soft buttons) |
| `--shadow` | `0 8px 24px -4px rgba(24,39,75,.35)` (floating only: modals, drawers, dropdowns, toasts) |
| `--shadow-sm` | `0 2px 8px -6px rgba(24,39,75,.26)` (selected segment, small lift) |
| `--focus` | `0 0 0 3px rgba(47,71,63,.28)` + 2px outline in `--accent` |
| `--font-ui` | `"Inter", "IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--font-display` | `"Inter Tight", "IBM Plex Sans Arabic", "Inter", system-ui, sans-serif` (weight 500, -0.01em) |
| `--font-ar` | `"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif` (Arabic text and RTL pages, headings included) |
| `--font-mono` | unchanged (IBM Plex Mono) |

**Why panels use 16px rather than 24–32px:** SiFi uses 12–16px corners on its ordinary cards and 32px only on one hero block. MPH panels are dense data containers (tables, forms), where 24–32px corners look bubbly and clip table corners. So 16px is the panel radius, and 24px (`--radius-xl`) goes on the large feature surfaces.

## Buttons
| Class | Style |
|---|---|
| `.btn-primary` | `--accent` background, white text, 400, 8px radius; hover `--accent-2` |
| `.btn` (default, soft) | sand `--raised`, black text, 500, pill; hover `--raised-2` |
| `.btn-dark` (new, available) | black background, white text, 8px radius |
| `.btn-outline` | transparent, 1px `--line-2`, black text, 8px radius; hover cream |
| `.btn-ghost` | transparent, text `--accent`; hover `--fill-2` |
| `.btn-accent` (new, available; at most one per screen) | `--highlight` background, black text, pill |
| `.btn-danger` | danger tint, danger text |

All buttons have a visible `:focus-visible` ring (`--focus`) and a disabled state (opacity .45).

## Contrast checks (WCAG AA)
All values are computed. Body text needs ≥ 4.5:1, large text ≥ 3:1.
- Black on cream: 19.3 · `--text-2` on cream: 12.8 · `--muted` on cream: 6.7 (on sand: 5.9)
- `--faint` `#6B6B6B`: 5.3 on white, 4.9 on cream. SiFi's `#8B8B8B` would be 3.1, so it was darkened.
- White on primary: 10.0 · primary on cream: 9.2 · primary on its tint: 8.8
- Black on `--highlight` `#3FA34D`: 6.6. It is never used as text on white (3.2).
- Status text on its tint: ok 4.8 · warn 5.2 · danger 5.7 · info 6.0 · market 5.3
- Cream text on the dark toast: 12.9
- Phase colours on white: 5.2 / 5.1 / 6.1
- Category tags: see the list above; every one is ≥ 4.5:1.

## Kept as they are, on purpose
- **Illustrations:** `sketch.js` and `art.js` drawings, the treatment cover art, lookbook images and colour swatches, and storyboard frames and covers use their own fixed colours, so the theme doesn't touch them.
- **Dark band (`.sifi-dark`, `.tr-show`, `.ov-hero`), re-themed on 2026-10-24 at the user's request:** the old dark palette is gone. Surfaces that sit on pictures use SiFi's dark sections instead.
  - Surfaces: `#252E2A` and `#253932`, with the primary green `#2F473F` as the raised surface.
  - Text: cream `#F6F6EE`, sand `#E1E1D1`, muted `#B9BFB4`, faint `#AEB6AB`.
  - Accent: on dark, `#55B05F` carries the accent (5.2 on `#252E2A`, 4.5 on `#253932`). It was `#59DB59` until the user asked for no light greens.
  - Type: Inter Tight 500, as in the light theme.
  - The shades over pictures are now deep green instead of near-black.
  - Contrast on `#252E2A`: text 12.9, muted 7.4, faint 6.7, accent 5.2. Faint is at least 4.8 on every dark surface.
  - **Step drawings (`MPH.art.step()`):** these appear on the overview step cards and the Treatment and Storyboard start cards. They were recoloured to a deep-green palette at the user's request: a darker green `#3FA34D` (3.1:1 on the tile) with `#34893F` as its second shade, sand `#E1E1D1`, cream `#F6F6EE` and pale green-grey `#A9C2B5`, on `#2F473F` tiles. The shoot-day "recording" dot stays red. `MPH.art.colors` (used by the treatment cover art and the storyboard placeholders) is unchanged.
  - **Overview hero drawing (`MPH.art.set()`):** this is the default picture when a production has no header image. It was recoloured to the deep greens at the user's request:
    - Sky: `#1B2622` → `#253932` → `#2F473F`.
    - Beams: one cream, one soft `#55B05F`.
    - Silhouettes and film strip: `#141D1A`.
    - Header images that someone has drawn for a production (`MPH.sketch`) keep their own colours.
  - **Old fonts:** Bricolage Grotesque and Figtree are no longer loaded.
- **Sign-in picture (`.aa`), re-themed on 2026-10-24 at the user's request:** it is HTML and CSS, not an image, so it now uses the SiFi tokens.
  - A deep-green band (`--accent`, with `#253932` and `#3A574D` glows), like SiFi's dark sections.
  - The stripboard strips are white, cream and sand, with the darker green `#3FA34D` on the night-exterior strips, at 16% opacity.
  - The card is white, with `--radius-lg` and `--shadow`. Its "AI Breakdown" live dot and pulse are the deep green `--accent` (10:1 on white), not the bright green.
  - Tagged words and chips use the light theme's category colours on a 14–16% tint; the worst case is cast, at 5.0:1.
  - The tagline is cream on green (9.2:1) in Inter Tight, and the subtitle is 82% cream (6.8:1).
- **Drawing palettes:** the lime in `art.js` (`MPH.art.colors`, used by the treatment cover and the storyboard placeholders) and in `sketch.js` (storyboard, shot list and header sketches) is now `#3FA34D`, with `#34893F` as its second shade, instead of `#ACD062` and `#8DB44A`. This was changed at the user's request. The storyboard's user-chosen "Lime" frame label is data and keeps its colour.
- **Stripboard strip colours** (INT/EXT, day/night/dawn) are the industry-standard stripboard code, and are content rather than theme.
- **Call-sheet paper preview** (`.cs-*`) shows the printed document, which is already light paper.
- **Production tiles** (a production without a header image): solid deep green `#2F473F` with cream initials (Inter Tight 500, 10:1) for every production, instead of a colour derived from its ID. A production with a drawn header image still shows the drawing.
- **User-chosen colours:** storyboard frame labels, calendar event-type colours (only made darker where they're used as text), and lookbook swatches.
