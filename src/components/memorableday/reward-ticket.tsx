"use client";

import { Award, Check, Scissors, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiFX } from "./confetti";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* RewardTicket — the shared "golden coupon" the recipient reveals.    */
/* One art source for the moment player and the builder's live stage.  */
/*                                                                     */
/* Anatomy:                                                            */
/*  • Frosted-glass coupon card (dark scenes: white glass; editor:     */
/*    white card with a soft emerald wash)                             */
/*  • Medallion — gradient emerald disc with Award glyph, ambient      */
/*    glow, and a slowly rotating conic sheen ring while sealed        */
/*  • Kind eyebrow — "COUPON · GIFT CARD · DOWNLOAD" chip              */
/*  • Code zone — mono, wide-tracked; sealed = blurred + looping       */
/*    shimmer, revealed = crisp with a one-shot diagonal shine sweep   */
/*  • Perforation tear line — dashed rule with diamond cut marks       */
/*    and a tiny scissors glyph (classic coupon cue)                   */
/*  • Status footer — pulsing "Tap to reveal" / "Yours to use" ✓       */
/*  • Reveal pops the ConfettiFX burst (same engine as the blocks)     */
/* ------------------------------------------------------------------ */

export const REWARD_KIND_META: Record<
  string,
  { label: string; blurb: string }
> = {
  Coupon: { label: "Coupon", blurb: "A discount they can type at checkout" },
  "Gift card": { label: "Gift card", blurb: "A prepaid balance to spend" },
  Download: { label: "Download", blurb: "A file, drop or unlock link" },
};

export function rewardKindMeta(kind?: string): { label: string; blurb: string } {
  return (kind && REWARD_KIND_META[kind]) || { label: "Reward", blurb: "A little something for them" };
}

export function RewardTicket({
  kind,
  code,
  open,
  onOpen,
  onDark = true,
  celebrate = true,
}: {
  kind?: string;
  code: string;
  open: boolean;
  onOpen?: () => void;
  onDark?: boolean;
  celebrate?: boolean;
}) {
  const meta = rewardKindMeta(kind);
  const shown = code || "MD-REWARD";

  const card = (
    <div
      className={cn(
        "relative w-full max-w-[340px] overflow-hidden rounded-[24px] text-center",
        onDark
          ? "border border-white/15 bg-white/[0.07] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
          : "border border-[#1D1D1F]/[0.06] bg-white shadow-[0_18px_44px_-16px_rgba(30,158,74,0.35)]"
      )}
      style={{ WebkitBackdropFilter: "blur(18px)", backdropFilter: "blur(18px)" }}
    >
      {/* soft emerald wash + top sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: onDark
            ? "radial-gradient(110% 70% at 50% 0%, rgba(48,209,88,0.16) 0%, transparent 60%)"
            : "radial-gradient(110% 70% at 50% 0%, rgba(48,209,88,0.10) 0%, transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          onDark ? "bg-gradient-to-r from-transparent via-white/40 to-transparent" : "bg-gradient-to-r from-transparent via-[#1D1D1F]/10 to-transparent"
        )}
      />

      {/* Header — medallion + kind */}
      <div className="relative flex flex-col items-center px-7 pt-7">
        <span className="relative flex h-14 w-14 items-center justify-center">
          {/* ambient glow */}
          <span
            aria-hidden
            className="absolute inset-[-10px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(48,209,88,0.35) 0%, transparent 70%)",
            }}
          />
          {/* rotating conic sheen ring while sealed */}
          {!open ? (
            <motion.span
              aria-hidden
              className="absolute inset-[-6px] rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.85) 40deg, transparent 90deg, transparent 180deg, rgba(94,222,128,0.7) 220deg, transparent 270deg)",
                WebkitMask: "radial-gradient(circle, transparent 62%, black 64%)",
                mask: "radial-gradient(circle, transparent 62%, black 64%)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          ) : null}
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5BE07E] via-[#30D158] to-[#1E9E4A] text-white shadow-[0_10px_26px_-8px_rgba(48,209,88,0.8)]">
            <Award size={24} aria-hidden />
          </span>
        </span>

        <span
          className={cn(
            "mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]",
            onDark ? "bg-white/10 text-[#8CE8B0]" : "bg-[#30D158]/[0.12] text-[#1E9E4A]"
          )}
        >
          {open ? <Sparkles size={10} aria-hidden /> : null}
          {meta.label}
        </span>

        {/* Code zone */}
        <div
          className={cn(
            "relative mt-4 w-full rounded-[16px] px-5 py-4",
            onDark ? "bg-black/25 ring-1 ring-inset ring-white/10" : "bg-[#F5F5F7] ring-1 ring-inset ring-[#1D1D1F]/[0.05]"
          )}
        >
          <p
            aria-label={`Reward code: ${shown}`}
            className={cn(
              "relative overflow-hidden font-mono text-[21px] font-bold tracking-[0.12em] break-all",
              onDark ? "text-white" : "text-[#1D1D1F]",
              !open && "select-none blur-[7px]"
            )}
            style={!open ? { opacity: 0.55 } : undefined}
          >
            {shown}
          </p>
          {/* sealed: looping shimmer band */}
          {!open ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]"
            >
              <span
                className="absolute inset-y-0 w-1/3 animate-[md-ticket-shine_2.6s_ease-in-out_infinite]"
                style={{
                  background: onDark
                    ? "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)"
                    : "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
                }}
              />
            </span>
          ) : (
            /* revealed: one-shot diagonal shine sweep */
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]"
            >
              <span
                className="absolute inset-y-0 w-1/2 animate-[md-ticket-shine_1.1s_ease-out_1_forwards]"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                }}
              />
            </span>
          )}
        </div>
      </div>

      {/* Perforation tear line — diamond cut marks + scissors */}
      <div aria-hidden className="relative mt-5 flex items-center px-4">
        <span className={cn("h-2 w-2 rotate-45 rounded-[2px]", onDark ? "bg-white/20" : "bg-[#1D1D1F]/15")} />
        <span className={cn("mx-1 h-px flex-1 border-t border-dashed", onDark ? "border-white/20" : "border-[#1D1D1F]/15")} />
        <Scissors size={11} className={onDark ? "text-white/25" : "text-[#1D1D1F]/25"} />
        <span className={cn("mx-1 h-px flex-1 border-t border-dashed", onDark ? "border-white/20" : "border-[#1D1D1F]/15")} />
        <span className={cn("h-2 w-2 rotate-45 rounded-[2px]", onDark ? "bg-white/20" : "bg-[#1D1D1F]/15")} />
      </div>

      {/* Status footer */}
      <div className="relative flex h-[52px] items-center justify-center px-7 pb-6 pt-2">
        <AnimatePresence mode="wait" initial={false}>
          {!open ? (
            <motion.span
              key="hint"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <span
                className={cn(
                  "animate-pulse text-[12.5px] font-semibold",
                  onDark ? "text-white/75" : "text-[#1D1D1F]/70"
                )}
              >
                Tap to reveal
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="yours"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#30D158]/20 px-3.5 py-1.5 text-[12px] font-bold text-[#5BE07E]"
            >
              <Check size={12} strokeWidth={3} aria-hidden /> Yours to use
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Reveal burst */}
      {open && celebrate ? <ConfettiFX onDark={onDark} /> : null}
    </div>
  );

  if (!onOpen) return <div className={cn("relative w-full max-w-[340px]", "pointer-events-none")}>{card}</div>;

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // the ticket reveals on its own tap, not the scene advance
        onOpen();
      }}
      aria-label={open ? "Reward revealed" : "Tap to reveal your reward"}
      className="relative mx-auto block w-full max-w-[340px] cursor-pointer outline-none transition-transform duration-150 active:scale-[0.97]"
      whileTap={{ scale: 0.97 }}
    >
      {card}
    </motion.button>
  );
}
