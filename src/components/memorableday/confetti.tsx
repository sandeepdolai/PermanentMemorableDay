"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* ConfettiFX — the celebration system shared by the moment player     */
/* (confetti / reward / gift blocks) and the builder's live preview.   */
/*                                                                     */
/* Four curated styles, each with layered detail and real physics:     */
/*  • Burst  — a luminous pop: soft flash + expanding ring, then       */
/*             paper, streamers, dots and star sparkles launched on    */
/*             true gravity arcs (rise, decelerate, fall).             */
/*  • Rain   — a gentle shower: streamers and petals drifting the      */
/*             height of the viewport with sway and slow spin.         */
/*  • Hearts — soft glowing hearts floating upward with twinkles.      */
/*  • Gold   — an elegant champagne shimmer: golden strips, dots and   */
/*             four-point stars over a lingering warm glow.            */
/* ------------------------------------------------------------------ */

export type ConfettiStyleName = "Burst" | "Rain" | "Hearts" | "Gold";

export const CONFETTI_STYLES: ConfettiStyleName[] = ["Burst", "Rain", "Hearts", "Gold"];

export const CONFETTI_PALETTES: Record<ConfettiStyleName, string[]> = {
  Burst: ["#FF6482", "#FFD60A", "#64D2FF", "#30D158", "#BF5AF2", "#FF9F0A"],
  Rain: ["#7EC8FF", "#FF9FB2", "#FFD97A", "#8CE8C0", "#C9B8FF", "#FFFFFF"],
  Hearts: ["#FF6482", "#FF8FA8", "#FFB3C6", "#FFD1DC", "#FFC94D"],
  Gold: ["#FFD60A", "#FFC94D", "#F5E6B8", "#FFB340", "#FFFFFF"],
};

export const CONFETTI_DESCRIPTIONS: Record<ConfettiStyleName, string> = {
  Burst: "A luminous pop of paper, streamers and star sparkles.",
  Rain: "A gentle shower of streamers drifting down the scene.",
  Hearts: "Soft glowing hearts floating up with little twinkles.",
  Gold: "An elegant champagne shimmer of gold and sparkles.",
};

/** Anything unknown (or unset) falls back to the classic Burst. */
function normalizeStyle(style: string | undefined): ConfettiStyleName {
  return CONFETTI_STYLES.includes(style as ConfettiStyleName) ? (style as ConfettiStyleName) : "Burst";
}

/* A classic curved four-point sparkle (kin to the gift-box sparkles). */
const STAR_PATH =
  "M12 0C13.2 7.2 16.8 10.8 24 12c-7.2 1.2-10.8 4.8-12 12-1.2-7.2-4.8-10.8-12-12C7.2 10.8 10.8 7.2 12 0Z";

function SparkleStar({
  size,
  color,
  glow,
}: {
  size: number;
  color: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={glow ? { filter: "drop-shadow(0 0 4px rgba(255, 214, 10, 0.65))" } : undefined}
    >
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

type PieceShape = "paper" | "dot" | "strip" | "heart" | "star";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Rolls a shape from weighted probabilities, e.g. [["paper", .4], ["dot", .3]] */
function rollShape(table: [PieceShape, number][]): PieceShape {
  let roll = Math.random();
  for (const [shape, weight] of table) {
    if (roll < weight) return shape;
    roll -= weight;
  }
  return table[table.length - 1][0];
}

function pieceSize(shape: PieceShape): { w: number; h: number; radius: string } {
  switch (shape) {
    case "dot":
      return { w: rand(5, 9), h: 0, radius: "9999px" };
    case "strip":
      return { w: rand(3, 4.2), h: rand(12, 21), radius: "2px" };
    case "heart":
      return { w: rand(9, 14), h: 0, radius: "0" };
    case "star":
      return { w: rand(9, 13), h: 0, radius: "0" };
    default:
      return { w: rand(7, 11), h: rand(5, 8), radius: "2px" };
  }
}

/** Renders one confetti piece (paper / dot / strip / heart / star). */
function Piece({
  shape,
  w,
  h,
  radius,
  color,
  glow,
  className,
  style,
}: {
  shape: PieceShape;
  w: number;
  h: number;
  radius: string;
  color: string;
  glow?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (shape === "heart") {
    return (
      <span className={className} style={style}>
        <Heart size={w} fill={color} strokeWidth={0} aria-hidden />
      </span>
    );
  }
  if (shape === "star") {
    return (
      <span className={className} style={style}>
        <SparkleStar size={w} color={color} glow />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{
        ...style,
        width: w,
        height: shape === "dot" ? w : h,
        borderRadius: radius,
        backgroundColor: color,
        boxShadow: glow,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Burst — flash + ring + two gravity-arc waves + twinkling stars      */
/* ------------------------------------------------------------------ */

interface ArcPiece {
  id: string;
  shape: PieceShape;
  x: number;
  apex: number;
  fall: number;
  w: number;
  h: number;
  radius: string;
  rotate: number;
  delay: number;
  dur: number;
  color: string;
  glow?: string;
}

interface Twinkle {
  id: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay: number;
  dur: number;
  color: string;
}

function makeArcWave(
  count: number,
  delayBase: number,
  palette: string[],
  opts: { cone: number; dist: [number, number]; glow?: string; table: [PieceShape, number][] }
): ArcPiece[] {
  return Array.from({ length: count }, (_, i) => {
    const shape = rollShape(opts.table);
    const { w, h, radius } = pieceSize(shape);
    // Launch angle: a cone around straight-up, mirrored left/right
    const angle = rand(-opts.cone, opts.cone);
    const dist = rand(opts.dist[0], opts.dist[1]);
    const rad = (angle * Math.PI) / 180;
    return {
      id: `${delayBase}-${i}`,
      shape,
      x: Math.sin(rad) * dist,
      apex: -Math.cos(rad) * dist - 14,
      fall: rand(34, 120),
      w,
      h,
      radius,
      rotate: rand(-540, 540),
      delay: delayBase + Math.random() * 0.12,
      dur: rand(1.05, 1.55),
      color: pick(palette, i),
      glow: opts.glow,
    };
  });
}

function makeTwinkles(count: number, palette: string[]): Twinkle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand(-0.4, 0.4);
    const dist = rand(66, 150);
    return {
      id: `tw-${i}`,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.82,
      size: rand(8, 13),
      rotate: rand(-55, 55),
      delay: rand(0.12, 0.55),
      dur: rand(0.75, 1.15),
      color: pick(palette, i),
    };
  });
}

function ArcPieces({ pieces, flutter }: { pieces: ArcPiece[]; flutter: boolean }) {
  return (
    <>
      {pieces.map((p) => {
        const isFlat = p.shape === "paper" || p.shape === "strip";
        return (
          <motion.span
            key={p.id}
            className="absolute"
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.2 }}
            animate={{
              x: p.x,
              y: [0, p.apex, p.apex + p.fall],
              rotate: p.rotate,
              opacity: [1, 1, 0],
              scale: [0.2, 1, 1],
              ...(flutter && isFlat ? { scaleY: [1, 0.35, 1, 0.45, 1] } : {}),
            }}
            transition={{
              x: { duration: p.dur, delay: p.delay, ease: "easeOut" },
              y: { duration: p.dur, delay: p.delay, times: [0, 0.58, 1], ease: ["easeOut", "easeIn"] },
              rotate: { duration: p.dur, delay: p.delay, ease: "easeOut" },
              opacity: { duration: p.dur, delay: p.delay, times: [0, 0.62, 1] },
              scale: { duration: p.dur, delay: p.delay, times: [0, 0.22, 1], ease: "easeOut" },
              scaleY: { duration: p.dur, delay: p.delay, ease: "easeInOut" },
            }}
          >
            <Piece shape={p.shape} w={p.w} h={p.h} radius={p.radius} color={p.color} glow={p.glow} />
          </motion.span>
        );
      })}
    </>
  );
}

function Twinkles({ twinkles }: { twinkles: Twinkle[] }) {
  return (
    <>
      {twinkles.map((t) => (
        <motion.span
          key={t.id}
          className="absolute"
          initial={{ x: t.x, y: t.y, opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.15, 0], rotate: t.rotate }}
          transition={{ duration: t.dur, delay: t.delay, ease: "easeOut" }}
        >
          <SparkleStar size={t.size} color={t.color} glow />
        </motion.span>
      ))}
    </>
  );
}

/** Soft luminous pop at the origin — a glow orb plus an expanding ring. */
function Flash({ gold }: { gold?: boolean }) {
  return (
    <>
      <motion.span
        className="absolute h-28 w-28 rounded-full"
        style={{
          background: gold
            ? "radial-gradient(circle, rgba(255,246,214,0.98) 0%, rgba(255,193,61,0.42) 45%, transparent 70%)"
            : "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,214,10,0.32) 45%, transparent 70%)",
        }}
        initial={{ opacity: 0.95, scale: 0.15 }}
        animate={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.span
        className="absolute h-28 w-28 rounded-full border-2"
        style={{ borderColor: gold ? "rgba(255,214,10,0.75)" : "rgba(255,255,255,0.7)" }}
        initial={{ opacity: 0.8, scale: 0.25 }}
        animate={{ opacity: 0, scale: 1.7 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </>
  );
}

function BurstFX({ onDark }: { onDark: boolean }) {
  const palette = CONFETTI_PALETTES.Burst;
  const waves = useMemo(
    () => [
      ...makeArcWave(30, 0, palette, {
        cone: 82,
        dist: [72, 200],
        table: [
          ["paper", 0.36],
          ["strip", 0.24],
          ["dot", 0.2],
          ["heart", 0.08],
          ["star", 0.12],
        ],
      }),
      ...makeArcWave(16, 0.2, palette, {
        cone: 95,
        dist: [56, 150],
        table: [
          ["paper", 0.3],
          ["strip", 0.3],
          ["dot", 0.25],
          ["star", 0.15],
        ],
      }),
    ],
    []
  );
  const twinkles = useMemo(() => makeTwinkles(7, ["#FFD60A", "#FFFFFF", "#FF8FA8"]), []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Flash />
      <ArcPieces pieces={waves} flutter />
      <Twinkles twinkles={twinkles} />
      {onDark ? null : <DimVeil />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rain — streamers drifting the viewport height with sway + spin      */
/* ------------------------------------------------------------------ */

interface RainPiece {
  id: string;
  left: number;
  drift: number;
  shape: PieceShape;
  w: number;
  h: number;
  radius: string;
  rotate: number;
  spin: boolean;
  color: string;
  fade: number;
  delay: number;
  dur: number;
}

function RainFX() {
  const palette = CONFETTI_PALETTES.Rain;
  const pieces = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => {
        const shape = rollShape([
          ["strip", 0.4],
          ["paper", 0.24],
          ["dot", 0.2],
          ["heart", 0.16],
        ]);
        const { w, h, radius } = pieceSize(shape);
        return {
          id: `rain-${i}`,
          left: rand(2, 98),
          drift: rand(12, 30),
          shape,
          w,
          h,
          radius,
          rotate: rand(-420, 420),
          spin: shape === "strip" || shape === "paper",
          color: pick(palette, i),
          fade: rand(0.65, 1),
          delay: rand(0, 1.55),
          dur: rand(2.3, 3.6),
        };
      }),
    []
  );

  return (
    <div className="absolute inset-0">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0"
          style={{ left: `${p.left}%` }}
          initial={{ y: "-12vh", opacity: 0, rotate: 0 }}
          animate={{
            y: "112vh",
            x: [0, p.drift, -p.drift, 0, p.drift * 0.55],
            opacity: [0, p.fade, p.fade, 0],
            rotate: p.spin ? [0, p.rotate] : p.rotate,
          }}
          transition={{
            y: { duration: p.dur, delay: p.delay, ease: "linear" },
            x: { duration: p.dur, delay: p.delay, ease: "easeInOut" },
            opacity: { duration: p.dur, delay: p.delay, times: [0, 0.12, 0.82, 1] },
            rotate: { duration: p.dur, delay: p.delay, ease: "linear" },
          }}
        >
          <Piece shape={p.shape} w={p.w} h={p.h} radius={p.radius} color={p.color} />
        </motion.span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hearts — glowing hearts floating upward with sparkles               */
/* ------------------------------------------------------------------ */

interface FloatPiece {
  id: string;
  x: number;
  rise: number;
  sway: number;
  size: number;
  tilt: number;
  color: string;
  delay: number;
  dur: number;
}

function HeartsFX({ onDark }: { onDark: boolean }) {
  const palette = CONFETTI_PALETTES.Hearts;
  const hearts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: `h-${i}`,
        x: rand(-72, 72),
        rise: rand(105, 205),
        sway: rand(8, 22),
        size: rand(12, 28),
        tilt: rand(-14, 14),
        color: pick(palette, i),
        delay: rand(0, 0.5),
        dur: rand(1.55, 2.35),
      })),
    []
  );
  const twinkles = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: `htw-${i}`,
        x: rand(-110, 110),
        y: rand(-130, 40),
        size: rand(7, 11),
        rotate: rand(-50, 50),
        delay: rand(0.15, 0.7),
        dur: rand(0.8, 1.2),
        color: pick(["#FFC94D", "#FFFFFF", "#FFD1DC"], i),
      })),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.span
        className="absolute h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,100,130,0.28) 0%, rgba(255,100,130,0.1) 45%, transparent 70%)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.1, 1.25] }}
        transition={{ duration: 1.7, ease: "easeOut" }}
      />
      {hearts.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{
            x: [0, p.x + p.sway, p.x - p.sway * 0.5, p.x],
            y: [0, p.rise * 0.62, p.rise * 0.86, p.rise],
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1.06, 1, 1.02],
            rotate: [0, p.tilt, -p.tilt * 0.4, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            ease: "easeOut",
            opacity: { duration: p.dur, delay: p.delay, times: [0, 0.16, 0.68, 1] },
          }}
          style={{ filter: onDark ? "drop-shadow(0 4px 10px rgba(255,100,130,0.5))" : undefined }}
        >
          <Heart size={p.size} fill={p.color} strokeWidth={0} aria-hidden />
        </motion.span>
      ))}
      {twinkles.map((t) => (
        <motion.span
          key={t.id}
          className="absolute"
          initial={{ x: t.x, y: t.y, opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.15, 0], rotate: t.rotate }}
          transition={{ duration: t.dur, delay: t.delay, ease: "easeOut" }}
        >
          <SparkleStar size={t.size} color={t.color} glow />
        </motion.span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gold — champagne shimmer: warm glow, fountain of gold + stars       */
/* ------------------------------------------------------------------ */

function GoldFX({ onDark }: { onDark: boolean }) {
  const palette = CONFETTI_PALETTES.Gold;
  const glow = onDark ? "0 0 8px rgba(255,201,77,0.55)" : "0 1px 5px rgba(196,148,32,0.35)";
  const waves = useMemo(
    () => [
      ...makeArcWave(22, 0, palette, {
        cone: 55,
        dist: [80, 210],
        glow,
        table: [
          ["strip", 0.34],
          ["dot", 0.26],
          ["star", 0.28],
          ["paper", 0.12],
        ],
      }),
      ...makeArcWave(12, 0.24, palette, {
        cone: 68,
        dist: [60, 160],
        glow,
        table: [
          ["strip", 0.3],
          ["dot", 0.3],
          ["star", 0.4],
        ],
      }),
    ],
    [glow]
  );
  const twinkles = useMemo(
    () => makeTwinkles(9, ["#FFD60A", "#FFF3C4", "#FFFFFF"]),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Warm champagne aura that breathes, then lets go */}
      <motion.span
        className="absolute h-44 w-44 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,224,138,0.55) 0%, rgba(255,193,61,0.2) 45%, transparent 72%)",
        }}
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 0.95, 0.5, 0], scale: [0.55, 1.08, 1.16, 1.3] }}
        transition={{ duration: 1.75, ease: "easeOut" }}
      />
      <Flash gold />
      <ArcPieces pieces={waves} flutter />
      <Twinkles twinkles={twinkles} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DimVeil — on light backgrounds, a faint dark halo behind the burst  */
/* so bright pieces keep their pop                                     */
/* ------------------------------------------------------------------ */

function DimVeil() {
  return (
    <motion.span
      className="absolute h-36 w-36 rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(29,29,31,0.1) 0%, transparent 68%)",
      }}
      initial={{ opacity: 0.8, scale: 0.4 }}
      animate={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* ConfettiFX — the public component                                   */
/* ------------------------------------------------------------------ */

export function ConfettiFX({
  style = "Burst",
  onDark = true,
  className,
}: {
  style?: string;
  onDark?: boolean;
  className?: string;
}) {
  const s = normalizeStyle(style);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {s === "Burst" ? <BurstFX onDark={onDark} /> : null}
      {s === "Rain" ? <RainFX /> : null}
      {s === "Hearts" ? <HeartsFX onDark={onDark} /> : null}
      {s === "Gold" ? <GoldFX onDark={onDark} /> : null}
    </div>
  );
}
