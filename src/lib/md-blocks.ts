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

/** Card colors the creator can assign to claw-machine coupons (pile art). */
export const COUPON_COLORS = ["#9B59B6", "#E84393", "#F59E0B", "#2ECC71", "#3498DB", "#FF7A3D"] as const;

/** 3D-flower varieties — real GLB models (user-authored assets from the repo).
 *  Each variety carries its hero camera ("best angle": azimuth/elevation in
 *  degrees, distance in model-heights, target height fraction), accent colors
 *  for the card, and a thumbnail used across lists. */
export const FLOWER_VARIETIES = [
  {
    id: "rose",
    name: "Rose",
    model: "/models/rose.glb",
    thumb: "/models/rose-thumb.png",
    /* curated hero angle — matches the user's reference screenshots: bloom
     * facing the camera dead-front, camera slightly above looking into the
     * open bloom, intimate close-up framing, stem cropped at the frame bottom */
    az: 6,
    el: 22,
    dist: 1.15,
    ty: 0.62,
    base: "#7A0E30",
    mid: "#C2185B",
    edge: "#FF9EBE",
    leaf: "#3E7C3A",
    /** the exporter shipped TEXCOORD_0 as all zeros — real UVs live in uv1 */
    needsUvRebind: true,
    /** azalea-style PBR metals read as wet plastic under stage light */
    matte: false,
    /** the atlas is alphaMode BLEND with binary alpha — render it as an
     *  opaque alphaTest cutout so petals stay fully opaque (no washed-out
     *  translucency) and depth-sort correctly */
    cutout: true,
    playAnim: false,
  },
  {
    id: "azalea",
    name: "Azalea",
    model: "/models/rhododendron_azalea.glb",
    thumb: "/models/azalea-thumb.png",
    az: 30,
    el: 12,
    dist: 3.2,
    ty: 0.5,
    base: "#8E2A2A",
    mid: "#E85858",
    edge: "#FFB3A8",
    leaf: "#2E5B2B",
    needsUvRebind: false,
    matte: true,
    cutout: false,
    /** the GLB ships a looping "Insectfly" clip — a bee orbiting the bloom */
    playAnim: true,
  },
] as const;

export type FlowerVariety = (typeof FLOWER_VARIETIES)[number];

/** Resolves a stored variety id → variety. Legacy rose-style palette ids
 *  (classic / crimson / blush / lavender / apricot) map to the rose model. */
export function flowerVariety(style?: string): FlowerVariety {
  const hit = FLOWER_VARIETIES.find((v) => v.id === style);
  if (hit) return hit;
  return style && ["classic", "crimson", "blush", "lavender", "apricot"].includes(style)
    ? FLOWER_VARIETIES[0]
    : FLOWER_VARIETIES[0];
}

/** How the flower presents in the player — "still" parks it at its curated
 *  best angle (the default), "spin" adds a slow turntable. Recipients can
 *  always drag to look around. */
export type FlowerMotion = "still" | "spin";

export function flowerMotion(motion?: string): FlowerMotion {
  return motion === "spin" ? "spin" : "still";
}

/** One coupon in the claw-machine pool (creator-managed in the block editor).
 *  Lives inside BlockData.coupons and round-trips through the sceneData JSON
 *  column — assignments reference these by id. */
export interface CouponDef {
  /** Stable pool-item id (uid) — the assignment key */
  id: string;
  /** The redeemable code, e.g. "SAVE20" */
  code: string;
  /** Prize title shown at the reveal, e.g. "20% off your next order" */
  title: string;
  /** Optional longer description shown under the reveal */
  description?: string;
  /** Pile-card color (COUPON_COLORS pick) */
  color: string;
  /** Creator on/off switch — disabled coupons stay visible but never get assigned */
  enabled: boolean;
  /** Remaining units; null/undefined = unlimited */
  stock?: number | null;
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
  /** gift: ribbon style on the wrapped box — "classic" | "cross" | "none" */
  ribbon?: string;
  /** countdown: unlock delay minutes */
  minutes?: number;
  /** quiz */
  question?: string;
  options?: string[];
  answer?: number;
  /** reward */
  rewardKind?: string;
  code?: string;
  /** coupon (claw machine): the creator-managed prize pool. Falls back to a
   *  single-coupon pool built from `code` for legacy blocks (see couponPool). */
  coupons?: CouponDef[];
  /** coupon: how many face-down tickets pile up in the glass (6–28).
   *  The pile always includes every pool coupon; the rest are fillers. */
  displayCount?: number;
  /** coupon draw: the marquee headline ("COUPON CODE") */
  heading?: string;
  /** coupon draw: the ticket eyebrow shown at the reveal ("YOUR COUPON CODE") */
  stepLabel?: string;
  /** cta */
  label?: string;
  action?: string;
  /** cta / reward: the destination link (opened in a new tab) */
  url?: string;
  /** confetti */
  style?: string;
  /** rose: which GLB flower model (FLOWER_VARIETIES id — "rose" | "azalea").
   *  Legacy palette ids still resolve to the rose model. The dedication copy
   *  lives in `message` (shared with gift). */
  roseStyle?: string;
  /** rose: presentation in the player — "still" (curated best angle, the
   *  default) or "spin" (slow turntable). Drag-to-look works either way. */
  flowerMotion?: string;
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

/* ------------------------------------------------------------------ */
/* Claw-machine coupon pool                                            */
/* ------------------------------------------------------------------ */

/**
 * The machine's prize pool: the creator-configured coupon list, or the
 * legacy single-prize fallback built from `code` (blocks saved before the
 * pool existed keep working — and still get server-backed assignment).
 * Shared by the player, the builder editor AND the draw API so all three
 * always agree on what's in the machine.
 */
export function couponPool(d: BlockData | undefined | null): CouponDef[] {
  const pool = (d?.coupons ?? []).filter(
    (c) => c && typeof c.code === "string" && c.code.trim().length > 0
  );
  if (pool.length > 0) return pool;
  const legacy = d?.code?.trim();
  if (!legacy) return [];
  return [
    {
      id: "legacy",
      code: legacy,
      title: "",
      color: COUPON_COLORS[0],
      enabled: true,
      stock: null,
    },
  ];
}

/** Pool items that may be assigned to a NEW player (enabled + in stock). */
export function eligibleCoupons(pool: CouponDef[]): CouponDef[] {
  return pool.filter((c) => c.enabled !== false && (c.stock == null || c.stock > 0));
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
