import { cn } from "@/lib/utils";

/**
 * Abstract gradient cover art (Apple-wallpaper style).
 * Used for moment / explore cards. Deterministic per variant index.
 */
const PALETTES: Array<[string, string, string]> = [
  ["#007AFF", "#40A9FF", "#64D2FF"], // system sky
  ["#FF6482", "#FF8F6B", "#FFC5A1"], // rose peach
  ["#30D158", "#5FD4C0", "#A8F0E0"], // mint teal
  ["#0A84FF", "#4F7DF9", "#9DB8FF"], // steel blue
  ["#FF9F0A", "#FFD60A", "#FFE9B8"], // amber gold
  ["#1D1D1F", "#3A3A3C", "#5E5CE6"], // midnight chrome
  ["#FF375F", "#C86BFF", "#8E7BFF"], // neon rose violet
  ["#64D2FF", "#7DE2FF", "#E2F7FF"], // ice
  ["#5E5CE6", "#7D7AFF", "#B4A7FF"], // ultraviolet
  ["#FFD60A", "#FF9F0A", "#FF6482"], // sunset
];

/** Display names for each palette (same order as PALETTES) */
export const COVER_NAMES = [
  "System Sky",
  "Rose Peach",
  "Mint Tide",
  "Steel Blue",
  "Amber Glow",
  "Midnight Chrome",
  "Neon Rosé",
  "Glacier",
  "Ultraviolet",
  "Sunset Fade",
] as const;

interface CoverArtProps {
  variant: number;
  className?: string;
  children?: React.ReactNode;
}

export function CoverArt({ variant, className, children }: CoverArtProps) {
  const v = ((variant % PALETTES.length) + PALETTES.length) % PALETTES.length;
  const [a, b, c] = PALETTES[v];

  // Deterministic blob placement per variant
  const blobA = {
    top: `${12 + ((v * 37) % 48)}%`,
    left: `${8 + ((v * 53) % 60)}%`,
    size: 46 + ((v * 29) % 30),
  };
  const blobB = {
    top: `${40 + ((v * 41) % 40)}%`,
    left: `${45 + ((v * 23) % 45)}%`,
    size: 34 + ((v * 31) % 26),
  };

  return (
    <div
      aria-hidden
      // No base height: `h-full` + `aspect-*` created a grid sizing cycle
      // (row sized by square cover → h-full stretched cover to row height →
      // text below clipped by the card's overflow-hidden). Aspect-ratio
      // usages now size purely from width; full-bleed callers pass their
      // own h-full / inset-0 explicitly.
      className={cn("relative w-full overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${a} 0%, ${b} 52%, ${c} 100%)` }}
    >
      {/* soft light blobs */}
      <div
        className="absolute rounded-full bg-white/25 blur-2xl"
        style={{
          top: blobA.top,
          left: blobA.left,
          width: `${blobA.size}%`,
          height: `${blobA.size}%`,
        }}
      />
      <div
        className="absolute rounded-full bg-white/15 blur-2xl"
        style={{
          top: blobB.top,
          left: blobB.left,
          width: `${blobB.size}%`,
          height: `${blobB.size}%`,
        }}
      />
      {/* top specular light */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_46%)]" />
      {/* diagonal light streak */}
      <div className="absolute -inset-y-8 left-1/3 w-10 rotate-[24deg] bg-white/10 blur-md" />
      {children}
    </div>
  );
}
