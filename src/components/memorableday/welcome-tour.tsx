"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Heart, Share2, Sparkles } from "lucide-react";
import { CoverArt } from "./cover-art";
import { LogoMark } from "./bits";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    cover: 5,
    icon: Sparkles,
    iconBg: "rgba(255,255,255,0.25)",
    title: "Create moments that land",
    sub: "Stack scenes, reveals and rewards into an interactive experience — no code, nothing to install.",
  },
  {
    cover: 1,
    icon: Share2,
    iconBg: "rgba(255,255,255,0.25)",
    title: "Share with a single link",
    sub: "Every moment lives at its own link with a QR code. Recipients just tap — no account needed.",
  },
  {
    cover: 9,
    icon: Heart,
    iconBg: "rgba(255,255,255,0.25)",
    title: "Watch every scene land",
    sub: "See opens, completion and loves in real time — then invite them to make one back.",
  },
] as const;

/**
 * First-run welcome tour — 3 slides, iOS onboarding style.
 * Phone: full-bleed. Tablet/desktop: a centered floating card over a scrim.
 * Marks itself seen in localStorage when dismissed.
 */
export function WelcomeTour({
  open,
  onClose,
  onSignIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
}) {
  const [step, setStep] = useState(0);

  // Reset to the first slide whenever the tour (re)opens —
  // "previous render" pattern (adjusting state when a prop changes, render-safe)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStep(0);
  }

  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-[95] flex flex-col bg-[#F5F5F7] md:items-center md:justify-center md:bg-[#1D1D1F]/[0.4] md:p-6 md:backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to MemorableDay"
        >
          {/* Tour card — full-bleed column on phone, floating card ≥ md */}
          <div className="flex min-h-0 w-full flex-1 flex-col md:h-[min(640px,calc(100dvh-48px))] md:max-w-[500px] md:flex-none md:overflow-hidden md:rounded-[44px] md:shadow-[0_60px_140px_-30px_rgba(29,29,31,0.55)]">
          {/* Visual half */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 44 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -44 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <CoverArt variant={slide.cover} className="h-full w-full" />
                {/* soft gradient into the sheet below */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F5F7]"
                />
              </motion.div>
            </AnimatePresence>

            {/* Skip */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#1D1D1F] backdrop-blur-md transition-transform active:scale-95"
              style={{ boxShadow: "0 8px 24px -10px rgba(29,29,31,0.35)" }}
            >
              Skip
            </button>
          </div>

          {/* Text half */}
          <div className="relative rounded-t-[36px] bg-[#F5F5F7] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-7 md:pb-8">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-[#1D1D1F]/[0.14]"
            />
            <div className="mx-auto max-w-[340px]">
              <div className="flex items-center gap-2.5">
                <LogoMark size={34} />
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#AAAAAA]">
                  MemorableDay
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <span
                    aria-hidden
                    className="mt-5 flex h-12 w-12 items-center justify-center rounded-[16px] text-white"
                    style={{ background: "linear-gradient(135deg, #007AFF, #40B4FF)", boxShadow: "0 12px 28px -10px rgba(0,122,255,0.55)" }}
                  >
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <h2 className="mt-4 text-[27px] font-bold leading-[1.14] tracking-[-0.03em] text-[#1D1D1F]">
                    {slide.title}
                  </h2>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[#AAAAAA]">{slide.sub}</p>
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              <div className="mt-7 flex items-center gap-2" role="tablist" aria-label="Tour progress">
                {SLIDES.map((s, i) => (
                  <span
                    key={s.title}
                    aria-hidden
                    className={cn(
                      "h-[7px] rounded-full transition-all duration-300",
                      i === step ? "w-7 bg-[#007AFF]" : "w-[7px] bg-[#1D1D1F]/[0.15]"
                    )}
                  />
                ))}
                <span className="sr-only">
                  Step {step + 1} of {SLIDES.length}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="flex-1 rounded-full bg-[#1D1D1F]/[0.06] py-3.5 text-[15px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.97]"
                >
                  I have an account
                </button>
                <button
                  type="button"
                  onClick={() => (last ? onClose() : setStep((s) => s + 1))}
                  aria-label={last ? "Get started" : "Next"}
                  className="flex flex-[1.3] items-center justify-center gap-1.5 rounded-full bg-[#007AFF] py-3.5 text-[15px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
                >
                  {last ? "Get started" : "Next"}
                  {last ? null : <ChevronRight size={16} strokeWidth={2.6} aria-hidden />}
                </button>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
