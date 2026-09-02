const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function classify(review, skipSplit = false) {
  const res = await fetch(`${BASE}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review, skip_split: skipSplit }),
  });
  return handle(res);
}

export async function getGraph() {
  const res = await fetch(`${BASE}/graph`);
  return handle(res);
}

export async function getStats() {
  const res = await fetch(`${BASE}/stats`);
  return handle(res);
}

export async function resetState() {
  const res = await fetch(`${BASE}/reset`, { method: "POST" });
  return handle(res);
}
