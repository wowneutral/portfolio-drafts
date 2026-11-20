// Live from GitHub: recent commits and repositories, fetched in the visitor's browser.
// No token; if GitHub is unreachable or rate limited, the static list stays.
import { useEffect, useState } from "react";
import { GITHUB_FALLBACK, GITHUB_USER } from "../content";
import "./now.css";

type Repo = { name: string; description: string | null; href: string; language?: string | null };
type Commit = { repo: string; message: string; at: string; href: string };

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [u, n] of [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]] as const)
    if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return "just now";
}

export default function Code() {
  const [repos, setRepos] = useState<Repo[]>(GITHUB_FALLBACK.map((r) => ({ ...r })));
  const [commits, setCommits] = useState<Commit[]>([]);
  useEffect(() => {
    const api = `https://api.github.com/users/${GITHUB_USER}`;
    fetch(`${api}/repos?sort=pushed&per_page=6`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (Array.isArray(j) && j.length) setRepos(j.filter((r) => !r.fork).map((r) => ({ name: r.name, description: r.description, href: r.html_url, language: r.language })));
    }).catch(() => {});
    fetch(`${api}/events/public?per_page=40`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!Array.isArray(j)) return;
      const out: Commit[] = [];
      for (const e of j) if (e.type === "PushEvent") for (const c of e.payload?.commits ?? [])
        out.push({ repo: String(e.repo?.name ?? "").split("/")[1] ?? "", message: String(c.message ?? "").split("\n")[0], at: e.created_at, href: `https://github.com/${e.repo?.name}/commit/${c.sha}` });
      setCommits(out.slice(0, 6));
    }).catch(() => {});
  }, []);
  return (
    <section className="act2-section" id="code" data-num="07">
      <div className="act2-wrap">
        <p className="sec-label" data-reveal>Live from GitHub</p>
        <h2 className="act2-h" data-reveal>What I pushed lately.</h2>
        {commits.length > 0 && (
          <ol className="code-commits">
            {commits.map((c) => (
              <li key={c.href}>
                <a href={c.href} target="_blank" rel="noreferrer" data-sfx>
                  <span className="code-repo">{c.repo}</span>
                  <span className="code-msg">{c.message}</span>
                  <time dateTime={c.at}>{ago(c.at)}</time>
                </a>
              </li>
            ))}
          </ol>
        )}
        <ul className="code-repos">
          {repos.slice(0, 6).map((r) => (
            <li key={r.name}>
              <a href={r.href} target="_blank" rel="noreferrer" data-sfx>
                <span className="code-name">{r.name}<span aria-hidden="true"> ↗</span></span>
                {r.description && <span className="code-desc">{r.description}</span>}
              </a>
            </li>
          ))}
        </ul>
        <p className="act2-aside" data-reveal>
          All of it at <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer">github.com/{GITHUB_USER}</a>.
        </p>
      </div>
    </section>
  );
}
