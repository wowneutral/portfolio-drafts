# Building a version

This app holds twenty drafts of Armaan Seth's portfolio, one route each. This file is the contract for anyone (person or agent) adding one. Read all of it before writing code, then read `/home/claude/port/briefs/_taste.md`.

Armaan is 14. He founded MITEZ (a free mentorship nonprofit), founded and head coaches Skeptical (a Lincoln-Douglas debate team), just won two LD tournaments, wrote an open-access philosophy paper on Wittgenstein, Mauthner and the skeptic's critique of language, translated an Old High German poem, and builds websites, tools and software. The audience is anyone who looks him up: other debaters, people he builds for, colleges, people who find his GitHub. A good version makes a stranger think "this kid is serious, and interesting" inside five seconds, and makes a debater want to send it to a friend.

## 1. What you own

A version is one folder and nothing else:

```
src/versions/<slug>/index.tsx   default export: the page component
src/versions/<slug>/meta.ts     default export: { slug, n, name, color, ink, kind, text }
src/versions/<slug>/*.css|tsx   anything else you need
public/<slug>/                  your own assets, if any
```

`meta.ts` registers the route and the catalog card by itself (see `src/registry.ts`):

```ts
import type { Version } from '@/content';
const meta: Version = { slug: 'ladder', n: 4, name: 'The ladder', color: '#0d0d0c', ink: '#efede6', kind: '3D playground', text: 'One sentence, plain words, saying what the visitor sees and does.' };
export default meta;
```

`color` is the page background, `ink` the main text colour.

**Never edit anything outside your folder and `public/<slug>/`.** Not `src/lib`, not `src/components`, not `content.ts`, not `App.tsx`, not `package.json`, not another version, not `public/notes.md`. Others build in this repo at the same moment. **Never run `npm install`, and never run git except the one commit command you are given.**

## 2. Copy rules (hard)

- Every claim about Armaan comes from `src/content.ts`. Import it; do not retype it.
- You may add short interface words of your own (labels, section framing, up to about eight words each). They must never state a fact, result, number, date, place, book, author or quote that is not in `content.ts`. He named genres he is reading, not books: never invent titles.
- Never put invented words in his mouth beyond short framing. No testimonials, no fake stats, no invented commits or GitHub numbers: GitHub data comes only from `useGitHub()`.
- No em dashes and no en dashes in visible text.
- Links: only hrefs in `content.ts` (checked against `ALLOWED_LINK`), plus whatever `useGitHub()` returns (github.com/wowneutral/...).
- Every version must carry, somewhere, in this order or an order that suits the idea:
  1. Name, and `PERSON.line` (or `PERSON.short`).
  2. About: `PERSON.about` (both paragraphs) and `PERSON.aside`.
  3. Debate: both `DEBATE.wins`, `DEBATE.next` (up next), and Skeptical with "Founder and head coach", its line, its record line and its link. Debate is the headline this month: give the two championships real weight.
  4. Research: the paper's full title, abstract, keywords, and every link in `links` (DOI, Zenodo, PhilArchive, Google Scholar). The Wessobrunn translation, shorter.
  5. Work: every item in `WORK` with its image, kind, line, stack and link (JARVIS has no link).
  6. **Live from GitHub** (required, dynamic): `useGitHub()` from `@/lib/github`. Show recent commits when `activity` is non-empty and the repos list always; link to `GITHUB.href`. In tests GitHub is unreachable, so the fallback must look finished on its own, never like an empty state.
  7. **Today** (required, dynamic): `useNotes()` from `@/lib/notes`. The latest note, prominent, with its date (`formatDate`); earlier notes reachable (a list, a drawer, pages: your call). This is his daily blog; it must look like a place worth checking every day.
  8. Now: `NOW.reading` (with its shelves), `NOW.club`, `NOW.status`.
  9. Record: `HONORS` and `AWARDS` (the two certificate images, linked). `STATS` if it suits.
  10. Off the record (shorter, optional to style lightly): `LIKES`, `DISLIKES`, `FAVOURITES`, `COURSES`.
  11. Contact: `LINKS`.
  12. Footer: "Draft N of the portfolio. Not the live site." and anything you must credit.

## 3. Shared code you can use

- `useVersion(slug)` from `@/lib/version`: call it first. Names the page, sets the theme colour, starts smooth scroll (Lenis on GSAP's ticker), lifts the page cover.
- `@/lib/github`: `useGitHub()` returns `{ repos, activity, commitsThisMonth, live }`, and `ago(iso)`.
- `@/lib/notes`: `useNotes()` returns `{ notes, loaded }` newest first (`{ date, body: string[] }`), and `formatDate(iso, opts?)`.
- `@/lib/scroll`: `gsap`, `ScrollTrigger`, `SplitText`, `useGSAP`, `scroll` (mutable `{ y, p, v }` for `useFrame`), `scrollToY`, `scrollToId`.
- `@/lib/motion`: `<Split as="h2" by="lines|words|chars" on="view|load|none" effect="rise|blur">`, `useRise(ref)` (everything with `data-rise` fades up on entry). Anything that renders later (notes, GitHub rows) must not depend on an observer that ran before it existed: make late content visible by default.
- `@/lib/utils`: `still` (reduced motion), `coarse` (touch), `clamp`, `lerp`, `smooth`, `damp`, `cn`, `isPhone()`.
- `@/components/Loader`, shadcn/ui in `@/components/ui`, React Bits in `@/components/bits` and the full library at `/home/claude/lab/rb/src/ts-default/<Category>/<Name>/` (copy into your folder, remove `'use client'` and any Google Fonts import).
- Installed: react 19, react-router, three r187, @react-three/fiber, drei, postprocessing, @react-three/rapier (physics, offline), gsap (all plugins), lenis, motion, maath, zustand, matter-js, rough-notation, roughjs, simplex-noise, @use-gesture/react, tone, canvas-confetti, ogl, lucide-react, radix-ui, tailwindcss 4.
- Fonts (Fontsource; import the CSS in your component). Variable: archivo (also `/wdth.css`), big-shoulders-display, bodoni-moda, bricolage-grotesque, eb-garamond, familjen-grotesk, fraunces, hanken-grotesk, instrument-sans, jetbrains-mono, newsreader, oswald, playfair-display, schibsted-grotesk, syne, unbounded. Static: abril-fatface, anton, bebas-neue, bodoni-moda, carlito, caveat, chivo-mono, courier-prime, dm-serif-display, gloock, ibm-plex-mono, kalam, libre-baskerville, old-standard-tt, permanent-marker, press-start-2p, reenie-beanie, schibsted-grotesk, silkscreen, space-mono, special-elite, unifrakturcook, vt323. Check `node_modules/@fontsource*/<name>/` for file names.
- Images: `public/work/<slug>.jpg` (screenshots of each project, about 1200 wide), `public/awards/*.jpg` (the two certificates, portrait), `public/og.jpg`. Use `import.meta.env.BASE_URL + item.img` for src (the site is served from a subfolder).
- Code patterns in the Skeptical drafts (read only, never edit): `/home/claude/lab/app/src/versions/letters/` (heavy 3D letters on a paper sweep that you knock over and that stand back up: physics, glyph extrusion, product lighting; he loved it), `question/` (glass shape bending DOM text), `ladder/` (R3F scene driven by scroll), `cards/`, `blocks/Pit.tsx` (matter.js with DOM bodies). `node /home/claude/lab/app/test/glyphs.mjs <font.woff> "TEXT" <out.json>` writes outlines of any installed font for `SVGLoader` + `ExtrudeGeometry`. You may copy code from there into your folder.

## 4. CSS rules

- Every selector under one root class `.v-<slug>`, plus `html[data-v="<slug>"] { background: ... }`.
- Tailwind's reset is on: style links, headings, lists yourself. Do not name classes after Tailwind utilities (block, flex, grid, hidden, fixed, absolute, relative, sticky, italic, underline, border, shadow, blur, transition, transform, group, peer and so on).
- A switcher sits fixed at the bottom-left (about 12rem by 3.5rem). Keep fixed UI out of that corner; give the footer bottom padding.
- No horizontal scroll at 390px. Body text at least 17px desktop, 16px phone. Hit targets at least 44px.

## 5. No overlapping text, no layers fighting (he asked for this by name)

- Text never sits on top of other text. `test/check.mjs` scans every page at eight scroll positions on desktop and phone and reports any two text runs whose boxes intersect (`overlap`). It must come back empty. Sticky or pinned headers, marquee rows, giant background words and floating labels are the usual culprits: give each its own space, or make the decorative one `aria-hidden` and keep it clear of real text.
- Body text never sits on a busy 3D render, an image or a moving background. Give text its own calm, solid field.
- Fixed and sticky layers must never cover content the visitor is trying to read at any scroll position or width. Check the phone layout as carefully as the desktop one.

## 6. Robustness and accessibility

- One `<h1>`. A skip link (`<a className="skip-x" href="#main">`). Visually hidden text: `className="sr-only-x"`.
- Contrast at least 4.5:1, including dimmed states. Visible `:focus-visible` styles. Themed `::selection`.
- `aria-label` only on elements that may take one.
- Every interaction works with keyboard and touch. Nothing reachable only by hover. Content never depends on WebGL: detect it and show the content plainly without.
- Reduced motion: nothing moves on its own, everything visible, page complete.
- Canvases must not swallow page scroll: `touch-action: pan-y`, never `preventDefault` on wheel.
- No network at runtime except the GitHub API inside `useGitHub()` and `notes.md`. No CDNs, no remote fonts, images or models.
- Everything you draw is original: no real logos, no clones of real products' interfaces (no GitHub, VS Code, macOS, Windows, Discord, Spotify look-alikes), no known characters, no artworks. A plain list of his GitHub repos styled your way is fine; a fake GitHub page is not.

## 7. 3D notes (learned the hard way)

- Read scroll from the `scroll` store inside `useFrame`; never drive a scene with React state per frame.
- `ShaderMaterial` under `<EffectComposer>` must output linear colour.
- three r187: use `shadows={{ type: THREE.PCFShadowMap }}`.
- Bloom: `luminanceThreshold` 0.9 or more; never with `MeshReflectorMaterial`.
- `dpr={[1, 1.6]}`; lighten the scene on phones.
- 3D must not look cheap: physically based materials, bevels, real thickness, one motivated key light plus a rim, contact shadows or N8AO, a long lens, motion with weight (springs, damping, overshoot). If it still reads as a tech demo, stylise on purpose.
- No `<Environment preset>` (CDN). Build it: `<Environment resolution={256}><Lightformer .../></Environment>`.
- drei `<Text>` needs a local `font` (`@fontsource/<name>/files/<file>.woff?url`, use `.woff`).
- rapier works offline; wrap in `<Suspense>`.
- The test browser renders in software: wait about 12 seconds before the first screenshot. That says nothing about real speed.

## 8. How to work (unlazy + ponytail, distilled)

He asked for two working disciplines by name. Both apply:

- **Unlazy (completion discipline).** Before building, write your gates in `/tmp/port/<slug>/GATES.md`: one observable outcome per line (each required section present, each must-have from the brief, overlap empty, check clean, thumbnail good). Work in four passes: build the whole thing with no placeholders; re-read it as an expert designer and replace the cheap version of each part; hunt defects (overlap, phone, keyboard, reduced motion, empty states); polish. Do not report done while a gate is unmet; say plainly which gate you abandoned and why.
- **Ponytail (smallest complete change).** Use what exists (shared hooks, installed packages, patterns in the Skeptical drafts) before writing new code. No abstractions, options, config or "for later" code. Spend lines on what shows on screen, not on scaffolding. Never cut accessibility, validation, or anything the brief asks for.

## 9. The bar

He called earlier drafts "mid", "boring blocks", "AI slop", "doesn't feel related at all". Before you finish, your version must have:

1. **A first screen that lands in three seconds**: one unmistakable idea, visible without scrolling, that could only be about him.
2. **A reason in his own world**: skepticism, language and linguistics, Wittgenstein's ladder, Pyrrhonism, Old High German, debate, coaching, building and code. If the concept would fit any other portfolio, push it until it would not.
3. **At least four distinct things that happen**: scroll set-pieces, something to drag, press, type or throw, state that changes. Not one effect repeated.
4. **Its own typography and colour**, chosen for the idea. No gradients as decoration, no glass cards, no dashboard tiles, no "hero, three features, footer".
5. **Every section designed**, not just the first screen. The sections after the opening are where earlier drafts went boring: give the record, research, work, GitHub and Today blocks each a real layout of their own within the idea.
6. **Detail at the edges**: hover and focus states, an authored opening, a considered ending, a phone layout that was designed.

## 10. Verify before you finish (required)

```
bash test/serve.sh                                     # shared dev server on 127.0.0.1:5180
bash test/tscheck.sh <slug>                            # type errors in your folder only
node test/shot.mjs /<slug> --first 12000 --wait 1800   # stops down the page, desktop; prints the image path
node test/shot.mjs /<slug> --w 390 --h 844 --first 12000 --wait 1800
node test/play.mjs /<slug> steps.mjs --first 12000     # drive it like a person (see below)
node test/check.mjs /<slug>                            # errors, axe, links, copy, OVERLAP, reduced motion, phone overflow
node test/thumbs.mjs <slug> 12000                      # writes public/thumbs/<slug>.jpg
```

`steps.mjs` lives in `/tmp/port/<slug>/`: `export default async ({ page, snap, wait }) => { await page.mouse.click(700, 400); await wait(600); await snap(); };`. Only one test browser runs at a time, so commands queue: use a 10 minute timeout. Open every image with the Read tool and look. `check.mjs` must return empty `axe`, `errors`, `links`, `copy`, `overlap`, `reduced.invisible`, and `phone.sw` 390.
