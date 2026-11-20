// The front door: every draft as a print, two to a row. Version 1 is the live site, rebuilt, so it opens outside the app.
import { useRef } from 'react';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './index.css';
import { ALL as VERSIONS } from '@/registry';
import { PERSON } from '@/content';
import { Split, useRise } from '@/lib/motion';
import { useVersion } from '@/lib/version';
import { Go } from '@/components/Transition';

const thumb = (slug: string) => `${import.meta.env.BASE_URL}thumbs/${slug}.jpg`;

export default function Index() {
  useVersion('index');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  return (
    <div className="pi" ref={root}>
      <header>
        <p className="pi-mark">{PERSON.name}</p>
        <Split as="h1" on="load" delay={0.3}>{`A portfolio, ${VERSIONS.length} ways.`}</Split>
        <p data-rise>Each draft is one idea about how to show the same person. The words are the same everywhere; only the design changes. Pick the ones worth keeping.</p>
      </header>
      <main>
        <ol>
          {VERSIONS.map((v) => {
            const inner = (
              <>
                <span className="pi-thumb" style={{ background: v.color }}>
                  <img src={thumb(v.slug)} alt="" width={640} height={400} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </span>
                <span className="pi-cap">
                  <span className="pi-n">{String(v.n).padStart(2, '0')}</span>
                  <span className="pi-name">{v.name}</span>
                  <span className="pi-kind">{v.kind}</span>
                </span>
                <span className="pi-text">{v.text}</span>
              </>
            );
            return (
              <li key={v.slug} data-rise>
                {v.href ? <a href={v.href}>{inner}</a> : <Go to={`/${v.slug}`}>{inner}</Go>}
              </li>
            );
          })}
        </ol>
      </main>
      <footer>
        <p>Drafts only: nothing here is the live site. Share a single draft with <code>?v=</code> and its number. Inside a draft, use the bar at the bottom left or the [ and ] keys to step through.</p>
      </footer>
    </div>
  );
}
