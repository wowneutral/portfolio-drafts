// The daily note. Armaan edits public/notes.md (a "## YYYY-MM-DD" heading, then
// a paragraph or two) and pushes; every version reads the same file at runtime.
import { useEffect, useState } from 'react';

export type Note = { date: string; body: string[] };

export function parseNotes(md: string): Note[] {
  return md
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [head, ...rest] = block.split('\n');
      const body = rest.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
      return { date: head.trim(), body };
    })
    .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date) && n.body.length > 0);
}

/** "2026-11-20" to "20 November 2026". */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', opts);
}

/** All notes, newest first. Empty while loading or if the file is missing. */
export function useNotes(): { notes: Note[]; loaded: boolean } {
  const [state, set] = useState<{ notes: Note[]; loaded: boolean }>({ notes: [], loaded: false });
  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}notes.md`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
      .then((t) => { if (live) set({ notes: parseNotes(t).sort((a, b) => b.date.localeCompare(a.date)), loaded: true }); });
    return () => { live = false; };
  }, []);
  return state;
}
