"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Copy, Hand, Sparkles, Volume2, VolumeX } from "lucide-react";
import { ConfettiFX } from "./confetti";
import { useMD } from "./md-context";
import type { MachineSfxName } from "./coupon-sfx";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* CouponMachine — the blue arcade claw machine with a REAL prize      */
/* flow. The machine is PLAYER-CONTROLLED:                             */
/*                                                                     */
/*   PLAY & WIN → the machine wakes (starting, the server deal runs)   */
/*   → CONTROL — the red joystick goes live; drag it (or arrow keys)   */
/*   to sweep the claw across the chamber; every ticket is face-down   */
/*   (all read "COUPON" with a blurred code strip, so nobody can      */
/*   cheat by reading codes in the pile)                               */
/*   → RELEASE the joystick → the claw drops onto the nearest ticket,  */
/*   the pincers snap shut (grabbing), it lifts + glides to center     */
/*   → the ticket bursts into the golden ticket and the code reveals.  */
/*                                                                     */
/* The SERVER still decides the prize: the first play assigns one      */
/* coupon from the creator's eligible pool (persisted, stock-guarded); */
/* every replay returns the SAME coupon no matter which ticket the    */
/* player grabs — the codes were never visible, so the reveal is       */
/* always a perfect match.                                             */
/*                                                                     */
/* One art source for the moment player and the builder's live stage.  */
/* ------------------------------------------------------------------ */

/** Rounded arcade font stack (Korean-capable for legacy drafts). */
const ARCADE =
  'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** The golden ticket body — rounded corners + scalloped (bumped) ends. */
const TICKET_PATH =
  "M9.5 0 H102.5 A4.5 4.5 0 0 1 107 4.5 A5.5 5.5 0 0 1 107 15.5 A5.5 5.5 0 0 1 107 26.5 A5.5 5.5 0 0 1 107 37.5 A4.5 4.5 0 0 1 102.5 42 H9.5 A4.5 4.5 0 0 1 5 37.5 A5.5 5.5 0 0 1 5 26.5 A5.5 5.5 0 0 1 5 15.5 A5.5 5.5 0 0 1 5 4.5 A4.5 4.5 0 0 1 9.5 0 Z";

/** Scallop-sided ticket path sized to a w×h box — rounded corners plus
 *  three outward semicircle bumps on the left and right edges (the classic
 *  amusement-ticket stub silhouette from the reference art). */
function ticketPath(w: number, h: number): string {
  const cr = Math.max(1.5, Math.min(4.5, h * 0.12)); // rounded corner radius
  const br = (h - 2 * cr) / 6; // scallop radius (three bumps per side)
  const xL = br;
  const xR = w - br;
  return [
    `M${xL + cr} 0 H${xR - cr}`,
    `A${cr} ${cr} 0 0 1 ${xR} ${cr}`,
    `A${br} ${br} 0 0 1 ${xR} ${cr + 2 * br}`,
    `A${br} ${br} 0 0 1 ${xR} ${cr + 4 * br}`,
    `A${br} ${br} 0 0 1 ${xR} ${h - cr}`,
    `A${cr} ${cr} 0 0 1 ${xR - cr} ${h}`,
    `H${xL + cr}`,
    `A${cr} ${cr} 0 0 1 ${xL} ${h - cr}`,
    `A${br} ${br} 0 0 1 ${xL} ${cr + 4 * br}`,
    `A${br} ${br} 0 0 1 ${xL} ${cr + 2 * br}`,
    `A${br} ${br} 0 0 1 ${xL} ${cr}`,
    `A${cr} ${cr} 0 0 1 ${xL + cr} 0`,
    "Z",
  ].join(" ");
}

/** Code font-size that keeps any code (up to 24 chars) inside the ticket. */
function codeFontSize(len: number): number {
  if (len <= 6) return 14;
  if (len <= 9) return 12;
  if (len <= 13) return 10;
  if (len <= 18) return 8.5;
  return 7;
}

/** Font for a ticket's hidden code strip (tiny surface, blurred anyway). */
function stripFontSize(len: number): number {
  if (len <= 6) return 4.7;
  if (len <= 10) return 4.2;
  return 3.7;
}

/** A four-point sparkle star. */
function Spark({ x, y, s = 1, fill, delay = 0 }: { x: number; y: number; s?: number; fill: string; delay?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -4.6 L1.25 -1.25 L4.6 0 L1.25 1.25 L0 4.6 L-1.25 1.25 L-4.6 0 L-1.25 -1.25 Z"
      fill={fill}
    />
  );
}

/** A classic five-point star — the arcade marquee/star-mark shape. */
function Star5({
  x,
  y,
  s = 1,
  fill,
  stroke,
  strokeWidth = 0.7,
}: {
  x: number;
  y: number;
  s?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5 L1.23 -1.7 L4.76 -1.55 L2 0.65 L2.94 4.05 L0 2.1 L-2.94 4.05 L-2 0.65 L-4.76 -1.55 L-1.23 -1.7 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? strokeWidth : undefined}
      strokeLinejoin="round"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Public machine types                                                */
/* ------------------------------------------------------------------ */

/** A coupon as the machine displays it (a face-down ticket in the pile). */
export interface MachineCoupon {
  id: string;
  code: string;
  title?: string;
  color?: string;
}

/** The prize a player has been assigned (server decision). */
export interface MachinePrize {
  couponId: string;
  code: string;
  title: string;
  description?: string;
  color: string;
}

/** idle → starting (wake + server deal) → control (player aims via the
 *  joystick) → grabbing (drop → snap → lift → center) → revealed. */
export type MachinePhase = "idle" | "starting" | "control" | "grabbing" | "revealed";

/** Duration of the release choreography: flare → drop → bounce → snap →
 *  pluck → lift → glide → settle → reveal. */
export const MACHINE_SEQ_MS = 2600;

/** Shared beat map — fractions of the grab sequence. The hook's timers and
 *  the SVG keyframes both read these, so sound + motion stay in lockstep. */
export const MACHINE_BEAT = {
  /** pincers flare open just before the dive */
  open: 0.07,
  /** claw lands on the ticket (gravity easeIn) */
  drop: 0.4,
  /** contact rebound */
  bounce: 0.47,
  /** pincers snap shut on the ticket */
  snap: 0.52,
  /** ticket plucked clear of the pile */
  pluck: 0.62,
  /** claw rises to travel height */
  lift: 0.7,
  /** trolley glides to the center stage */
  glide: 0.84,
  /** pincers loosen over the stage */
  settle: 0.92,
  done: 1,
} as const;

/** Ticket-count bounds the creator can dial the pile to. */
export const TICKETS_MIN = 6;
export const TICKETS_MAX = 28;
export const TICKETS_DEFAULT = 12;

/** Horizontal claw travel (viewBox units from center x=160). */
const CLAW_RANGE = 112;

/* ------------------------------------------------------------------ */
/* Pile layout — a dumped, jumbled heap of tickets behind the glass    */
/* ------------------------------------------------------------------ */

interface PileSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  /** 0 = deepest row … 1 = front row (drives contact-shadow depth). */
  depth: number;
}

/** Deterministic PRNG — the same pile every play/refresh. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable pseudo-random from a string (legacy helper — still used by art). */
function hashStr(s: string): number {
  return [...s].reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) % 100003, 11);
}

/** Jitter in [-spread, +spread] from a stable key. */
function jitter(key: string, spread: number): number {
  return ((hashStr(key) % 1000) / 1000 - 0.5) * 2 * spread;
}

/** Front row baseline — bottoms tuck just behind the chamber lip (y 336). */
const FRONT_ROW_Y = 316;
/** Vertical gap between depth bands (jittered per ticket). */
const ROW_GAP = 21;

/** Back-to-front row weights — the heap reads deeper with more cards up front. */
const ROW_WEIGHTS: Record<number, number[]> = {
  3: [0.85, 1, 1.3],
  4: [0.75, 0.95, 1.15, 1.35],
  5: [0.7, 0.9, 1.05, 1.2, 1.35],
};

/** Chamber x-window the heap may occupy (matches the glass, minus margin). */
const PILE_LEFT = 36;
const PILE_RIGHT = 284;

/**
 * Deals `count` tickets into a heaped mound at the bottom of the glass —
 * the look of a pile someone just dumped in: rows of depth for perspective
 * (back = smaller + higher, front = bigger + lower), but within each row
 * the tickets scatter around a random cluster center with uneven gaps,
 * random tilt (a couple tossed nearly sideways) and per-ticket vertical
 * jitter so no two ever line up. Deterministic — the same count always
 * builds the same mound.
 */
function generateSlots(count: number): PileSlot[] {
  const R = count <= 10 ? 3 : count <= 16 ? 4 : 5;
  const weights = ROW_WEIGHTS[R];
  const totalW = weights.reduce((a, b) => a + b, 0);

  // Distribute tickets across depth bands (front-heavy), each row ≥ 1.
  const rowCounts = weights.map((w) => Math.max(1, Math.round((count * w) / totalW)));
  let diff = rowCounts.reduce((a, b) => a + b, 0) - count;
  let guard = 0;
  while (diff !== 0 && guard++ < 100) {
    const idx = rowCounts.reduce((best, c, i) => (c > rowCounts[best] ? i : best), 0);
    if (diff > 0 && rowCounts[idx] > 1) {
      rowCounts[idx] -= 1;
      diff -= 1;
    } else if (diff < 0) {
      rowCounts[idx] += 1;
      diff += 1;
    }
  }

  const rand = mulberry32(count * 2654435761);
  const slots: PileSlot[] = [];
  let g = 0; // global ticket index → stable art jitter
  for (let r = 0; r < R; r++) {
    const depth = r / (R - 1); // 0 back … 1 front
    const y = FRONT_ROW_Y - (R - 1 - r) * ROW_GAP;
    const h = 16 + (21 - 16) * depth;
    const w = 43 + (58 - 43) * depth;
    const n = rowCounts[r];

    // This row's heap center wanders — rows don't share an axis, so the
    // mound never reads as aligned stacks.
    const rowSpan = PILE_RIGHT - PILE_LEFT - w;
    const density = (n * w) / rowSpan; // how packed this row is
    const wander = (rand() - 0.5) * rowSpan * (1 - Math.min(0.85, density)) * 0.8;
    const center = (PILE_LEFT + PILE_RIGHT) / 2 + wander;

    // Scatter positions: uneven steps around the cluster center.
    const xs: number[] = [];
    if (n === 1) {
      xs.push(center + (rand() - 0.5) * w * 0.5);
    } else {
      // total width the row occupies — packed rows spread wide, sparse
      // rows cluster tightly (like the middle of a real dump).
      const spread = Math.min(rowSpan, n * w * (0.62 + density * 0.34));
      let cursor = center - spread / 2;
      for (let i = 0; i < n; i++) {
        xs.push(cursor + w / 2);
        // uneven step: 0.55–0.95 of a ticket width → visible overlap variety
        cursor += w * (0.55 + rand() * 0.4);
      }
    }

    for (let i = 0; i < n; i++) {
      const key = `slot-${g}-${i}`;
      // tilt: mostly gentle, a couple tossed hard per pile
      const tossed = rand() < 0.14;
      const rot = tossed ? (rand() - 0.5) * 56 : (rand() - 0.5) * 26;
      slots.push({
        x: xs[i] + jitter(`${key}-x`, 2.5),
        y: y + (rand() - 0.5) * 9,
        w,
        h,
        rot,
        depth,
      });
      g += 1;
    }
  }
  return slots;
}

const FILLER_COLORS = ["#9B59B6", "#E84393", "#F59E0B", "#2ECC71", "#3498DB", "#FF7A3D"];

interface PileCard {
  key: string;
  /** Real coupon code (rendered BLURRED — never readable in the pile). */
  code?: string;
  fill: string;
}

interface PileEntry {
  card: PileCard;
  slot: PileSlot;
}

/**
 * Builds the face-down ticket pile: the pool's coupons are dealt into the
 * mountain at stable positions; every remaining slot gets a generic filler
 * ticket. All tickets look identical (COUPON + blurred strip) — which
 * ticket hides which code is nobody's business until the claw reveals it.
 * Sorted back-to-front for natural depth stacking.
 */
function layoutPile(coupons: MachineCoupon[], ticketCount: number): PileEntry[] {
  const total = Math.max(ticketCount, coupons.length, TICKETS_MIN);
  const slots = generateSlots(total);
  const used = new Set<number>();
  const entries: PileEntry[] = [];

  coupons.forEach((c, i) => {
    let idx = (hashStr(c.id) + i * 3) % slots.length;
    let guard = 0;
    while (used.has(idx) && guard++ < slots.length) idx = (idx + 1) % slots.length;
    used.add(idx);
    entries.push({
      card: { key: `c-${c.id}`, code: c.code, fill: c.color || FILLER_COLORS[i % FILLER_COLORS.length] },
      slot: slots[idx],
    });
  });

  slots.forEach((slot, idx) => {
    if (used.has(idx)) return;
    entries.push({
      card: { key: `f-${idx}`, fill: FILLER_COLORS[idx % FILLER_COLORS.length] },
      slot,
    });
  });

  return entries.sort((a, b) => a.slot.y - b.slot.y);
}

/** One face-down pile ticket — a scalloped stub that reads "COUPON" with
 *  a blurred mystery-code strip. Pool tickets carry their real code under
 *  the blur; fillers carry dot leaders. Visually identical either way.
 *  `dim` darkens the deep rows slightly for pile depth. */
function PileCardArt({ w, h, fill, code, dim = 1 }: { w: number; h: number; fill: string; code?: string; dim?: number }) {
  const cr = Math.max(1.5, Math.min(4.5, h * 0.12));
  const br = (h - 2 * cr) / 6;
  const dots = "•".repeat(4 + (hashStr(fill + w) % 3));
  const hidden = code?.trim() ? code.trim().slice(0, 12) : dots;
  const showStrip = h >= 16.5;
  return (
    <g opacity={dim}>
      {/* soft contact shadow — the ticket rests on the pile */}
      <path d={ticketPath(w, h)} transform="translate(1.4 2.4)" fill="#17316B" opacity={0.2} />
      {/* scalloped ticket-stub body */}
      <path d={ticketPath(w, h)} fill={fill} stroke="rgba(0,0,0,0.22)" strokeWidth={1} strokeLinejoin="round" />
      {/* gloss tick along the top edge */}
      <rect x={br + 2} y={1.6} width={Math.max(2, w - 2 * br - 4)} height={Math.max(1.6, h * 0.28)} rx={1.6} fill="#FFFFFF" opacity={0.26} />
      {/* printed star marks near each end */}
      <Star5 x={br + 5.5} y={h / 2 - 2.5} s={0.46} fill="#FFFFFF" stroke="rgba(0,0,0,0.2)" strokeWidth={0.9} />
      <Star5 x={w - br - 5.5} y={h / 2 - 2.5} s={0.46} fill="#FFFFFF" stroke="rgba(0,0,0,0.2)" strokeWidth={0.9} />
      {/* the "COUPON" headline */}
      <text
        x={w / 2}
        y={h / 2 + 1.5}
        textAnchor="middle"
        fontSize={h >= 18 ? 6 : 5.2}
        fontWeight={800}
        letterSpacing={1}
        fill="#FFFFFF"
        fontFamily={ARCADE}
      >
        COUPON
      </text>
      {/* the hidden code strip — blurred until the claw wins it */}
      {showStrip ? (
        <>
          <rect x={br + 5} y={h - 6.6} width={Math.max(6, w - 2 * br - 10)} height={4.6} rx={2.3} fill="#FFFFFF" opacity={0.24} />
          <text
            x={w / 2}
            y={h - 3.3}
            textAnchor="middle"
            fontSize={stripFontSize(hidden.length)}
            fontWeight={800}
            letterSpacing={0.4}
            fill="#FFFFFF"
            opacity={0.9}
            fontFamily={MONO}
            style={{ filter: "blur(1.3px)" }}
          >
            {hidden}
          </text>
        </>
      ) : null}
    </g>
  );
}

/** Claw travel: from rest (pincer tips ≈ y 217.5) down to a ticket's row.
 *  Top-of-the-mound rows sit high, so the floor is lower than the old
 *  calibration (min 12 = a shallow reach onto the top row). */
function clawDropFor(slot: PileSlot): number {
  return Math.max(12, Math.min(106, slot.y + 6 - 217.5));
}

/** Cable stretch that matches a claw drop distance (existing calibration). */
function cableScaleFor(dropY: number): number {
  return 0.355 + dropY / 124;
}

/* ------------------------------------------------------------------ */
/* The golden ticket art — the winning ticket's presentation at the    */
/* reveal (112 × 42 in local coords).                                  */
/* ------------------------------------------------------------------ */
function GoldTicket({ code, eyebrow, reveal }: { code: string; eyebrow: string; reveal: boolean }) {
  const size = codeFontSize(code.length);
  return (
    <g>
      <path d={TICKET_PATH} fill="url(#cmGold)" stroke="#C77800" strokeWidth={2} strokeLinejoin="round" />
      <rect
        x={13}
        y={5.5}
        width={86}
        height={31}
        rx={5}
        fill="none"
        stroke="#C77800"
        strokeOpacity={0.4}
        strokeWidth={1.1}
        strokeDasharray="3 2.6"
      />
      <text x={56} y={15} textAnchor="middle" fontSize={5.8} fontWeight={800} letterSpacing={0.8} fill="#6B4A12" fontFamily={ARCADE}>
        {eyebrow}
      </text>
      <Star5 x={17} y={27.5} s={0.9} fill="#B45309" stroke="#8A3E06" strokeWidth={0.6} />
      <Star5 x={95} y={27.5} s={0.9} fill="#B45309" stroke="#8A3E06" strokeWidth={0.6} />
      {/* the real code — blurred while sealed, crisp at the reveal */}
      <motion.text
        x={56}
        y={32.5}
        textAnchor="middle"
        fontSize={size}
        fontWeight={800}
        letterSpacing={0.5}
        fill="#5D4037"
        fontFamily={MONO}
        initial={false}
        animate={reveal ? { filter: "blur(0px)", opacity: 1 } : { filter: "blur(4.5px)", opacity: 0.85 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {code}
      </motion.text>
      <motion.rect
        x={16}
        y={20.5}
        width={80}
        height={15}
        rx={3}
        fill="#AEB4BF"
        initial={false}
        animate={{ opacity: reveal ? 0 : 0.62 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* useCouponMachine — the play-flow state machine (player + editor).   */
/*                                                                     */
/* IDLE → STARTING (machine wakes while `draw()` deals with the        */
/* server) → CONTROL (the player aims the claw with the red joystick;  */
/* `clawX` is the live aim, ±112 from center) → GRABBING (`beginGrab`  */
/* runs the drop → snap → lift → center choreography) → REVEALED       */
/* (golden ticket + code + copy). PLAY AGAIN repeats the whole thing   */
/* and the server always returns the player's one assigned coupon.     */
/* ------------------------------------------------------------------ */

/** What the component resolves the moment the player releases the stick. */
export interface GrabPlan {
  /** Pile card key that gets lifted out (fades from the pile). */
  key: string;
  /** Vertical drop distance for the claw. */
  dropY: number;
  /** The grabbed ticket's color (continuity for the claw-held card). */
  color: string;
  /** Claw x at release (start of the glide-to-center keyframes). */
  x: number;
}

function messageForReason(reason?: string): string {
  switch (reason) {
    case "pool-empty":
      return "No coupons in this machine yet — ask the creator to add some.";
    case "no-eligible-coupons":
      return "All coupons have been claimed — check back later!";
    case "moment-not-found":
      return "This experience is no longer available.";
    case "machine-missing":
      return "This machine was just updated — reopen the experience and play again.";
    default:
      return "The machine jammed — check your connection and try again.";
  }
}

export function useCouponMachine({
  draw,
  seqMs = MACHINE_SEQ_MS,
  sfx,
}: {
  /** Server draw (player) or local simulation (builder preview). */
  draw: () => Promise<{ prize: MachinePrize | null; reason?: string }>;
  seqMs?: number;
  sfx?: { play: (name: MachineSfxName) => void };
}) {
  const [phase, setPhase] = useState<MachinePhase>("idle");
  const [prize, setPrize] = useState<MachinePrize | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soldOut, setSoldOut] = useState(false);
  const [clawX, setClawXState] = useState(0);
  const [grabPlan, setGrabPlan] = useState<GrabPlan | null>(null);
  const timers = useRef<number[]>([]);

  // Reduced motion: keep every beat functional but shorten the waits
  // (framer's MotionConfig reducedMotion="user" already collapses the
  // transforms — the claw simply arrives, the coupon still reveals).
  const [seq] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return Math.min(seqMs, 800);
    }
    return seqMs;
  });

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const busy = phase === "starting" || phase === "control" || phase === "grabbing";
  const setClawX = (next: number) => {
    if (phase !== "control") return;
    setClawXState(Math.max(-CLAW_RANGE, Math.min(CLAW_RANGE, next)));
  };

  const play = () => {
    if (busy) return; // one run at a time — aim, then grab
    clearTimers();
    setError(null);
    setGrabPlan(null);
    setClawXState(0);
    sfx?.play("press");
    setPhase("idle"); // reset any held end-state before the fresh run
    window.requestAnimationFrame(() => {
      setPhase("starting");
      draw().then(
        (res) => {
          if (!res.prize) {
            setSoldOut(res.reason === "no-eligible-coupons");
            setError(messageForReason(res.reason));
            setPhase("idle");
            return;
          }
          setPrize(res.prize);
          setHasAssignment(true);
          setSoldOut(false);
          setPlayToken((t) => t + 1);
          setPhase("control");
          sfx?.play("whirr"); // motor spins up — the claw is armed
        },
        (err) => {
          console.warn("[coupon-machine] draw failed:", err);
          setError(messageForReason());
          setPhase("idle");
        }
      );
    });
  };

  /** DROP pressed → resolve the grab and run the choreography. */
  const beginGrab = (plan: GrabPlan) => {
    if (phase !== "control") return;
    setGrabPlan(plan);
    setPhase("grabbing");
    sfx?.play("whirr"); // descent motor
    timers.current.push(window.setTimeout(() => sfx?.play("grab"), seq * MACHINE_BEAT.snap));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("revealed");
        sfx?.play("win");
      }, seq)
    );
  };

  useEffect(() => clearTimers, []);

  return {
    phase,
    prize,
    playToken,
    hasAssignment,
    setHasAssignment,
    error,
    soldOut,
    play,
    busy,
    clawX,
    setClawX,
    grabPlan,
    beginGrab,
  };
}

/* ------------------------------------------------------------------ */
/* CouponMachine                                                       */
/* ------------------------------------------------------------------ */
export function CouponMachine({
  title = "COUPON CODE",
  subtitle = "REVEAL",
  ticketLabel = "YOUR COUPON CODE",
  buttonLabel = "PLAY & WIN",
  coupons = [],
  cardCount,
  prize = null,
  phase = "idle",
  playToken = 0,
  hasAssignment = false,
  error = null,
  soldOut = false,
  /** Omit for a static, non-interactive rendering. */
  onPlay,
  /** Live claw aim (−112…112 from center) while phase is "control". */
  clawX = 0,
  /** Aim update from the joystick / arrow keys. */
  onAim,
  /** Joystick released — grab the resolved ticket and run the show. */
  onGrab,
  /** The active grab plan (drives drop height + held-ticket color). */
  grabPlan = null,
  celebrateFx = true,
  sfx,
}: {
  title?: string;
  subtitle?: string;
  ticketLabel?: string;
  buttonLabel?: string;
  /** The pool as displayed in the machine (one ticket per coupon). */
  coupons?: MachineCoupon[];
  /** How many tickets the creator wants piled in the glass (6–28). */
  cardCount?: number;
  /** The player's assigned coupon — the code the claw reveals. */
  prize?: MachinePrize | null;
  phase?: MachinePhase;
  playToken?: number;
  hasAssignment?: boolean;
  error?: string | null;
  soldOut?: boolean;
  onPlay?: () => void;
  clawX?: number;
  onAim?: (x: number) => void;
  onGrab?: (plan: GrabPlan) => void;
  grabPlan?: GrabPlan | null;
  celebrateFx?: boolean;
  sfx?: { play: (name: MachineSfxName) => void; muted: boolean; toggle: () => void };
}) {
  const { notify } = useMD();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stickRef = useRef<SVGCircleElement | null>(null);
  const playBtnRef = useRef<SVGGElement | null>(null);
  const [stickFocus, setStickFocus] = useState(false);

  /* Manual-aim state (pointer drag on the red knob). */
  const stickDrag = useRef<{ startX: number; startY: number; startClaw: number; scale: number } | null>(null);

  const revealed = phase === "revealed";
  const grabbing = phase === "grabbing";
  const controlling = phase === "control";
  const busy = phase === "starting" || phase === "control" || phase === "grabbing";
  const emptyPool = coupons.length === 0;

  /* The face-down ticket mountain (pool + fillers up to the dial count). */
  const ticketCount = Math.max(TICKETS_MIN, Math.min(TICKETS_MAX, cardCount ?? TICKETS_DEFAULT));
  const pile = useMemo(() => layoutPile(coupons, ticketCount), [coupons, ticketCount]);

  /* Release → grab the ticket nearest the claw's center. */
  const computeGrab = (x: number): GrabPlan => {
    const clawAbs = 160 + x;
    let best: PileEntry | null = null;
    let bestD = Infinity;
    for (const e of pile) {
      const c = e.slot.x + e.slot.w / 2;
      const d = Math.abs(c - clawAbs);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return { key: "", dropY: 86, color: "#9B59B6", x };
    return { key: best.card.key, dropY: clawDropFor(best.slot), color: best.card.fill, x };
  };

  /* DROP — sends the claw down wherever it currently hangs. */
  const dropClaw = () => {
    if (phase !== "control") return;
    onGrab?.(computeGrab(clawX));
  };

  const dropY = grabPlan?.dropY ?? 86;
  const releaseX = grabPlan?.x ?? 0;
  const cableDrop = cableScaleFor(dropY);
  /* Grab-choreography duration — matches the hook's timer schedule
   * (shortened for prefers-reduced-motion the same way). */
  const [g] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return 0.8;
    }
    return MACHINE_SEQ_MS / 1000;
  });

  /* COPY CODE → real clipboard (with the legacy + toast fallbacks) */
  const shown = prize?.code?.trim() || "";
  const doCopy = async () => {
    if (!shown) return;
    const flashCopied = () => {
      setCopied(true);
      sfx?.play("copy");
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    };
    let ok = false;
    try {
      await navigator.clipboard.writeText(shown);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shown;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) flashCopied();
    else notify(`Code: ${shown}`); // last resort — surface it for a manual copy
  };

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  /* When the golden reveal lands, make sure the code card is on screen —
   * the machine is tall and mobile viewports can hide it below the fold. */
  useEffect(() => {
    if (phase === "revealed") {
      const t = window.setTimeout(() => revealRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350);
      return () => window.clearTimeout(t);
    }
  }, [phase, playToken]);

  /* Panel button */
  const canPlay = Boolean(onPlay) && !busy && !soldOut && !emptyPool;
  /* During the aiming phase the pill becomes the machine's DROP button —
   * exactly like a real cabinet: stick to aim, big button to send it down. */
  const canDrop = controlling;
  const canPress = canPlay || canDrop;
  const btnLabel = soldOut
    ? "SOLD OUT"
    : emptyPool
      ? "NO PRIZES"
      : controlling
        ? "DROP"
        : phase === "starting" || grabbing
          ? "···"
          : revealed || (hasAssignment && phase === "idle")
            ? "PLAY AGAIN"
            : buttonLabel;
  const buttonAction = () => {
    if (canDrop) {
      dropClaw();
      return;
    }
    if (canPlay && onPlay) onPlay();
  };
  const btnAria = soldOut
    ? "All coupons have been claimed"
    : emptyPool
      ? "No coupons in this machine yet"
      : controlling
        ? "Drop the claw and grab a coupon"
        : busy
          ? "Drawing your coupon"
          : hasAssignment || revealed
            ? "Play again — you’ll win the same coupon"
            : `${buttonLabel} — play the claw machine`;
  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buttonAction();
    }
  };
  const btnTextSize = btnLabel.length > 12 ? 11 : 12.5;

  /* ---------- joystick (manual claw control) ----------
   *
   * Real-cabinet feel: the knob is a spring-return stick. Grab it and drag —
   * the DEFLECTION (not raw distance) sweeps the claw from wherever it hung
   * when you grabbed, so aim is proportional and forgiving. Let go and the
   * stick springs home but the claw HOLDS — you can re-grab and fine-tune as
   * many times as you like. The big green DROP button sends it down. */

  const stickActive = controlling;
  /** Finger travel (viewBox units) for full deflection. */
  const STICK_TRAVEL = 26;
  /** Claw units swept at full deflection (half the rail per stroke). */
  const STICK_SWEEP = 64;
  /** Knob visual deflection (viewBox units) at full stick. */
  const KNOB_X = 9.5;
  const KNOB_Y = 4.5;

  /* Knob deflection −1…1 (drives the stick art + spring-back). */
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  /* Cable pendulum lean from stick motion (viewBox degrees). */
  const [sway, setSway] = useState(0);
  const swayBack = useRef<number | null>(null);
  const lastAim = useRef(0);
  const lastWhirr = useRef(0);
  const whirrTravel = useRef(0);

  /* The claw lags the stick like a motor-driven trolley — velocity feeds a
   * pendulum lean on the cable and a throttled motor whirr. */
  const aimWithPhysics = (next: number) => {
    const delta = next - lastAim.current;
    lastAim.current = next;
    onAim?.(next);
    setSway(Math.max(-6.5, Math.min(6.5, -delta * 0.55)));
    if (swayBack.current) window.clearTimeout(swayBack.current);
    swayBack.current = window.setTimeout(() => setSway(0), 150);
    whirrTravel.current += Math.abs(delta);
    const now = Date.now();
    if (whirrTravel.current > 20 && now - lastWhirr.current > 170) {
      whirrTravel.current = 0;
      lastWhirr.current = now;
      sfx?.play("whirr");
    }
  };

  useEffect(
    () => () => {
      if (swayBack.current) window.clearTimeout(swayBack.current);
    },
    []
  );

  const onStickDown = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!controlling) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    const rect = svgRef.current?.getBoundingClientRect();
    stickDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startClaw: clawX,
      scale: rect ? rect.width / 320 : 1,
    };
    lastAim.current = clawX;
    sfx?.play("press");
  };

  const onStickMove = (e: React.PointerEvent<SVGCircleElement>) => {
    const drag = stickDrag.current;
    if (!drag || !controlling) return;
    const dx = (e.clientX - drag.startX) / Math.max(0.5, drag.scale);
    const dy = (e.clientY - drag.startY) / Math.max(0.5, drag.scale);
    // deflection −1…1 with a small dead zone at center
    let deflX = Math.max(-1, Math.min(1, dx / STICK_TRAVEL));
    if (Math.abs(deflX) < 0.06) deflX = 0;
    const deflY = Math.max(-1, Math.min(1, dy / (STICK_TRAVEL * 0.7)));
    setKnob({ x: deflX, y: deflY });
    aimWithPhysics(Math.max(-CLAW_RANGE, Math.min(CLAW_RANGE, drag.startClaw + deflX * STICK_SWEEP)));
  };

  const endStickDrag = () => {
    const wasDragging = stickDrag.current !== null;
    stickDrag.current = null;
    if (wasDragging) {
      // stick springs home — the claw STAYS. Short motor blip as it settles.
      setKnob({ x: 0, y: 0 });
      sfx?.play("whirr");
    }
  };

  const onStickKey = (e: React.KeyboardEvent<SVGCircleElement>) => {
    if (!controlling) return;
    const step = e.shiftKey ? 34 : 14;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setKnob({ x: -0.7, y: 0 });
        aimWithPhysics(clawX - step);
        window.setTimeout(() => setKnob({ x: 0, y: 0 }), 160);
        break;
      case "ArrowRight":
        e.preventDefault();
        setKnob({ x: 0.7, y: 0 });
        aimWithPhysics(clawX + step);
        window.setTimeout(() => setKnob({ x: 0, y: 0 }), 160);
        break;
      case "Home":
        e.preventDefault();
        setKnob({ x: -1, y: 0 });
        aimWithPhysics(-CLAW_RANGE);
        window.setTimeout(() => setKnob({ x: 0, y: 0 }), 220);
        break;
      case "End":
        e.preventDefault();
        setKnob({ x: 1, y: 0 });
        aimWithPhysics(CLAW_RANGE);
        window.setTimeout(() => setKnob({ x: 0, y: 0 }), 220);
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        dropClaw();
        break;
    }
  };

  /* Keyboard flow: if focus is still on PLAY when control starts, hop it
   * over to the joystick so arrow-key players aren't left hunting. */
  useEffect(() => {
    if (phase === "control" && typeof document !== "undefined" && document.activeElement === playBtnRef.current) {
      stickRef.current?.focus();
    }
  }, [phase]);

  const ariaPct = Math.round(((clawX + CLAW_RANGE) / (CLAW_RANGE * 2)) * 100);

  const machine = (
    <svg
      ref={svgRef}
      viewBox="0 0 320 452"
      role="figure"
      aria-label={`${title} ${subtitle} — claw machine coupon game${
        revealed && shown ? ` — you won ${shown}` : ""
      }`}
      className="block h-auto w-full select-none"
      style={{ fontFamily: ARCADE }}
    >
      <defs>
        <linearGradient id="cmBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42A5F5" />
          <stop offset="55%" stopColor="#1E88E5" />
          <stop offset="100%" stopColor="#1565C0" />
        </linearGradient>
        <linearGradient id="cmMarquee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E63E9" />
          <stop offset="100%" stopColor="#0D47A1" />
        </linearGradient>
        <linearGradient id="cmGoldText" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3C0" />
          <stop offset="55%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#FFC53D" />
        </linearGradient>
        <linearGradient id="cmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBDC" />
          <stop offset="45%" stopColor="#FFEE58" />
          <stop offset="100%" stopColor="#FFD93B" />
        </linearGradient>
        <radialGradient id="cmInterior" cx="50%" cy="40%" r="78%">
          <stop offset="0%" stopColor="#F2F8FF" />
          <stop offset="58%" stopColor="#E4EEFB" />
          <stop offset="100%" stopColor="#CFE0F3" />
        </radialGradient>
        <linearGradient id="cmMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8EDF3" />
          <stop offset="100%" stopColor="#9AA3B2" />
        </linearGradient>
        <linearGradient id="cmPanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E93F7" />
          <stop offset="100%" stopColor="#1668C9" />
        </linearGradient>
        <linearGradient id="cmInset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#54B2FF" />
          <stop offset="100%" stopColor="#2E93F7" />
        </linearGradient>
        <linearGradient id="cmButton" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BA68C8" />
          <stop offset="100%" stopColor="#8E24AA" />
        </linearGradient>
        <linearGradient id="cmButtonGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
        <radialGradient id="cmBall" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FF8A7A" />
          <stop offset="55%" stopColor="#E02424" />
          <stop offset="100%" stopColor="#A50F0F" />
        </radialGradient>
        <radialGradient id="cmSpot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7DC" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#FFF7DC" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cmMarqueeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2F6BFF" stopOpacity={0.42} />
          <stop offset="100%" stopColor="#2F6BFF" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cmBulbGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity={0.85} />
          <stop offset="55%" stopColor="#FFD84D" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#FFD84D" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cmSilver" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F4F7FB" />
          <stop offset="45%" stopColor="#C3CCD9" />
          <stop offset="100%" stopColor="#8D99AB" />
        </linearGradient>
        <linearGradient id="cmSilverR" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#F4F7FB" />
          <stop offset="45%" stopColor="#C3CCD9" />
          <stop offset="100%" stopColor="#8D99AB" />
        </linearGradient>
        <linearGradient id="cmHousing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5AB0FF" />
          <stop offset="100%" stopColor="#1976D2" />
        </linearGradient>
        <radialGradient id="cmRivet" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#EAF7FF" />
          <stop offset="55%" stopColor="#4FC3F7" />
          <stop offset="100%" stopColor="#1E88E5" />
        </radialGradient>
        <radialGradient id="cmCeil" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cmGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.32} />
          <stop offset="24%" stopColor="#FFFFFF" stopOpacity={0.1} />
          <stop offset="48%" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="cmShadeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="68%" stopColor="#083B75" stopOpacity={0} />
          <stop offset="100%" stopColor="#083B75" stopOpacity={0.4} />
        </linearGradient>
        <linearGradient id="cmSeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#083B75" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#083B75" stopOpacity={0} />
        </linearGradient>
        <clipPath id="cmBodyClip">
          <rect x={10} y={10} width={300} height={420} rx={26} />
        </clipPath>
        <clipPath id="cmWinClip">
          <rect x={30} y={96} width={260} height={240} rx={16} />
        </clipPath>
      </defs>

      {/* whole cabinet micro-shakes while the machine powers up */}
      <motion.g
        initial={false}
        animate={
          phase === "starting"
            ? { x: [0, -1.4, 1.4, 0], transition: { duration: 0.16, repeat: Infinity } }
            : { x: 0, transition: { duration: 0.25 } }
        }
      >
        {/* ================= cabinet ================= */}
        {/* black semi-spherical feet peeking under the body */}
        <g>
          <ellipse cx={44} cy={431} rx={13.5} ry={8.5} fill="#16181D" />
          <ellipse cx={126} cy={433.5} rx={11.5} ry={8} fill="#16181D" />
          <ellipse cx={194} cy={433.5} rx={11.5} ry={8} fill="#16181D" />
          <ellipse cx={276} cy={431} rx={13.5} ry={8.5} fill="#16181D" />
          <ellipse cx={40} cy={428.5} rx={5} ry={1.9} fill="#39414F" opacity={0.8} />
          <ellipse cx={272} cy={428.5} rx={5} ry={1.9} fill="#39414F" opacity={0.8} />
        </g>
        <rect x={10} y={10} width={300} height={420} rx={26} fill="url(#cmBody)" stroke="#0A5BB8" strokeWidth={3} />
        {/* molded-plastic volume — bevel light, right-side shade, vertical gloss */}
        <rect x={13} y={13} width={294} height={414} rx={23} fill="none" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={2.4} />
        <rect x={10} y={10} width={300} height={420} rx={26} fill="url(#cmShadeR)" clipPath="url(#cmBodyClip)" />
        <rect x={10} y={10} width={300} height={420} rx={26} fill="url(#cmGloss)" clipPath="url(#cmBodyClip)" />
        <rect x={20} y={15} width={280} height={9} rx={4.5} fill="#FFFFFF" opacity={0.14} />
        {/* upper-left key light — a long gloss streak down the left pillar */}
        <rect x={14} y={30} width={4.6} height={290} rx={2.3} fill="#FFFFFF" opacity={0.2} />

        {/* ================= marquee — recessed navy sign ================= */}
        {/* soft blue bleed out of the sign onto the cabinet + glass */}
        <ellipse cx={160} cy={55} rx={150} ry={44} fill="url(#cmMarqueeGlow)" />
        <rect x={56} y={24} width={208} height={62} rx={16} fill="url(#cmMarquee)" stroke="#0A3D8C" strokeWidth={2.5} />
        <rect x={59} y={27} width={202} height={56} rx={13} fill="none" stroke="#7EB3FF" strokeOpacity={0.4} strokeWidth={1.4} />
        <ellipse cx={160} cy={54} rx={88} ry={30} fill="#3B76FF" opacity={0.22} />
        <rect x={60} y={27.5} width={200} height={7} rx={3.5} fill="#FFFFFF" opacity={0.14} />
        {/* golden 3D-extruded lettering — three stacked passes */}
        <text x={163.6} y={55.6} textAnchor="middle" fontSize={21} fontWeight={900} letterSpacing={1} fill="#9C5B00" opacity={0.95} fontFamily={ARCADE}>
          {title}
        </text>
        <text x={161.8} y={53.8} textAnchor="middle" fontSize={21} fontWeight={900} letterSpacing={1} fill="#C97B06" fontFamily={ARCADE}>
          {title}
        </text>
        <text x={160} y={52} textAnchor="middle" fontSize={21} fontWeight={900} letterSpacing={1} fill="url(#cmGoldText)" stroke="#B45309" strokeWidth={0.7} fontFamily={ARCADE}>
          {title}
        </text>
        <text x={161.5} y={76.5} textAnchor="middle" fontSize={14} fontWeight={800} letterSpacing={3.2} fill="#0A2E6E" fontFamily={ARCADE}>
          {subtitle}
        </text>
        <text x={160} y={75} textAnchor="middle" fontSize={14} fontWeight={800} letterSpacing={3.2} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2.4} fontFamily={ARCADE}>
          {subtitle}
        </text>
        <text x={160} y={75} textAnchor="middle" fontSize={14} fontWeight={800} letterSpacing={3.2} fill="#FFFFFF" fontFamily={ARCADE} style={{ filter: "drop-shadow(0 0 4px rgba(147,197,253,0.9))" }}>
          {subtitle}
        </text>
        <Star5 x={110} y={70.5} s={1.15} fill="#FFC107" stroke="#E6A100" strokeWidth={0.7} />
        <Star5 x={210} y={70.5} s={1.15} fill="#FFC107" stroke="#E6A100" strokeWidth={0.7} />

        {/* four big warm marquee lamps — twinkle gently at idle, strobe while starting */}
        {[
          { x: 40, y: 35, r: 5.4, halo: 11.5 },
          { x: 40, y: 63, r: 5.4, halo: 11.5 },
          { x: 280, y: 35, r: 5.4, halo: 11.5 },
          { x: 280, y: 63, r: 5.4, halo: 11.5 },
        ].map((b, i) => (
          <g key={i}>
            <circle
              className="md-bulb"
              style={{
                animationDelay: `${i * 0.32}s`,
                ...(phase === "starting" ? { animationDuration: "0.38s" } : {}),
              }}
              cx={b.x}
              cy={b.y}
              r={b.halo}
              fill="url(#cmBulbGlow)"
            />
            <circle cx={b.x} cy={b.y} r={b.r} fill="#FFE9A8" stroke="#E0A93E" strokeWidth={0.7} />
            <circle cx={b.x - b.r * 0.32} cy={b.y - b.r * 0.32} r={b.r * 0.32} fill="#FFFFFF" opacity={0.9} />
          </g>
        ))}

        {/* ================= glass window ================= */}
        <rect x={30} y={96} width={260} height={240} rx={16} fill="url(#cmInterior)" stroke="#0A5BB8" strokeWidth={3} />
        <g clipPath="url(#cmWinClip)">
          {/* interior depth — top AO + two diffused ceiling lamps */}
          <rect x={30} y={96} width={260} height={42} fill="url(#cmSeam)" opacity={0.5} />
          <ellipse cx={90} cy={113} rx={32} ry={15} fill="url(#cmCeil)" />
          <ellipse cx={230} cy={113} rx={32} ry={15} fill="url(#cmCeil)" />
          {/* soft floor shading */}
          <ellipse cx={160} cy={336} rx={122} ry={11} fill="#B9CDE8" opacity={0.5} />
          <rect x={30} y={329} width={260} height={7} fill="#8FA9CE" opacity={0.3} />

          {/* gantry rail (fixed) — the trolley rides along it */}
          <rect x={44} y={103} width={232} height={6.5} rx={3.25} fill="#46536B" />
          <rect x={44} y={103} width={232} height={2.2} rx={1.1} fill="#FFFFFF" opacity={0.18} />

          {/* ============ the pile (behind the claw) ============ */}
          <motion.g
            initial={false}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
            animate={
              grabbing
                ? {
                    y: [0, 0, 3.5, 0, 0],
                    scaleX: [1, 1, 1.06, 1, 1],
                    transition: { duration: g, times: [0, MACHINE_BEAT.drop, MACHINE_BEAT.bounce, MACHINE_BEAT.pluck, 1], ease: "easeOut" },
                  }
                : { y: 0, scaleX: 1, transition: { duration: 0.3 } }
            }
          >
            <g style={{ filter: "drop-shadow(0 3px 3px rgba(23,43,77,0.22))" }}>
              {pile.map(({ card, slot }) => {
                const isGrabbed = Boolean(grabPlan && card.key === grabPlan.key);
                const art = <PileCardArt w={slot.w} h={slot.h} fill={card.fill} code={card.code} dim={1 - slot.depth * 0.06} />;
                return (
                  <g key={card.key} transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rot} ${slot.w / 2} ${slot.h / 2})`}>
                    {isGrabbed ? (
                      /* the grabbed ticket — tugged loose and plucked out with the claw */
                      <motion.g
                        initial={false}
                        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
                        animate={
                          grabbing
                            ? {
                                opacity: [1, 1, 1, 0, 0],
                                y: [0, 0, -3, -16, -16],
                                rotate: [0, 0, -7, 6, 6],
                                transition: {
                                  duration: g,
                                  times: [0, MACHINE_BEAT.snap, MACHINE_BEAT.pluck, MACHINE_BEAT.lift, 1],
                                  ease: "easeOut",
                                },
                              }
                            : { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.2 } }
                        }
                      >
                        {art}
                      </motion.g>
                    ) : (
                      art
                    )}
                  </g>
                );
              })}
            </g>
          </motion.g>

          {/* spotlight behind the presented ticket */}
          <motion.ellipse
            cx={160}
            cy={222}
            rx={86}
            ry={54}
            fill="url(#cmSpot)"
            initial={false}
            animate={{ opacity: revealed ? 0.6 : 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ pointerEvents: "none" }}
          />

          {/* ============ claw assembly ============ */}
          {/* horizontal travel: follows the joystick while aiming (with a
              motor-like spring lag); after the snap, glides the prize to
              the center stage */}
          <motion.g
            initial={false}
            animate={
              controlling
                ? { x: clawX }
                : grabbing
                  ? { x: [releaseX, releaseX, releaseX, 0, 0] }
                  : phase === "starting"
                    ? { x: [0, -3, 3, 0] }
                    : { x: 0 }
            }
            transition={
              controlling
                ? { type: "spring", stiffness: 260, damping: 26 }
                : grabbing
                  ? {
                      duration: g,
                      times: [0, MACHINE_BEAT.snap, MACHINE_BEAT.lift, MACHINE_BEAT.glide, 1],
                      ease: ["linear", "linear", "easeInOut", "linear"],
                    }
                  : phase === "starting"
                    ? { duration: 0.5, repeat: Infinity }
                    : { duration: 0.3 }
            }
          >
            {/* the claw's soft shadow on the pile — tracks the travel */}
            <motion.ellipse
              cx={160}
              cy={328}
              rx={24}
              ry={5.5}
              fill="#17316B"
              initial={false}
              animate={
                grabbing
                  ? { opacity: [0.16, 0.16, 0.32, 0.32, 0.16] }
                  : controlling
                    ? { opacity: 0.16 }
                    : { opacity: 0.1 }
              }
              transition={
                grabbing
                  ? { duration: g, times: [0, MACHINE_BEAT.drop, MACHINE_BEAT.bounce, MACHINE_BEAT.lift, 1] }
                  : { duration: 0.25 }
              }
            />
            {/* motor trolley — rides the rail with the cable */}
            <rect x={149} y={108} width={22} height={17} rx={4} fill="#1F7AE8" stroke="#0A5BB8" strokeWidth={1.5} />
            <rect x={150.5} y={109.6} width={19} height={4.6} rx={2.3} fill="#FFFFFF" opacity={0.24} />
            <circle cx={154.5} cy={114} r={1.5} fill="#9DC7FF" />
            <circle cx={165.5} cy={114} r={1.5} fill="#9DC7FF" />
            <circle cx={160} cy={124.5} r={2.6} fill="none" stroke="#23252E" strokeWidth={2} />

            {/* pendulum sway — the cable + claw lean against stick motion
                while aiming (velocity-driven), then swing gently through the
                grab choreography */}
            <motion.g
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
              animate={
                grabbing
                  ? { rotate: [0, 0, 1.5, -3.5, 1.8, -0.8, 0] }
                  : { rotate: controlling ? sway : 0 }
              }
              transition={
                grabbing
                  ? {
                      duration: g,
                      times: [0, MACHINE_BEAT.snap, MACHINE_BEAT.lift, MACHINE_BEAT.glide, MACHINE_BEAT.settle, 0.97, 1],
                      ease: "easeInOut",
                    }
                  : { type: "spring", stiffness: 90, damping: 11 }
              }
            >
            {/* coiled cable — stretches as the claw descends */}
            <motion.g
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
              animate={
                grabbing
                  ? {
                      scaleY: [0.355, 0.355, cableDrop, cableDrop, 0.29, 0.29],
                    }
                  : revealed
                    ? { scaleY: 0.29 }
                    : { scaleY: 0.355 }
              }
              transition={
                grabbing
                  ? {
                      duration: g,
                      times: [0, MACHINE_BEAT.open, MACHINE_BEAT.drop, MACHINE_BEAT.snap, MACHINE_BEAT.lift, 1],
                      ease: ["linear", "easeIn", "linear", "easeOut", "linear"],
                    }
                  : { duration: 0.3 }
              }
            >
              {Array.from({ length: 10 }, (_, i) => (
                <g key={i}>
                  <ellipse cx={160} cy={130 + i * 14} rx={5.4} ry={4.7} fill="none" stroke={i % 2 === 0 ? "#2C3038" : "#1B1E24"} strokeWidth={2.7} />
                  <path d={`M${156.6} ${130 + i * 14} a3.4 3 0 0 1 6.8 0`} fill="none" stroke="#5F6B7E" strokeWidth={0.9} />
                </g>
              ))}
            </motion.g>

            {/* vertical travel: gravity drop → contact bounce → snap → lift */}
            <motion.g
              initial={false}
              animate={
                grabbing
                  ? {
                      y: [
                        0,
                        0,
                        dropY + 1.6, // lands — slight overshoot into the pile
                        dropY - 2.6, // rebound
                        dropY, // settle on the ticket
                        dropY,
                        -8,
                        -8,
                      ],
                    }
                  : revealed
                    ? { y: -8 }
                    : { y: 0 }
              }
              transition={
                grabbing
                  ? {
                      duration: g,
                      times: [
                        0,
                        MACHINE_BEAT.open,
                        MACHINE_BEAT.drop,
                        MACHINE_BEAT.bounce,
                        MACHINE_BEAT.snap,
                        MACHINE_BEAT.lift,
                        MACHINE_BEAT.glide,
                        1,
                      ],
                      ease: ["linear", "easeIn", "easeOut", "easeInOut", "linear", "easeOut", "linear"],
                    }
                  : { duration: 0.35 }
              }
            >
              {/* gentle idle bob (keeps floating while the player aims —
                  switches off for the precise grab run) */}
              <motion.g
                initial={false}
                animate={
                  grabbing ? { y: 0, transition: { duration: 0.2 } } : { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }
                }
              >
                {/* blue cylindrical motor housing with a metallic ring */}
                <rect x={146} y={160} width={28} height={23} rx={8} fill="url(#cmHousing)" stroke="#0D47A1" strokeWidth={1.6} />
                <rect x={148.6} y={162.6} width={22.8} height={6} rx={3} fill="#FFFFFF" opacity={0.34} />
                <circle cx={160} cy={172} r={2} fill="#0D47A1" opacity={0.5} />
                <circle cx={151.5} cy={169.5} r={1.15} fill="#BFE0FF" opacity={0.85} />
                <circle cx={168.5} cy={169.5} r={1.15} fill="#BFE0FF" opacity={0.85} />
                <rect x={147.6} y={178.6} width={24.8} height={4.6} rx={2.3} fill="url(#cmMetal)" stroke="#39414F" strokeWidth={0.9} />
                <rect x={149.2} y={179.4} width={21.6} height={1.3} rx={0.65} fill="#FFFFFF" opacity={0.55} />

                {/* left pincer — armed open while aiming, flares wide for the
                    dive, snaps shut on the ticket, loosens over the stage */}
                <motion.g
                  initial={false}
                  style={{ transformBox: "fill-box", originX: 0.65, originY: 0 }}
                  animate={
                    grabbing
                      ? { rotate: [-33, -33, -40, -40, -3, -3, -9, -9] }
                      : controlling
                        ? { rotate: -33 }
                        : revealed
                          ? { rotate: -9 }
                          : { rotate: -24 }
                  }
                  transition={
                    grabbing
                      ? {
                          duration: g,
                          times: [
                            0,
                            MACHINE_BEAT.open,
                            MACHINE_BEAT.drop,
                            MACHINE_BEAT.snap - 0.03,
                            MACHINE_BEAT.snap + 0.02,
                            MACHINE_BEAT.settle,
                            MACHINE_BEAT.settle + 0.04,
                            1,
                          ],
                          ease: ["linear", "easeOut", "linear", "easeOut", "linear", "easeOut", "linear"],
                        }
                      : { duration: 0.25 }
                  }
                >
                  <path d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214" fill="none" stroke="#39414F" strokeWidth={7.4} strokeLinecap="round" />
                  <path d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214" fill="none" stroke="url(#cmSilver)" strokeWidth={5} strokeLinecap="round" />
                  <path d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214" fill="none" stroke="#F4F8FC" strokeWidth={1.8} strokeLinecap="round" />
                  <circle cx={155.5} cy={217.5} r={3.4} fill="#1A1D23" />
                  <circle cx={154.6} cy={216.6} r={1} fill="#8D99AB" opacity={0.85} />
                </motion.g>

                {/* right pincer */}
                <motion.g
                  initial={false}
                  style={{ transformBox: "fill-box", originX: 0.35, originY: 0 }}
                  animate={
                    grabbing
                      ? { rotate: [33, 33, 40, 40, 3, 3, 9, 9] }
                      : controlling
                        ? { rotate: 33 }
                        : revealed
                          ? { rotate: 9 }
                          : { rotate: 24 }
                  }
                  transition={
                    grabbing
                      ? {
                          duration: g,
                          times: [
                            0,
                            MACHINE_BEAT.open,
                            MACHINE_BEAT.drop,
                            MACHINE_BEAT.snap - 0.03,
                            MACHINE_BEAT.snap + 0.02,
                            MACHINE_BEAT.settle,
                            MACHINE_BEAT.settle + 0.04,
                            1,
                          ],
                          ease: ["linear", "easeOut", "linear", "easeOut", "linear", "easeOut", "linear"],
                        }
                      : { duration: 0.25 }
                  }
                >
                  <path d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214" fill="none" stroke="#39414F" strokeWidth={7.4} strokeLinecap="round" />
                  <path d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214" fill="none" stroke="url(#cmSilverR)" strokeWidth={5} strokeLinecap="round" />
                  <path d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214" fill="none" stroke="#F4F8FC" strokeWidth={1.8} strokeLinecap="round" />
                  <circle cx={164.5} cy={217.5} r={3.4} fill="#1A1D23" />
                  <circle cx={163.6} cy={216.6} r={1} fill="#8D99AB" opacity={0.85} />
                </motion.g>

                {/* center prong — the fixed third finger (hides behind the held ticket) */}
                <path d="M160 183 C159 190 158.8 198 160 205" fill="none" stroke="#39414F" strokeWidth={7.4} strokeLinecap="round" />
                <path d="M160 183 C159 190 158.8 198 160 205" fill="none" stroke="url(#cmSilver)" strokeWidth={5} strokeLinecap="round" />
                <path d="M160 183 C159 190 158.8 198 160 205" fill="none" stroke="#F4F8FC" strokeWidth={1.8} strokeLinecap="round" />
                <circle cx={160} cy={208} r={3} fill="#1A1D23" />
                <circle cx={159.2} cy={207.2} r={0.9} fill="#8D99AB" opacity={0.85} />

                {/* grab motion lines — flash as the pincers snap shut */}
                <motion.g
                  initial={false}
                  stroke="#6B7A94"
                  strokeWidth={2}
                  strokeLinecap="round"
                  animate={
                    grabbing
                      ? {
                          opacity: [0, 0, 1, 0, 0],
                          transition: {
                            duration: g,
                            times: [0, MACHINE_BEAT.snap - 0.05, MACHINE_BEAT.snap, MACHINE_BEAT.lift, 1],
                            ease: "linear",
                          },
                        }
                      : { opacity: 0, transition: { duration: 0.2 } }
                  }
                >
                  <path d="M137 171 L141 167" />
                  <path d="M134.5 177 L138.5 173" />
                  <path d="M137 183 L141 179" />
                  <path d="M183 167 L187 171" />
                  <path d="M181.5 173 L185.5 177" />
                  <path d="M183 179 L187 183" />
                </motion.g>

                {/* the claw-held prize ticket — swaps in exactly as the pincers
                    close, rides up with the claw, swings, then bursts into
                    the golden ticket at the reveal */}
                <motion.g
                  initial={false}
                  animate={
                    grabbing
                      ? {
                          opacity: [0, 0, 1, 1],
                          transition: {
                            duration: g,
                            times: [0, MACHINE_BEAT.snap - 0.02, MACHINE_BEAT.snap + 0.03, 1],
                            ease: "linear",
                          },
                        }
                      : revealed
                        ? { opacity: 1, transition: { duration: 0.2 } }
                        : { opacity: 0, transition: { duration: 0.2 } }
                  }
                >
                  <motion.g
                    initial={false}
                    style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
                    animate={
                      revealed
                        ? {
                            rotate: [0, 1.6, 0, -1.6, 0],
                            transition: { rotate: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } },
                          }
                        : grabbing
                          ? {
                              rotate: [0, 0, 3, -2.5, 1.5, -0.5, 0],
                              transition: {
                                duration: g,
                                times: [
                                  0,
                                  MACHINE_BEAT.snap,
                                  MACHINE_BEAT.lift,
                                  MACHINE_BEAT.glide,
                                  MACHINE_BEAT.settle,
                                  0.97,
                                  1,
                                ],
                                ease: "easeInOut",
                              },
                            }
                          : { rotate: 0, transition: { duration: 0.3 } }
                    }
                  >
                    {/* the face-down pool ticket (held) — fades out at the reveal */}
                    {grabbing || revealed ? (
                      <motion.g initial={false} animate={{ opacity: revealed ? 0 : 1 }} transition={{ duration: 0.3 }}>
                        <g transform="translate(128 212)" style={{ filter: "drop-shadow(0 4px 5px rgba(23,43,77,0.3))" }}>
                          <PileCardArt w={64} h={23} fill={grabPlan?.color ?? "#9B59B6"} code={prize?.code} />
                        </g>
                      </motion.g>
                    ) : null}

                    {/* golden presentation ticket — pops in at the reveal */}
                    {prize ? (
                      <>
                        {/* the burst — a golden shockwave that sells the ticket→gold transform */}
                        <motion.g
                          initial={false}
                          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
                          animate={
                            revealed
                              ? { scale: [0.25, 1.2], opacity: [0.95, 0], transition: { duration: 0.55, ease: "easeOut" } }
                              : { scale: 0.25, opacity: 0, transition: { duration: 0.2 } }
                          }
                          pointerEvents="none"
                        >
                          <circle cx={160} cy={235} r={48} fill="none" stroke="#FFD84D" strokeWidth={3.5} />
                        </motion.g>
                        <motion.g
                          initial={false}
                          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
                          animate={
                            revealed
                              ? {
                                  opacity: [0, 1, 1],
                                  scale: [0.55, 1.18, 1],
                                  transition: { duration: 0.55, ease: "easeOut", times: [0, 0.7, 1] },
                                }
                              : { opacity: 0, scale: 0.55, transition: { duration: 0.2 } }
                          }
                        >
                          <g transform="translate(104 214)" style={{ filter: "drop-shadow(0 4px 5px rgba(23,43,77,0.3))" }}>
                            <GoldTicket code={prize.code} eyebrow={ticketLabel} reveal={revealed} />
                          </g>
                        </motion.g>
                      </>
                    ) : null}
                  </motion.g>

                  {/* blue vibration lines flanking the held ticket — the shake marks.
                      A CSS timeline (md-vib in globals.css, duration synced to the
                      grab sequence) — framer-motion keyframes proved unreliable for
                      this element (mount with running=true jumps straight to the
                      final keyframe and the timeline never plays). */}
                  <g
                    className={cn("md-vib", grabbing && "is-running")}
                    style={{ "--md-vib-dur": `${g}s` } as React.CSSProperties}
                    fill="none"
                    stroke="#29B6F6"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    pointerEvents="none"
                  >
                    <path d="M118 224 C112.8 229.5 112.8 238.5 118 244" />
                    <path d="M112.4 226 C107.2 230.6 107.2 237.4 112.4 242" />
                    <path d="M106.8 228.4 C102.4 231.8 102.4 235.2 106.8 238.6" />
                    <path d="M202 224 C207.2 229.5 207.2 238.5 202 244" />
                    <path d="M207.6 226 C212.8 230.6 212.8 237.4 207.6 242" />
                    <path d="M213.2 228.4 C217.6 231.8 217.6 235.2 213.2 238.6" />
                  </g>
                </motion.g>
              </motion.g>
            </motion.g>
            {/* end pendulum sway */}
            </motion.g>
          </motion.g>

          {/* reveal sparkles at the presented ticket's corners */}
          {[
            { x: 106, y: 204 },
            { x: 214, y: 248 },
          ].map((s, i) => (
            <motion.g
              key={`sp-${i}`}
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
              animate={
                revealed
                  ? { scale: [0, 1.35, 1], opacity: [0, 1, 1], rotate: 25, transition: { duration: 0.5, ease: "easeOut" } }
                  : { scale: 0, opacity: 0, rotate: 0, transition: { duration: 0.2 } }
              }
            >
              <Spark x={s.x} y={s.y} s={1.35} fill={i === 0 ? "#FFD84D" : "#FF9F0A"} />
            </motion.g>
          ))}

          {/* glass glare — ON the pane, layered over the contents */}
          <path d="M78 96 L112 96 L62 336 L36 336 L36 300 Z" fill="#FFFFFF" opacity={0.24} pointerEvents="none" />
          <path d="M126 96 L140 96 L90 336 L76 336 Z" fill="#FFFFFF" opacity={0.15} pointerEvents="none" />
        </g>
        {/* glass inner bevel */}
        <rect x={33} y={99} width={254} height={234} rx={13} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.8} pointerEvents="none" />

        {/* ================= control panel ================= */}
        {/* ambient occlusion where the panel meets the body */}
        <rect x={22} y={341} width={276} height={10} rx={5} fill="url(#cmSeam)" opacity={0.6} />
        <rect x={22} y={348} width={276} height={72} rx={18} fill="url(#cmPanel)" stroke="#0A5BB8" strokeWidth={2.5} />
        <rect x={34} y={356} width={252} height={56} rx={13} fill="url(#cmInset)" stroke="#0F5FC0" strokeWidth={1.8} />
        <rect x={40} y={359} width={240} height={5} rx={2.5} fill="#FFFFFF" opacity={0.22} />
        {/* light-blue ball rivets at the panel corners */}
        {[
          { x: 41, y: 362 },
          { x: 279, y: 362 },
          { x: 41, y: 406 },
          { x: 279, y: 406 },
        ].map((r, i) => (
          <g key={i}>
            <circle cx={r.x} cy={r.y} r={3.4} fill="url(#cmRivet)" stroke="#1E7AD4" strokeWidth={1} />
            <circle cx={r.x - 1.1} cy={r.y - 1.1} r={1} fill="#FFFFFF" opacity={0.85} />
          </g>
        ))}

        {/* ================= joystick — THE control ================= */}
        <ellipse cx={88} cy={408} rx={17} ry={5} fill="#000000" opacity={0.18} />
        {/* ready halo around the knob while the player can aim */}
        <motion.circle
          cx={88}
          cy={363.5}
          r={15.5}
          fill="none"
          stroke="#FF5A5A"
          strokeWidth={2}
          initial={false}
          animate={stickActive ? { opacity: [0.35, 0.85, 0.35], scale: [1, 1.12, 1] } : { opacity: 0, scale: 1 }}
          transition={{ duration: 1.4, repeat: stickActive ? Infinity : 0, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5, pointerEvents: "none" }}
        />
        <circle cx={88} cy={399} r={15} fill="#23252B" stroke="#AEB8C4" strokeWidth={3.2} />
        <circle cx={88} cy={399} r={12.6} fill="none" stroke="#FFFFFF" strokeOpacity={0.26} strokeWidth={1.4} />
        {/* gimbal guide — the ring the knob sweeps inside */}
        <ellipse
          cx={88}
          cy={382}
          rx={17}
          ry={12.5}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={stickActive ? 0.22 : 0.1}
          strokeWidth={1.2}
          strokeDasharray="2.5 3"
          pointerEvents="none"
        />
        {/* the stick — pivots at the collar and deflects with the drag,
            springs home on release (the claw keeps its position) */}
        <motion.g
          initial={false}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ rotate: knob.x * 14 }}
          transition={{ type: "spring", stiffness: 380, damping: 17 }}
        >
          <rect x={85} y={368} width={6} height={24} rx={3} fill="#2A2D35" stroke="#101216" strokeWidth={1} />
          <rect x={86} y={369.5} width={1.7} height={20} rx={0.85} fill="#8D99AB" opacity={0.75} />
          <rect x={83} y={388} width={10} height={5} rx={2.5} fill="#3A3F49" />
          {/* the ball rides the stick top — extra travel sells the gimbal */}
          <motion.g
            initial={false}
            animate={{ x: knob.x * KNOB_X, y: Math.max(0, knob.y) * KNOB_Y + Math.abs(knob.x) * 1.2 }}
            transition={{ type: "spring", stiffness: 380, damping: 17 }}
          >
            <circle cx={88} cy={363.5} r={11} fill="url(#cmBall)" />
            <ellipse cx={84.6} cy={359.8} rx={3.2} ry={2.4} fill="#FFFFFF" opacity={0.8} />
            <ellipse cx={90.8} cy={367.4} rx={2.6} ry={1.7} fill="#7E1010" opacity={0.5} />
          </motion.g>
        </motion.g>
        {/* keyboard focus ring */}
        {stickFocus ? (
          <circle cx={88} cy={382} r={26} fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeDasharray="4 3" opacity={0.9} pointerEvents="none" />
        ) : null}
        {/* the invisible grab surface — pointer + keyboard control */}
        <circle
          ref={stickRef}
          cx={88}
          cy={382}
          r={26}
          fill="transparent"
          style={{
            touchAction: "none",
            cursor: stickActive ? "grab" : "default",
            outline: "none",
          }}
          tabIndex={stickActive ? 0 : -1}
          role="slider"
          aria-label="Claw aim — drag the knob left or right, then press the DROP button"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ariaPct}
          aria-valuetext={ariaPct < 33 ? "Claw over the left side" : ariaPct > 66 ? "Claw over the right side" : "Claw over the middle"}
          onPointerDown={onStickDown}
          onPointerMove={onStickMove}
          onPointerUp={endStickDrag}
          onPointerCancel={endStickDrag}
          onKeyDown={onStickKey}
          onFocus={() => setStickFocus(true)}
          onBlur={() => setStickFocus(false)}
        />

        {/* soft glow behind the button while it's tappable — green when the
            claw is armed (DROP), violet while it invites a play */}
        <motion.ellipse
          cx={193}
          cy={386}
          rx={84}
          ry={26}
          fill={canDrop ? "#4ADE80" : "#CE93D8"}
          initial={false}
          animate={{ opacity: canPress ? [0.14, 0.34, 0.14] : 0 }}
          transition={{ duration: canDrop ? 1 : 1.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ pointerEvents: "none" }}
        />

        {/* PLAY & WIN → DROP → ··· → PLAY AGAIN */}
        <motion.g
          ref={playBtnRef}
          initial={false}
          whileTap={canPress ? { scale: 0.97 } : undefined}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5, cursor: canPress ? "pointer" : "default" }}
          onClick={(e) => {
            e.stopPropagation();
            buttonAction();
          }}
          onKeyDown={onButtonKey}
          role="button"
          tabIndex={canPress ? 0 : -1}
          aria-disabled={!canPress}
          aria-label={btnAria}
        >
          {/* button shadow + stadium */}
          <rect x={124} y={377} width={138} height={28} rx={14} fill={canDrop ? "#14532D" : "#6A1B9A"} opacity={soldOut || emptyPool ? 0.35 : 0.5} />
          <motion.rect
            x={124}
            y={372}
            width={138}
            height={28}
            rx={14}
            fill={soldOut || emptyPool ? "#8B8FA3" : canDrop ? "url(#cmButtonGreen)" : "url(#cmButton)"}
            stroke={soldOut || emptyPool ? "#B9BFCC" : canDrop ? "#BBF7D0" : "#E1BEE7"}
            strokeWidth={1.6}
            initial={false}
            animate={{ opacity: grabbing ? 0.75 : 1 }}
            transition={{ duration: 0.25 }}
          />
          <rect x={129} y={374.5} width={128} height={11} rx={5.5} fill="#FFFFFF" opacity={0.16} />
          {/* dome shading — specular top, pressed-in bottom */}
          <ellipse cx={177} cy={379.2} rx={52} ry={4.4} fill="#FFFFFF" opacity={0.34} />
          <rect x={129} y={391.8} width={128} height={5.4} rx={2.7} fill={canDrop ? "#14532D" : "#6A1B9A"} opacity={0.45} />

          <AnimatePresence mode="wait" initial={false}>
            {phase === "starting" || grabbing ? (
              <motion.g
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {[185, 193, 201].map((cx, i) => (
                  <circle key={cx} className="md-dot" style={{ animationDelay: `${i * 0.12}s` }} cx={cx} cy={387} r={2.7} fill="#FFFFFF" />
                ))}
              </motion.g>
            ) : (
              <motion.g
                key={`label-${btnLabel}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <text
                  x={193}
                  y={391}
                  textAnchor="middle"
                  fontSize={btnTextSize}
                  fontWeight={800}
                  letterSpacing={0.8}
                  fill={soldOut || emptyPool ? "#FFFFFF" : canDrop ? "#FFFFFF" : "#FFFFFF"}
                  style={canDrop ? { filter: "drop-shadow(0 0 3px rgba(255,255,255,0.9))" } : undefined}
                  fontFamily={ARCADE}
                >
                  {btnLabel}
                </text>
                {/* DROP: a bold down-arrow on each side of the label */}
                {canDrop ? (
                  <g stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M139 382.5 L139 389" />
                    <path d="M135.5 386 L139 389.5 L142.5 386" />
                    <path d="M247 382.5 L247 389" />
                    <path d="M243.5 386 L247 389.5 L250.5 386" />
                  </g>
                ) : soldOut || emptyPool ? null : (
                  /* three radiating action lines flanking the label */
                  <g stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none">
                    <path d="M132 380.5 L138.5 384" />
                    <path d="M130 387 L137.5 387" />
                    <path d="M132 393.5 L138.5 390" />
                    <path d="M254 380.5 L247.5 384" />
                    <path d="M256 387 L248.5 387" />
                    <path d="M254 393.5 L247.5 390" />
                  </g>
                )}
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </motion.g>
    </svg>
  );

  return (
    <div
      className={cn("relative flex w-full flex-col items-center")}
      style={{ filter: "drop-shadow(0 16px 34px rgba(23,43,77,0.25))" }}
    >
      <div className="relative w-full max-w-[340px]">
        {machine}

        {/* sound toggle — a small chip set into the cabinet's top-right corner */}
        {sfx ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sfx.toggle();
            }}
            aria-label={sfx.muted ? "Unmute machine sounds" : "Mute machine sounds"}
            className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#083B75]/45 text-white/85 shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)] backdrop-blur-[2px] transition-all hover:bg-[#083B75]/65 hover:text-white active:scale-90"
          >
            {sfx.muted ? <VolumeX size={12} aria-hidden /> : <Volume2 size={12} aria-hidden />}
          </button>
        ) : null}

        {/* reveal burst — spans the whole machine */}
        {revealed && celebrateFx ? <ConfettiFX key={`fx-${playToken}`} /> : null}
      </div>

      {/* ============ aim hint — your turn at the controls ============ */}
      <AnimatePresence>
        {controlling ? (
          <motion.div
            key="aim-hint"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              opacity: { duration: 0.25 },
              y: { duration: 0.25 },
              scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
            }}
            className="mt-3 flex w-full max-w-[340px] items-center justify-center gap-2 rounded-full border border-[#F59E0B]/35 bg-gradient-to-b from-[#FFF7E0] to-[#FFEDBF] px-4 py-2.5 shadow-[0_10px_24px_-14px_rgba(180,83,9,0.55)]"
          >
            <Hand size={14} className="shrink-0 text-[#B45309]" aria-hidden />
            <span className="min-w-0 text-center text-[12.5px] font-extrabold tracking-[0.01em] text-[#92400E]">
              Drag the red knob to aim — press DROP when the claw is over a coupon
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ============ the reveal card (HTML — readable + tappable) ============ */}
      <AnimatePresence>
        {revealed && prize ? (
          <motion.div
            key={`reveal-${playToken}`}
            role="status"
            ref={revealRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="mt-4 w-full max-w-[340px] overflow-hidden rounded-[20px] border border-[#1D1D1F]/[0.06] bg-white shadow-[0_18px_40px_-18px_rgba(23,43,77,0.35)]"
          >
            <div className="px-4 pb-3.5 pt-3">
              <p className="flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]">
                <Sparkles size={11} aria-hidden className="text-[#F59E0B]" />
                Coupon revealed
                <Sparkles size={11} aria-hidden className="text-[#F59E0B]" />
              </p>
              <p className="mt-1 text-center text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                {prize.title?.trim() || "A little something for you"}
              </p>
              <div className="relative mt-3 flex items-center gap-2 rounded-[14px] border border-dashed border-[#F59E0B]/45 bg-gradient-to-b from-[#FFFBEB] to-[#FFF6DC] px-3.5 py-2.5">
                <span aria-hidden className="absolute -left-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.28)]" />
                <span aria-hidden className="absolute -right-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.28)]" />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[16px] font-bold tracking-[0.14em] text-[#1D1D1F]"
                  aria-label={`Coupon code ${prize.code}`}
                >
                  {prize.code}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void doCopy();
                  }}
                  aria-label={copied ? "Code copied" : `Copy code ${prize.code}`}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-extrabold tracking-wide text-white transition-all active:scale-95",
                    copied
                      ? "md-pop bg-gradient-to-br from-[#4ADE80] to-[#16A34A] shadow-[0_8px_20px_-8px_rgba(22,163,74,0.7)]"
                      : "bg-gradient-to-br from-[#A96BFF] to-[#8B3FE8] shadow-[0_8px_20px_-8px_rgba(139,92,246,0.75)]"
                  )}
                >
                  {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                  {copied ? "COPIED" : "COPY CODE"}
                </button>
              </div>
              {prize.description?.trim() ? (
                <p className="mt-2 px-1 text-center text-[12px] font-medium leading-relaxed text-[#AAAAAA]">
                  {prize.description.trim()}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ============ graceful failure states ============ */}
      <AnimatePresence>
        {error && !busy ? (
          <motion.div
            key="err"
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex w-full max-w-[340px] items-center gap-2 rounded-full border border-[#FF375F]/20 bg-[#FF375F]/[0.07] px-3.5 py-2 text-[12px] font-semibold text-[#C0253C]"
          >
            <AlertTriangle size={13} className="shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{error}</span>
            {soldOut || error.includes("no longer available") || error.includes("just updated") ? null : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (canPlay && onPlay) onPlay();
                }}
                className="shrink-0 rounded-full bg-[#C0253C]/10 px-2.5 py-1 text-[11px] font-bold text-[#C0253C] transition-colors hover:bg-[#C0253C]/20"
              >
                Retry
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
