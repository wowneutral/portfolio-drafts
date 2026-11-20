// The pineapple poll.
//
// It works the moment it is deployed. With a KV namespace bound it is durable
// across restarts and regions; without one it falls back to a module-scoped
// counter, which is real but only lives as long as the worker isolate does.
// The response says which mode it is in, so the page never has to guess and
// never has to pretend.
//
// TO MAKE IT DURABLE (about ninety seconds):
//   1. Cloudflare dashboard: Workers & Pages, KV, Create namespace, call it
//      "poll".
//   2. Your Pages project: Settings, Functions, KV namespace bindings.
//      Variable name POLL, namespace the one you just made. Save.
//   3. Redeploy.
//
// No cookies, no addresses, no identifiers. Two integers is the whole schema.

let memory = { yes: 0, no: 0 };

async function read(env) {
  if (!env.POLL) return { ...memory, durable: false };
  const [yes, no] = await Promise.all([env.POLL.get("yes"), env.POLL.get("no")]);
  return { yes: Number(yes || 0), no: Number(no || 0), durable: true };
}

const json = (body) =>
  Response.json(body, { headers: { "cache-control": "no-store" } });

export async function onRequestGet({ env }) {
  return json(await read(env));
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const key = body?.vote === "yes" ? "yes" : body?.vote === "no" ? "no" : null;
  if (!key) return new Response("bad vote", { status: 400 });

  if (env.POLL) {
    // Read, add one, write. Two votes in the same instant can lose a count;
    // for a pineapple poll that is a better trade than a durable object.
    const current = Number((await env.POLL.get(key)) || 0);
    await env.POLL.put(key, String(current + 1));
  } else {
    memory[key] += 1;
  }
  return json(await read(env));
}
