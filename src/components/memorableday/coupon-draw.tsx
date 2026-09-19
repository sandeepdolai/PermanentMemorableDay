"use client";

import { Check, Scissors, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiFX } from "./confetti";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* CouponDraw — the claw-machine prize screen, recreated from the      */
/* reference shot: a dark promo poster with a step indicator, a        */
/* Korean promo headline and a lavender "coupon machine" card.         */
/* A claw hovers over a pile of tilted coupons holding one near-black  */
/* winner ticket; tapping the pill CTA lifts the claw, the grabbed     */
/* coupon flies at the viewer and flips into the prize ticket with     */
/* the real code — celebrated by the shared ConfettiFX burst.          */
/*                                                                     */
/* One art source for the moment player and the builder's live stage.  */
/* ------------------------------------------------------------------ */

/** Korean-capable font stack (falls back to system fonts everywhere). */
const KOREAN_FONT =
  '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';

/** The machine claw's indigo. */
const CLAW = "#6366F1";

/** Pile palette — the purple spectrum of the reference screen. */
const PILE_COLORS = ["#818CF8", "#A78BFA", "#C084FC", "#E879F9", "#F472B6", "#8B5CF6"];

/** The coupon pile: front row carries the COUPON wordmark, back rows
 *  are partial tickets peeking around the edges for depth. */
const PILE: Array<{
  left: string;
  bottom: string;
  w: string;
  h: number;
  rot: number;
  c: number;
  o: number;
  label: boolean;
}> = [
  { left: "3%", bottom: "8%", w: "36%", h: 34, rot: -13, c: 0, o: 0.95, label: true },
  { left: "31%", bottom: "3%", w: "38%", h: 36, rot: 5, c: 1, o: 0.95, label: true },
  { left: "61%", bottom: "9%", w: "34%", h: 33, rot: 15, c: 2, o: 0.95, label: true },
  { left: "10%", bottom: "36%", w: "30%", h: 28, rot: -21, c: 3, o: 0.6, label: false },
  { left: "50%", bottom: "40%", w: "27%", h: 26, rot: 11, c: 4, o: 0.55, label: false },
  { left: "77%", bottom: "33%", w: "23%", h: 25, rot: 21, c: 5, o: 0.5, label: false },
];

/* Claw idle bob (gentle keyframe loop) → open lift (one-shot rise). */
const clawVariants = {
  idle: {
    y: [0, -5, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" as const },
  },
  open: {
    y: -30,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

/* The grabbed coupon: hanging tilted while sealed → flies at the
 * viewer and dissolves once the draw fires. */
const grabVariants = {
  idle: {
    rotate: -6,
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  open: {
    rotate: -18,
    scale: 1.85,
    opacity: 0,
    y: -14,
    transition: { delay: 0.3, duration: 0.42, ease: "easeIn" as const },
  },
};

/* The pile settles a hair when the claw lifts off it. */
const pileVariants = {
  idle: { y: 0, scale: 1, transition: { duration: 0.3 } },
  open: { y: 3, scale: 0.98, transition: { type: "spring" as const, stiffness: 380, damping: 26 } },
};

export function CouponDraw({
  stepLabel = "01",
  subtitle = "올려만 하면 100% 당첨",
  title = "쿠폰 뽑기",
  buttonLabel = "쿠폰 뽑기",
  code = "MD-COUPON",
  open,
  onDraw,
  celebrate = true,
}: {
  stepLabel?: string;
  subtitle?: string;
  title?: string;
  buttonLabel?: string;
  code?: string;
  open: boolean;
  /** Omit for a static, non-interactive rendering. */
  onDraw?: () => void;
  celebrate?: boolean;
}) {
  const shown = code || "MD-COUPON";

  const poster = (
    <div
      role="figure"
      aria-label={`${title} — coupon prize draw`}
      className="relative w-full max-w-[340px] select-none overflow-hidden rounded-[28px] px-5 pb-5 pt-6 text-center"
      style={{
        background: "linear-gradient(180deg, #1E1E23 0%, #17171B 100%)",
        fontFamily: KOREAN_FONT,
        boxShadow:
          "0 26px 60px -22px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* faint violet aura at the top of the dark stage */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 42% at 50% -6%, rgba(139,92,246,0.18) 0%, transparent 66%)",
        }}
      />

      {/* Header — step / subtitle / headline (reference layout) */}
      <div className="relative">
        <p className="text-[15px] font-extrabold tracking-[0.3em] text-[#8B5CF6]">
          {stepLabel}
        </p>
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#9CA3AF]">{subtitle}</p>
        <p className="mt-1 text-[25px] font-extrabold leading-tight tracking-[-0.01em] text-white">
          {title}
        </p>
      </div>

      {/* The lavender machine card */}
      <div
        className="relative mt-4 rounded-[20px] p-2.5"
        style={{
          background: "linear-gradient(180deg, #F3E8FF 0%, #DCCBFF 100%)",
          boxShadow:
            "0 14px 34px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {/* Machine canvas */}
        <div
          aria-hidden
          className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px]"
          style={{ background: "#F5F5F7" }}
        >
          {/* soft floor shading so the pile sits "inside" the machine */}
          <span
            className="absolute inset-x-0 bottom-0 h-[46%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(99,102,241,0.0) 0%, rgba(99,102,241,0.08) 100%)",
            }}
          />

          {/* Coupon pile */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[58%]"
            variants={pileVariants}
            animate={open ? "open" : "idle"}
            initial={false}
          >
            {PILE.map((p, i) => (
              <span
                key={i}
                className="absolute flex items-center justify-center rounded-[8px]"
                style={{
                  left: p.left,
                  bottom: p.bottom,
                  width: p.w,
                  height: p.h,
                  transform: `rotate(${p.rot}deg)`,
                  backgroundColor: PILE_COLORS[p.c],
                  opacity: p.o,
                  boxShadow: "0 4px 10px rgba(29,29,31,0.18)",
                }}
              >
                {p.label ? (
                  <span className="text-[9.5px] font-extrabold tracking-[0.16em] text-white/95">
                    COUPON
                  </span>
                ) : null}
                {/* ticket notches punched into both edges */}
                <span
                  className="absolute -left-[6px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: "#F5F5F7" }}
                />
                <span
                  className="absolute -right-[6px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: "#F5F5F7" }}
                />
              </span>
            ))}
          </motion.div>

          {/* Claw assembly: stem, carriage, U-hook + the grabbed winner */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            variants={clawVariants}
            animate={open ? "open" : "idle"}
            initial={false}
          >
            {/* rail stem from the ceiling */}
            <span
              className="absolute left-1/2 top-0 w-[5px] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: CLAW, height: "24%" }}
            />
            {/* carriage */}
            <span
              className="absolute left-1/2 top-[22.5%] h-[10px] w-[32px] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: CLAW }}
            />
            {/* U-hook — an open cup that cradles the winner coupon */}
            <span
              className="absolute left-1/2 top-[26%] h-[26px] w-[38px] -translate-x-1/2 rounded-b-full"
              style={{ borderWidth: 5, borderTopWidth: 0, borderStyle: "solid", borderColor: CLAW }}
            />
            {/* the near-black winner coupon, hanging in the claw */}
            <motion.span
              variants={grabVariants}
              animate={open ? "open" : "idle"}
              initial={false}
              className="absolute top-[36%] block w-[46%] rounded-[10px] px-1 py-[11px]"
              style={{
                left: "27%",
                backgroundColor: "#1F2937",
                boxShadow: "0 6px 16px rgba(29,29,31,0.35)",
              }}
            >
              <span className="block text-center text-[13px] font-extrabold tracking-[0.2em] text-white">
                COUPON
              </span>
              <span className="absolute -left-[7px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-[#F5F5F7]" />
              <span className="absolute -right-[7px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-[#F5F5F7]" />
            </motion.span>
          </motion.div>

          {/* The prize ticket — springs in over the machine once drawn */}
          <AnimatePresence>
            {open ? (
              <motion.div
                key="prize"
                initial={{ x: "-50%", y: "-36%", scale: 0.5, opacity: 0, rotate: -7 }}
                animate={{ x: "-50%", y: "-50%", scale: 1, opacity: 1, rotate: -2 }}
                exit={{ x: "-50%", y: "-42%", scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.38 }}
                className="absolute left-1/2 top-1/2 z-10 w-[84%]"
              >
                <div
                  className="relative rounded-[16px] bg-white px-4 pb-3.5 pt-4 text-center"
                  style={{
                    boxShadow:
                      "0 18px 40px -12px rgba(29,29,31,0.45), 0 0 0 1px rgba(29,29,31,0.04)",
                  }}
                >
                  {/* eyebrow */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/[0.12] px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#7C3AED]">
                    <Sparkles size={9} aria-hidden /> Coupon
                  </span>
                  {/* the real code */}
                  <p
                    aria-label={`Coupon code: ${shown}`}
                    className="mt-2 break-all font-mono text-[19px] font-bold tracking-[0.1em] text-[#1D1D1F]"
                  >
                    {shown}
                  </p>
                  {/* perforation */}
                  <div aria-hidden className="mt-2.5 flex items-center px-1">
                    <span className="h-1.5 w-1.5 rotate-45 rounded-[2px] bg-[#1D1D1F]/15" />
                    <span className="mx-1 h-px flex-1 border-t border-dashed border-[#1D1D1F]/20" />
                    <Scissors size={9} className="text-[#1D1D1F]/25" />
                    <span className="mx-1 h-px flex-1 border-t border-dashed border-[#1D1D1F]/20" />
                    <span className="h-1.5 w-1.5 rotate-45 rounded-[2px] bg-[#1D1D1F]/15" />
                  </div>
                  <p className="mt-2 text-[10.5px] font-bold text-[#7C3AED]">
                    100% 당첨 · yours to use
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

        </div>

        {/* CTA — the pill from the reference; morphs to a won state */}
        <div className="relative mt-2.5">
          <AnimatePresence mode="wait" initial={false}>
            {!open ? (
              onDraw ? (
                <motion.button
                  key="draw"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // fire the draw, not the scene advance
                    onDraw();
                  }}
                  aria-label={`${buttonLabel} — draw your coupon`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full cursor-pointer overflow-hidden rounded-full py-[13px] text-[15.5px] font-bold text-[#3F3A4A] transition-transform duration-150 active:scale-[0.98]"
                  style={{
                    backgroundColor: "#E9E4F0",
                    boxShadow:
                      "0 6px 16px -6px rgba(29,29,31,0.28), inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  <span className="relative z-10">{buttonLabel}</span>
                  {/* looping sheen — CSS-driven, decoupled from framer exit */}
                  <span aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
                    <span
                      className="absolute inset-y-0 w-1/3 animate-[md-ticket-shine_2.8s_ease-in-out_infinite]"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
                      }}
                    />
                  </span>
                </motion.button>
              ) : (
                <motion.div
                  key="draw-static"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="w-full rounded-full py-[13px] text-[15.5px] font-bold text-[#3F3A4A]"
                  style={{
                    backgroundColor: "#E9E4F0",
                    boxShadow:
                      "0 6px 16px -6px rgba(29,29,31,0.28), inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  {buttonLabel}
                </motion.div>
              )
            ) : (
              <motion.div
                key="won"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 320, damping: 22 }}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1F2937] py-[13px] text-[15px] font-bold text-white"
              >
                <Check size={14} strokeWidth={3} className="text-[#A78BFA]" aria-hidden />
                100% 당첨
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Draw burst — spans the whole poster (same pattern as the reward ticket) */}
      {open && celebrate ? <ConfettiFX /> : null}
    </div>
  );

  return <div className={cn("relative flex w-full justify-center")}>{poster}</div>;
}
