/**
 * /api/md/music/search?q=… — song search for builder blocks + soundtracks.
 *
 * Provider strategy (Instagram-Notes-style song picking):
 *  · Default: Apple iTunes Search API — free, no key, always ships a 30s
 *    preview clip + artwork, which is what actually plays in experiences.
 *  · Spotify-ready: set SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET and Spotify
 *    becomes the primary catalog (client-credentials flow); tracks without a
 *    Spotify preview_url fall through to the iTunes result for the same query
 *    so previews always work.
 */
import type { SongResult } from "@/lib/md-blocks";

export const dynamic = "force-dynamic";

/** Small in-memory cache (queries repeat while users scrub the picker). */
const CACHE = new Map<string, { at: number; songs: SongResult[] }>();
const CACHE_TTL = 5 * 60 * 1000;

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMs?: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists?: Array<{ name: string }>;
  album?: { images?: Array<{ url: string }> };
  preview_url?: string | null;
  duration_ms?: number;
}

function itunesArt(url: string): string {
  return url.replace(/\/\d+x\d+bb\./, "/600x600bb.");
}

function mapItunes(t: ITunesTrack): SongResult | null {
  if (!t.previewUrl || !t.trackName) return null;
  return {
    id: String(t.trackId),
    title: t.trackName,
    artist: t.artistName ?? "Unknown artist",
    album: t.collectionName,
    artwork: t.artworkUrl100 ? itunesArt(t.artworkUrl100) : "",
    previewUrl: t.previewUrl,
    durationMs: t.durationMs ?? 30000,
    source: "itunes",
  };
}

function mapSpotify(t: SpotifyTrack): SongResult | null {
  if (!t.preview_url || !t.name) return null; // no preview → can't play
  return {
    id: t.id,
    title: t.name,
    artist: t.artists?.map((a) => a.name).join(", ") ?? "Unknown artist",
    album: undefined,
    artwork: t.album?.images?.[0]?.url ?? "",
    previewUrl: t.preview_url,
    durationMs: t.duration_ms ?? 30000,
    source: "spotify",
  };
}

async function searchItunes(q: string): Promise<SongResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=24`;
  const res = await fetch(url, { headers: { "User-Agent": "MemorableDay/1.0" } });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = (await res.json()) as { results?: ITunesTrack[] };
  return (data.results ?? []).map(mapItunes).filter((s): s is SongResult => s !== null);
}

async function searchSpotify(q: string): Promise<SongResult[]> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return [];
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error(`Spotify token ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const res = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=24&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  const data = (await res.json()) as { tracks?: { items?: SpotifyTrack[] } };
  return (data.tracks?.items ?? []).map(mapSpotify).filter((s): s is SongResult => s !== null);
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return Response.json({ ok: true, songs: [] });
  }
  const key = q.toLowerCase();
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return Response.json({ ok: true, songs: cached.songs });
  }

  // Spotify first when configured; iTunes is both the default and the
  // fallback that guarantees playable preview clips.
  let songs: SongResult[] = [];
  let provider: "spotify" | "itunes" = "itunes";
  try {
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      const fromSpotify = await searchSpotify(q);
      if (fromSpotify.length > 0) {
        songs = fromSpotify;
        provider = "spotify";
      }
    }
    if (songs.length === 0) songs = await searchItunes(q);
    else {
      // enrich: keep Spotify ordering but top up with iTunes matches
      const extra = await searchItunes(q).catch(() => [] as SongResult[]);
      const seen = new Set(songs.map((s) => `${s.title.toLowerCase()}·${s.artist.toLowerCase()}`));
      for (const s of extra) {
        const k = `${s.title.toLowerCase()}·${s.artist.toLowerCase()}`;
        if (!seen.has(k) && songs.length < 24) {
          songs.push(s);
          seen.add(k);
        }
      }
    }
  } catch (e) {
    console.error("[md/music/search]", e);
    return Response.json({ ok: false, error: "Song search is unavailable right now" }, { status: 502 });
  }

  CACHE.set(key, { at: Date.now(), songs });
  return Response.json({ ok: true, songs, provider });
}
