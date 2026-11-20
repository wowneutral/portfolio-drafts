// Everything the page says, in one place.
//
// House rules for this file:
//   - No em dashes anywhere in visible copy. Full stops, commas, colons.
//   - Nothing that a real person would not say out loud.
//   - Every claim is one Armaan can stand behind.

export type Chapter = {
  id: string; from: number; to: number; side: "left" | "right";
  label: string; title: string; body: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "mitez", from: 0.1, to: 0.29, side: "left",
    label: "01 / Nonprofit", title: "MITEZ",
    body: "Free mentorship for anyone who asks. I founded it, I run it, and it is going through incorporation now.",
  },
  {
    id: "debate", from: 0.32, to: 0.51, side: "right",
    label: "02 / Debate", title: "Two titles this fall",
    body: "Champion in Novice LD at Florida Blue Key and in Open LD at Wildcat Classic. I also founded and head coach Skeptical, an LD team.",
  },
  {
    id: "author", from: 0.54, to: 0.73, side: "left",
    label: "03 / Research", title: "Out in the open",
    body: "A paper on Wittgenstein, Mauthner and the skeptic's critique of language. Open access, with a DOI, on Zenodo, PhilArchive and Google Scholar.",
  },
  {
    id: "builds", from: 0.76, to: 0.94, side: "right",
    label: "04 / Building", title: "Shipped",
    body: "Sites, tools, and an assistant that answers my texts. Including the page you are reading.",
  },
];

export const WORK = [
  {
    n: "01", name: "MITEZ", kind: "Nonprofit", img: "work/mitez.jpg",
    href: "https://mitez.org",
    line: "The organisation's site, designed and built and deployed by me. Free mentorship, matched by subject, at no cost to the student.",
    stack: "React, Cloudflare Pages",
  },
  {
    n: "02", name: "Last Seen", kind: "Narrative", img: "work/lastseen.jpg",
    href: "https://byrafi.netlify.app",
    line: "A short story told as a website, where the interface does the telling. Still my favourite thing I have made.",
    stack: "Web, motion",
  },
  {
    n: "03", name: "Last Search", kind: "Narrative", img: "work/lastsearch.jpg",
    href: "https://lastsearch.netlify.app",
    line: "A second story in the same spirit, built around what a person types when nobody is watching.",
    stack: "Web, motion",
  },
  {
    n: "04", name: "Spread", kind: "Tool for debaters", img: "work/spread.jpg",
    href: "https://wowneutral.github.io/spread/",
    line: "A drill tool for learning to read at speed without turning into noise. Built for my own practice first.",
    stack: "Web app",
  },
  {
    n: "05", name: "Skeptical", kind: "Debate team", img: "work/skeptical.jpg",
    href: "https://skeptical.pages.dev",
    line: "The Lincoln-Douglas team I founded and head coach, and its site: the record, the prep drive, and an application portal coaches sign into with Discord.",
    stack: "React, GSAP, Cloudflare Pages and D1",
  },
  {
    n: "06", name: "Rogue", kind: "Experiment", img: "work/rogue.jpg",
    href: "https://clauderogue.netlify.app",
    line: "How far can an AI carry a build on its own, and where do the seams show. An honest answer, published.",
    stack: "Web, AI",
  },
  {
    n: "07", name: "JARVIS", kind: "Personal software", img: "work/jarvis.jpg",
    href: null,
    line: "A desktop assistant that actually runs my machine, plus a second build you can text like a person.",
    stack: "Python, local",
  },
] as const;

// Only the ones worth a stranger's attention.
export const HONORS = [
  { what: "Champion, Novice Lincoln-Douglas", detail: "Florida Blue Key" },
  { what: "Champion, Open Lincoln-Douglas", detail: "Wildcat Classic" },
  { what: "WD Awards Favourite, for this site and mitez.org", detail: "September 2026" },
  { what: "TOC bid, Congressional Debate", detail: "8th grade" },
  { what: "2nd Overall, Middle School, The Great Debate", detail: "NCDC" },
  { what: "Best Delegate, Cambridge University Model UN", detail: "CUIMUN" },
  { what: "2nd, Public Forum, FCDI Statewide", detail: "Florida" },
  { what: "Semi-finalist, Impromptu Speaking", detail: "NSDA, top 12" },
  { what: "1st, Website Design", detail: "FBLA Regionals" },
  { what: "Translation and commentary, the Wessobrunn Prayer", detail: "SSRN" },
] as const;

// The two certificates, shown under the record. Images are the PDFs WD Awards
// sent, turned into pictures; each links to its page on wdawards.com.
export const AWARDS = [
  { site: "A Living World", note: "This site · WD Favourite", img: "awards/wd-a-living-world.jpg", href: "https://wdawards.com/web/a-living-world" },
  { site: "Make It Easy", note: "mitez.org · WD Favourite", img: "awards/wd-make-it-easy.jpg", href: "https://wdawards.com/web/make-it-easy" },
] as const;

export const STATS = [
  { to: 60, suffix: "+", label: "Students mentored" },
  { to: 20, suffix: "+", label: "Projects peer reviewed" },
  { to: 14, suffix: "", label: "Years old" },
] as const;

export const COURSES = [
  { provider: "HarvardX", title: "Justice", note: "Sandel's course. The one that started it." },
  { provider: "Saylor", title: "PHIL 102", note: "Critical thinking and logic" },
  { provider: "Saylor", title: "PHIL 103", note: "Moral and political philosophy" },
  { provider: "FLVS", title: "Law Studies", note: "Certified, State of Florida" },
] as const;

export const LIKES = [
  "vibecoding until something works",
  "reading philosophy for fun",
  "going far too deep on skepticism",
  "debate, obviously",
  "absurdist and queer literature, lately",
  "painting, when I have the time",
  "JROTC air rifle, for fun. Stay away from me, I am dangerous",
] as const;

export const DISLIKES = [
  "hitting my Claude usage limits",
  "Plato. Terrible, terrible frameworks",
  "arguments that win on presentation",
  "being told to keep it short",
] as const;

// Paste the Spotify share link for each song (Share, Copy song link). The
// component pulls the id out of whatever form the URL takes, so a full share
// URL with its tracking query string is fine. Empty means the card shows
// without a player rather than showing a broken one.
export const LAUFEY = [
  { title: "Bewitched", id: "0pfpeTGQOWlGp6YUUbBD42" },
  { title: "Lovesick", id: "39fD0qvjgk8RarJnoBiDTx" },
  { title: "Promise", id: "08PdFBcXzpkn1cWNgmKqhn" },
] as const;

// Sketchfab viewers. One is mounted at a time, and only once the section is
// on screen: each embed is a full WebGL viewer, and five of them running at
// once would cost more than the forest does.
export const MODELS = [
  {
    key: "tars",
    label: "TARS",
    note: "Best character in the film is a filing cabinet.",
    id: "26d8323ceed34a718fbbf4c3d4ec8d49",
    credit: "Tars - Interstellar by The Moyai",
    href: "https://sketchfab.com/3d-models/tars-interstellar-26d8323ceed34a718fbbf4c3d4ec8d49",
  },
  {
    key: "tesseract",
    label: "The tesseract",
    note: "The end of Interstellar. Still the best scene ever filmed.",
    id: "99fa9d0135fc4f20b4bdfcbc5704ec25",
    credit: "Interstellar - Tesseract scene by fisher007",
    href: "https://sketchfab.com/3d-models/interstellar-tesseract-scene-final-99fa9d0135fc4f20b4bdfcbc5704ec25",
  },
  {
    key: "water",
    label: "Sparkling water",
    note: "Plain, lime, or lemon. Never still.",
    id: "ef783e8b7e98455da697bf2f9b326b01",
    credit: "San Pellegrino Water 750ml by amiryasrebi",
    href: "https://sketchfab.com/3d-models/san-pellegrino-water-750ml-ef783e8b7e98455da697bf2f9b326b01",
  },
  {
    key: "boba",
    label: "Oolong milk tea",
    note: "Boba, every single time.",
    id: "1203d1fe02e24c41a5ea0d172202e289",
    credit: "Bubble milk tea by zBossKungx",
    href: "https://sketchfab.com/3d-models/bubble-milk-tea-1203d1fe02e24c41a5ea0d172202e289",
  },
  {
    key: "chicken",
    label: "Chicken",
    note: "I am not a complicated eater.",
    id: "0651fa619e324cfcab1d97816d13bcbd",
    credit: "Fried chicken wing by CzernO",
    href: "https://sketchfab.com/3d-models/fried-chicken-wing-0651fa619e324cfcab1d97816d13bcbd",
  },
] as const;

export const LINKS = [
  { label: "Email", value: "founder@mitez.org", href: "mailto:founder@mitez.org" },
  { label: "Personal email", value: "armaan.seth2011@gmail.com", href: "mailto:armaan.seth2011@gmail.com" },
  { label: "Legal email", value: "armaan.law@outlook.com", href: "mailto:armaan.law@outlook.com" },
  { label: "GitHub", value: "github.com/wowneutral", href: "https://github.com/wowneutral" },
  { label: "Research", value: "Google Scholar", href: "https://scholar.google.com/citations?user=LKoj8VwAAAAJ" },
  { label: "Discord", value: "@skepticnegates", href: null },
  { label: "The nonprofit", value: "mitez.org", href: "https://mitez.org" },
] as const;

// November 2026 additions.
export const NEXT_UP = [
  { event: "Novice LD", where: "Isidore Newman" },
  { event: "Open LD", where: "DSDS1" },
] as const;

export const READING = {
  line: "Getting into literature: absurdist fiction, queer literature, and, as always, the skeptics.",
  club: "Starting a philosophy club. It is in the works.",
} as const;

export const GITHUB_USER = "wowneutral";
export const GITHUB_FALLBACK = [
  { name: "skeptical", description: "The Skeptical team site and its coach portal.", href: "https://github.com/wowneutral/skeptical" },
  { name: "skeptical-draft2", description: "One hundred drafts of the Skeptical site.", href: "https://github.com/wowneutral/skeptical-draft2" },
  { name: "spread", description: "A speed reading drill for debaters.", href: "https://github.com/wowneutral/spread" },
  { name: "portfolio-drafts", description: "Twenty drafts of this site.", href: "https://github.com/wowneutral/portfolio-drafts" },
] as const;
