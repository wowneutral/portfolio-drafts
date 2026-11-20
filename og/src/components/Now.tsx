// November 2026: the daily note, what he is reading, the club, and what is next.
// The note is public/notes.md: a "## YYYY-MM-DD" heading and a paragraph, newest first.
import { useEffect, useState } from "react";
import { NEXT_UP, READING } from "../content";
import "./now.css";

type Note = { date: string; body: string[] };

function parse(md: string): Note[] {
  return md.split(/^## /m).slice(1).map((block) => {
    const [head, ...rest] = block.split("\n");
    return { date: head.trim(), body: rest.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean) };
  }).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date) && n.body.length).sort((a, b) => b.date.localeCompare(a.date));
}

const day = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function Now() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}notes.md`, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "").then((t) => setNotes(parse(t)));
  }, []);
  const [latest, ...older] = notes;
  return (
    <section className="act2-section" id="now" data-num="06">
      <div className="act2-wrap">
        <p className="sec-label" data-reveal>Today</p>
        <h2 className="act2-h" data-reveal>A note a day, more or less.</h2>
        {latest ? (
          <article className="now-note">
            <time dateTime={latest.date}>{day(latest.date)}</time>
            {latest.body.map((p) => <p key={p}>{p}</p>)}
          </article>
        ) : (
          <p className="now-note now-note-empty">No note yet today.</p>
        )}
        {older.length > 0 && (
          <details className="now-older">
            <summary>Earlier notes</summary>
            <ol>
              {older.slice(0, 14).map((n) => (
                <li key={n.date}><time dateTime={n.date}>{day(n.date)}</time><p>{n.body.join(" ")}</p></li>
              ))}
            </ol>
          </details>
        )}
        <div className="now-grid">
          <div className="now-cell" data-reveal>
            <h3>Reading</h3>
            <p>{READING.line}</p>
          </div>
          <div className="now-cell" data-reveal style={{ transitionDelay: "80ms" }}>
            <h3>Starting</h3>
            <p>{READING.club}</p>
          </div>
          <div className="now-cell" data-reveal style={{ transitionDelay: "160ms" }}>
            <h3>Next rounds</h3>
            <ul>{NEXT_UP.map((n) => <li key={n.where}><span>{n.where}</span><span>{n.event}</span></li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}
