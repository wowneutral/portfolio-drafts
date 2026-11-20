# portfolio-drafts

Twenty drafts of [Armaan Seth](https://github.com/wowneutral)'s portfolio, one route each, in one Vite + React + TypeScript app. Each draft is a single idea about how to show the same person: the words never change, only the design does.

**Browse them:** https://wowneutral.github.io/portfolio-drafts/ (any single draft: add `?v=` and its number, e.g. `?v=7`).

Nothing here is the live site. The live site stays where it is until a draft is picked.

## What every draft carries

- **Today**: a daily note. `public/notes.md` holds every entry (a `## YYYY-MM-DD` heading, then a paragraph, newest first); every draft reads that one file at runtime, so posting is one edit and one push.
- **Live from GitHub**: recent commits and repositories, fetched in the visitor's browser from the public GitHub API, with a static fallback when GitHub is unreachable (`src/lib/github.ts`).
- Debate (two Lincoln-Douglas titles in 2026, Skeptical, what is next), the research, every project, the record, and every way to get in touch, all from one file: `src/content.ts`.

## Layout

```
src/content.ts           every word, in one place
src/lib/notes.ts         the daily note
src/lib/github.ts        live GitHub data
src/versions/<slug>/     one folder per draft (registers itself through meta.ts)
src/versions/index/      the catalog
og/                      draft 1: the live site, rebuilt with the November updates
test/                    screenshot, interaction and accessibility checks (Playwright, axe)
BUILDING.md              the contract each draft is built against
```

## Run it

```
npm install
npm run dev              # the drafts, at http://localhost:5180
cd og && npm install && npm run dev   # draft 1 on its own
```

## Checks

`node test/check.mjs /<slug>` loads a draft on desktop, phone and with reduced motion, and reports console errors, axe violations, links outside the allowed list, copy rule breaks, horizontal overflow, and **any two pieces of text that overlap** at eight scroll positions. A draft is committed only when that report is empty.
