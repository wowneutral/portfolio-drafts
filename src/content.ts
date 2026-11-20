// Every word a version may say about Armaan, in one place.
// Started from the live site's content.ts (armaanseth.pages.dev) and updated
// with what he asked for in November 2026. Nothing here is invented.
//
// House rules:
//   - No em or en dashes anywhere in visible copy.
//   - Nothing a real person would not say out loud.
//   - Every claim is one Armaan can stand behind. Do not add results, numbers,
//     dates, places, book titles or quotes that are not in this file.

export type Version = {
  slug: string;
  n: number;
  name: string;
  color: string;
  ink: string;
  kind: string;
  text: string;
  /** Set for a version that lives outside this app (version 1, the live site). */
  href?: string;
};

// Version 1 is the live site itself, rebuilt with this content and served from ./og/.
export const VERSIONS: Version[] = [
  {
    slug: 'og', n: 1, name: 'The forest', color: '#24261f', ink: '#e9ecdf', kind: 'The live site, updated',
    text: 'The site that is live today, with the November updates: both championships, the paper in every place it lives, what he is reading, the philosophy club, and a daily note.',
    href: './og/',
  },
];

export const PERSON = {
  name: 'Armaan Seth',
  first: 'Armaan',
  last: 'Seth',
  age: 14,
  home: 'Gainesville, Florida',
  line: 'Founder of MITEZ, head coach of Skeptical, debater, researcher, developer.',
  short: ['Debater.', 'Researcher.', 'Builder.'],
  about: [
    'I started debating in 2023 and it took over. Lincoln Douglas especially, because an LD round is really an argument about ethics with a timer running. That pulled me into philosophy, which pulled me into research of my own: a paper on how a skeptic can criticise language using language.',
    'The other half is building. I make websites, tools, and an assistant that runs my desktop. Most of it exists because I wanted the thing to exist and nobody was going to make it for me. MITEZ is the same instinct pointed at people: mentorship costs the mentor time and nothing else, so it should be free.',
  ],
  aside: 'Also: I have mentored more than sixty students, I paint when there is time, and I shoot JROTC air rifle for fun.',
};

// The four things, in the order the live site tells them.
export const CHAPTERS = [
  { id: 'mitez', label: 'Nonprofit', title: 'MITEZ', body: 'Free mentorship for anyone who asks. I founded it, I run it, and it is going through incorporation now.' },
  { id: 'debate', label: 'Debate', title: 'Two titles this fall', body: 'Champion in Novice LD at Florida Blue Key, and champion in Open LD at Wildcat Classic. Before that, a TOC bid in Congressional Debate in 8th grade. Lincoln Douglas is where I actually live.' },
  { id: 'coach', label: 'Coaching', title: 'Skeptical', body: 'I founded Skeptical, a free, independent Lincoln-Douglas team, and I am its head coach. I still compete.' },
  { id: 'research', label: 'Research', title: 'Out in the open', body: 'A paper on Wittgenstein, Mauthner and the skeptic’s critique of language. Open access, with a DOI, on Zenodo, PhilArchive and Google Scholar.' },
  { id: 'builds', label: 'Building', title: 'Shipped', body: 'Sites, tools, and an assistant that answers my texts. Including the page you are reading.' },
] as const;

export const DEBATE = {
  wins: [
    { title: 'Champion', event: 'Novice Lincoln-Douglas', where: 'Florida Blue Key', when: '2026' },
    { title: 'Champion', event: 'Open Lincoln-Douglas', where: 'Wildcat Classic', when: '2026' },
  ],
  next: [
    { event: 'Novice Lincoln-Douglas', where: 'Isidore Newman' },
    { event: 'Open Lincoln-Douglas', where: 'DSDS1' },
  ],
  team: {
    name: 'Skeptical',
    role: 'Founder and head coach',
    line: 'A free, independent Lincoln-Douglas team. Coaches who still compete, a private prep drive, and scrims. Middle school through varsity.',
    record: 'First tournament as a team: a novice champion and a middle school semifinalist with top speaker, at the National Speech & Debate Season Opener.',
    href: 'https://skeptical.pages.dev',
    github: 'https://github.com/wowneutral/skeptical',
  },
};

export const RESEARCH = [
  {
    title: '“Not in Mauthner’s Sense”: Wittgenstein, Mauthner, and the Pyrrhonian Critique of Language',
    short: 'Not in Mauthner’s Sense',
    status: 'Open access, 2026',
    pages: 15,
    abstract: 'How can a skeptic argue that language fails when the argument has to be made in language? I follow one image, the ladder you climb and then throw away, through Sextus Empiricus, Fritz Mauthner and the Tractatus, and argue that Wittgenstein owes Mauthner far more than he admits.',
    keywords: ['linguistic skepticism', 'Pyrrhonism', 'Sprachkritik', 'Fritz Mauthner', 'Ludwig Wittgenstein', 'Sextus Empiricus'],
    // The three ladders the paper traces, with the passage each one comes from.
    ladders: [
      { who: 'Sextus Empiricus', when: 'about 200 CE', where: 'Against the Logicians, M 8.480 to 481' },
      { who: 'Fritz Mauthner', when: '1901', where: 'Contributions to a Critique of Language, the introduction' },
      { who: 'Ludwig Wittgenstein', when: '1921', where: 'Tractatus Logico-Philosophicus 6.54' },
    ],
    // The line the paper is named after (Tractatus 4.0031, Ogden translation).
    epigraph: { text: 'All philosophy is “Critique of language” (but not at all in Mauthner’s sense).', source: 'Wittgenstein, Tractatus 4.0031' },
    doi: '10.5281/zenodo.23652238',
    links: [
      { label: 'DOI', href: 'https://doi.org/10.5281/zenodo.23652238' },
      { label: 'Zenodo', href: 'https://zenodo.org/records/23652238' },
      { label: 'PhilArchive', href: 'https://philarchive.org/rec/SETTOQ' },
      { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=LKoj8VwAAAAJ' },
    ],
  },
  {
    title: 'The Wessobrunn Prayer: translation and commentary',
    short: 'The Wessobrunn Prayer',
    status: 'On SSRN',
    abstract: 'A modern English translation of one of the earliest surviving poems in Old High German, from the late 8th century, with commentary. Full modern translations were hard to find, so I made one.',
    links: [] as { label: string; href: string }[],
  },
];

export const WORK = [
  { n: '01', slug: 'mitez', name: 'MITEZ', kind: 'Nonprofit', img: 'work/mitez.jpg', href: 'https://mitez.org', line: 'The organisation’s site, designed and built and deployed by me. Free mentorship, matched by subject, at no cost to the student.', stack: 'React, Cloudflare Pages' },
  { n: '02', slug: 'skeptical', name: 'Skeptical', kind: 'Debate team', img: 'work/skeptical.jpg', href: 'https://skeptical.pages.dev', line: 'The site for the Lincoln-Douglas team I founded and head coach: the record, the prep drive, and an application portal coaches sign into with Discord.', stack: 'React, GSAP, Cloudflare Pages and D1' },
  { n: '03', slug: 'lastseen', name: 'Last Seen', kind: 'Narrative', img: 'work/lastseen.jpg', href: 'https://byrafi.netlify.app', line: 'A short story told as a website, where the interface does the telling. Still my favourite thing I have made.', stack: 'Web, motion' },
  { n: '04', slug: 'lastsearch', name: 'Last Search', kind: 'Narrative', img: 'work/lastsearch.jpg', href: 'https://lastsearch.netlify.app', line: 'A second story in the same spirit, built around what a person types when nobody is watching.', stack: 'Web, motion' },
  { n: '05', slug: 'spread', name: 'Spread', kind: 'Tool for debaters', img: 'work/spread.jpg', href: 'https://wowneutral.github.io/spread/', line: 'A drill tool for learning to read at speed without turning into noise. Built for my own practice first.', stack: 'Web app' },
  { n: '06', slug: 'rogue', name: 'Rogue', kind: 'Experiment', img: 'work/rogue.jpg', href: 'https://clauderogue.netlify.app', line: 'How far can an AI carry a build on its own, and where do the seams show. An honest answer, published.', stack: 'Web, AI' },
  { n: '07', slug: 'jarvis', name: 'JARVIS', kind: 'Personal software', img: 'work/jarvis.jpg', href: null, line: 'A desktop assistant that actually runs my machine, plus a second build you can text like a person.', stack: 'Python, local' },
  { n: '08', slug: 'drafts', name: 'One hundred drafts', kind: 'Design library', img: 'work/drafts.jpg', href: 'https://wowneutral.github.io/skeptical-draft2/', line: 'A hundred different versions of the Skeptical site, each one a single idea, built to find the one worth shipping.', stack: 'React, Three.js, GitHub Pages' },
] as const;

// Only the ones worth a stranger's attention. Newest first.
export const HONORS = [
  { what: 'Champion, Novice Lincoln-Douglas', detail: 'Florida Blue Key' },
  { what: 'Champion, Open Lincoln-Douglas', detail: 'Wildcat Classic' },
  { what: 'WD Awards Favourite, for this site and mitez.org', detail: 'September 2026' },
  { what: 'TOC bid, Congressional Debate', detail: '8th grade' },
  { what: '2nd Overall, Middle School, The Great Debate', detail: 'NCDC' },
  { what: 'Best Delegate, Cambridge University Model UN', detail: 'CUIMUN' },
  { what: '2nd, Public Forum, FCDI Statewide', detail: 'Florida' },
  { what: 'Semi-finalist, Impromptu Speaking', detail: 'NSDA, top 12' },
  { what: '1st, Website Design', detail: 'FBLA Regionals' },
  { what: 'Translation and commentary, the Wessobrunn Prayer', detail: 'SSRN' },
] as const;

export const AWARDS = [
  { site: 'A Living World', note: 'His portfolio, WD Favourite', img: 'awards/wd-a-living-world.jpg', href: 'https://wdawards.com/web/a-living-world' },
  { site: 'Make It Easy', note: 'mitez.org, WD Favourite', img: 'awards/wd-make-it-easy.jpg', href: 'https://wdawards.com/web/make-it-easy' },
] as const;

export const STATS = [
  { to: 60, suffix: '+', label: 'Students mentored' },
  { to: 20, suffix: '+', label: 'Projects peer reviewed' },
  { to: 2, suffix: '', label: 'LD titles in 2026' },
] as const;

// What he is into right now. He named the genres, not the books: never invent titles or authors here.
export const NOW = {
  reading: {
    title: 'Getting into literature',
    body: 'Lately: absurdist fiction, queer literature, and, as always, the skeptics.',
    shelves: ['Absurdist fiction', 'Queer literature', 'The skeptics'],
  },
  club: {
    title: 'Starting a philosophy club',
    body: 'I want to start a philosophy club. It is in the works.',
  },
  status: 'Right now: getting ready for Isidore Newman and DSDS1, and behind on stats homework.',
};

export const COURSES = [
  { provider: 'HarvardX', title: 'Justice', note: 'Sandel’s course. The one that started it.' },
  { provider: 'Saylor', title: 'PHIL 102', note: 'Critical thinking and logic' },
  { provider: 'Saylor', title: 'PHIL 103', note: 'Moral and political philosophy' },
  { provider: 'FLVS', title: 'Law Studies', note: 'Certified, State of Florida' },
] as const;

export const LIKES = [
  'vibecoding until something works',
  'reading philosophy for fun',
  'going far too deep on skepticism',
  'debate, obviously',
  'absurdist and queer literature',
  'painting, when I have the time',
  'JROTC air rifle, for fun. Stay away from me, I am dangerous',
] as const;

export const DISLIKES = [
  'hitting my Claude usage limits',
  'Plato. Terrible, terrible frameworks',
  'arguments that win on presentation',
  'being told to keep it short',
] as const;

export const FAVOURITES = [
  'Interstellar, and TARS, the best character in it',
  'Laufey',
  'Sparkling water: plain, lime, or lemon. Never still.',
  'Oolong milk tea with boba, every single time',
] as const;

export const LINKS = [
  { label: 'Email', value: 'founder@mitez.org', href: 'mailto:founder@mitez.org' },
  { label: 'Personal email', value: 'armaan.seth2011@gmail.com', href: 'mailto:armaan.seth2011@gmail.com' },
  { label: 'GitHub', value: 'github.com/wowneutral', href: 'https://github.com/wowneutral' },
  { label: 'Research', value: 'Google Scholar', href: 'https://scholar.google.com/citations?user=LKoj8VwAAAAJ' },
  { label: 'Debate team', value: 'skeptical.pages.dev', href: 'https://skeptical.pages.dev' },
  { label: 'The nonprofit', value: 'mitez.org', href: 'https://mitez.org' },
  { label: 'Discord', value: '@skepticnegates', href: null },
] as const;

export const GITHUB = {
  user: 'wowneutral',
  href: 'https://github.com/wowneutral',
  // Shown until (or instead of, if GitHub is unreachable) the live data from useGitHub().
  repos: [
    { name: 'skeptical', description: 'The Skeptical team site and its coach portal.', language: 'TypeScript', href: 'https://github.com/wowneutral/skeptical' },
    { name: 'skeptical-draft2', description: 'One hundred drafts of the Skeptical site.', language: 'TypeScript', href: 'https://github.com/wowneutral/skeptical-draft2' },
    { name: 'spread', description: 'A speed reading drill for debaters.', language: 'JavaScript', href: 'https://github.com/wowneutral/spread' },
    { name: 'portfolio-drafts', description: 'Twenty drafts of this site.', language: 'TypeScript', href: 'https://github.com/wowneutral/portfolio-drafts' },
  ],
};

// Allowed outbound links. test/check.mjs flags any other href.
export const ALLOWED_LINK = /^(#|\/|\.\/|mailto:(founder@mitez\.org|armaan\.seth2011@gmail\.com)|https:\/\/(mitez\.org|skeptical\.pages\.dev|byrafi\.netlify\.app|lastsearch\.netlify\.app|wowneutral\.github\.io|clauderogue\.netlify\.app|github\.com\/wowneutral|doi\.org\/10\.5281\/zenodo\.23652238|zenodo\.org\/records\/23652238|philarchive\.org\/rec\/SETTOQ|scholar\.google\.com\/citations\?user=LKoj8VwAAAAJ|wdawards\.com\/web\/))/;
