// "Do you like pineapple on pizza?"
//
// A real poll when a store is wired up (see functions/api/poll.js), and an
// honest one when it is not: without a backend it still takes your answer and
// answers back, it just does not show a tally it cannot actually count.
//
// The vote is remembered in localStorage so the page does not ask twice. That
// is per browser, which is exactly as rigorous as this question deserves.

import { useEffect, useState } from "react";
import "./poll.css";

type Tally = { yes: number; no: number; durable?: boolean };
const KEY = "pineapple-vote";

export default function Poll() {
  const [vote, setVote] = useState<"yes" | "no" | null>(null);
  const [tally, setTally] = useState<Tally | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "yes" || v === "no") setVote(v);
    } catch { /* private window; the poll just asks again */ }
    fetch("/api/poll")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTally(d))
      .catch(() => {});
  }, []);

  const cast = async (v: "yes" | "no") => {
    if (vote) return;
    setVote(v);
    try { localStorage.setItem(KEY, v); } catch { /* fine */ }
    try {
      const r = await fetch("/api/poll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vote: v }),
      });
      if (r.ok) setTally(await r.json());
    } catch { /* no store wired up; no numbers shown */ }
  };

  const total = tally ? tally.yes + tally.no : 0;
  // Percentages are only shown once a real tally has been read back. A
  // percentage of one vote is not information, it is decoration.
  const show = !!tally && total > 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="poll">
      <p className="poll-q">Armaan likes pineapple on pizza.</p>
      <p className="poll-q poll-q-big">Do you?</p>

      <div className="poll-opts" role="group" aria-label="Pineapple on pizza">
        {([
          ["yes", "Yes", "I am the coolest person ever"],
          ["no", "No", "I suck"],
        ] as const).map(([k, big, small]) => (
          <button
            key={k}
            type="button"
            data-sfx
            className={`poll-opt${vote === k ? " picked" : ""}${vote && vote !== k ? " dimmed" : ""}`}
            disabled={!!vote}
            onClick={() => cast(k)}
          >
            {show ? (
              <span
                className="poll-fill"
                aria-hidden="true"
                style={{ transform: `scaleX(${pct(tally![k]) / 100})` }}
              />
            ) : null}
            <span className="poll-opt-text">
              <span className="poll-big">{big}</span>
              <span className="poll-small">({small})</span>
            </span>
            {show ? (
              <span className="poll-pct">
                {pct(tally![k])}%
                <span className="poll-count">{tally![k].toLocaleString()}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <p className="poll-foot" aria-live="polite">
        {!vote
          ? "Anonymous. No account, no cookie, nothing stored about you."
          : show
            ? `${vote === "yes" ? "Correct. We are going to get along." : "Noted. We can still be friends."} ${total.toLocaleString()} ${total === 1 ? "answer" : "answers"} so far.`
            : vote === "yes"
              ? "Correct. We are going to get along."
              : "Noted. We can still be friends."}
      </p>
    </div>
  );
}
