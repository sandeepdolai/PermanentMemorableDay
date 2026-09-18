/**
 * MemorableDay — canonical block/scene/song document types.
 * Shared by the Experience Builder, the recipient player, the REST API and
 * the Prisma persistence layer (stored as JSON strings on Moment rows).
 */

/** A song pick from the music search (Apple Music/iTunes catalog today,
 *  Spotify-ready: `source` marks the catalog the pick came from) OR a
 *  user-uploaded audio file (`source: "upload"`). */
export interface SongPick {
  /** Catalog track id (iTunes trackId / Spotify track id) or upload token */
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Album artwork URL (square, ~600px) — empty for uploads */
  artwork: string;
  /** 30s preview clip URL, or the full uploaded file URL (what actually plays) */
  previewUrl: string;
  /** Full track length in ms (catalog metadata / audio metadata for uploads) */
  durationMs: number;
  /** Snippet start offset in seconds (Instagram-Notes style "which part") */
  start: number;
  /** Snippet length in seconds (10 / 15 / 30, capped by the clip) */
  length: number;
  source: "itunes" | "spotify" | "upload";
}

/** Search result row (no snippet yet — becomes a SongPick when picked). */
export interface SongResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork: string;
  previewUrl: string;
  durationMs: number;
  source: "itunes" | "spotify";
}

/** Per-type block configuration (all optional — unset fields fall back to defaults). */
export interface BlockData {
  /** text: message body */
  body?: string;
  /** photo */
  image?: string;
  caption?: string;
  filter?: string;
  /** video */
  video?: string;
  duration?: number;
  /** background: full-screen scene cover. Media kind is picked by whichever
   *  field is set (photo `image` / video `video`). `dim` is the dark overlay
   *  strength so stacked text stays readable — "None" | "Light" | "Medium" |
   *  "Deep". `motion` is the image presentation — "Still" | "Zoom" (Ken Burns). */
  dim?: string;
  motion?: string;
  /** audio: the picked song/upload + snippet */
  song?: SongPick;
  /** audio: where it plays — "scene" shows a song card, "background" plays unseen */
  playMode?: "scene" | "background";
  /** gift */
  message?: string;
  wrap?: string;
  /** countdown: unlock delay minutes */
  minutes?: number;
  /** quiz */
  question?: string;
  options?: string[];
  answer?: number;
  /** reward */
  rewardKind?: string;
  code?: string;
  /** cta */
  label?: string;
  action?: string;
  /** cta / reward: the destination link (opened in a new tab) */
  url?: string;
  /** confetti */
  style?: string;
}

export interface BlockDoc {
  id: string;
  type: string;
  /** Optional composed copy (AI messages render here) */
  text?: string;
  /** Per-type configuration set in the block editor */
  data?: BlockData;
}

export interface SceneDoc {
  id: string;
  blocks: BlockDoc[];
}

/** The full authored experience persisted on a Moment row. */
export interface MomentDoc {
  scenes: SceneDoc[];
  track: SongPick | null;
}

/* ------------------------------------------------------------------ */
/* Shared presentation helpers                                         */
/* ------------------------------------------------------------------ */

export const PHOTO_FILTERS = ["Original", "Warm", "Mono", "Fade", "Vivid"] as const;

/** CSS filter chain for a photo-filter name (builder previews + player). */
export function photoFilterCss(filter?: string): React.CSSProperties {
  switch (filter) {
    case "Warm":
      return { filter: "sepia(0.32) saturate(1.25) brightness(1.03)" };
    case "Mono":
      return { filter: "grayscale(1) contrast(1.06)" };
    case "Fade":
      return { filter: "contrast(0.86) brightness(1.12) saturate(0.72)" };
    case "Vivid":
      return { filter: "saturate(1.65) contrast(1.06)" };
    default:
      return {};
  }
}

/** "1:05" from seconds */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Makes a bare pasted link safe to open (auto-prefixes https://). */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** "memorableday.in" from "https://www.memorableday.in/gift" — for link chips. */
export function urlDomain(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    return new URL(normalizeUrl(t)).hostname.replace(/^www\./i, "");
  } catch {
    return t.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

/** Background-block overlay options (builder chips + player scrim). */
export const BACKGROUND_DIMS = ["None", "Light", "Medium", "Deep"] as const;

/** Background-block image motion options. */
export const BACKGROUND_MOTIONS = ["Still", "Zoom"] as const;

/** Overlay strength per dim name → Tailwind class pieces (player + previews). */
export function backgroundDimClass(dim?: string): string {
  switch (dim) {
    case "None":
      return "";
    case "Light":
      return "bg-[#1D1D1F]/30";
    case "Deep":
      return "bg-[#1D1D1F]/72";
    default:
      // "Medium" (and unset) — the sweet spot for white text on busy media
      return "bg-[#1D1D1F]/52";
  }
}

let uidSeq = 0;

/**
 * Collision-proof id: timestamp (base36) + module-scoped counter + random suffix.
 * Replaces the old `b${counter}` / `d${Date.now()}` schemes whose counters reset on
 * remount (or collide within the same millisecond), producing duplicate React keys.
 */
export function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${(uidSeq++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** Collision-proof block id (never re-issues `b100`-style ids after a remount). */
export const freshBlockId = (): string => uid("b");

/** Collision-proof scene id (never collides on same-millisecond "Add Scene" taps). */
export const freshSceneId = (): string => uid("s");

/**
 * Repairs a scenes array so every block id is unique within its scene and every
 * scene id is unique across the doc. Legacy drafts saved while the old resettable
 * counter was live can legitimately contain two `b100` blocks — this re-keys the
 * duplicates so React keyed lists never warn again.
 */
export function dedupeScenes<S extends { id: string; blocks: Array<{ id: string }> }>(
  scenes: S[]
): S[] {
  const sceneIds = new Set<string>();
  return scenes.map((s) => {
    const sid = sceneIds.has(s.id) ? freshSceneId() : s.id;
    sceneIds.add(sid);
    const blockIds = new Set<string>();
    const blocks = s.blocks.map((b) => {
      if (blockIds.has(b.id)) return { ...b, id: freshBlockId() };
      blockIds.add(b.id);
      return b;
    });
    return { ...s, id: sid, blocks } as S;
  });
}

/** Parses a JSON column into a scene doc array (null-safe, duplicate-id-repaired). */
export function parseScenes(raw: string | null | undefined): SceneDoc[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SceneDoc[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return dedupeScenes(parsed);
  } catch {
    return null;
  }
}

/** Parses a JSON column into a song pick (null-safe). */
export function parseSong(raw: string | null | undefined): SongPick | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SongPick;
    return parsed && typeof parsed.previewUrl === "string" ? parsed : null;
  } catch {
    return null;
  }
}
