"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  Heart,
  MousePointerClick,
  Music as MusicIcon,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Video as VideoIcon,
  X,
} from "lucide-react";
import type { PlayerPayload } from "./md-context";
import type { BlockDoc, SceneDoc, SongPick } from "@/lib/md-blocks";
import { backgroundDimClass, formatClock, normalizeUrl, photoFilterCss, urlDomain } from "@/lib/md-blocks";
import { CoverArt } from "./cover-art";
import { GiftBox, GiftConfetti, isLightWrap } from "./gift-box";
import { CONFETTI_PALETTES, ConfettiFX, type ConfettiStyleName } from "./confetti";
import { RewardTicket } from "./reward-ticket";
import { CouponMachine, useCouponPlay } from "./coupon-machine";
import { LogoMark } from "./bits";
import { useMD } from "./md-context";
import { cn } from "@/lib/utils";


/** Progress dots (scene indicator) — adapts to light/dark scenes */
function SceneDots({ total, current, light }: { total: number; current: number; light?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-2",
        light ? "bg-black/[0.06]" : "bg-[#1D1D1F]/35"
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
                ? "w-5 bg-black"
                : "w-5 bg-white"
              : light
                ? "w-[6px] bg-black/30"
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

/* ------------------------------------------------------------------ */
/* Soundtrack — real catalog preview, snippet looped across scenes     */
/* ------------------------------------------------------------------ */

type SoundtrackState = "idle" | "playing" | "paused" | "needsTap";

/** Plays the picked snippet on loop; falls back to a tap-to-start chip
 *  when the browser blocks programmatic audio. */
function useSoundtrack(music: SongPick | null) {
  const [state, setState] = useState<SoundtrackState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = music?.previewUrl ?? null;
  const start = music?.start ?? 0;
  const length = music?.length ?? 30;

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;

    const begin = () => {
      try {
        audio.currentTime = start;
      } catch {
        // seek before metadata — retried on timeupdate anyway
      }
      audio
        .play()
        .then(() => setState("playing"))
        .catch(() => setState("needsTap"));
    };
    const onTime = () => {
      if (audio.currentTime >= start + length - 0.05) {
        audio.currentTime = start; // loop the snippet
      }
    };
    const onMeta = () => {
      try {
        audio.currentTime = start;
      } catch {
        // ignore
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    begin();
    if (audio.readyState >= 1) {
      try {
        audio.currentTime = start;
      } catch {
        // ignore
      }
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.pause();
      audioRef.current = null;
    };
  }, [url, start, length]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        audio.currentTime = start;
      } catch {
        // ignore
      }
      void audio.play().then(() => setState("playing")).catch(() => setState("needsTap"));
    } else {
      audio.pause();
      setState("paused");
    }
  }, [start]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.paused && state !== "needsTap") {
      void audio.play().then(() => setState("playing")).catch(() => {});
    }
  }, [state]);

  return { state, toggle, pause, resume };
}

/* ------------------------------------------------------------------ */
/* Authored block renderers (block-driven mode)                        */
/* ------------------------------------------------------------------ */

function TextBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const body = block.text?.trim() || block.data?.body?.trim() || "";
  const isAi = !!block.text?.trim();
  const long = body.length > 120;
  const medium = body.length > 40;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="w-full text-center"
    >
      {body ? (
        <>
          <p
            className={cn(
              "font-bold leading-[1.22] tracking-[-0.02em] text-white drop-shadow-md",
              long ? "text-[21px] md:text-[28px]" : medium ? "text-[26px] md:text-[34px]" : "text-[31px] md:text-[42px]"
            )}
          >
            {isAi ? `“${body}”` : body}
          </p>
          {isAi ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#B4A7FF] backdrop-blur-md">
              <Sparkles size={10} aria-hidden /> AI composed
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-[27px] font-bold leading-[1.25] tracking-[-0.02em] text-white md:text-[36px]">
          Some words that land.
        </p>
      )}
    </motion.div>
  );
}

function PhotoBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const d = block.data;
  const caption = d?.caption?.trim();
  return (
    <motion.figure
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.45, ease: "easeOut" }}
      className="relative w-full overflow-hidden rounded-[22px] shadow-[0_30px_70px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/15"
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 9, ease: "easeOut" }}
        className="w-full"
      >
        {d?.image ? (
          <img
            src={d.image}
            alt={caption || "A photo in this moment"}
            style={photoFilterCss(d.filter)}
            className="max-h-[46vh] w-full object-cover md:max-h-[52vh]"
          />
        ) : (
          <CoverArt variant={d?.filter && d.filter !== "Original" ? 4 : 0} className="h-[36vh] w-full md:h-[42vh]" />
        )}
      </motion.div>
      {caption ? (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3.5 pt-10 text-center">
          <span className="text-[14px] font-medium italic tracking-[-0.01em] text-white/95">{caption}</span>
        </figcaption>
      ) : null}
      {d?.filter && d.filter !== "Original" ? (
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-white backdrop-blur-md">
          {d.filter}
        </span>
      ) : null}
    </motion.figure>
  );
}

function VideoBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const d = block.data;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.45, ease: "easeOut" }}
      className="relative w-full overflow-hidden rounded-[22px] bg-black shadow-[0_30px_70px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/15"
    >
      {d?.video ? (
        <>
          <video
            ref={videoRef}
            src={d.video}
            playsInline
            preload="metadata"
            aria-label="Video in this moment"
            className="max-h-[46vh] w-full object-cover md:max-h-[52vh]"
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v && d?.duration && v.currentTime >= d.duration) {
                v.pause();
                setPlaying(false);
              }
            }}
            onEnded={() => setPlaying(false)}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // the scene tap shouldn't advance while playing
              start();
            }}
            aria-label={playing ? "Pause video" : "Play video"}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md transition-all active:scale-90",
                playing ? "opacity-0 hover:opacity-100" : "opacity-100"
              )}
            >
              {playing ? <Pause size={20} fill="currentColor" aria-hidden /> : <Play size={20} fill="currentColor" className="ml-1" aria-hidden />}
            </span>
          </button>
        </>
      ) : (
        <div className="flex h-[30vh] w-full flex-col items-center justify-center gap-2 text-white/60 md:h-[34vh]">
          <VideoIcon size={26} aria-hidden />
          <p className="text-[13px] font-semibold">A clip plays here</p>
        </div>
      )}
      <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white backdrop-blur-md">
        {formatClock(d?.duration ?? 12)}
      </span>
    </motion.div>
  );
}

function AudioBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const song = block.data?.song;
  const mode = block.data?.playMode ?? "scene";

  if (!song) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 + index * 0.09 }}
        className="flex w-full flex-col items-center gap-2 rounded-[22px] bg-white/[0.06] px-6 py-8 ring-1 ring-white/10"
      >
        <MusicIcon size={24} className="text-white/60" aria-hidden />
        <p className="text-[14px] font-semibold text-white/80">A song plays here</p>
      </motion.div>
    );
  }

  // Background mode — no card, the snippet just loops under the scene.
  if (mode === "background") {
    return <BackgroundAudio song={song} />;
  }

  return <AudioSceneCard song={song} index={index} />;
}

/** Hidden scene-scope music — loops the picked snippet while the scene is
 *  open and stops on exit. Falls back to a tap chip when autoplay is blocked. */
function BackgroundAudio({ song }: { song: SongPick }) {
  const [needsTap, setNeedsTap] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(song.previewUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    const seek = () => {
      try {
        audio.currentTime = song.start;
      } catch {
        // seek before metadata — queued on most browsers
      }
    };
    const onTime = () => {
      if (audio.currentTime >= song.start + song.length - 0.05) {
        seek(); // loop the snippet
      }
    };
    const onMeta = () => seek();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    seek();
    void audio
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
    if (audio.readyState >= 1) seek();
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.pause();
      audioRef.current = null;
    };
  }, [song.previewUrl, song.start, song.length]);

  const tapPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = song.start;
    } catch {
      // ignore
    }
    void audio.play().then(() => setNeedsTap(false)).catch(() => {});
  };

  if (!needsTap) return null;
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-6">
      <button
        type="button"
        onClick={tapPlay}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md transition-transform active:scale-95"
      >
        <AudioLines size={14} aria-hidden className="text-[#64D2FF]" />
        Tap to play the background music
      </button>
    </span>
  );
}

/** Visible song card (scene mode) — uploads get a gradient tile instead of artwork. */
function AudioSceneCard({ song, index }: { song: SongPick; index: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Plays the picked snippet once when the scene enters.
  useEffect(() => {
    const audio = new Audio(song.previewUrl);
    audioRef.current = audio;
    const onTime = () => {
      if (audio.currentTime >= song.start + song.length) {
        audio.pause();
        setPlaying(false);
      }
    };
    const onMeta = () => {
      try {
        audio.currentTime = song.start;
      } catch {
        // ignore
      }
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    if (audio.readyState >= 1) onMeta();
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.pause();
      audioRef.current = null;
    };
  }, [song.previewUrl, song.start, song.length]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't advance the scene from a play/pause tap
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        audio.currentTime = song.start;
      } catch {
        // ignore
      }
      void audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.45, ease: "easeOut" }}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      className="flex w-full items-center gap-4 rounded-[22px] bg-white/[0.08] p-4 text-left ring-1 ring-white/12 backdrop-blur-md active:scale-[0.98]"
    >
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] shadow-lg">
        {song.artwork ? (
          <img src={song.artwork} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF375F] to-[#5E5CE6] text-white"
          >
            <MusicIcon size={20} />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16.5px] font-bold tracking-[-0.01em] text-white">{song.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[13px] text-white/65">
          {playing ? (
            <span aria-hidden className="md-eq h-3 w-4 text-[#64D2FF]">
              <span />
              <span />
              <span />
            </span>
          ) : null}
          <span className="truncate">{song.artist}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-[#FF375F]/25 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#FF9FB2]">
          {formatClock(song.length)}
        </span>
        {song.source === "upload" ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white/60">
            Your file
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}

function QuizBlockView({
  block,
  index,
  solved,
  onSolved,
}: {
  block: BlockDoc;
  index: number;
  solved: boolean;
  onSolved: () => void;
}) {
  const d = block.data;
  const question = d?.question?.trim() || "Who is this moment for?";
  const options = d?.options?.length ? d.options : ["You", "Not you", "Someone else"];
  const answer = d?.answer ?? 0;
  const [wrong, setWrong] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Pop quiz</p>
      <h2 className="mx-auto mt-2 max-w-[440px] text-center text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-white md:text-[28px]">
        {question}
      </h2>
      <div className="mx-auto mt-7 flex w-full max-w-[320px] flex-col gap-3 md:max-w-[380px]" role="group" aria-label="Quiz answers">
        {options.map((o, i) => {
          const correctPick = solved && i === answer;
          const wrongPick = wrong === i;
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={`Answer: ${o}`}
              disabled={solved}
              onClick={(e) => {
                e.stopPropagation(); // don't advance the scene from an answer tap
                if (solved) return;
                if (i === answer) {
                  onSolved();
                  setWrong(null);
                } else {
                  setWrong(i);
                  window.setTimeout(() => setWrong((w) => (w === i ? null : w)), 600);
                }
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={wrongPick ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 0] } : { opacity: 1, y: 0, x: 0 }}
              transition={wrongPick ? { duration: 0.45 } : { delay: 0.18 + i * 0.08 }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-full border py-3.5 text-[15.5px] font-semibold transition-colors",
                correctPick
                  ? "border-[#30D158]/60 bg-[#30D158]/25 text-white"
                  : wrongPick
                    ? "border-[#FF6482]/60 bg-[#FF6482]/20 text-white"
                    : solved
                      ? "border-white/10 bg-white/[0.04] text-white/35"
                      : "border-white/25 bg-white/10 text-white backdrop-blur-md active:scale-[0.96]"
              )}
            >
              {o}
              {correctPick ? <Check size={16} strokeWidth={3} aria-hidden /> : null}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {solved ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center text-[13.5px] font-medium text-white/70"
          >
            Obviously. Keep going —
          </motion.p>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="mt-6 text-center text-[12.5px] font-semibold text-white/60"
          >
            Pick an answer to continue
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GiftBlockView({
  block,
  index,
  open,
  onOpen,
}: {
  block: BlockDoc;
  index: number;
  open: boolean;
  onOpen: () => void;
}) {
  const d = block.data;
  const wrap = d?.wrap ?? "#5E5CE6";
  const iconTint = isLightWrap(wrap) ? "#1D1D1F" : wrap;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      {open ? <GiftConfetti tint={wrap} /> : null}
      {!open ? (
        <>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            <Sparkles size={11} aria-hidden /> A surprise
          </p>
          <p className="mb-7 mt-1.5 text-[19px] font-bold tracking-[-0.02em] text-white md:text-[24px]">
            There&apos;s something for you.
          </p>
        </>
      ) : null}
      {/* The box glides up to center stage as the headline leaves — the note
          then rises BELOW it, so the flying lid can never cover the message. */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 210, damping: 26 }}
        className="relative z-10"
      >
        <GiftBox open={open} wrap={d?.wrap} ribbon={d?.ribbon} onOpen={onOpen} onDark />
      </motion.div>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 21, delay: 0.3 }}
          className="relative z-20 mt-6 w-full max-w-[340px] rounded-[22px] border border-white/25 bg-white/[0.14] px-6 py-5 text-center shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        >
          <span
            aria-hidden
            className="mx-auto mb-2.5 flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${wrap}40` }}
          >
            <Gift size={15} style={{ color: iconTint }} aria-hidden />
          </span>
          <p className="text-[18px] font-bold leading-snug tracking-[-0.02em] text-white md:text-[22px]">
            {d?.message?.trim() || "This is for you."}
          </p>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // keep the pill tap from also advancing the scene
            onOpen();
          }}
          className="mt-7 flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F] shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.06] transition-all hover:scale-[1.03] active:scale-95"
        >
          <Gift size={15} style={{ color: iconTint }} aria-hidden /> Open the gift
        </button>
      )}
    </motion.div>
  );
}

function CountdownBlockView({
  block,
  index,
  done,
  onDone,
}: {
  block: BlockDoc;
  index: number;
  done: boolean;
  onDone: () => void;
}) {
  const minutes = block.data?.minutes ?? 1;
  const totalMs = minutes * 60_000;
  // Accelerated preview: any countdown resolves within ~4.5s.
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (done || !running) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 4500; // 0 → 1 over 4.5s
      if (t >= 1) {
        setElapsed(1);
        setRunning(false);
        onDone();
      } else {
        setElapsed(t);
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [done, running, onDone]);

  const remainingMs = Math.max(0, totalMs * (1 - elapsed));
  const mm = Math.floor(remainingMs / 60000);
  const ss = Math.floor((remainingMs % 60000) / 1000);
  const pct = Math.round(elapsed * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Unlocks in</p>
      <p
        className={cn(
          "mt-2 font-extrabold tabular-nums tracking-tight transition-colors",
          done ? "text-[34px] text-[#30D158] md:text-[42px]" : "text-[44px] text-white md:text-[56px]"
        )}
      >
        {done ? "Open" : `${String(mm).padStart(2, "0")} : ${String(ss).padStart(2, "0")}`}
      </p>
      <div className="mt-4 h-[6px] w-full max-w-[280px] overflow-hidden rounded-full bg-white/15">
        <div
          className={cn("h-full rounded-full transition-[width] duration-75", done ? "bg-[#30D158]" : "bg-[#FF9F0A]")}
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-white/60">
        <Clock size={12} aria-hidden />
        {done ? "The wait is over" : "Time moves fast in this preview"}
      </p>
      {!done ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRunning(false);
            setElapsed(1);
            onDone();
          }}
          className="mt-4 rounded-full bg-white/12 px-4 py-2 text-[12.5px] font-semibold text-white backdrop-blur-md transition-transform active:scale-95"
        >
          Skip the wait
        </button>
      ) : null}
    </motion.div>
  );
}

function RewardBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const { notify } = useMD();
  const d = block.data;
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const kind = d?.rewardKind;
  const code = d?.code?.trim() || "MD-REWARD";
  const url = d?.url?.trim();
  const domain = url ? urlDomain(url) : null;

  const copyCode = async () => {
    const flashCopied = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    try {
      await navigator.clipboard.writeText(code);
      flashCopied();
    } catch {
      // Async clipboard blocked (no gesture/permission) — try the legacy path.
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) {
          flashCopied();
          return;
        }
      } catch {
        // fall through to the toast
      }
      notify(`Code: ${code}`); // last resort — surface it for a manual copy
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <RewardTicket
        kind={kind}
        code={code}
        open={revealed}
        onOpen={() => setRevealed(true)}
      />

      {/* Post-reveal actions — copy the code, open the redeem link */}
      <AnimatePresence>
        {revealed ? (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.22 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void copyCode();
              }}
              aria-label="Copy reward code"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-[1.1rem] py-2.5 text-[12.5px] font-semibold backdrop-blur-md transition-all active:scale-95",
                copied
                  ? "border-[#30D158]/50 bg-[#30D158]/25 text-[#8CE8B0]"
                  : "border-white/15 bg-white/12 text-white hover:bg-white/20"
              )}
            >
              {copied ? (
                <>
                  <Check size={13} strokeWidth={3} aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} aria-hidden /> Copy code
                </>
              )}
            </button>
            {url && domain ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(normalizeUrl(url), "_blank", "noopener,noreferrer");
                  notify(`Opening ${domain}…`);
                }}
                aria-label={`Redeem at ${domain}`}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#5BE07E] to-[#1E9E4A] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_26px_-8px_rgba(48,209,88,0.75)] transition-transform active:scale-95"
              >
                <ExternalLink size={13} aria-hidden /> {domain}
              </button>
            ) : null}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function CouponBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const { notify } = useMD();
  const d = block.data;
  const { played, revealed, play } = useCouponPlay();
  const code = d?.code?.trim() || "SAVE20";
  const url = d?.url?.trim();
  const domain = url ? urlDomain(url) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      {/* The machine owns the whole flow: PLAY & WIN → claw grabs the golden
          ticket → code reveals → COPY CODE → COPIED ✓ (clipboard built in). */}
      <CouponMachine
        title={d?.heading?.trim() || "COUPON CODE"}
        subtitle={d?.body?.trim() || "REVEAL"}
        ticketLabel={d?.stepLabel?.trim() || "YOUR COUPON CODE"}
        buttonLabel={d?.label?.trim() || "PLAY & WIN"}
        code={code}
        open={played}
        celebrate={revealed}
        onPlay={play}
      />

      {/* Post-reveal action — open the redeem link (copy lives on the machine) */}
      <AnimatePresence>
        {revealed && url && domain ? (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.45 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(normalizeUrl(url), "_blank", "noopener,noreferrer");
                notify(`Opening ${domain}…`);
              }}
              aria-label={`Redeem at ${domain}`}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_26px_-8px_rgba(139,92,246,0.75)] transition-transform active:scale-95"
            >
              <ExternalLink size={13} aria-hidden /> {domain}
            </button>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function CtaBlockView({ block, index, onAction }: { block: BlockDoc; index: number; onAction: (label: string, action?: string) => void }) {
  const { notify } = useMD();
  const d = block.data;
  const label = d?.label?.trim() || "Continue";
  // Reply taps stay in-experience; Open link / Claim open the pasted URL.
  const url = d?.action === "Reply" ? "" : (d?.url?.trim() ?? "");
  const domain = url ? urlDomain(url) : null;

  const fire = () => {
    if (url) {
      window.open(normalizeUrl(url), "_blank", "noopener,noreferrer");
      notify(`Opening ${domain ?? "your link"}…`);
    } else {
      onAction(label, d?.action);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // fire the action, not the scene advance
          fire();
        }}
        className="flex items-center gap-2 rounded-full bg-[#007AFF] px-8 py-3.5 text-[16px] font-semibold text-white shadow-[0_14px_34px_-10px_rgba(0,122,255,0.7)] transition-transform active:scale-[0.97]"
      >
        <MousePointerClick size={16} aria-hidden /> {label}
        {domain ? <ExternalLink size={13} aria-hidden className="opacity-75" /> : null}
      </button>
      <p className="mt-2.5 text-[11.5px] font-medium text-white/55">
        {domain ? (
          <span className="inline-flex items-center gap-1">
            <ExternalLink size={10} aria-hidden className="text-[#64D2FF]" />
            <span className="font-semibold text-[#64D2FF]">{domain}</span>
            <span>· opens in a new tab</span>
          </span>
        ) : (
          d?.action ?? "Opens a link, claim or reply"
        )}
      </p>
    </motion.div>
  );
}

function ConfettiBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const style = block.data?.style;
  const isKnown = ["Burst", "Rain", "Hearts", "Gold"].includes(style as string);
  const palette = CONFETTI_PALETTES[(isKnown ? style : "Burst") as ConfettiStyleName];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <ConfettiFX style={style} />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6482] to-[#FF9F0A] text-white shadow-[0_12px_30px_-8px_rgba(255,100,130,0.65)]">
        <PartyPopper size={24} aria-hidden />
        {/* breathing halo — the block stays alive after the burst */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-white/50"
          animate={{ scale: [1, 1.32], opacity: [0.55, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
        />
      </span>
      <p className="mt-3.5 text-[15px] font-bold tracking-[-0.01em] text-white">
        {style ? `${style} celebration` : "Celebration!"}
      </p>
      {/* the style's palette, echoed as tiny dots */}
      <span className="mt-2 flex items-center gap-1.5" aria-hidden>
        {palette.slice(0, 5).map((c) => (
          <span
            key={c}
            className="h-[5px] w-[5px] rounded-full"
            style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}66` }}
          />
        ))}
      </span>
      <p className="mt-2.5 text-[12.5px] text-white/60">Fired the moment this scene opened</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene backdrop — the authored background block (full-screen cover   */
/* photo or looping video) or the default generated cover art          */
/* ------------------------------------------------------------------ */

/** Finds the scene's background block (media-bearing, backdrop-consuming). */
function findBackgroundBlock(doc: SceneDoc | null): BlockDoc | null {
  if (!doc) return null;
  return doc.blocks.find((b) => b.type === "background" && (b.data?.image || b.data?.video)) ?? null;
}

/**
 * Full-bleed scene backdrop. Uploaded media wins; otherwise the generated
 * gradient cover art. Sits in its own non-scrolling layer so it covers the
 * whole screen no matter how tall the stacked blocks get.
 */
function SceneBackdrop({
  doc,
  cover,
  sceneIndex,
}: {
  doc: SceneDoc | null;
  cover: number;
  sceneIndex: number;
}) {
  const bg = findBackgroundBlock(doc);
  const d = bg?.data;
  const dim = d?.dim ?? "Medium";

  if (d?.video) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#1D1D1F]">
        <video
          key={d.video}
          src={d.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className="h-full w-full object-cover"
        />
        <div className={cn("absolute inset-0", backgroundDimClass(dim))} />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(0,0,0,0.10),rgba(0,0,0,0.38))]" />
      </div>
    );
  }

  if (d?.image) {
    const zoom = d.motion !== "Still";
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#1D1D1F]">
        <motion.img
          key={d.image}
          src={d.image}
          alt=""
          aria-hidden
          initial={{ scale: zoom ? 1 : 1.02 }}
          animate={{ scale: zoom ? 1.09 : 1.02 }}
          transition={{ duration: 16, ease: "easeOut" }}
          className="h-full w-full object-cover"
        />
        <div className={cn("absolute inset-0", backgroundDimClass(dim))} />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(0,0,0,0.10),rgba(0,0,0,0.38))]" />
      </div>
    );
  }

  return (
    <CoverArt variant={(cover + sceneIndex * 3) % 10} className="absolute inset-0 h-full">
      <div className="absolute inset-0 bg-[#1D1D1F]/55" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(0,0,0,0.12),rgba(0,0,0,0.5))]" />
    </CoverArt>
  );
}

const QUIZ_OPTIONS = [
  { label: "You", correct: true },
  { label: "Not you", correct: false },
  { label: "Someone else", correct: false },
];

const LEGACY_SCENE_COUNT = 5;

export function MomentPlayer({ moment, onClose }: { moment: PlayerPayload; onClose: () => void }) {
  const { setTab, notify, openShare, sheet, trackLove } = useMD();
  const [scene, setScene] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [quizSolved, setQuizSolved] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [loved, setLoved] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  /* Block-driven mode — the authored document plays exactly as built. */
  const authored = useMemo(
    () => (moment.scenes && moment.scenes.length > 0 ? moment.scenes : null),
    [moment.scenes]
  );
  const total = authored ? authored.length + 2 : LEGACY_SCENE_COUNT;
  const authoredIdx = authored ? scene - 1 : -1;
  const currentDoc = authored && authoredIdx >= 0 && authoredIdx < authored.length ? authored[authoredIdx] : null;

  /* Per-scene progress for authored gating (quiz solved / gift opened / countdown done) */
  const [solvedMap, setSolvedMap] = useState<Record<number, boolean>>({});
  const [giftMap, setGiftMap] = useState<Record<number, boolean>>({});
  const [countdownMap, setCountdownMap] = useState<Record<number, boolean>>({});

  const sceneHasQuiz = !!currentDoc?.blocks.some((b) => b.type === "quiz");
  const sceneHasGift = !!currentDoc?.blocks.some((b) => b.type === "gift");
  const sceneHasAudio = !!currentDoc?.blocks.some((b) => b.type === "audio");
  const quizGate = authored ? sceneHasQuiz && !solvedMap[authoredIdx] : scene === 2 && !quizSolved;
  const giftGate = authored ? sceneHasGift && !giftMap[authoredIdx] : scene === 3 && !giftOpen;

  /* Soundtrack — real catalog snippet, looped, ducked under audio blocks */
  const soundtrack = useSoundtrack(moment.music ?? null);
  const duckedRef = useRef(false);
  useEffect(() => {
    if (!moment.music) return;
    if (sceneHasAudio) {
      if (soundtrack.state === "playing") {
        soundtrack.pause();
        duckedRef.current = true;
      }
    } else if (duckedRef.current && soundtrack.state === "paused") {
      soundtrack.resume();
      duckedRef.current = false;
    }
  }, [sceneHasAudio, soundtrack, moment.music]);

  const advance = useCallback(() => {
    // Quiz scenes require a correct answer first
    if (quizGate) return;
    // Gift scenes: the first tap opens the gift
    if (giftGate) {
      if (authored) setGiftMap((m) => ({ ...m, [authoredIdx]: true }));
      else setGiftOpen(true);
      return;
    }
    setScene((s) => Math.min(s + 1, total - 1));
  }, [quizGate, giftGate, authored, authoredIdx, total]);

  /** Love reaction — heart burst + filled state + real server tracking (once per session) */
  const love = useCallback(() => {
    setLoved((prev) => {
      if (!prev) {
        setBurstKey((k) => k + 1);
        trackLove(moment.id);
      }
      return true;
    });
  }, [moment.id, trackLove]);

  // Escape to close (deferred while a sheet is layered above the player)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sheet) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sheet]);

  const isFinal = scene === total - 1;
  const isLightScene = isFinal;

  const replay = () => {
    setScene(0);
    setGiftOpen(false);
    setQuizSolved(false);
    setWrongPick(null);
    setSolvedMap({});
    setGiftMap({});
    setCountdownMap({});
  };

  const onCta = (label: string, action?: string) => {
    notify(`“${label}” — ${action ?? "action"} (preview)`);
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
          {/* Scene 1 — Intro (title card) */}
          {scene === 0 && (
            <motion.section
              key="s0"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <CoverArt variant={moment.cover} className="absolute inset-0 h-full">
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
                  className="mt-3 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white drop-shadow-lg md:text-[56px]"
                >
                  {moment.title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-3 text-[16px] font-medium text-white/85 md:text-[19px]"
                >
                  {moment.dedication}
                </motion.p>
                {authored ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.62 }}
                    className="mt-8 rounded-full bg-white/12 px-4 py-2 text-[12.5px] font-semibold text-white/85 backdrop-blur-md"
                  >
                    {authored.length} scenes · tap to walk through
                  </motion.p>
                ) : null}
              </div>
            </motion.section>
          )}

          {/* Authored scenes — exactly the blocks the creator built.
              Two layers: a fixed full-bleed backdrop (background block media
              or generated cover art) + a scrollable content column above it,
              so the cover keeps filling the screen on tall scenes. */}
          {authored && currentDoc ? (
            <motion.section
              key={`authored-${authoredIdx}`}
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <SceneBackdrop doc={currentDoc} cover={moment.cover} sceneIndex={authoredIdx} />
              <div className="absolute inset-0 overflow-y-auto no-scrollbar">
              <div className="relative flex min-h-full flex-col items-center justify-center gap-7 px-7 py-16 md:gap-8">
                {currentDoc.blocks.map((b, i) => {
                  switch (b.type) {
                    case "background":
                      // Consumed as the full-screen backdrop above — never an inline card
                      return null;
                    case "text":
                      return <TextBlockView key={b.id} block={b} index={i} />;
                    case "photo":
                      return <PhotoBlockView key={b.id} block={b} index={i} />;
                    case "video":
                      return <VideoBlockView key={b.id} block={b} index={i} />;
                    case "audio":
                      return <AudioBlockView key={b.id} block={b} index={i} />;
                    case "quiz":
                      return (
                        <QuizBlockView
                          key={b.id}
                          block={b}
                          index={i}
                          solved={!!solvedMap[authoredIdx]}
                          onSolved={() => setSolvedMap((m) => ({ ...m, [authoredIdx]: true }))}
                        />
                      );
                    case "gift":
                      return (
                        <GiftBlockView
                          key={b.id}
                          block={b}
                          index={i}
                          open={!!giftMap[authoredIdx]}
                          onOpen={() => setGiftMap((m) => ({ ...m, [authoredIdx]: true }))}
                        />
                      );
                    case "countdown":
                      return (
                        <CountdownBlockView
                          key={b.id}
                          block={b}
                          index={i}
                          done={!!countdownMap[authoredIdx]}
                          onDone={() => setCountdownMap((m) => ({ ...m, [authoredIdx]: true }))}
                        />
                      );
                    case "reward":
                      return <RewardBlockView key={b.id} block={b} index={i} />;
                    case "coupon":
                      return <CouponBlockView key={b.id} block={b} index={i} />;
                    case "cta":
                      return <CtaBlockView key={b.id} block={b} index={i} onAction={onCta} />;
                    case "confetti":
                      return <ConfettiBlockView key={b.id} block={b} index={i} />;
                    default:
                      return null;
                  }
                })}
                </div>
              </div>
            </motion.section>
          ) : null}

          {/* Legacy scene 2 — Message (demo flow without authored scenes) */}
          {!authored && scene === 1 && (
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
                  className="text-[27px] font-bold leading-[1.25] tracking-[-0.02em] text-white md:max-w-[560px] md:text-[36px]"
                >
                  Some moments deserve more than a text message.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 text-[15px] leading-relaxed text-white/60 md:text-[17px]"
                >
                  This one is interactive — keep going.
                </motion.p>
              </div>
            </motion.section>
          )}

          {/* Legacy scene 3 — Quiz (interactive) */}
          {!authored && scene === 2 && (
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
                  className="mt-3 max-w-[300px] text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-white md:max-w-[480px] md:text-[36px]"
                >
                  Who is this moment for?
                </motion.h2>

                <div className="mt-9 flex w-full max-w-[280px] flex-col gap-3 md:max-w-[400px]" role="group" aria-label="Quiz answers">
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

          {/* Legacy scene 4 — Gift reveal */}
          {!authored && scene === 3 && (
            <motion.section
              key="s3-gift"
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -70 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <CoverArt variant={moment.cover + 3} className="absolute inset-0 h-full">
                <div className="absolute inset-0 bg-[#1D1D1F]/45" />
              </CoverArt>
              {giftOpen ? <ConfettiFX /> : null}
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
                      className="mb-10 mt-2 text-[22px] font-bold tracking-[-0.02em] text-white md:text-[30px]"
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
                      className="mt-6 text-[28px] font-extrabold leading-tight tracking-[-0.025em] text-white drop-shadow-md md:text-[38px]"
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

          {/* Signature finale — shared by both modes */}
          {scene === total - 1 && (
            <motion.section
              key="finale"
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
                  className="mt-9 flex w-full max-w-[300px] flex-col gap-3 md:max-w-[380px]"
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

        {/* Soundtrack chip — real snippet, tap to pause / needs a tap to start */}
        {moment.music && !isFinal ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={(e) => {
              e.stopPropagation();
              soundtrack.toggle();
            }}
            aria-label={
              soundtrack.state === "playing"
                ? `Pause soundtrack: ${moment.music.title}`
                : `Play soundtrack: ${moment.music.title}`
            }
            className="absolute bottom-[70px] left-4 flex items-center gap-2 rounded-full bg-[#1D1D1F]/40 py-1.5 pl-2.5 pr-3.5 text-white backdrop-blur-md"
          >
            {soundtrack.state === "playing" ? (
              <span aria-hidden className="md-eq h-3 w-4 text-[#64D2FF]">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <MusicIcon size={12} aria-hidden className="text-[#64D2FF]" />
            )}
            <span className="max-w-[160px] truncate text-[11.5px] font-semibold tracking-[-0.01em]">
              {soundtrack.state === "needsTap"
                ? "Tap to play soundtrack"
                : soundtrack.state === "paused"
                  ? `${moment.music.title} · paused`
                  : moment.music.title}
            </span>
          </motion.button>
        ) : null}

        {/* Continue hint */}
        <AnimatePresence>
          {!isFinal && !quizGate ? (
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
              {giftGate ? "Tap to open the gift" : "Tap to continue"} <ChevronRight size={13} aria-hidden />
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
        <SceneDots total={total} current={scene} light={isLightScene} />
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
