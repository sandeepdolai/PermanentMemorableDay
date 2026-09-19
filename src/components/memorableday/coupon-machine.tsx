"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiFX } from "./confetti";
import { useMD } from "./md-context";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* CouponMachine — the blue arcade claw machine, recreated from the     */
/* reference set: royal-blue cabinet, purple marquee with golden 3D    */
/* "COUPON CODE" lettering + white "REVEAL", four twinkling bulbs, a   */
/* glass window with a coiled-cable claw hanging over a pile of        */
/* colorful COUPON tickets, a red-ball joystick and a purple           */
/* "PLAY & WIN" stadium button.                                        */
/*                                                                     */
/* Fully coded + interactive (no images): tapping PLAY runs the        */
/* choreography — the claw rides down, pincers snap shut on the        */
/* golden ticket, it is lifted out of the pile and presented with the  */
/* real code (editable Block data), the button morphs PLAY & WIN →     */
/* working dots → COPY CODE → COPIED ✓, and a confetti burst fires.    */
/*                                                                     */
/* One art source for the moment player and the builder's live stage.  */
/* ------------------------------------------------------------------ */

/** Rounded arcade font stack (Korean-capable for legacy drafts). */
const ARCADE =
  'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** The golden ticket body — rounded corners + scalloped (bumped) ends,
 * drawn as one closed path so the outline follows every scallop. */
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

/* The colorful pile: purple / pink / amber / green / blue / orange     */
/* tickets scattered at the bottom of the glass window.                 */
const PILE: Array<{ x: number; y: number; w: number; h: number; rot: number; fill: string; label: boolean }> = [
  { x: 36, y: 290, w: 62, h: 21, rot: -13, fill: "#9B59B6", label: true },
  { x: 100, y: 283, w: 56, h: 20, rot: 6, fill: "#E84393", label: true },
  { x: 164, y: 285, w: 60, h: 20, rot: -7, fill: "#F59E0B", label: true },
  { x: 226, y: 291, w: 56, h: 21, rot: 12, fill: "#2ECC71", label: true },
  { x: 28, y: 315, w: 58, h: 22, rot: 8, fill: "#3498DB", label: true },
  { x: 240, y: 313, w: 54, h: 22, rot: -11, fill: "#FF7A3D", label: true },
  { x: 46, y: 322, w: 46, h: 18, rot: -4, fill: "#FF5D8F", label: false },
  { x: 234, y: 322, w: 46, h: 18, rot: 6, fill: "#10B981", label: false },
];

/* Sequence timings (one shared clock — duration 2.25s).               */
const SEQ = 2.25;
/** Claw drop → hold → lift → settle. */
const HEAD_TIMES = [0, 0.05, 0.32, 0.46, 0.72, 1];
const HEAD_EASE = ["linear", "easeIn", "linear", "easeOut", "easeInOut"] as const;
/** Pincers: open → wide while dropping → snap shut at the ticket. */
const PINCER_TIMES = [0, 0.05, 0.34, 0.46, 0.72, 1];
/** Ticket swap (pile copy out / claw copy in) at the grab. */
const SWAP_TIMES = [0, 0.05, 0.38, 0.46, 1];
/** Pile impact squash. */
const PILE_TIMES = [0, 0.05, 0.36, 0.5, 0.72, 1];

/* ------------------------------------------------------------------ */
/* useCouponPlay — event-driven sequence driver (player + editor).     */
/* `played` flips immediately (machine choreography starts),           */
/* `revealed` flips after the claw has lifted + presented the ticket   */
/* (confetti + COPY CODE). No setState-in-effect — timers live inside  */
/* the click handler, mirroring useRevealDemo.                         */
/* ------------------------------------------------------------------ */
export function useCouponPlay(revealDelayMs = 1750, resetAfterMs?: number) {
  const [played, setPlayed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const play = () => {
    clearTimers();
    setPlayed(false);
    setRevealed(false);
    // restart from idle on a fresh frame so keyframed moves replay
    window.requestAnimationFrame(() => {
      setPlayed(true);
      timers.current.push(window.setTimeout(() => setRevealed(true), revealDelayMs));
      if (resetAfterMs) {
        timers.current.push(
          window.setTimeout(() => {
            setPlayed(false);
            setRevealed(false);
          }, resetAfterMs)
        );
      }
    });
  };

  useEffect(() => clearTimers, []);

  return { played, revealed, play };
}

/* ------------------------------------------------------------------ */
/* The golden ticket art — shared by the pile copy (sealed) and the    */
/* claw-held copy (un-seals at the reveal). 112 × 42 in local coords.  */
/* ------------------------------------------------------------------ */
function GoldTicket({ code, eyebrow, reveal }: { code: string; eyebrow: string; reveal: boolean }) {
  const size = codeFontSize(code.length);
  return (
    <g>
      <path d={TICKET_PATH} fill="url(#cmGold)" stroke="#B45309" strokeWidth={2} strokeLinejoin="round" />
      {/* inner dashed perforation border */}
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
      <text
        x={56}
        y={15}
        textAnchor="middle"
        fontSize={5.8}
        fontWeight={800}
        letterSpacing={0.8}
        fill="#8A5A16"
        fontFamily={ARCADE}
      >
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
      {/* grey smudge over the code zone while sealed */}
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
/* CouponMachine                                                        */
/* ------------------------------------------------------------------ */
export function CouponMachine({
  title = "COUPON CODE",
  subtitle = "REVEAL",
  ticketLabel = "YOUR COUPON CODE",
  buttonLabel = "PLAY & WIN",
  code = "SAVE20",
  open = false,
  celebrate = false,
  /** Omit for a static, non-interactive rendering. */
  onPlay,
  celebrateFx = true,
}: {
  title?: string;
  subtitle?: string;
  ticketLabel?: string;
  buttonLabel?: string;
  code?: string;
  open?: boolean;
  celebrate?: boolean;
  onPlay?: () => void;
  celebrateFx?: boolean;
}) {
  const { notify } = useMD();
  const shown = code || "SAVE20";
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  /* COPY CODE → real clipboard (with the legacy + toast fallbacks) */
  const doCopy = async () => {
    const flashCopied = () => {
      setCopied(true);
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

  const running = open && !celebrate;
  const buttonAction = () => {
    if (!open && onPlay) onPlay();
    else if (celebrate) void doCopy();
  };
  const interactiveBtn = Boolean(onPlay) || celebrate;
  const btnAria = open
    ? celebrate
      ? "Copy coupon code"
      : "Drawing the winning coupon"
    : `${buttonLabel} — play the claw machine`;
  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buttonAction();
    }
  };
  const btnTextSize = buttonLabel.length > 12 ? 11 : 12.5;

  const machine = (
    <svg
      viewBox="0 0 320 440"
      role="figure"
      aria-label={`${title} ${subtitle} — claw machine coupon reveal`}
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

      {/* ================= cabinet ================= */}
      <rect x={10} y={10} width={300} height={420} rx={26} fill="url(#cmBody)" stroke="#0A5BB8" strokeWidth={3} />
      <rect x={20} y={15} width={280} height={9} rx={4.5} fill="#FFFFFF" opacity={0.14} />

      {/* ================= marquee ================= */}
      <rect x={56} y={24} width={208} height={62} rx={16} fill="url(#cmMarquee)" stroke="#4C1D95" strokeWidth={2.5} />
      <rect x={60} y={27.5} width={200} height={7} rx={3.5} fill="#FFFFFF" opacity={0.14} />
      {/* golden 3D title + white subtitle (shadow layer behind each) */}
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

      {/* four twinkling marquee bulbs on the cabinet shoulders */}
      {[
        { x: 40, y: 34 },
        { x: 40, y: 60 },
        { x: 280, y: 34 },
        { x: 280, y: 60 },
      ].map((b, i) => (
        <g key={i}>
          <circle className="md-bulb" style={{ animationDelay: `${i * 0.38}s` }} cx={b.x} cy={b.y} r={7.5} fill="#FFE9A8" opacity={0.55} />
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

        {/* gantry rail + motor housing (fixed) */}
        <rect x={44} y={103} width={232} height={6.5} rx={3.25} fill="#46536B" />
        <rect x={44} y={103} width={232} height={2.2} rx={1.1} fill="#FFFFFF" opacity={0.18} />
        <rect x={149} y={108} width={22} height={17} rx={4} fill="#1F7AE8" stroke="#0A5BB8" strokeWidth={1.5} />
        <circle cx={154.5} cy={114} r={1.5} fill="#9DC7FF" />
        <circle cx={165.5} cy={114} r={1.5} fill="#9DC7FF" />
        <circle cx={160} cy={124.5} r={2.6} fill="none" stroke="#23252E" strokeWidth={2} />

        {/* coiled cable — stretches as the claw descends */}
        <motion.g
          initial={false}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
          animate={
            open
              ? {
                  scaleY: [0.355, 0.355, 1.065, 1.065, 0.27, 0.355],
                  transition: { duration: SEQ, times: HEAD_TIMES, ease: HEAD_EASE },
                }
              : { scaleY: 0.355, transition: { duration: 0.3 } }
          }
        >
          {Array.from({ length: 10 }, (_, i) => (
            <ellipse key={i} cx={160} cy={130 + i * 14} rx={5.2} ry={4.5} fill="none" stroke="#23252E" strokeWidth={2.2} />
          ))}
        </motion.g>

        {/* claw assembly — rides down to the pile, grabs, lifts */}
        <motion.g
          initial={false}
          animate={
            open
              ? {
                  y: [0, 0, 88, 88, -10, 0],
                  transition: { duration: SEQ, times: HEAD_TIMES, ease: HEAD_EASE },
                }
              : { y: 0, transition: { duration: 0.3 } }
          }
        >
          {/* gentle idle bob (switches off once the sequence starts) */}
          <motion.g
            initial={false}
            animate={
              open
                ? { y: 0, transition: { duration: 0.25 } }
                : { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }
            }
          >
            {/* metal head bar */}
            <rect x={144} y={168} width={32} height={13} rx={5} fill="url(#cmMetal)" stroke="#5B6472" strokeWidth={1.5} />
            <circle cx={160} cy={174.5} r={2} fill="#5B6472" />
            <circle cx={150} cy={181} r={2.4} fill="#5B6472" />
            <circle cx={170} cy={181} r={2.4} fill="#5B6472" />

            {/* left pincer — pivots open/closed (wide J-hook + rubber tip) */}
            <motion.g
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.65, originY: 0 }}
              animate={
                open
                  ? {
                      rotate: [-24, -29, -29, -2, -2, -2],
                      transition: { duration: SEQ, times: PINCER_TIMES, ease: ["linear", "easeIn", "easeOut", "linear", "linear"] },
                    }
                  : { rotate: -24, transition: { duration: 0.3 } }
              }
            >
              <path
                d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214"
                fill="none"
                stroke="#C3CBD6"
                strokeWidth={5.5}
                strokeLinecap="round"
              />
              <path
                d="M150 181 C138 189 133 204 143 217 C148 224 158 222 159 214"
                fill="none"
                stroke="#EFF3F8"
                strokeWidth={1.7}
                strokeLinecap="round"
              />
              <circle cx={155.5} cy={217.5} r={3.4} fill="#1A1D23" />
            </motion.g>

            {/* right pincer */}
            <motion.g
              initial={false}
              style={{ transformBox: "fill-box", originX: 0.35, originY: 0 }}
              animate={
                open
                  ? {
                      rotate: [24, 29, 29, 2, 2, 2],
                      transition: { duration: SEQ, times: PINCER_TIMES, ease: ["linear", "easeIn", "easeOut", "linear", "linear"] },
                    }
                  : { rotate: 24, transition: { duration: 0.3 } }
              }
            >
              <path
                d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214"
                fill="none"
                stroke="#C3CBD6"
                strokeWidth={5.5}
                strokeLinecap="round"
              />
              <path
                d="M170 181 C182 189 187 204 177 217 C172 224 162 222 161 214"
                fill="none"
                stroke="#EFF3F8"
                strokeWidth={1.7}
                strokeLinecap="round"
              />
              <circle cx={164.5} cy={217.5} r={3.4} fill="#1A1D23" />
            </motion.g>

            {/* grab motion lines — flash as the pincers snap shut */}
            <motion.g
              initial={false}
              stroke="#6B7A94"
              strokeWidth={2}
              strokeLinecap="round"
              animate={
                open
                  ? {
                      opacity: [0, 0, 1, 0, 0],
                      transition: { duration: SEQ, times: [0, 0.05, 0.38, 0.54, 1], ease: "linear" },
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

            {/* the claw-held golden ticket (appears at the grab) */}
            <motion.g
              initial={false}
              animate={
                open
                  ? {
                      opacity: [0, 0, 0, 1, 1],
                      transition: { duration: SEQ, times: SWAP_TIMES, ease: "linear" },
                    }
                  : { opacity: 0, transition: { duration: 0.2 } }
              }
            >
              <g transform="translate(104 208)">
                {/* pendulum sway + present-pop once revealed */}
                <motion.g
                  initial={false}
                  style={{ transformBox: "fill-box", originX: 0.5, originY: 0.08 }}
                  animate={
                    celebrate
                      ? {
                          rotate: [0, 1.6, 0, -1.6, 0],
                          scale: 1.13,
                          transition: {
                            rotate: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                            scale: { type: "spring", stiffness: 260, damping: 16 },
                          },
                        }
                      : { rotate: 0, scale: 1, transition: { duration: 0.3 } }
                  }
                >
                  <g style={{ filter: "drop-shadow(0 4px 5px rgba(23,43,77,0.3))" }}>
                    <GoldTicket code={shown} eyebrow={ticketLabel} reveal={celebrate} />
                  </g>
                </motion.g>
              </g>
            </motion.g>
          </motion.g>
        </motion.g>

        {/* spotlight behind the presented ticket */}
        <motion.ellipse
          cx={160}
          cy={222}
          rx={86}
          ry={54}
          fill="url(#cmSpot)"
          initial={false}
          animate={{ opacity: celebrate ? 0.6 : 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ pointerEvents: "none" }}
        />

        {/* the pile — squashes on impact, golden copy fades as it's grabbed */}
        <motion.g
          initial={false}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={
            open
              ? {
                  y: [0, 0, 3, 3, 0, 0],
                  scaleX: [1, 1, 1.045, 1.045, 1, 1],
                  transition: { duration: SEQ, times: PILE_TIMES, ease: "easeOut" },
                }
              : { y: 0, scaleX: 1, transition: { duration: 0.3 } }
          }
        >
          <g style={{ filter: "drop-shadow(0 3px 3px rgba(23,43,77,0.22))" }}>
            {PILE.map((p, i) => (
              <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot} ${p.w / 2} ${p.h / 2})`}>
                <rect width={p.w} height={p.h} rx={4} fill={p.fill} stroke="rgba(0,0,0,0.16)" strokeWidth={1} />
                <circle cx={0} cy={p.h / 2} r={3.4} fill="#EAF3FD" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
                <circle cx={p.w} cy={p.h / 2} r={3.4} fill="#EAF3FD" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
                {p.label ? (
                  <text
                    x={p.w / 2}
                    y={p.h / 2 + 2.4}
                    textAnchor="middle"
                    fontSize={6}
                    fontWeight={800}
                    letterSpacing={1.4}
                    fill="#FFFFFF"
                    fontFamily={ARCADE}
                  >
                    COUPON
                  </text>
                ) : null}
              </g>
            ))}
          </g>
          {/* golden ticket resting in the pile (front-center, sealed) */}
          <motion.g
            initial={false}
            animate={
              open
                ? {
                    opacity: [1, 1, 0, 0, 0],
                    transition: { duration: SEQ, times: SWAP_TIMES, ease: "linear" },
                  }
                : { opacity: 1, transition: { duration: 0.2 } }
            }
          >
            <g transform="translate(104 296)" style={{ filter: "drop-shadow(0 4px 5px rgba(23,43,77,0.28))" }}>
              <GoldTicket code={shown} eyebrow={ticketLabel} reveal={false} />
            </g>
          </motion.g>
        </motion.g>

        {/* reveal sparkles at the presented ticket's corners */}
        {[
          { x: 106, y: 204 },
          { x: 214, y: 248 },
        ].map((s, i) => (
          <motion.g
            key={i}
            initial={false}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
            animate={
              celebrate
                ? {
                    scale: [0, 1.35, 1],
                    opacity: [0, 1, 1],
                    rotate: 25,
                    transition: { duration: 0.5, ease: "easeOut" },
                  }
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

      {/* PLAY & WIN → … → COPY CODE → COPIED ✓ */}
      <motion.g
        initial={false}
        whileTap={onPlay || celebrate ? { scale: 0.97 } : undefined}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5, cursor: onPlay || celebrate ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          buttonAction();
        }}
        onKeyDown={onButtonKey}
        {...(interactiveBtn ? { role: "button", tabIndex: 0, "aria-label": btnAria } : {})}
      >
        {/* button shadow + stadium */}
        <rect x={124} y={377} width={138} height={28} rx={14} fill="#5B21B6" opacity={0.5} />
        <motion.rect
          x={124}
          y={372}
          width={138}
          height={28}
          rx={14}
          fill={copied ? "url(#cmButtonGreen)" : "url(#cmButton)"}
          stroke={copied ? "#86EFAC" : "#C9A4FF"}
          strokeWidth={1.6}
          initial={false}
          animate={{ opacity: running ? 0.75 : 1 }}
          transition={{ duration: 0.25 }}
        />
        <rect x={129} y={374.5} width={128} height={11} rx={5.5} fill="#FFFFFF" opacity={0.16} />

        <AnimatePresence mode="wait" initial={false}>
          {!open ? (
            <motion.g
              key="idle"
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
                {buttonLabel}
              </text>
              {/* sparkle action marks */}
              <path d="M132 381 L137 387 M137 378 L142 384" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
              <path d="M254 381 L249 387 M249 378 L244 384" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
            </motion.g>
          ) : running ? (
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
              key="copy"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {copied ? (
                <>
                  <path d="M180 387.5 L183.5 391 L190 383.5" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                  <text x={202} y={391} textAnchor="middle" fontSize={11.5} fontWeight={800} letterSpacing={1} fill="#FFFFFF" fontFamily={ARCADE}>
                    COPIED ✓
                  </text>
                </>
              ) : (
                <>
                  <rect x={168} y={382.5} width={8.5} height={8.5} rx={2} fill="none" stroke="#FFFFFF" strokeWidth={1.5} />
                  <rect x={171.5} y={379.5} width={8.5} height={8.5} rx={2} fill="#8B3FE8" stroke="#FFFFFF" strokeWidth={1.5} />
                  <text x={202} y={391} textAnchor="middle" fontSize={11.5} fontWeight={800} letterSpacing={0.8} fill="#FFFFFF" fontFamily={ARCADE}>
                    COPY CODE
                  </text>
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </motion.g>
    </svg>
  );

  return (
    <div
      className={cn("relative flex w-full justify-center")}
      style={{ filter: "drop-shadow(0 22px 44px rgba(23,43,77,0.30))" }}
    >
      <div className="relative w-full max-w-[340px]">
        {machine}
        {/* reveal burst — spans the whole machine (plays once the ticket is presented) */}
        {celebrate && celebrateFx ? <ConfettiFX /> : null}
      </div>
    </div>
  );
}
