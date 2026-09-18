/**
 * MemorableDay — canonical block/scene/song document types.
 * Shared by the Experience Builder, the recipient player, the REST API and
 * the Prisma persistence layer (stored as JSON strings on Moment rows).
 */

/** A song pick from the music search (Apple Music/iTunes catalog today,
 *  Spotify-ready: `source` marks the catalog the pick came from). */
export interface SongPick {
  /** Catalog track id (iTunes trackId / Spotify track id) */
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Album artwork URL (square, ~600px) */
  artwork: string;
  /** 30s preview clip URL (what actually plays) */
  previewUrl: string;
  /** Full track length in ms (catalog metadata) */
  durationMs: number;
  /** Snippet start offset in seconds (Instagram-Notes style "which part") */
  start: number;
  /** Snippet length in seconds (10 / 15 / 30, capped by the preview clip) */
  length: number;
  source: "itunes" | "spotify";
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
  /** audio: the picked song + snippet */
  song?: SongPick;
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

/** Parses a JSON column into a scene doc array (null-safe). */
export function parseScenes(raw: string | null | undefined): SceneDoc[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SceneDoc[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
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
