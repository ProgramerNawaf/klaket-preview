# Klaket landing page

A one-page overview site for Klaket. Its look comes from the brand (ink, paper and teal; Cairo and IBM Plex) and from the clapperboard itself: 45° stripes, slate labels and SCENE / TAKE / ROLL.

**Stack:** plain HTML, hand-written CSS and vanilla ES modules. There's no build step, matching the rest of `docs/`. Tailwind was left out because its CDN build isn't meant for production and would cost Lighthouse points. anime.js v4.4.1 loads from jsDelivr through the import map in `index.html`, so `main.js` can use `import … from 'animejs'`.

```
index.html     markup for all 8 scenes, plus the inline camera and clapperboard SVGs
styles.css     brand tokens in :root, layout, film texture, reduced-motion rules
main.js        hero reveal, section reveals, counters, card tilt, previews and lightbox,
               the Action! scroll scene, sound, live slate
assets/audio   clap.wav (24 KB), reel-loop.wav (2 s seamless loop)
assets/video   work-01…06.mp4   PLACEHOLDER clips
assets/img     work-01…06.jpg   PLACEHOLDER posters
```

To preview, run `python3 -m http.server 5174 --directory docs` and open http://localhost:5174/landing/.

## Swapping the brand colours
All colours are the tokens at the top of `styles.css`:

| Token | Now | Used for |
|---|---|---|
| `--black` | `#121212` ink | page background |
| `--chalk` | `#F6EBD9` paper | text, clapper stripes |
| `--slate` / `--raised` | `#1C1C1C` / `#262523` | cards, slate board, inputs |
| `--teal` / `--teal-deep` | `#0F5C57` / `#0A3F3C` | buttons, camera body, film strip |
| `--accent` | `#5FA8A1` teal tint | teal used as text or lines on ink |
| `--muted` | `#A69F93` | secondary text |

The clapperboard stripe pattern sits inside the SVG `<pattern id="stripes">` in `index.html`, so change its two `fill` values as well. Signal red (`#F2483A`) appears only in the logo's dots, per `docs/brand/README.md`.

Fonts are set by `--display` (Cairo), `--body` (IBM Plex Sans / Plex Sans Arabic) and `--mono` (IBM Plex Mono). They load from the Google Fonts link in `<head>`.

## Swapping the audio
1. Put your files in `assets/audio`. Keep the clap under 50 KB. The reel sound must loop seamlessly: trim it on zero crossings.
2. Point the `AUDIO` object near the top of the sound section in `main.js` at the new files.

WAV or OGG loop gaplessly. MP3 and AAC add encoder padding, which causes an audible click at the loop point.

The current sounds were synthesised from scratch for this page, so they carry no licence. If you use freesound.org or Pixabay sounds instead, check each licence. CC-BY sounds need credit.

**How it behaves:**
- Sound is muted by default. The 🔊 button saves the visitor's choice in `localStorage` (`klaket-sound`).
- The audio context is only created on the visitor's first click, key or touch after they turn sound on, because of browser autoplay rules.
- The clap fires once per entry into the Action! scene.
- The whir follows scroll speed and fades out about 140 ms after scrolling stops.

## Replacing the placeholders
Everything marked `PLACEHOLDER` in `index.html` is stand-in content:
- the hero headline and tagline
- the About copy and the `data-count` stats
- the client names in the marquee (two identical lists; the second is `aria-hidden`)
- the two quotes
- the social links and the contact promise
- the slate's DIRECTOR line

**Work grid:** each `.thumb` button has these parts:
- `data-video`, the preview and lightbox clip;
- an `<img>` poster;
- `data-title`.

Keep the clips short, muted, H.264 MP4 around 640×360 for the hover previews. The film strip in the Action! scene reuses the posters.

**Contact form:** it isn't connected to anything yet. In `main.js`, the `form()` function stops the submit and shows a note. Post the `FormData` to your endpoint where the `PLACEHOLDER` comment is.

## Accessibility and motion
**Reduced motion** (`prefers-reduced-motion`):
- no scroll-linked motion, letter reveal, marquee, grain animation, tilt or hover previews;
- the Action! scene becomes a normal section with the clapper shown shut;
- sound is disabled.

**Without JavaScript,** or if anime.js fails to load within 4 s, every section renders visible and static.

**Animation rules:**
- Only `transform` and `opacity` are animated.
- `will-change` is set only on the reels and the clapper arm.

## How the Action! scene works
- **Reels and film strip:** `onScroll({ target: '#action', enter: 'bottom top', leave: 'top bottom', sync: true })` maps the whole time the scene is on screen to the animation's progress. Scrolling down runs them forward, scrolling up runs them back, and faster scrolling spins them faster.
- **Clapper arm:** it's two nested groups that rotate around the same hinge.
  - `.arm-lift` is synced to scroll and rises to −28° while the scene slides in.
  - `.arm-snap` is a `createTimeline()` with three steps: lift a little more, pause, then snap +28° with `outBack`. The clap plays on the snap's `onComplete`.
  - The snap fires when the sticky stage is 42% through. Scrolling back above 36% reopens the arm silently.
- **Slate:** SCENE is the section under the middle of the screen, TAKE counts complete passes through the scene, and ROLL is the page scroll percentage.
