"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Copy, Sparkles, Volume2, VolumeX } from "lucide-react";
import { ConfettiFX } from "./confetti";
import { useMD } from "./md-context";
import type { MachineSfxName } from "./coupon-sfx";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* CouponMachine — the blue arcade claw machine with a REAL prize      */
/* flow: every coupon in the creator's pool is a distinct card in the  */
/* pile. PLAY → the machine wakes (starting) → the claw sweeps left /  */
/* right hunting (searching) → locks onto the player's assigned card   */
/* (chosen by the SERVER — first play assigns randomly + persists,     */
/* replays always return the same one) → descends, pincers snap shut  */
/* (grab) → lifts the card out with a pendulum sway (lift) → glides    */
/* to center (center) → the card bursts into the golden ticket and     */
/* the code reveals (reveal). PLAY AGAIN reruns the whole choreography */
/* and always grabs the SAME card — the visual and the data agree.     */
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

/** Code font-size that keeps any code (up to 24 chars) inside the ticket. */
function codeFontSize(len: number): number {
  if (len <= 6) return 14;
  if (len <= 9) return 12;
  if (len <= 13) return 10;
  if (len <= 18) return 8.5;
  return 7;
}

/** Pile-card code font (smaller surface than the golden ticket). */
function cardCodeFontSize(len: number): number {
  if (len <= 5) return 8;
  if (len <= 8) return 7;
  return 6.2;
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

/* ------------------------------------------------------------------ */
/* Public machine types                                                */
/* ------------------------------------------------------------------ */

/** A coupon as the machine displays it (a card in the pile). */
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

export type MachinePhase = "idle" | "starting" | "running" | "revealed";

/** Total choreography duration: search → grab → lift → center → present. */
export const MACHINE_SEQ_MS = 4600;

/* ------------------------------------------------------------------ */
/* Pile layout — deterministic card slots (stable across plays)        */
/* ------------------------------------------------------------------ */

interface PileSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

/** Ten natural card positions across three depth rows inside the window
 *  (window x 30–290, floor ≈ 336 — front-row bottoms tuck behind the lip). */
const SLOTS: PileSlot[] = [
  { x: 38, y: 278, w: 54, h: 19, rot: -8 },
  { x: 133, y: 276, w: 56, h: 19, rot: 4 },
  { x: 230, y: 278, w: 52, h: 19, rot: -6 },
  { x: 30, y: 298, w: 58, h: 21, rot: 7 },
  { x: 99, y: 294, w: 60, h: 22, rot: -4 },
  { x: 168, y: 296, w: 58, h: 21, rot: 9 },
  { x: 236, y: 299, w: 56, h: 21, rot: -10 },
  { x: 46, y: 316, w: 50, h: 19, rot: -3 },
  { x: 128, y: 318, w: 52, h: 19, rot: 6 },
  { x: 208, y: 317, w: 50, h: 19, rot: -7 },
];

const FILLER_COLORS = ["#9B59B6", "#E84393", "#F59E0B", "#2ECC71", "#3498DB", "#FF7A3D"];

function hashStr(s: string): number {
  return [...s].reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) % 100003, 11);
}

interface PileCard {
  key: string;
  couponId?: string;
  code?: string;
  fill: string;
}

interface PileEntry {
  card: PileCard;
  slot: PileSlot;
}

/**
 * Deals the pool's coupons into the slot grid — each coupon gets a stable
 * slot derived from its id (same card, same place, every play and refresh);
 * remaining slots get generic "COUPON" filler cards (set dressing, never
 * grabbable). Sorted back-to-front for natural depth stacking.
 */
function layoutPile(coupons: MachineCoupon[]): PileEntry[] {
  const used = new Set<number>();
  const entries: PileEntry[] = [];
  coupons.forEach((c, i) => {
    let idx = (hashStr(c.id) + i * 3) % SLOTS.length;
    let guard = 0;
    while (used.has(idx) && guard++ < SLOTS.length) idx = (idx + 1) % SLOTS.length;
    used.add(idx);
    entries.push({
      card: { key: `c-${c.id}`, couponId: c.id, code: c.code, fill: c.color || FILLER_COLORS[i % FILLER_COLORS.length] },
      slot: SLOTS[idx],
    });
  });
  SLOTS.forEach((slot, idx) => {
    if (used.has(idx)) return;
    entries.push({ card: { key: `f-${idx}`, fill: FILLER_COLORS[idx % FILLER_COLORS.length] }, slot });
  });
  return entries.sort((a, b) => a.slot.y - b.slot.y);
}

/** One pile card — scalloped mini ticket with its code (or "COUPON"). */
function PileCardArt({ w, h, fill, code }: { w: number; h: number; fill: string; code?: string }) {
  const label = code ? (code.length > 9 ? `${code.slice(0, 8)}…` : code) : "COUPON";
  return (
    <g>
      <rect width={w} height={h} rx={4} fill={fill} stroke="rgba(0,0,0,0.16)" strokeWidth={1} />
      <circle cx={0} cy={h / 2} r={3.4} fill="#EAF3FD" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      <circle cx={w} cy={h / 2} r={3.4} fill="#EAF3FD" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      <text
        x={w / 2}
        y={h / 2 + 2.6}
        textAnchor="middle"
        fontSize={code ? cardCodeFontSize(label.length) : 6}
        fontWeight={800}
        letterSpacing={code ? 0.4 : 1.4}
        fill="#FFFFFF"
        fontFamily={code ? MONO : ARCADE}
      >
        {label}
      </text>
    </g>
  );
}

/** Claw travel: from rest (pincer tips ≈ y 217.5) down to a card's row. */
function clawDropFor(slot: PileSlot): number {
  return Math.max(58, Math.min(106, slot.y + 6 - 217.5));
}

/** Cable stretch that matches a claw drop distance (existing calibration). */
function cableScaleFor(dropY: number): number {
  return 0.355 + dropY / 124;
}

/* ------------------------------------------------------------------ */
/* The golden ticket art — the winning card's presentation at the      */
/* reveal (112 × 42 in local coords).                                  */
/* ------------------------------------------------------------------ */
function GoldTicket({ code, eyebrow, reveal }: { code: string; eyebrow: string; reveal: boolean }) {
  const size = codeFontSize(code.length);
  return (
    <g>
      <path d={TICKET_PATH} fill="url(#cmGold)" stroke="#B45309" strokeWidth={2} strokeLinejoin="round" />
      <rect
        x={13}
        y={5.5}
        width={86}
        height={31}
        rx={5}
        fill="none"
        stroke="#B45309"
        strokeOpacity={0.38}
        strokeWidth={1.1}
        strokeDasharray="3 2.6"
      />
      <text x={56} y={15} textAnchor="middle" fontSize={5.8} fontWeight={800} letterSpacing={0.8} fill="#8A5A16" fontFamily={ARCADE}>
        {eyebrow}
      </text>
      <Spark x={17} y={27.5} s={0.85} fill="#E2543E" />
      <Spark x={95} y={27.5} s={0.85} fill="#E2543E" />
      {/* the real code — blurred while sealed, crisp at the reveal */}
      <motion.text
        x={56}
        y={32.5}
        textAnchor="middle"
        fontSize={size}
        fontWeight={800}
        letterSpacing={0.5}
        fill="#1E3A8A"
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
/* IDLE → STARTING (machine wakes while `draw()` talks to the server)  */
/*      → RUNNING (full claw choreography, MACHINE_SEQ_MS)             */
/*      → REVEALED (golden ticket + code + copy). PLAY AGAIN repeats   */
/* the whole thing. `draw()` returns the player's assigned coupon —    */
/* the server assigns once and persists; it never re-rolls.            */
/* ------------------------------------------------------------------ */

function messageForReason(reason?: string): string {
  switch (reason) {
    case "no-eligible-coupons":
      return "All coupons have been claimed — check back later!";
    case "moment-not-found":
    case "machine-missing":
      return "This machine isn’t set up yet — ask the creator to add coupons.";
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
  const timers = useRef<number[]>([]);

  // Reduced motion: keep every beat functional but shorten the waits
  // (framer's MotionConfig reducedMotion="user" already collapses the
  // transforms — the claw simply arrives, the coupon still reveals).
  const [seq] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return Math.min(seqMs, 1100);
    }
    return seqMs;
  });

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const busy = phase === "starting" || phase === "running";

  const play = () => {
    if (busy) return; // one choreography at a time
    clearTimers();
    setError(null);
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
          setPhase("running");
          sfx?.play("whirr");
          timers.current.push(window.setTimeout(() => sfx?.play("grab"), seq * 0.735));
          timers.current.push(window.setTimeout(() => setPhase("revealed"), seq));
          timers.current.push(window.setTimeout(() => sfx?.play("win"), seq + 0.05 * seq));
        },
        (err) => {
          console.warn("[coupon-machine] draw failed:", err);
          setError(messageForReason());
          setPhase("idle");
        }
      );
    });
  };

  useEffect(() => clearTimers, []);

  return { phase, prize, playToken, hasAssignment, setHasAssignment, error, soldOut, play, busy };
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
  prize = null,
  phase = "idle",
  playToken = 0,
  hasAssignment = false,
  error = null,
  soldOut = false,
  /** Omit for a static, non-interactive rendering. */
  onPlay,
  celebrateFx = true,
  sfx,
}: {
  title?: string;
  subtitle?: string;
  ticketLabel?: string;
  buttonLabel?: string;
  /** The pool as displayed in the machine (one card per coupon). */
  coupons?: MachineCoupon[];
  /** The player's assigned coupon — the card the claw grabs. */
  prize?: MachinePrize | null;
  phase?: MachinePhase;
  playToken?: number;
  hasAssignment?: boolean;
  error?: string | null;
  soldOut?: boolean;
  onPlay?: () => void;
  celebrateFx?: boolean;
  sfx?: { play: (name: MachineSfxName) => void; muted: boolean; toggle: () => void };
}) {
  const { notify } = useMD();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const revealed = phase === "revealed";
  const running = phase === "running" || revealed;
  const busy = phase === "starting" || phase === "running";
  const emptyPool = coupons.length === 0;

  /* The pile: pool cards + (if the creator removed it since) a restored
   * card for the player's assigned coupon — the claw must always find it. */
  const pile = useMemo(() => {
    const cards = [...coupons];
    if (prize && !cards.some((c) => c.id === prize.couponId)) {
      cards.push({ id: prize.couponId, code: prize.code, title: prize.title, color: prize.color });
    }
    return layoutPile(cards);
  }, [coupons, prize]);

  /* The grab target — the assigned coupon's slot (fallback: middle card). */
  const target = useMemo(() => {
    if (!prize) return null;
    return (
      pile.find((e) => e.card.couponId === prize.couponId) ??
      pile[Math.floor(pile.length / 2)] ??
      null
    );
  }, [pile, prize]);

  const tx = target ? target.slot.x + target.slot.w / 2 : 160;
  const dropY = target ? clawDropFor(target.slot) : 86;
  const cableDrop = cableScaleFor(dropY);
  const seq = MACHINE_SEQ_MS / 1000;

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

  /* Panel button */
  const canPlay = Boolean(onPlay) && !busy && !soldOut && !emptyPool;
  const btnLabel = soldOut
    ? "SOLD OUT"
    : emptyPool
      ? "NO PRIZES"
      : revealed || (hasAssignment && phase === "idle")
        ? "PLAY AGAIN"
        : buttonLabel;
  const buttonAction = () => {
    if (canPlay && onPlay) onPlay();
  };
  const btnAria = soldOut
    ? "All coupons have been claimed"
    : emptyPool
      ? "No coupons in this machine yet"
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

  const machine = (
    <svg
      viewBox="0 0 320 440"
      role="figure"
      aria-label={`${title} ${subtitle} — claw machine coupon reveal${
        revealed && shown ? ` — you won ${shown}` : ""
      }`}
      className="block h-auto w-full select-none"
      style={{ fontFamily: ARCADE }}
    >
      <defs>
        <linearGradient id="cmBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#45A7FF" />
          <stop offset="55%" stopColor="#218CF4" />
          <stop offset="100%" stopColor="#1277DE" />
        </linearGradient>
        <linearGradient id="cmMarquee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id="cmGoldText" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3C0" />
          <stop offset="55%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#FFC53D" />
        </linearGradient>
        <linearGradient id="cmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFEDB0" />
          <stop offset="45%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#F5B93B" />
        </linearGradient>
        <linearGradient id="cmGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7FBFF" />
          <stop offset="100%" stopColor="#E4F0FC" />
        </linearGradient>
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
          <stop offset="0%" stopColor="#A96BFF" />
          <stop offset="100%" stopColor="#8B3FE8" />
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
        <rect x={10} y={10} width={300} height={420} rx={26} fill="url(#cmBody)" stroke="#0A5BB8" strokeWidth={3} />
        <rect x={20} y={15} width={280} height={9} rx={4.5} fill="#FFFFFF" opacity={0.14} />

        {/* ================= marquee ================= */}
        <rect x={56} y={24} width={208} height={62} rx={16} fill="url(#cmMarquee)" stroke="#4C1D95" strokeWidth={2.5} />
        <rect x={60} y={27.5} width={200} height={7} rx={3.5} fill="#FFFFFF" opacity={0.14} />
        <text x={162} y={54.5} textAnchor="middle" fontSize={21} fontWeight={900} letterSpacing={1} fill="#8A4A0E" fontFamily={ARCADE}>
          {title}
        </text>
        <text x={160} y={52} textAnchor="middle" fontSize={21} fontWeight={900} letterSpacing={1} fill="url(#cmGoldText)" stroke="#B45309" strokeWidth={0.7} fontFamily={ARCADE}>
          {title}
        </text>
        <text x={161.5} y={76.5} textAnchor="middle" fontSize={13.5} fontWeight={800} letterSpacing={3} fill="#3B0A70" fontFamily={ARCADE}>
          {subtitle}
        </text>
        <text x={160} y={75} textAnchor="middle" fontSize={13.5} fontWeight={800} letterSpacing={3} fill="#FFFFFF" fontFamily={ARCADE}>
          {subtitle}
        </text>
        <Spark x={100} y={70.5} fill="#FFD84D" />
        <Spark x={220} y={70.5} fill="#FFD84D" />

        {/* four marquee bulbs — twinkle gently at idle, strobe while starting */}
        {[
          { x: 40, y: 34 },
          { x: 40, y: 60 },
          { x: 280, y: 34 },
          { x: 280, y: 60 },
        ].map((b, i) => (
          <g key={i}>
            <circle
              className="md-bulb"
              style={{
                animationDelay: `${i * 0.38}s`,
                ...(phase === "starting" ? { animationDuration: "0.38s" } : {}),
              }}
              cx={b.x}
              cy={b.y}
              r={7.5}
              fill="#FFE9A8"
              opacity={0.55}
            />
            <circle cx={b.x} cy={b.y} r={4.2} fill="#FFD84D" stroke="#E0A93E" strokeWidth={1} />
            <circle cx={b.x - 1.3} cy={b.y - 1.3} r={1.3} fill="#FFFFFF" opacity={0.85} />
          </g>
        ))}

        {/* ================= glass window ================= */}
        <rect x={30} y={96} width={260} height={240} rx={16} fill="url(#cmGlass)" stroke="#0A5BB8" strokeWidth={3} />
        <g clipPath="url(#cmWinClip)">
          {/* diagonal glass glare */}
          <path d="M78 96 L112 96 L62 336 L36 336 L36 300 Z" fill="#FFFFFF" opacity={0.22} />
          <path d="M126 96 L140 96 L90 336 L76 336 Z" fill="#FFFFFF" opacity={0.13} />
          {/* soft floor shading */}
          <ellipse cx={160} cy={336} rx={122} ry={11} fill="#B9CDE8" opacity={0.5} />

          {/* gantry rail (fixed) — the trolley rides along it */}
          <rect x={44} y={103} width={232} height={6.5} rx={3.25} fill="#46536B" />
          <rect x={44} y={103} width={232} height={2.2} rx={1.1} fill="#FFFFFF" opacity={0.18} />

          {/* ============ the pile (behind the claw) ============ */}
          <motion.g
            key={`pile-${playToken}`}
            initial={false}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
            animate={
              running
                ? {
                    y: [0, 0, 3, 0, 0],
                    scaleX: [1, 1, 1.05, 1, 1],
                    transition: { duration: seq, times: [0, 0.66, 0.74, 0.86, 1], ease: "easeOut" },
                  }
                : { y: 0, scaleX: 1, transition: { duration: 0.3 } }
            }
          >
            <g style={{ filter: "drop-shadow(0 3px 3px rgba(23,43,77,0.22))" }}>
              {pile.map(({ card, slot }) => {
                const isTarget = Boolean(prize && card.couponId === prize.couponId);
                const art = <PileCardArt w={slot.w} h={slot.h} fill={card.fill} code={card.code} />;
                return (
                  <g key={card.key} transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rot} ${slot.w / 2} ${slot.h / 2})`}>
                    {isTarget ? (
                      /* the assigned card — lifts out with the claw at the grab */
                      <motion.g
                        key={`t-${playToken}`}
                        initial={false}
                        animate={
                          running
                            ? {
                                opacity: [1, 1, 0, 0],
                                transition: { duration: seq, times: [0, 0.71, 0.75, 1], ease: "linear" },
                              }
                            : { opacity: 1, transition: { duration: 0.2 } }
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
          {/* horizontal travel: sweep left → right → lock onto the target card */}
          <motion.g
            key={`cx-${playToken}`}
            initial={false}
            animate={
              running
                ? {
                    x: [0, 0, -94, 90, tx - 160, tx - 160, tx - 160, 0, 0],
                    transition: {
                      duration: seq,
                      times: [0, 0.05, 0.22, 0.38, 0.55, 0.74, 0.8, 0.93, 1],
                      ease: ["linear", "easeInOut", "easeInOut", "easeInOut", "linear", "linear", "easeInOut", "easeOut"],
                    },
                  }
                : phase === "starting"
                  ? { x: [0, -3, 3, 0], transition: { duration: 0.5, repeat: Infinity } }
                  : { x: 0, transition: { duration: 0.3 } }
            }
          >
            {/* motor trolley — rides the rail with the cable */}
            <rect x={149} y={108} width={22} height={17} rx={4} fill="#1F7AE8" stroke="#0A5BB8" strokeWidth={1.5} />
            <circle cx={154.5} cy={114} r={1.5} fill="#9DC7FF" />
            <circle cx={165.5} cy={114} r={1.5} fill="#9DC7FF" />
            <circle cx={160} cy={124.5} r={2.6} fill="none" stroke="#23252E" strokeWidth={2} />

            {/* coiled cable — stretches as the claw descends */}
            <motion.g
              key={`cable-${playToken}`}
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
              animate={
                running
                  ? {
                      scaleY: [0.355, 0.355, cableDrop, cableDrop, 0.29, 0.29],
                      transition: {
                        duration: seq,
                        times: [0, 0.55, 0.68, 0.74, 0.84, 1],
                        ease: ["linear", "easeIn", "linear", "easeOut", "easeOut"],
                      },
                    }
                  : { scaleY: 0.355, transition: { duration: 0.3 } }
              }
            >
              {Array.from({ length: 10 }, (_, i) => (
                <ellipse key={i} cx={160} cy={130 + i * 14} rx={5.2} ry={4.5} fill="none" stroke="#23252E" strokeWidth={2.2} />
              ))}
            </motion.g>

            {/* vertical travel: drop to the card, hold for the grab, lift */}
            <motion.g
              key={`cy-${playToken}`}
              initial={false}
              animate={
                running
                  ? {
                      y: [0, 0, dropY, dropY, -8, -8],
                      transition: {
                        duration: seq,
                        times: [0, 0.55, 0.68, 0.74, 0.84, 1],
                        ease: ["linear", "easeIn", "linear", "easeOut", "easeOut"],
                      },
                    }
                  : { y: 0, transition: { duration: 0.3 } }
              }
            >
              {/* gentle idle bob (switches off once the sequence starts) */}
              <motion.g
                initial={false}
                animate={
                  running ? { y: 0, transition: { duration: 0.25 } } : { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }
                }
              >
                {/* metal head bar */}
                <rect x={144} y={168} width={32} height={13} rx={5} fill="url(#cmMetal)" stroke="#5B6472" strokeWidth={1.5} />
                <circle cx={160} cy={174.5} r={2} fill="#5B6472" />
                <circle cx={150} cy={181} r={2.4} fill="#5B6472" />
                <circle cx={170} cy={181} r={2.4} fill="#5B6472" />

                {/* left pincer — opens wide on the drop, snaps shut at the card */}
                <motion.g
                  key={`pl-${playToken}`}
                  initial={false}
                  style={{ transformBox: "fill-box", originX: 0.65, originY: 0 }}
                  animate={
                    running
                      ? {
                          rotate: [-24, -24, -33, -33, -3, -3],
                          transition: {
                            duration: seq,
                            times: [0, 0.55, 0.65, 0.7, 0.745, 1],
                            ease: ["linear", "easeIn", "linear", "easeOut", "linear"],
                          },
                        }
                      : { rotate: -24, transition: { duration: 0.3 } }
                  }
                >
                  <path d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214" fill="none" stroke="#C3CBD6" strokeWidth={5.5} strokeLinecap="round" />
                  <path d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214" fill="none" stroke="#EFF3F8" strokeWidth={1.7} strokeLinecap="round" />
                  <circle cx={155.5} cy={217.5} r={3.4} fill="#1A1D23" />
                </motion.g>

                {/* right pincer */}
                <motion.g
                  key={`pr-${playToken}`}
                  initial={false}
                  style={{ transformBox: "fill-box", originX: 0.35, originY: 0 }}
                  animate={
                    running
                      ? {
                          rotate: [24, 24, 33, 33, 3, 3],
                          transition: {
                            duration: seq,
                            times: [0, 0.55, 0.65, 0.7, 0.745, 1],
                            ease: ["linear", "easeIn", "linear", "easeOut", "linear"],
                          },
                        }
                      : { rotate: 24, transition: { duration: 0.3 } }
                  }
                >
                  <path d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214" fill="none" stroke="#C3CBD6" strokeWidth={5.5} strokeLinecap="round" />
                  <path d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214" fill="none" stroke="#EFF3F8" strokeWidth={1.7} strokeLinecap="round" />
                  <circle cx={164.5} cy={217.5} r={3.4} fill="#1A1D23" />
                </motion.g>

                {/* grab motion lines — flash as the pincers snap shut */}
                <motion.g
                  key={`gl-${playToken}`}
                  initial={false}
                  stroke="#6B7A94"
                  strokeWidth={2}
                  strokeLinecap="round"
                  animate={
                    running
                      ? {
                          opacity: [0, 0, 0, 1, 0, 0],
                          transition: { duration: seq, times: [0, 0.68, 0.71, 0.735, 0.8, 1], ease: "linear" },
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

                {/* the claw-held prize card — swaps in exactly as the pincers
                    close, rides up with the claw, swings, then bursts into
                    the golden ticket at the reveal */}
                <motion.g
                  key={`hold-${playToken}`}
                  initial={false}
                  animate={
                    running
                      ? {
                          opacity: [0, 0, 0, 1, 1],
                          transition: { duration: seq, times: [0, 0.71, 0.735, 0.765, 1], ease: "linear" },
                        }
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
                        : running
                          ? {
                              rotate: [0, 0, 0, 0, 5, -4, 2, 0],
                              transition: {
                                duration: seq,
                                times: [0, 0.75, 0.8, 0.84, 0.88, 0.93, 0.97, 1],
                                ease: "easeInOut",
                              },
                            }
                          : { rotate: 0, transition: { duration: 0.3 } }
                    }
                  >
                    {/* colored pool card (held) — fades out at the reveal */}
                    {prize ? (
                      <motion.g
                        key={`card-${playToken}`}
                        initial={false}
                        animate={{ opacity: revealed ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <g transform="translate(128 212)" style={{ filter: "drop-shadow(0 4px 5px rgba(23,43,77,0.3))" }}>
                          <PileCardArt w={64} h={23} fill={prize.color} code={prize.code} />
                        </g>
                      </motion.g>
                    ) : null}

                    {/* golden presentation ticket — pops in at the reveal */}
                    {prize ? (
                      <motion.g
                        key={`gold-${playToken}`}
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
                    ) : null}
                  </motion.g>
                </motion.g>
              </motion.g>
            </motion.g>
          </motion.g>

          {/* reveal sparkles at the presented ticket's corners */}
          {[
            { x: 106, y: 204 },
            { x: 214, y: 248 },
          ].map((s, i) => (
            <motion.g
              key={`sp-${i}-${playToken}`}
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
        </g>

        {/* ================= control panel ================= */}
        <rect x={22} y={348} width={276} height={72} rx={18} fill="url(#cmPanel)" stroke="#0A5BB8" strokeWidth={2.5} />
        <rect x={34} y={356} width={252} height={56} rx={13} fill="url(#cmInset)" stroke="#0F5FC0" strokeWidth={1.8} />
        <rect x={40} y={359} width={240} height={5} rx={2.5} fill="#FFFFFF" opacity={0.22} />
        {/* rivets */}
        {[
          { x: 44, y: 364 },
          { x: 276, y: 364 },
          { x: 44, y: 404 },
          { x: 276, y: 404 },
        ].map((r, i) => (
          <g key={i}>
            <circle cx={r.x} cy={r.y} r={3} fill="#DCE9F8" stroke="#0F5FC0" strokeWidth={1} />
            <path d={`M${r.x - 1.4} ${r.y} H${r.x + 1.4} M${r.x} ${r.y - 1.4} V${r.y + 1.4}`} stroke="#0F5FC0" strokeWidth={0.7} />
          </g>
        ))}

        {/* joystick */}
        <ellipse cx={88} cy={408} rx={17} ry={5} fill="#000000" opacity={0.18} />
        <rect x={85} y={368} width={6} height={24} rx={3} fill="#2A2D35" stroke="#101216" strokeWidth={1} />
        <rect x={83} y={388} width={10} height={5} rx={2.5} fill="#3A3F49" />
        <circle cx={88} cy={399} r={15} fill="#23252B" stroke="#AEB8C4" strokeWidth={3.2} />
        <circle cx={88} cy={363.5} r={11} fill="url(#cmBall)" />
        <ellipse cx={84.6} cy={359.8} rx={3.2} ry={2.4} fill="#FFFFFF" opacity={0.8} />

        {/* soft glow behind the PLAY button while it's tappable */}
        <motion.ellipse
          cx={193}
          cy={386}
          rx={84}
          ry={26}
          fill="#C9A4FF"
          initial={false}
          animate={{ opacity: canPlay ? [0.12, 0.3, 0.12] : 0 }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ pointerEvents: "none" }}
        />

        {/* PLAY & WIN → … → PLAY AGAIN */}
        <motion.g
          initial={false}
          whileTap={canPlay ? { scale: 0.97 } : undefined}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5, cursor: canPlay ? "pointer" : "default" }}
          onClick={(e) => {
            e.stopPropagation();
            buttonAction();
          }}
          onKeyDown={onButtonKey}
          role="button"
          tabIndex={canPlay ? 0 : -1}
          aria-disabled={!canPlay}
          aria-label={btnAria}
        >
          {/* button shadow + stadium */}
          <rect x={124} y={377} width={138} height={28} rx={14} fill="#5B21B6" opacity={soldOut || emptyPool ? 0.35 : 0.5} />
          <motion.rect
            x={124}
            y={372}
            width={138}
            height={28}
            rx={14}
            fill={soldOut || emptyPool ? "#8B8FA3" : "url(#cmButton)"}
            stroke={soldOut || emptyPool ? "#B9BFCC" : "#C9A4FF"}
            strokeWidth={1.6}
            initial={false}
            animate={{ opacity: busy ? 0.75 : 1 }}
            transition={{ duration: 0.25 }}
          />
          <rect x={129} y={374.5} width={128} height={11} rx={5.5} fill="#FFFFFF" opacity={0.16} />

          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.g
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {[185, 193, 201].map((cx, i) => (
                  <circle key={cx} className="md-dot" style={{ animationDelay: `${i * 0.12}s` }} cx={cx} cy={389} r={2.7} fill="#FFFFFF" />
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
                  fill="#FFFFFF"
                  fontFamily={ARCADE}
                >
                  {btnLabel}
                </text>
                {/* sparkle action marks */}
                <path d="M132 381 L137 387 M137 378 L142 384" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
                <path d="M254 381 L249 387 M249 378 L244 384" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
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
      style={{ filter: "drop-shadow(0 22px 44px rgba(23,43,77,0.30))" }}
    >
      <div className="relative w-full max-w-[340px]">
        {machine}

        {/* sound toggle — tiny, top-right, out of the machine's way */}
        {sfx ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sfx.toggle();
            }}
            aria-label={sfx.muted ? "Unmute machine sounds" : "Mute machine sounds"}
            className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#1D1D1F]/[0.08] bg-white/80 text-[#1D1D1F]/55 shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[#1D1D1F]/80 active:scale-90"
          >
            {sfx.muted ? <VolumeX size={13} aria-hidden /> : <Volume2 size={13} aria-hidden />}
          </button>
        ) : null}

        {/* reveal burst — spans the whole machine */}
        {revealed && celebrateFx ? <ConfettiFX key={`fx-${playToken}`} /> : null}
      </div>

      {/* ============ the reveal card (HTML — readable + tappable) ============ */}
      <AnimatePresence>
        {revealed && prize ? (
          <motion.div
            key={`reveal-${playToken}`}
            role="status"
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
              <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[#F5F5F7] px-3 py-2.5">
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
                      ? "bg-gradient-to-br from-[#4ADE80] to-[#16A34A] shadow-[0_8px_20px_-8px_rgba(22,163,74,0.7)]"
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
            {soldOut || error.includes("set up") ? null : (
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
