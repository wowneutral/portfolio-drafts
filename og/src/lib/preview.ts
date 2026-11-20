// Thirty-second previews, resolved at runtime.
//
// WHY NOT THE SPOTIFY EMBED. It plays the whole song for anyone signed in to
// Premium, it cannot be made to start on its own, and it brings its own white
// chrome that no amount of CSS reaches into, because it is a cross-origin
// iframe. Three requirements, none of them satisfiable.
//
// Apple's public search endpoint returns, for any track, a `previewUrl`: a
// thirty-second clip meant exactly for this, plus the real cover art. Playing
// that through a plain <audio> element means our own interface, our own clip
// length, our own start, and the site score can duck under it properly.
//
// Two separate cross-origin questions, and only one of them is a risk:
//   the SEARCH is a fetch, so it needs CORS, and Apple does send it;
//   the PLAYBACK is an <audio src>, which never needed CORS in the first place.
// If the search ever fails, the caller falls back to the Spotify embed.

export type Preview = { audio: string; art: string; artist: string };

const cache = new Map<string, Preview | null>();

export async function resolvePreview(title: string, artist: string): Promise<Preview | null> {
  const key = `${artist} ${title}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url =
      "https://itunes.apple.com/search?media=music&entity=song&limit=8&term=" +
      encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();

    // Apple's ranking is good but not perfect: match the artist and prefer an
    // exact title, so "Promise" does not resolve to somebody else's Promise.
    const wanted = title.toLowerCase();
    const list = (data.results ?? []).filter(
      (r: { artistName?: string; previewUrl?: string }) =>
        r.previewUrl && (r.artistName ?? "").toLowerCase().includes(artist.toLowerCase()),
    );
    const hit =
      list.find((r: { trackName?: string }) => (r.trackName ?? "").toLowerCase() === wanted) ??
      list.find((r: { trackName?: string }) => (r.trackName ?? "").toLowerCase().startsWith(wanted)) ??
      list[0];
    if (!hit) throw new Error("no match");

    const out: Preview = {
      audio: hit.previewUrl,
      // artworkUrl100 is a template in practice: asking for 600 gives 600.
      art: String(hit.artworkUrl100 ?? "").replace(/100x100bb/, "600x600bb"),
      artist: hit.artistName ?? artist,
    };
    cache.set(key, out);
    return out;
  } catch {
    cache.set(key, null);
    return null;
  }
}
