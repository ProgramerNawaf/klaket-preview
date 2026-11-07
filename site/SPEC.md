# Klaket landing: how this is built

24 landing pages, one engine. The brief asked for 20+ directions to choose between,
so the shared machinery lives in `core/`, each treatment of a section lives in
`sections/` or `heroes/`, and a variant is a thin page that picks one of each.

Checkpoint before any of this: commit `d2134ad`, tag `checkpoint/pre-landing-redesign`.
The previous one-page site is untouched at `docs/landing/`.

## Hard rules

1. **No em dashes anywhere**, in code comments, in copy, in commit messages. Commas,
   parentheses and full stops instead. This is a standing instruction from Nawaf.
2. **No eyebrows.** No `USE CASES` / `REVENUE AND COST` label floating above a heading.
   Enode does it; we do not. The heading carries itself.
3. **No gratuitous text.** Less is more. If a line does not change what the reader
   does or believes, cut it. No "key benefits", no filler subheads, no decorative
   badges, no "trusted by thousands".
4. **Four colours only**: ink `#121212`, paper `#F6EBD9`, teal `#0F5C57` (+ `--teal-deep`,
   and `--teal-tint #5FA8A1` when teal has to be text on ink), signal `#F2483A`.
   Signal appears **at most once per screen**. Use the tokens, never a raw hex.
5. **Fonts**: Cairo 700/900 for display, IBM Plex Sans for body, IBM Plex Sans Arabic
   for Arabic body, IBM Plex Mono 500 for anything a crew reads off a slate (scene,
   take, step numbers, times, phases). Never type the wordmark: use the SVG.
6. **Arabic is written, not translated.** `كل شغل يبدأ بكلاكيت.` is what a crew says,
   not a dictionary rendering of the English.
7. **Accessibility is not optional**: every interactive thing is a real `button` or `a`,
   reachable by keyboard, with a visible focus ring; `prefers-reduced-motion` turns the
   motion off and leaves the argument intact; contrast meets AA against the token it
   sits on; one `h1` per page and headings in order.
8. **No build step.** Plain HTML, hand-written CSS, vanilla ES. Libraries are vendored
   in `vendor/`, never pulled from a CDN at runtime.

## The stack

- `vendor/gsap.min.js` 3.13.0, `vendor/ScrollTrigger.min.js`, `vendor/lenis.min.js` 1.3.4,
  `vendor/three.module.min.js` r182. The same versions vectrfl.com runs.
- `core/boot.js` owns the single Lenis instance, registers ScrollTrigger against it, and
  exposes `KL`:
  - `KL.gsap`, `KL.ScrollTrigger`, `KL.lenis`, `KL.reduced`
  - `KL.reveal(el, opts)` and `KL.autoReveal(root)` for `[data-reveal]`
  - `KL.onScroll(fn)` for raw scroll progress
  - `KL.paint(fn)` to join the one shared rAF (auto-pauses on a hidden tab); returns an
    unsubscribe
- **Never create a second Lenis, a second ScrollTrigger ticker, or your own
  `requestAnimationFrame` loop.** Use `KL.paint`.
- `core/data.js` holds every word on the site as `window.KLDATA`. Copy changes go there,
  never inline in a section.

## Module contract

A section module is a pair `name.css` + `name.js`. The JS is an IIFE that:
- finds its single root by class (`document.querySelector('.vreel')`), returns quietly if
  absent, so a variant includes only what it uses
- renders its own markup from `KLDATA`
- checks `KL.reduced` and falls back to a still, readable version
- cleans up: anything registered with `KL.paint` is released on `pagehide`

Read `sections/value-reel.js` and `core/footer.js` first. They are the house style:
comments explain *why*, never *what*, and they are sparse.

## Three.js rules

- Import from `../vendor/three.module.min.js` inside a `<script type="module">`.
- **One `position: fixed` full-viewport canvas per page**, behind the content, exactly how
  vectrfl.com does it. Sections scroll over it and drive the camera by scroll progress.
  No pinning for the 3D itself.
- Cap the pixel ratio at 2. Dispose geometries and materials on teardown.
- Skip WebGL entirely when `KL.reduced` is set or when the context fails: every 3D section
  must have a drawn or CSS fallback that still makes the point.
- Keep the poly count low: this is a flat, four-colour world, not a render.

## Section treatments

Each has a reference, studied from Nawaf's recordings (notes in the scratchpad):

| Slot | Code | Treatment | Reference |
|---|---|---|---|
| Nav | `core/nav` | island pill that morphs into a card with a live still | annnimate Island Menu |
| Value | `V1` | split headline, cards falling through the gap | usealia.com |
| Value | `V2` | the slate wipes, chaos on one side, Klaket on the other | ours |
| Value | `V3` | four claims assembling as the quadrants of a slate | ours |
| Value | `V4` | counters with the proof under each | easyseller stat block |
| Journey | `J1` | fixed canvas, scroll flies a camera across a 3D film set | vectrfl.com |
| Journey | `J2` | one continuous zoom from the set into the lens into the UI | ours |
| Journey | `J3` | pinned horizontal film strip, one frame per step | ours |
| Journey | `J4` | slate cards that clap into a stack | ours |
| Features | `F1` | horizontal card carousel, arrows, numbered indicator | Enode |
| Features | `F2` | sticky split: list on the left, swapping still on the right | ours |
| Features | `F3` | bento grid with live mini demos | ours |
| Footer | `Ft1` | camera, rolling tape, cinema screen playing the CTA | Nawaf's own |
| Footer | `Ft2` | giant ghost marquee, then a halftone aperture reveal | eclipse.space |
| Footer | `Ft3` | pill meta chips, then a full-bleed painted end scene | glossar.app |

## Page order (every variant, no exceptions)

nav, hero, companies, value, journey, features, FAQ, companies again, footer.

The companies strip appears twice on purpose: once under the hero to buy trust before
the argument, once before the footer to bank it before the ask.

## Two brands

The same identity, read two ways. A page carries `data-brand` on `<html>`:

- **colour** (default): teal, ink, paper and signal, the identity as published.
- **mono**: black and white carry everything and signal red `#F2483A` is the only
  colour left. `--teal` becomes a dark slate grey `#2B2B2B` (dark enough to still be
  a clapperboard, light enough not to sink into the page's black under 3D lighting),
  `--accent` becomes the red, and `--primary` becomes white with black text.

How it is applied, in order of authority:

1. `?brand=colour` or `?brand=mono` in the address pins that page. Use this for
   links and for anything automated: `localStorage` is shared across every session
   driving the browser, so it cannot be trusted while agents are running.
2. Otherwise `localStorage['klaket.brand']`, set by the dock.

Both are read by a small inline script in each page's `<head>`, before the first
paint, so a page never flashes the other brand.

**Writing for both brands is free if you only ever use the tokens.** Two things do
not follow automatically and must be routed by hand:

- **Canvas and WebGL.** `core/three-kit.js` exports `C`, which `readPalette()` fills
  from the CSS custom properties at import time. Build scenes from `K.C` and they
  follow. A hardcoded `0x0F5C57` does not.
- **Inline SVG.** Use `fill="var(--teal)"`, which works in inline SVG. A hardcoded
  `#0F5C57` does not.

Switching reloads the page. CSS tokens would swap live, but canvas textures are
painted once and 3D materials are built once, so a live swap would leave half the
page in the old brand. The scroll position is restored so it reads as a switch.

`tools/_audit.html?brand=mono` checks every page in mono and reports any element
still painting teal, teal-deep, teal-tint, teal-pale or cream.

## The review dock

`core/theme.js` adds a dock at the bottom right of every page: the brand switch,
the direction number with previous and next, and a link back to the gallery. Keys:
`b` switches brand, `[` and `]` step through the directions. It is a review tool
and comes out once a direction is chosen.

## Known gaps

- **PLACEHOLDER-COMPANIES**: `KLDATA.companies.names` are invented. Nawaf still owes the
  real list of the founders' past employers. Grep that token before shipping.
- The brand artifact at `claude.ai/artifact/MFUyLamkboJda42snrsJs4` cannot be opened from
  this session. Everything here comes from `docs/brand/README.md` and `ui-direction.md`.

## Demo form

`demo/` is the destination behind every **Request Demo** button. A page, not a modal, on the
ink ground, using `core/tokens.css`, `core/base.css`, `core/nav.css`, `core/nav.js` and
`core/boot.js`. Files: `demo/index.html`, `demo/demo.css`, `demo/demo.js`.

It asks for seven things: full name, work email, company, role, productions per year, phone
(optional, with a country code) and a short message (optional). Nothing else, and no copy
beyond the headline, one line of lede, and three lines saying what happens next.

**How it posts.** `demo.js` reads `window.MPH_CONFIG` from `docs/js/config.js` and inserts one
row into `demo_requests` with the public anon key, the same way the app does it. It reuses
`MPH.sb` when the page is opened inside the app, and otherwise makes its own client with
`persistSession: false`, so a landing page never writes to the app's auth storage. If
supabase-js is missing it falls back to a single REST POST rather than lose the request.

**Validation** is on blur, never on a field the visitor has not touched yet, and every rule is
the mirror of a check constraint in the migration, so the database cannot refuse something the
form accepted. Errors carry `aria-invalid`, an `aria-describedby` message in a polite live
region, a paper outline and a mono `!`: never colour alone. Submitting replaces the form with a
real success panel that takes focus; a failed insert keeps every typed value and says so.

**Bots** get a hidden honeypot field and a timestamp check (a form sent in under 2.5 seconds was
not typed). Both paths show the success state and insert nothing, because telling a bot what it
got wrong only teaches it to get it right. No CAPTCHA.

**With JavaScript off** the form still renders from the markup and the contact address is on the
page. `novalidate` is added by `demo.js` at runtime, never in the markup, so a visitor without
JavaScript still gets the browser's own validation.

Two deliberate departures, both worth knowing:
- **Signal appears once**, on the submit banner. Field errors use the brand's dark-mode warning
  treatment (a paper outline and a mono `!`) instead, because a form can have five errors at
  once and rule 4 allows one signal per screen.
- **The copy lives in the markup, not in `KLDATA`.** A field the visitor cannot see is a field
  they cannot fill in, so the form has to survive with JavaScript off. Fold it into `KLDATA`
  only if that requirement is ever dropped.

### The migration

`supabase/migrations/20261107100000_demo_requests.sql`. **It has not been applied anywhere.**
Nothing is written until the owner runs it.

It creates `demo_requests` (the seven answers, plus `source`, `user_agent`, and `status` /
`handled_by` / `handled_at` / `note` for triage, the same shape `unassigned_emails` uses) with
length caps and shape checks on every column, since the form is public and unauthenticated.
It also adds `public.is_staff()`: an owner or producer of any workspace, which is the same role
test `can_see_internal` makes, with no production to scope it to. A lead arrives before there is
an account, an org or a production, so the production-scoped helpers have nothing to narrow.

RLS: `anon` and `authenticated` may insert, and only as `status = 'new'` with the triage columns
empty; only staff select and update; nobody deletes. Verified against the local stack in a
rolled-back transaction: every junk value is refused, an owner sees the row and can triage it,
and a `crew` member, a signed-in stranger and `anon` all see nothing.

### Still to do

- **Apply the migration.** Until then the form reaches PostgREST and fails on the missing table,
  which is exactly what the error state is for.
- **PLACEHOLDER-CONTACT**: `hello@klaket.com` is invented. It appears twice in `demo/index.html`
  (the aside and the `noscript` block) and once in `demo.js`. Replace all three before launch.
- **Rate limiting** is not built. The honeypot and the timing check stop casual bots; a
  determined one can still post with the anon key, so put a limit in front of it before launch.
- `demo/vendor/supabase.js` is supabase-js 2.117.2, the version `docs/index.html` loads, vendored
  because rule 8 forbids a CDN at runtime. Move it to `site/vendor/` when a second page needs it.
- The island's menu points at `#value` and the rest, which do not exist on a standalone page, so
  those links do nothing here (the same is true of `blog/`). Once a variant is published at
  `site/index.html`, point them at it from both pages.
