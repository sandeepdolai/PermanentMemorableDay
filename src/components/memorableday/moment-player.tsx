"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Heart, Play, RotateCcw, Share2, X } from "lucide-react";
import type { PlayerPayload } from "./md-context";
import { SOUNDTRACKS } from "@/lib/mock-data";
import { CoverArt } from "./cover-art";
import { LogoMark } from "./bits";
import { useMD } from "./md-context";
import { cn } from "@/lib/utils";

const CONFETTI_COLORS = ["#007AFF", "#64D2FF", "#FF6482", "#FFD60A", "#FFFFFF", "#30D158"];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay: number;
  color: string;
}

/** One-shot confetti burst (gift reveal) */
function ConfettiBurst() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * 360 + (Math.random() - 0.5) * 18;
      const distance = 90 + Math.random() * 120;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance,
        size: 6 + Math.random() * 7,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.14,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      };
    })
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.5 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1 + p.delay * 2.4, ease: "easeOut", delay: p.delay }}
          className="absolute rounded-[2px]"
          style={{ width: p.size, height: p.size * 0.62, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

/** Tap-to-open gift box (signature interaction) */
function GiftBox({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? "Gift opened" : "Tap to open the gift"}
      onClick={(e) => {
        e.stopPropagation();
        if (!open) onOpen();
      }}
      className="relative outline-none"
    >
      <motion.div
        animate={open ? { y: 0 } : { y: [0, -10, 0] }}
        transition={open ? { duration: 0.2 } : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        className="relative"
      >
        {/* box body */}
        <div
          className="relative h-[84px] w-[104px] rounded-[18px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45)]"
          style={{ background: "linear-gradient(160deg, #339CFF, #007AFF 60%)" }}
        >
          {/* vertical ribbon */}
          <div className="absolute inset-y-0 left-1/2 w-[14px] -translate-x-1/2 bg-white/75" />
          <div className="absolute inset-0 rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),transparent_45%)]" />
        </div>
        {/* lid */}
        <motion.div
          animate={open ? { y: -84, rotate: -24, opacity: 1 } : { y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="absolute -top-[14px] left-[-6px] h-[26px] w-[116px] rounded-[10px] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.4)]"
          style={{ background: "linear-gradient(160deg, #5AB4FF, #0A6FE0)" }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[14px] -translate-x-1/2 bg-white/75" />
          <div className="absolute inset-0 rounded-[10px] bg-[linear-gradient(180deg,rgba(255,255,255,0.4),transparent_60%)]" />
        </motion.div>
        {/* bow */}
        <motion.div
          animate={open ? { y: -120, rotate: -30, opacity: 0.9 } : { y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="absolute -top-[34px] left-1/2 flex -translate-x-1/2 items-center justify-center text-white drop-shadow-md"
        >
          <Heart size={22} fill="currentColor" strokeWidth={0} />
        </motion.div>
      </motion.div>
    </button>
  );
}

/** Progress dots (scene indicator) — adapts to light/dark scenes */
function SceneDots({ total, current, light }: { total: number; current: number; light?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-2",
        light ? "bg-[#1D1D1F]/[0.06]" : "bg-[#1D1D1F]/35"
      )}
      style={{ WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "h-[6px] rounded-full transition-all duration-300",
            i === current
              ? light
                ? "w-5 bg-[#1D1D1F]"
                : "w-5 bg-white"
              : light
                ? "w-[6px] bg-[#1D1D1F]/30"
                : "w-[6px] bg-white/40"
          )}
        />
      ))}
    </div>
  );
}

/** Floating heart burst (double-tap / love reaction) */
function HeartBurst() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.span
        initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
        animate={{ scale: [0.4, 1.25, 1.1], opacity: [0, 1, 0], rotate: [-12, 6, 0] }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="text-[#FF6482] drop-shadow-[0_12px_32px_rgba(255,100,130,0.6)]"
      >
        <Heart size={110} fill="currentColor" strokeWidth={0} />
      </motion.span>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * 360;
        const rad = (angle * Math.PI) / 180;
        const d = 70 + (i % 3) * 26;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: Math.cos(rad) * d, y: Math.sin(rad) * d, opacity: 0, scale: 1 }}
            transition={{ duration: 0.75, ease: "easeOut", delay: 0.06 * (i % 3) }}
            className="absolute rounded-full"
            style={{
              width: 8 + (i % 4) * 3,
              height: 8 + (i % 4) * 3,
              backgroundColor: ["#FF6482", "#FFD60A", "#64D2FF"][i % 3],
            }}
          />
        );
      })}
    </div>
  );
}

/** Recipient-answerable quiz (abstract — every answer is the recipient) */
const QUIZ_OPTIONS = [
  { label: "You", correct: true },
  { label: "Not you", correct: false },
  { label: "Someone else", correct: false },
];

const SCENE_COUNT = 5;

export function MomentPlayer({ moment, onClose }: { moment: PlayerPayload; onClose: () => void }) {
  const { setTab, notify, openShare, sheet } = useMD();
  const [scene, setScene] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [quizSolved, setQuizSolved] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [loved, setLoved] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const track = moment.trackId ? (SOUNDTRACKS.find((t) => t.id === moment.trackId) ?? null) : null;

  const advance = useCallback(() => {
    // Quiz scene: requires a correct answer first
    if (scene === 2 && !quizSolved) return;
    // Gift scene: first tap opens the gift
    if (scene === 3) {
      if (!giftOpen) {
        setGiftOpen(true);
        return;
      }
    }
    setScene((s) => Math.min(s + 1, SCENE_COUNT - 1));
  }, [scene, giftOpen, quizSolved]);

  /** Love reaction — heart burst + filled state (idempotent per session) */
  const love = useCallback(() => {
    setLoved((prev) => {
      if (!prev) setBurstKey((k) => k + 1);
      return true;
    });
  }, []);

  // Escape to close (deferred while a sheet is layered above the player)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sheet) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sheet]);

  const isFinal = scene === SCENE_COUNT - 1;
  const isLightScene = isFinal;

  const replay = () => {
    setScene(0);
    setGiftOpen(false);
    setQuizSolved(false);
    setWrongPick(null);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Experience: ${moment.title}`}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="absolute inset-0 z-[70] flex flex-col overflow-hidden bg-[#1D1D1F]"
    >
      {/* Scenes */}
      <div
        className="relative flex-1 cursor-pointer select-none"
        onClick={isFinal ? undefined : advance}
        onDoubleClick={isFinal ? undefined : love}
      >
        <AnimatePresence mode="wait" initial={false}>
          {/* Scene 1 — Intro */}
          {scene === 0 && (
            <motion.section
              key="s0"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <CoverArt variant={moment.cover} className="absolute inset-0">
                <div className="absolute inset-0 bg-[#1D1D1F]/35" />
              </CoverArt>
              <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/75"
                >
                  MemorableDay presents
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 20 }}
                  className="mt-3 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white drop-shadow-lg"
                >
                  {moment.title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-3 text-[16px] font-medium text-white/85"
                >
                  {moment.dedication}
                </motion.p>
              </div>
            </motion.section>
          )}

          {/* Scene 2 — Message */}
          {scene === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0 bg-[#1D1D1F]" />
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[90px]"
                style={{ background: "radial-gradient(circle, rgba(0,122,255,0.55), transparent 70%)" }}
              />
              <div
                aria-hidden
                className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full opacity-40 blur-[70px]"
                style={{ background: "radial-gradient(circle, rgba(255,100,130,0.5), transparent 70%)" }}
              />
              <div className="relative flex h-full flex-col items-center justify-center px-9 text-center">
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="text-[27px] font-bold leading-[1.25] tracking-[-0.02em] text-white"
                >
                  Some moments deserve more than a text message.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 text-[15px] leading-relaxed text-white/60"
                >
                  This one is interactive — keep going.
                </motion.p>
              </div>
            </motion.section>
          )}

          {/* Scene 3 — Quiz (interactive) */}
          {scene === 2 && (
            <motion.section
              key="s2-quiz"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0 bg-[#1D1D1F]" />
              <div
                aria-hidden
                className="absolute -right-16 top-10 h-64 w-64 rounded-full opacity-40 blur-[80px]"
                style={{ background: "radial-gradient(circle, rgba(94,92,230,0.6), transparent 70%)" }}
              />
              <div
                aria-hidden
                className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full opacity-35 blur-[70px]"
                style={{ background: "radial-gradient(circle, rgba(100,210,255,0.55), transparent 70%)" }}
              />
              <div className="relative flex h-full flex-col items-center justify-center px-9 text-center">
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] font-bold uppercase tracking-[0.2em] text-white/70"
                >
                  Pop quiz
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="mt-3 max-w-[300px] text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-white"
                >
                  Who is this moment for?
                </motion.h2>

                <div className="mt-9 flex w-full max-w-[280px] flex-col gap-3" role="group" aria-label="Quiz answers">
                  {QUIZ_OPTIONS.map((o, i) => {
                    const isCorrectPick = quizSolved && o.correct;
                    const isWrongPick = wrongPick === i;
                    return (
                      <motion.button
                        key={o.label}
                        type="button"
                        aria-label={`Answer: ${o.label}`}
                        disabled={quizSolved}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (quizSolved) return;
                          if (o.correct) {
                            setQuizSolved(true);
                            setWrongPick(null);
                          } else {
                            setWrongPick(i);
                            window.setTimeout(() => setWrongPick((w) => (w === i ? null : w)), 600);
                          }
                        }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={
                          isWrongPick
                            ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 0] }
                            : { opacity: 1, y: 0, x: 0 }
                        }
                        transition={isWrongPick ? { duration: 0.45 } : { delay: 0.2 + i * 0.09 }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-full border py-3.5 text-[16px] font-semibold transition-colors",
                          isCorrectPick
                            ? "border-[#30D158]/60 bg-[#30D158]/25 text-white"
                            : isWrongPick
                              ? "border-[#FF6482]/60 bg-[#FF6482]/20 text-white"
                              : quizSolved
                                ? "border-white/10 bg-white/[0.04] text-white/35"
                                : "border-white/25 bg-white/10 text-white backdrop-blur-md active:scale-[0.96]"
                        )}
                      >
                        {o.label}
                        {isCorrectPick ? <Check size={16} strokeWidth={3} aria-hidden /> : null}
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {quizSolved ? (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-8 text-[14px] font-medium text-white/70"
                    >
                      Obviously. Keep going —
                    </motion.p>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="mt-8 text-[12.5px] font-semibold text-white/60"
                    >
                      Pick an answer to continue
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {/* Scene 4 — Gift reveal */}
          {scene === 3 && (
            <motion.section
              key="s3-gift"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <CoverArt variant={moment.cover + 3} className="absolute inset-0">
                <div className="absolute inset-0 bg-[#1D1D1F]/45" />
              </CoverArt>
              {giftOpen ? <ConfettiBurst /> : null}
              <div className="relative flex h-full flex-col items-center justify-center px-9 text-center">
                {!giftOpen ? (
                  <>
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] font-bold uppercase tracking-[0.2em] text-white/70"
                    >
                      A surprise
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mb-10 mt-2 text-[22px] font-bold tracking-[-0.02em] text-white"
                    >
                      There&apos;s something for you.
                    </motion.p>
                    <GiftBox open={false} onOpen={() => setGiftOpen(true)} />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="mt-10 text-[13px] font-semibold text-white/70"
                    >
                      Tap the gift to open it
                    </motion.p>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md"
                    >
                      <Heart size={38} className="text-[#FF6482]" fill="currentColor" strokeWidth={0} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18, type: "spring", stiffness: 220, damping: 20 }}
                      className="mt-6 text-[28px] font-extrabold leading-tight tracking-[-0.025em] text-white drop-shadow-md"
                    >
                      You are unforgettable.
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-2.5 text-[15px] text-white/75"
                    >
                      A small moment, made just for you.
                    </motion.p>
                  </>
                )}
              </div>
            </motion.section>
          )}

          {/* Scene 5 — Signature */}
          {scene === 4 && (
            <motion.section
              key="s4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto bg-[#F5F5F7]"
            >
              <div
                aria-hidden
                className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#007AFF]/[0.14] blur-[80px]"
              />
              <div
                aria-hidden
                className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#FF6482]/[0.12] blur-[80px]"
              />
              <div className="relative flex min-h-full flex-col items-center justify-center px-8 py-16 text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  <LogoMark size={56} />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                  className="mt-5 flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.01em] text-[#1D1D1F]"
                >
                  {moment.dedication}
                  <Heart size={15} className="text-[#FF375F]" fill="currentColor" strokeWidth={0} aria-hidden />
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="my-6 h-[1.5px] w-40 origin-center rounded-full bg-[#1D1D1F]/[0.08]"
                />
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                >
                  <p className="text-[13px] font-semibold text-[#AAAAAA]">Created with MemorableDay</p>
                  <p className="mt-1 text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                    Make every moment memorable.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-9 flex w-full max-w-[300px] flex-col gap-3"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      setTab("create");
                      notify("Start your own moment — Create tab");
                    }}
                    className="w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
                  >
                    Create your own moment
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openShare({ id: moment.id, title: moment.title });
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#1D1D1F]/[0.1] bg-white py-3 text-[14px] font-semibold text-[#007AFF] hairline transition-transform active:scale-[0.97]"
                  >
                    <Share2 size={14} aria-hidden /> Share this moment
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      replay();
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13.5px] font-semibold text-[#AAAAAA] transition-colors active:text-[#1D1D1F]"
                  >
                    <RotateCcw size={13} aria-hidden /> Replay
                  </button>
                </motion.div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Love burst (double-tap or heart button) */}
        {burstKey > 0 ? <HeartBurst key={burstKey} /> : null}

        {/* Soundtrack chip — "now playing" (dark scenes only) */}
        {track && !isFinal ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pointer-events-none absolute bottom-[70px] left-4 flex items-center gap-2 rounded-full bg-[#1D1D1F]/40 py-1.5 pl-2.5 pr-3.5 text-white backdrop-blur-md"
          >
            <span aria-hidden className="md-eq h-3 w-4 text-[#64D2FF]">
              <span />
              <span />
              <span />
            </span>
            <span className="text-[11.5px] font-semibold tracking-[-0.01em]">{track.title}</span>
          </motion.div>
        ) : null}

        {/* Continue hint */}
        <AnimatePresence>
          {!isFinal && !(scene === 2 && !quizSolved) ? (
            <motion.button
              type="button"
              aria-label="Continue"
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, -3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ y: { repeat: Infinity, duration: 1.6, ease: "easeInOut" } }}
              className="absolute inset-x-0 bottom-9 mx-auto flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-[12.5px] font-semibold text-white backdrop-blur-md"
            >
              Tap to continue <ChevronRight size={13} aria-hidden />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Top chrome: close + scene dots + share (adapts to light/dark scenes) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          aria-label="Close experience"
          onClick={onClose}
          className={cn(
            "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90",
            isLightScene
              ? "bg-white/80 text-[#1D1D1F] hairline backdrop-blur-xl"
              : "bg-[#1D1D1F]/35 text-white backdrop-blur-md"
          )}
        >
          <X size={19} strokeWidth={2.4} />
        </button>
        <SceneDots total={SCENE_COUNT} current={scene} light={isLightScene} />
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={loved ? "Loved — thank you" : "Love this moment"}
            aria-pressed={loved}
            onClick={(e) => {
              e.stopPropagation();
              love();
              if (!loved) notify("Loved — they’ll know you cared");
            }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90",
              isLightScene
                ? "bg-white/80 hairline backdrop-blur-xl"
                : "bg-[#1D1D1F]/35 backdrop-blur-md",
              loved ? "text-[#FF375F]" : isLightScene ? "text-[#1D1D1F]" : "text-white"
            )}
          >
            <motion.span
              key={String(loved)}
              initial={{ scale: loved ? 0.5 : 1 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
              className="flex"
            >
              <Heart size={17} fill={loved ? "currentColor" : "none"} strokeWidth={2.2} aria-hidden />
            </motion.span>
          </button>
          <button
            type="button"
            aria-label="Share experience"
            onClick={(e) => {
              e.stopPropagation();
              openShare({ id: moment.id, title: moment.title });
            }}
            className={cn(
              "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90",
              isLightScene
                ? "bg-white/80 text-[#007AFF] hairline backdrop-blur-xl"
                : "bg-[#1D1D1F]/35 text-white backdrop-blur-md"
            )}
          >
            <Share2 size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
