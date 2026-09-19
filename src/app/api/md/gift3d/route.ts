import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 3D Gift Box library — live proxy to the public Sketchfab model search API.
 *
 * GET /api/md/gift3d?q=gift+box&cursor=0
 *   → { ok: true, models: Gift3dModel[], nextCursor: number | null }
 *
 * Models are streamed (iframe embeds) straight from Sketchfab's CDN — we never
 * host the geometry. Responses are normalized to a stable shape and cached in
 * process memory for 10 minutes (Sketchfab search is rate-limited per IP).
 */

interface Gift3dModel {
  id: string;
  name: string;
  author: string;
  thumb: string;
  embedUrl: string;
  viewerUrl: string;
  views: number;
  likes: number;
  animated: boolean;
  downloadable: boolean;
}

const COUNT = 24;
const MAX_CURSOR = 480;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 64;

const cache = new Map<string, { at: number; body: { ok: true; models: Gift3dModel[]; nextCursor: number | null } }>();

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function cachePut(key: string, body: { ok: true; models: Gift3dModel[]; nextCursor: number | null }) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // evict the oldest entry (Map preserves insertion order)
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), body });
}

/** Pick the smallest thumbnail ≥400px wide (grid cards) — fall back to the largest. */
function pickThumb(images: unknown): string {
  if (!Array.isArray(images)) return "";
  let best: { url: string; w: number } | null = null;
  let largest: { url: string; w: number } | null = null;
  for (const img of images) {
    const url = typeof (img as { url?: unknown })?.url === "string" ? (img as { url: string }).url : "";
    const w = Number((img as { width?: unknown })?.width) || 0;
    if (!url || !w) continue;
    if (!largest || w > largest.w) largest = { url, w };
    if (w >= 400 && (!best || w < best.w)) best = { url, w };
  }
  return (best ?? largest)?.url ?? "";
}

function toInt(v: string | null, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeModel(raw: unknown): Gift3dModel | null {
  const r = raw as { uid?: unknown; name?: unknown; user?: { displayName?: unknown; username?: unknown } | null; viewerUrl?: unknown; viewCount?: unknown; likeCount?: unknown; animationCount?: unknown; isDownloadable?: unknown; thumbnails?: { images?: unknown } | null };
  const id = typeof r?.uid === "string" ? r.uid : "";
  if (!/^[a-f0-9]{16,40}$/i.test(id)) return null;
  const name = typeof r?.name === "string" && r.name.trim() ? r.name.trim() : "Untitled model";
  const author =
    (typeof r?.user?.displayName === "string" && r.user.displayName.trim()) ||
    (typeof r?.user?.username === "string" && r.user.username.trim()) ||
    "Sketchfab creator";
  const viewerUrl = typeof r?.viewerUrl === "string" ? r.viewerUrl : `https://sketchfab.com/3d-models/${id}`;
  return {
    id,
    name: name.slice(0, 80),
    author: author.slice(0, 60),
    thumb: pickThumb(r?.thumbnails?.images),
    embedUrl: `https://sketchfab.com/models/${id}/embed`,
    viewerUrl,
    views: Math.max(0, toInt(String(r?.viewCount ?? "0"), 0)),
    likes: Math.max(0, toInt(String(r?.likeCount ?? "0"), 0)),
    animated: Number(r?.animationCount ?? 0) > 0,
    downloadable: r?.isDownloadable === true,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawQ = (sp.get("q") ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60);
  const q = rawQ.length >= 2 ? rawQ : "gift box";
  const cursor = Math.min(Math.max(0, toInt(sp.get("cursor"), 0)), MAX_CURSOR);

  const key = `${q}|${cursor}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url =
    `https://api.sketchfab.com/v3/search?type=models&count=${COUNT}&cursor=${cursor}` +
    `&sort_by=-likeCount&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MemorableDay/1.0 (+https://memorableday.in)" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sketchfab responded ${res.status}`);
    const json = (await res.json()) as { results?: unknown };
    const models = (Array.isArray(json?.results) ? json.results : [])
      .map(normalizeModel)
      .filter((m): m is Gift3dModel => m !== null);

    const body = {
      ok: true as const,
      models,
      nextCursor: models.length === COUNT ? cursor + COUNT : null,
    };
    cachePut(key, body);
    return NextResponse.json(body);
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "The Sketchfab library took too long to respond. Try again."
        : "Could not reach the Sketchfab library right now. Try again in a moment.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
