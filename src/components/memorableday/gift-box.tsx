"use client";

/* ------------------------------------------------------------------ */
/* GiftBox — the shared wrapped-box art used by BOTH the builder       */
/* editor preview and the moment player. One source of truth: the      */
/* recipient sees exactly what the creator styled.                     */
/* Pure CSS art: layered gradients for a curved 3D body, overhanging   */
/* lid with a cast shadow, woven-sheen ribbon (classic / cross /       */
/* diagonal / none), a fabric bow (loops + knot + notched tails),      */
/* ambient glow, ground shadow, twinkling sparkles and a springy       */
/* lid-off open animation. No 3D libraries, no iframes.                */
/* ------------------------------------------------------------------ */

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ---------- color helpers (all wrap values are plain hex) ---------- */

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return [94, 92, 230];
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** t > 0 lightens toward white, t < 0 darkens toward black. */
function shade(hex: string, t: number): string {
  const [r, g, b] = hexRgb(hex);
  const mix = (c: number) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Relative luminance, 0–1 — used to pick the ribbon tone. */
function isLight(hex: string): boolean {
  const [r, g, b] = hexRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.66;
}

export function isLightWrap(hex: string): boolean {
  return isLight(hex);
}

/** Ribbon fabric tone — warm ivory on rich wraps, deep cocoa on cream. */
function ribbonTone(wrap: string) {
  if (isLight(wrap)) return { base: "#4A3A2C", hi: "#8A6F55", lo: "#2C221A" };
  return { base: "#FBF3E4", hi: "#FFFFFF", lo: "#D8CBB2" };
}

/* ---------- curated wrap palette (editor swatches) ---------- */

export const GIFT_WRAP_PALETTE: { value: string; name: string }[] = [
  { value: "#5E5CE6", name: "Iris" },
  { value: "#E8618C", name: "Rose" },
  { value: "#FF9F0A", name: "Honey" },
  { value: "#0FA678", name: "Emerald" },
  { value: "#2BB3A3", name: "Lagoon" },
  { value: "#AF52DE", name: "Orchid" },
  { value: "#D9694A", name: "Terracotta" },
  { value: "#1D1D1F", name: "Midnight" },
  { value: "#EFE3D2", name: "Cream" },
];

export const GIFT_RIBBON_STYLES: { value: string; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "cross", label: "Cross" },
  { value: "diagonal", label: "Diagonal" },
  { value: "none", label: "None" },
];

/* ---------- geometry constants (design units) ---------- */

const W = 136;
const H = 178;
const BODY = { top: 70, w: 116, h: 86, r: 16 };
const LID = { top: 46, w: 132, h: 26, r: 10 };

/* ---------- the box ---------- */

export function GiftBox({
  wrap,
  ribbon = "classic",
  open = false,
  onOpen,
  still = false,
  sparkle = true,
  scale = 1,
  onDark = false,
  className,
}: {
  wrap?: string;
  ribbon?: string;
  open?: boolean;
  /** When present the box is a button that opens on its own tap. */
  onOpen?: () => void;
  /** Disable the idle float (block-card thumbnails). */
  still?: boolean;
  /** Twinkling star accents around the box. */
  sparkle?: boolean;
  /** Render scale (1 = 136×178). */
  scale?: number;
  /** Set on dark player scenes — deeper ground shadow, stronger glow. */
  onDark?: boolean;
  className?: string;
}) {
  const base = wrap ?? "#5E5CE6";
  const tone = ribbonTone(base);
  const band = ribbon !== "none";
  const cross = ribbon === "cross";
  const diagonal = ribbon === "diagonal";
  const idle = !open && !still;

  const bandSheenV = `linear-gradient(90deg, ${tone.lo} 0%, ${tone.base} 20%, ${tone.hi} 50%, ${tone.base} 80%, ${tone.lo} 100%)`;
  const bandSheenH = `linear-gradient(180deg, ${tone.lo} 0%, ${tone.base} 20%, ${tone.hi} 50%, ${tone.base} 80%, ${tone.lo} 100%)`;

  const art = (
    <div className="relative" style={{ width: W, height: H }}>
      {/* ambient glow behind the box */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 216,
          height: 216,
          background: `radial-gradient(circle, ${onDark ? `${base}4D` : `${base}2E`} 0%, transparent 66%)`,
          filter: "blur(6px)",
        }}
      />

      {/* sparkles */}
      {sparkle && !open
        ? (
            [
              { left: 2, top: 26, size: 13, delay: 0 },
              { left: W - 14, top: 84, size: 10, delay: 0.85 },
              { left: 14, top: 132, size: 8, delay: 1.65 },
            ] as const
          ).map((s, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                background: "#FFE9B8",
                clipPath:
                  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                filter: "drop-shadow(0 0 5px rgba(255,221,150,0.85))",
              }}
              animate={{ opacity: [0.12, 1, 0.12], scale: [0.55, 1, 0.55], rotate: [0, 25, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
            />
          ))
        : null}

      {/* ground shadow (breathes with the float) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: 158,
          width: 104,
          height: 15,
          background: onDark ? "rgba(0,0,0,0.55)" : "rgba(29,29,31,0.3)",
          filter: "blur(9px)",
        }}
        animate={idle ? { scaleX: [1, 0.9, 1], opacity: [0.85, 0.6, 0.85] } : { scaleX: 1.08, opacity: 1 }}
        transition={
          idle
            ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 200, damping: 20 }
        }
      />

      {/* the box itself (floats when idle, hops once when opened) */}
      <motion.div
        className="absolute inset-0"
        animate={idle ? { y: [0, -5, 0] } : { y: open ? [0, -12, 0] : 0, scale: open ? 1.045 : 1 }}
        transition={
          idle
            ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.6, times: [0, 0.45, 1], ease: "easeOut" }
        }
      >
        {/* ---- body ---- */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: (W - BODY.w) / 2,
            top: BODY.top,
            width: BODY.w,
            height: BODY.h,
            borderRadius: BODY.r,
            background: `linear-gradient(180deg, ${shade(base, 0.18)} 0%, ${base} 30%, ${shade(base, -0.08)} 74%, ${shade(base, -0.22)} 100%)`,
            boxShadow: `${onDark ? "0 26px 46px -14px rgba(0,0,0,0.62), 0 10px 18px -8px rgba(0,0,0,0.35)" : "0 22px 38px -14px rgba(29,29,31,0.42), 0 8px 16px -8px rgba(29,29,31,0.22)"}, inset 13px 0 22px -14px rgba(0,0,0,0.4), inset -13px 0 22px -14px rgba(0,0,0,0.4)`,
          }}
        >
          {/* cast shadow from the lid */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0"
            style={{
              height: 13,
              background: "linear-gradient(180deg, rgba(0,0,0,0.3), transparent)",
            }}
          />

          {/* vertical ribbon band */}
          {band ? (
            <div
              aria-hidden
              className="absolute"
              style={{
                left: BODY.w / 2 - 9,
                top: 0,
                width: 18,
                height: BODY.h,
                background: bandSheenV,
                boxShadow: "3px 0 5px rgba(0,0,0,0.22), -3px 0 5px rgba(0,0,0,0.22)",
              }}
            />
          ) : null}

          {/* horizontal band (cross) */}
          {cross ? (
            <div
              aria-hidden
              className="absolute"
              style={{
                left: 0,
                top: BODY.h / 2 - 9,
                width: BODY.w,
                height: 18,
                background: bandSheenH,
                boxShadow: "0 3px 5px rgba(0,0,0,0.22), 0 -3px 5px rgba(0,0,0,0.22)",
              }}
            />
          ) : null}

          {/* diagonal band */}
          {diagonal ? (
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2"
              style={{
                width: 18,
                height: 190,
                background: bandSheenV,
                boxShadow: "3px 0 5px rgba(0,0,0,0.22), -3px 0 5px rgba(0,0,0,0.22)",
                transform: "translate(-50%, -50%) rotate(-42deg)",
              }}
            />
          ) : null}

          {/* glossy specular sweep */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: BODY.r,
              background:
                "linear-gradient(112deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 24%, transparent 46%, rgba(0,0,0,0.05) 100%)",
            }}
          />
        </div>

        {/* warm light escaping the open box */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: (W - BODY.w) / 2,
            top: BODY.top - 4,
            width: BODY.w,
            height: 22,
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(255,242,205,0.95) 0%, rgba(255,222,160,0.4) 52%, transparent 78%)",
          }}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.4, delay: open ? 0.18 : 0 }}
        />

        {/* ---- lid + bow fly off together ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "50% 30%" }}
          initial={false}
          animate={open ? { y: -82, rotate: -21, opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 17 }}
        >
          {/* bow shadow on the lid */}
          {band ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]"
              style={{
                top: LID.top + 6,
                width: 46,
                height: 9,
                background: "rgba(0,0,0,0.3)",
                filter: "blur(4px)",
              }}
            />
          ) : null}

          {/* bow — loops, knot, notched tails */}
          {band ? (
            <div aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ top: 20, width: 66, height: 44 }}>
              {/* tails (behind the lid edge) */}
              <span
                className="absolute"
                style={{
                  left: 26,
                  top: 20,
                  width: 9,
                  height: 21,
                  background: bandSheenV,
                  transform: "rotate(17deg)",
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)",
                  opacity: 0.97,
                }}
              />
              <span
                className="absolute"
                style={{
                  left: 31,
                  top: 20,
                  width: 9,
                  height: 21,
                  background: bandSheenV,
                  transform: "rotate(-17deg)",
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)",
                  opacity: 0.97,
                }}
              />
              {/* left loop */}
              <span
                className="absolute"
                style={{
                  left: 4,
                  top: 2,
                  width: 27,
                  height: 21,
                  borderRadius: "62% 68% 66% 60% / 78% 88% 62% 72%",
                  background: `linear-gradient(135deg, ${tone.hi} 0%, ${tone.base} 52%, ${tone.lo} 100%)`,
                  transform: "rotate(-31deg)",
                  boxShadow:
                    "inset 2px 2px 4px rgba(255,255,255,0.55), inset -4px -4px 7px rgba(0,0,0,0.2), 0 3px 7px rgba(0,0,0,0.22)",
                }}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    borderRadius: "inherit",
                    background: "radial-gradient(ellipse at 88% 50%, rgba(0,0,0,0.26), transparent 58%)",
                  }}
                />
              </span>
              {/* right loop (mirrored) */}
              <span
                className="absolute"
                style={{
                  right: 4,
                  top: 2,
                  width: 27,
                  height: 21,
                  borderRadius: "60% 66% 68% 62% / 72% 62% 88% 78%",
                  background: `linear-gradient(225deg, ${tone.hi} 0%, ${tone.base} 52%, ${tone.lo} 100%)`,
                  transform: "rotate(31deg)",
                  boxShadow:
                    "inset -2px 2px 4px rgba(255,255,255,0.55), inset 4px -4px 7px rgba(0,0,0,0.2), 0 3px 7px rgba(0,0,0,0.22)",
                }}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    borderRadius: "inherit",
                    background: "radial-gradient(ellipse at 12% 50%, rgba(0,0,0,0.26), transparent 58%)",
                  }}
                />
              </span>
              {/* knot */}
              <span
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 8,
                  width: 16,
                  height: 13,
                  borderRadius: 5,
                  background: `linear-gradient(180deg, ${tone.hi} 0%, ${tone.base} 45%, ${tone.lo} 100%)`,
                  boxShadow:
                    "inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.24), 0 2px 5px rgba(0,0,0,0.26)",
                }}
              />
            </div>
          ) : null}

          {/* lid slab */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: (W - LID.w) / 2,
              top: LID.top,
              width: LID.w,
              height: LID.h,
              borderRadius: LID.r,
              background: `linear-gradient(180deg, ${shade(base, 0.3)} 0%, ${shade(base, 0.1)} 48%, ${shade(base, -0.05)} 100%)`,
              boxShadow: `${onDark ? "0 9px 16px -6px rgba(0,0,0,0.45)" : "0 8px 14px -6px rgba(29,29,31,0.32)"}, inset 0 2px 2px rgba(255,255,255,0.45), inset 0 -3px 4px rgba(0,0,0,0.16)`,
            }}
          >
            {band ? (
              <div
                aria-hidden
                className="absolute"
                style={{
                  left: LID.w / 2 - 9,
                  top: 0,
                  width: 18,
                  height: LID.h,
                  background: bandSheenV,
                  boxShadow: "2px 0 4px rgba(0,0,0,0.2), -2px 0 4px rgba(0,0,0,0.2)",
                }}
              />
            ) : null}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: LID.r,
                background: "linear-gradient(112deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 30%, transparent 55%)",
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );

  /* wrap in a fixed-size scale frame so layout stays predictable */
  const framed = (
    <span
      className={cn("relative inline-block align-middle", className)}
      style={{ width: W * scale, height: H * scale }}
    >
      <span
        className="absolute left-0 top-0"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {art}
      </span>
    </span>
  );

  if (!onOpen) return framed;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // the gift opens on its own tap, not the scene advance
        onOpen();
      }}
      aria-label={open ? "Gift opened" : "Tap to open the gift"}
      className="relative mx-auto block cursor-pointer outline-none transition-transform duration-150 active:scale-[0.965]"
    >
      {framed}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* GiftConfetti — richer burst for the gift reveal: mixed shapes,      */
/* two staggered waves, tinted with the wrap color.                    */
/* ------------------------------------------------------------------ */

export function GiftConfetti({ tint, onDark = true }: { tint?: string; onDark?: boolean }) {
  const color = tint ?? "#5E5CE6";
  const palette = useMemo(
    () => [color, "#FFD57A", "#FF8FA8", "#7CE7C4", onDark ? "#FFFFFF" : "#FFFFFF", "#C9B8FF"],
    [color, onDark]
  );

  const waves = useMemo(() => {
    const mk = (n: number, delayBase: number) =>
      Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * (Math.random() * 0.9 + 0.05)) / 1; // 0..π (upward)
        const dir = Math.random() > 0.5 ? 1 : -1;
        const dist = 60 + Math.random() * 120;
        const shapeRoll = Math.random();
        const shape = shapeRoll < 0.4 ? "rect" : shapeRoll < 0.7 ? "circle" : "strip";
        return {
          id: `${delayBase}-${i}`,
          x: Math.cos(angle) * dist * dir * 0.9,
          y: -(Math.sin(angle) * dist) - 20,
          rotate: (Math.random() - 0.5) * 720,
          scale: 0.7 + Math.random() * 0.6,
          delay: delayBase + Math.random() * 0.12,
          dur: 0.95 + Math.random() * 0.45,
          color: palette[i % palette.length],
          w: shape === "rect" ? 7 + Math.random() * 4 : shape === "strip" ? 3.5 : 6 + Math.random() * 4,
          h: shape === "rect" ? 5 + Math.random() * 3 : shape === "strip" ? 13 + Math.random() * 6 : 6 + Math.random() * 4,
          radius: shape === "circle" ? "9999px" : "2.5px",
        };
      });
    return [...mk(26, 0), ...mk(16, 0.22)];
  }, [palette]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {waves.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.5 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: p.scale }}
          transition={{ duration: p.dur, ease: "easeOut", delay: p.delay }}
          className="absolute"
          style={{
            width: p.w,
            height: p.h,
            borderRadius: p.radius,
            backgroundColor: p.color,
            boxShadow: onDark ? "0 1px 4px rgba(0,0,0,0.18)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* useRevealDemo — powers the editor's "Preview the reveal" button:    */
/* plays the open animation + confetti for a beat, then resets.        */
/* ------------------------------------------------------------------ */

export function useRevealDemo(timeoutMs = 3000) {
  const [demoOpen, setDemoOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const play = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setDemoOpen(false);
    // restart from closed on a fresh frame so keyframed hops replay
    window.requestAnimationFrame(() => {
      setDemoOpen(true);
      timer.current = window.setTimeout(() => setDemoOpen(false), timeoutMs);
    });
  };

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return { demoOpen, play };
}
