// The desk drawn flat, for no WebGL and reduced motion, and as the loader before the scene is ready.
// After the FlatWord pattern in src/versions/letters/index.tsx (draft 2).
import { DEBATE, GITHUB, LINKS, RESEARCH, WORK } from '@/content';
import GLYPHS from './glyphs.json';
import { MARK_GITHUB } from './geo';
import { NAME } from './plan';

const BASE = import.meta.env.BASE_URL;
const g = (ch: string) => GLYPHS.glyphs.find((x) => x.ch === ch)!;
export const glyphPath = (ch: string) => g(ch);

/** Each object: where it goes, what a screen reader hears, and its drawing (bottom at y 0, left at x 0). */
type Obj = { id: string; w: number; href?: string; label: string; ext?: boolean; draw: React.ReactNode };

export function objects(o: { day: string; ghN: string; ghLabel: string }): Obj[] {
  const q = g('?');
  const qs = 0.62;
  return [
    {
      id: 'mitez', w: 700, href: WORK[0].href, ext: true, label: 'MITEZ, mitez.org, opens in a new tab',
      draw: (<>
        <rect x="10" y="-400" width="680" height="350" fill="#f4f1ea" stroke="#14110d" strokeWidth="6" />
        <image href={BASE + WORK[0].img} x="22" y="-388" width="656" height="326" preserveAspectRatio="xMidYMax slice" />
        <rect x="0" y="-50" width="700" height="50" rx="10" fill="#14110d" />
      </>),
    },
    {
      id: 'github', w: 470, href: GITHUB.href, ext: true, label: 'GitHub, github.com/wowneutral, opens in a new tab',
      draw: (<>
        <rect x="0" y="-430" width="470" height="430" rx="36" fill="#1a1a1c" />
        <path d={MARK_GITHUB} fill="#f4f1ea" transform="translate(155 -390) scale(10)" />
        <text x="235" y="-80" textAnchor="middle" className="fd-num">{o.ghN}</text>
        <text x="235" y="-30" textAnchor="middle" className="fd-small fd-light">{o.ghLabel.toUpperCase()}</text>
      </>),
    },
    {
      id: 'notepad', w: 420, href: '#today', label: 'Today’s note, read it below',
      draw: (<>
        <rect x="0" y="-540" width="420" height="540" fill="#f8f5ec" stroke="#14110d" strokeWidth="5" />
        <rect x="-6" y="-560" width="432" height="56" rx="8" fill="#14110d" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="40" y={-300 + i * 56} width={i === 4 ? 200 : 340} height="6" fill="#bdb7aa" />)}
        <text x="40" y="-380" className="fd-date">{o.day || 'TODAY'}</text>
      </>),
    },
    {
      id: 'paper', w: 400, href: '#research', label: 'The paper, read it below',
      draw: (<>
        <rect x="14" y="-536" width="386" height="530" fill="#ebe6da" stroke="#14110d" strokeWidth="4" />
        <rect x="0" y="-550" width="386" height="530" fill="#fbfaf6" stroke="#14110d" strokeWidth="5" />
        <text x="193" y="-370" textAnchor="middle" className="fd-serif">Not in</text>
        <text x="193" y="-300" textAnchor="middle" className="fd-serif">Mauthner{'’'}s</text>
        <text x="193" y="-230" textAnchor="middle" className="fd-serif">Sense</text>
        <rect x="163" y="-160" width="60" height="4" fill="#14110d" />
      </>),
    },
    {
      id: 'envelope', w: 560, href: LINKS[0].href, label: 'Email, founder@mitez.org',
      draw: (<>
        <rect x="0" y="-340" width="560" height="340" fill="#efe5cc" stroke="#8a7650" strokeWidth="4" />
        <path d="M0 -340 L280 -150 L560 -340 M0 0 L230 -170 M560 0 L330 -170" fill="none" stroke="#8a7650" strokeWidth="4" />
      </>),
    },
    ...DEBATE.wins.map((w, i) => ({
      id: 'plaque' + i, w: 300, href: '#debate', label: `Champion, ${w.event}, ${w.where}, read Debate below`,
      draw: (<>
        <rect x="0" y="-200" width="300" height="200" rx="14" fill="#14110d" />
        <rect x="22" y="-480" width="256" height="290" fill="#c79f55" stroke="#8b6a32" strokeWidth="6" />
        <text x="150" y="-370" textAnchor="middle" className="fd-plaque">CHAMPION</text>
        <text x="150" y="-290" textAnchor="middle" className="fd-small fd-brass">{w.where.toUpperCase()}</text>
      </>),
    })),
    {
      id: 'skeptical', w: q.advance * qs + 40, href: '#skeptical', label: 'Skeptical, the question mark',
      draw: <path d={q.d} fill="#c8321e" transform={`translate(${20 - q.x * qs} 0) scale(${qs})`} />,
    },
  ];
}

/** The whole desk: the name above, his things in a row on the paper below. */
export function FlatDesk({ links, day, ghN, ghLabel, className }: { links: boolean; day: string; ghN: string; ghLabel: string; className?: string }) {
  let pen = 0;
  const name = NAME.split('').map((ch, i) => {
    if (ch === ' ') { pen += 330; return null; }
    const gl = g(ch);
    const el = <path key={i} className={ch === '.' ? 'fd-dot' : undefined} d={gl.d} transform={`translate(${pen - gl.x} 0)`} />;
    pen += gl.advance + 56;
    return el;
  });
  const W = pen;
  const objs = objects({ day, ghN, ghLabel });
  const used = objs.reduce((s, o) => s + o.w, 0), gap = (W - used) / (objs.length - 1);
  let x = 0;
  const row = objs.map((o) => {
    const at = x; x += o.w + gap;
    const body = <g transform={`translate(${at.toFixed(0)} 700)`} aria-hidden="true">{o.draw}</g>;
    return links && o.href
      ? <a key={o.id} href={o.href} aria-label={o.label} className="fd-obj" target={o.ext ? '_blank' : undefined} rel={o.ext ? 'noopener' : undefined}>{body}</a>
      : <g key={o.id} className="fd-obj">{body}</g>;
  });
  return (
    <svg className={'flatdesk ' + (className ?? '')} viewBox={`-40 -960 ${W + 80} 1700`} role={links ? 'group' : 'img'} aria-label={links ? 'His desk, drawn flat: each thing is a link' : 'Armaan Seth'}>
      <rect x={-40} y={704} width={W + 80} height={6} fill="#14110d" opacity="0.12" />
      <g className="fd-name">{name}</g>
      {row}
    </svg>
  );
}

/** The apple, in two stills: resting on the paper, then only its shadow. */
export function AppleStill() {
  const apple = (
    <g>
      <ellipse cx="0" cy="96" rx="78" ry="12" fill="#14110d" opacity="0.22" />
      <path d="M0 -58 C-30 -82 -92 -70 -96 -10 C-100 50 -52 96 -10 92 C-4 90 4 90 10 92 C52 96 100 50 96 -10 C92 -70 30 -82 0 -58 Z" fill="#b3161d" />
      <path d="M-60 -30 C-52 -54 -34 -62 -20 -60" stroke="#e9b06a" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M0 -58 C2 -78 8 -92 16 -104" stroke="#4a3520" strokeWidth="8" fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg className="applestill" viewBox="0 0 520 240" role="img" aria-label="An apple resting on the paper, then the paper empty with only its shadow">
      <rect x="0" y="0" width="250" height="240" fill="#efeadd" />
      <rect x="270" y="0" width="250" height="240" fill="#efeadd" />
      <g transform="translate(125 110)">{apple}</g>
      <ellipse cx="395" cy="206" rx="78" ry="12" fill="#14110d" opacity="0.16" />
    </svg>
  );
}

export const RESEARCH_DOI = RESEARCH[0].links[0];
