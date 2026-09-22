"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  Sparkles,
  Video as VideoIcon,
  X,
} from "lucide-react";
import type { PlayerPayload } from "./md-context";
import type { BlockDoc, SceneDoc, SongPick } from "@/lib/md-blocks";
import { backgroundDimClass, formatClock, normalizeUrl, openWhenList, photoFilterCss, urlDomain } from "@/lib/md-blocks";
import { CoverArt } from "./cover-art";
import { GiftBox, GiftConfetti, isLightWrap } from "./gift-box";
import { CONFETTI_PALETTES, ConfettiFX, type ConfettiStyleName } from "./confetti";
import { RewardTicket } from "./reward-ticket";
import { CouponMachine, useCouponMachine, type MachineCoupon } from "./coupon-machine";
import { useMachineSfx } from "./coupon-sfx";
import { FlowerStage } from "./flower-stage";
import { apiDrawCoupon, apiPeekCoupon } from "@/lib/md-client";
import { couponPool } from "@/lib/md-blocks";
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
  // The creator wrote nothing → the recipient sees nothing.
  if (!body) return null;
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
      ) : null}
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
  // Empty question → no question heading (the answers still play).
  const question = d?.question?.trim() || "";
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
      {question ? (
        <h2 className="mx-auto mt-2 max-w-[440px] text-center text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-white md:text-[28px]">
          {question}
        </h2>
      ) : null}
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

/* Flower — the user's rose-bouquet artwork floating frameless on the scene.
 * The bouquet is perfectly still, touches never move it — and the sender's
 * message sits on an elegant card beneath it, with an optional voice note
 * the recipient can play. No other chrome: the viewer sees a bouquet + a
 * card, that's it. */

/** Animated equalizer bars — shown while the voice note plays. */
function VoiceBars({ active }: { active: boolean }) {
  const bars = [0.9, 0.45, 1, 0.6, 0.8, 0.5];
  return (
    <span className="flex h-4 items-center gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#FF375F]"
          style={{ height: `${h * 100}%`, originY: 1 }}
          animate={active ? { scaleY: [0.35, 1, 0.5, 0.85, 0.35] } : { scaleY: 0.3 }}
          transition={
            active
              ? { repeat: Infinity, duration: 1.1 + i * 0.13, ease: "easeInOut" }
              : { duration: 0.25 }
          }
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Shared voice-note audio                                             */
/* ------------------------------------------------------------------ */
/* ONE <audio> element for the whole experience (module singleton). The
 * sender's voice keeps playing even when the recipient taps ahead to the
 * next scene — a voice should never be cut off mid-sentence. Every
 * VoiceNotePlayer button and the top-bar pill control this one element. */
interface VoiceAudioState {
  url: string | null;
  playing: boolean;
  duration: number | null;
}
let voiceAudioEl: HTMLAudioElement | null = null;
const voiceSubs = new Set<() => void>();
let voiceAudioState: VoiceAudioState = { url: null, playing: false, duration: null };

function voiceEmit() {
  voiceSubs.forEach((fn) => fn());
}

function voiceElement(): HTMLAudioElement {
  if (!voiceAudioEl) {
    voiceAudioEl = new Audio();
    voiceAudioEl.preload = "metadata";
    voiceAudioEl.addEventListener("play", () => {
      voiceAudioState = { ...voiceAudioState, playing: true };
      voiceEmit();
    });
    voiceAudioEl.addEventListener("pause", () => {
      voiceAudioState = { ...voiceAudioState, playing: false };
      voiceEmit();
    });
    voiceAudioEl.addEventListener("ended", () => {
      voiceAudioState = { ...voiceAudioState, playing: false };
      voiceEmit();
    });
    voiceAudioEl.addEventListener("loadedmetadata", () => {
      const s = voiceAudioEl?.duration;
      voiceAudioState = {
        ...voiceAudioState,
        duration: Number.isFinite(s) ? Math.max(1, Math.round(s as number)) : null,
      };
      voiceEmit();
    });
  }
  return voiceAudioEl;
}

/** Plays (or restarts) a voice note on the shared element. */
function playVoiceNote(url: string) {
  const el = voiceElement();
  if (voiceAudioState.url !== url) {
    el.src = url;
    voiceAudioState = { url, playing: false, duration: null };
    voiceEmit();
  }
  el.currentTime = 0;
  void el.play().catch(() => {});
}

/** Pauses the shared voice note (no-op when nothing plays). */
function pauseVoiceNote() {
  voiceAudioEl?.pause();
}

/** Live state of the shared voice audio — re-renders on every change. */
function useVoiceAudio(): VoiceAudioState {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    voiceSubs.add(bump);
    return () => {
      voiceSubs.delete(bump);
    };
  }, [bump]);
  return voiceAudioState;
}

/** The voice-note row on the card — one tap plays the sender's voice.
 *  Taps never advance the scene, and playback continues across scenes. */
function VoiceNotePlayer({ url }: { url: string }) {
  const voice = useVoiceAudio();
  const mine = voice.url === url;
  const playing = mine && voice.playing;
  const duration = mine ? voice.duration : null;

  // While idle, preload this note's metadata so the duration shows up front.
  useEffect(() => {
    if (!voiceAudioState.url) {
      const el = voiceElement();
      el.src = url;
      voiceAudioState = { url, playing: false, duration: null };
      voiceEmit();
    }
  }, [url]);

  const toggle = (e: React.MouseEvent) => {
    // THE FIX: a play/pause tap must NEVER advance the scene.
    e.stopPropagation();
    if (playing) pauseVoiceNote();
    else playVoiceNote(url);
  };

  return (
    <div
      className="flex w-full items-center gap-3 border-t border-[#B45309]/[0.12] pt-3.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF375F] text-white shadow-[0_6px_16px_-6px_rgba(255,55,95,0.55)] transition-transform active:scale-90"
      >
        {playing ? (
          <Pause size={15} fill="currentColor" aria-hidden />
        ) : (
          <Play size={15} fill="currentColor" className="ml-0.5" aria-hidden />
        )}
      </button>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <VoiceBars active={playing} />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-[#8A5A2B]/80">
          Voice note{duration ? ` · ${formatClock(duration)}` : ""}
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Open When… — sealed letters, one per mood                          */
/* ------------------------------------------------------------------ */

function OpenWhenBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const items = openWhenList(block.data);
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = items.find((it) => it.id === openId) ?? null;
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
        A set of letters, sealed
      </p>
      <h2 className="mx-auto mt-2 max-w-[440px] text-center text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-white md:text-[28px]">
        Open one when the moment is right
      </h2>

      {/* The envelope grid — every seal a different mood */}
      <div className="mx-auto mt-7 grid w-full max-w-[380px] grid-cols-2 gap-3.5">
        {items.map((it, i) => {
          const isOpen = openId === it.id;
          return (
            <button
              key={it.id}
              type="button"
              aria-expanded={isOpen}
              aria-label={`${it.label || "Letter " + (i + 1)} — ${isOpen ? "close" : "open"} this letter`}
              onClick={(e) => {
                e.stopPropagation(); // opening a letter must never advance the scene
                setOpenId(isOpen ? null : it.id);
              }}
              className="group flex flex-col items-center gap-2.5 outline-none"
            >
              <motion.span
                aria-hidden
                animate={isOpen ? { scale: 1.04 } : { scale: 1 }}
                whileHover={{ scale: 1.04, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
                whileTap={{ scale: 0.97 }}
                className="relative block h-[96px] w-full max-w-[150px] overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF3E4_100%)] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.65)] ring-1 ring-black/[0.09]"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* envelope flap — lifts when opened */}
                <motion.span
                  className="absolute inset-x-0 top-0 block h-[46%] origin-top bg-[linear-gradient(180deg,#F3E5C9_0%,#EBD9B4_100%)] [clip-path:polygon(0_0,100%_0,50%_100%)]"
                  animate={isOpen ? { rotateX: 148 } : { rotateX: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                />
                {/* wax seal */}
                <span
                  className="absolute left-1/2 top-[36%] flex h-[26px] w-[26px] -translate-x-1/2 items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-[1.5px] ring-white/30"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 47) % 360} 74% 58%), hsl(${(i * 47 + 30) % 360} 74% 44%))`,
                  }}
                >
                  <Heart size={12} className={isOpen ? "text-white/95" : "text-white/90"} fill="currentColor" aria-hidden />
                </span>
                {/* letter peeking out when open */}
                <motion.span
                  aria-hidden
                  className="absolute inset-x-[12%] bottom-[10%] block h-[70%] rounded-[8px] bg-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
                  animate={isOpen ? { y: -18 } : { y: 26 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                />
              </motion.span>
              <span
                className={cn(
                  "line-clamp-2 px-1 text-center text-[12px] font-semibold leading-snug tracking-[-0.01em] transition-colors",
                  isOpen ? "text-white" : "text-white/80"
                )}
              >
                {it.label?.trim() || `Letter ${i + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* The opened letter — the words inside the seal */}
      <AnimatePresence>
        {openItem ? (
          <motion.div
            key={openItem.id}
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 270, damping: 24 }}
            className="relative z-10 mx-auto mt-6 w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF3E4_100%)] px-6 pb-5 pt-6 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/[0.06]">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent_0%,#E8439333_18%,#E8439366_50%,#E8439333_82%,transparent_100%)]"
              />
              <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#E84393]">
                {openItem.label?.trim() || "For you"}
              </p>
              <p className="mt-3 text-center font-serif text-[16.5px] italic leading-[1.6] tracking-[-0.005em] text-[#3E2A1E]">
                {openItem.message?.trim() || "(This one is blank — but the thought counts.)"}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenId(null);
                  }}
                  className="rounded-full bg-[#1D1D1F]/[0.06] px-4 py-2 text-[12px] font-bold text-[#3E2A1E]/80 transition-all hover:bg-[#1D1D1F]/[0.1] active:scale-95"
                >
                  Seal it back
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Letter — types itself out, like it's being written live             */
/* ------------------------------------------------------------------ */

function LetterBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const body = (block.data?.body ?? "").trim();
  const signature = (block.data?.signature ?? "").trim();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (reduced ? body.length : 0));
  const done = shown >= body.length;

  useEffect(() => {
    if (done || !body) return;
    const t = window.setTimeout(() => setShown((s) => Math.min(s + 1, body.length)), 22);
    return () => window.clearTimeout(t);
  }, [shown, done, body.length]);

  // An empty letter shows nothing — the creator's words are the contract.
  if (!body) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative mx-auto w-full max-w-[420px] rounded-[24px] bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF3E4_100%)] px-7 pb-6 pt-7 shadow-[0_28px_56px_-24px_rgba(0,0,0,0.6)] ring-1 ring-black/[0.07]">
        {/* wax seal */}
        <span
          aria-hidden
          className="absolute -top-3 right-6 flex h-9 w-9 items-center justify-center rounded-full shadow-[0_4px_10px_rgba(142,31,61,0.5)] ring-[1.5px] ring-white/25"
          style={{ background: "linear-gradient(135deg,#C4385C,#8E1F3D)" }}
        >
          <Heart size={14} className="text-white/95" fill="currentColor" />
        </span>

        <p className="min-h-[72px] font-serif text-[16px] italic leading-[1.7] tracking-[-0.005em] text-[#3E2A1E]">
          {body.slice(0, shown)}
          {!done ? (
            <span
              aria-hidden
              className="ml-[1px] inline-block h-[15px] w-[2.5px] translate-y-[2px] animate-pulse rounded-full bg-[#AF52DE]"
            />
          ) : null}
        </p>

        {done && signature ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-4 text-right font-serif text-[15px] italic text-[#3E2A1E]/75"
          >
            — {signature}
          </motion.p>
        ) : null}

        <div className="mt-4 flex justify-center">
          {!done ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShown(body.length);
              }}
              className="rounded-full bg-[#1D1D1F]/[0.06] px-4 py-2 text-[12px] font-bold text-[#3E2A1E]/80 transition-all hover:bg-[#1D1D1F]/[0.1] active:scale-95"
            >
              Show it all
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scratch card — foil they scratch away with a finger                */
/* ------------------------------------------------------------------ */

function ScratchBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const image = (block.data?.image ?? "").trim();
  const message = (block.data?.message ?? "").trim();
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const checkCount = useRef(0);
  const revealedRef = useRef(false);

  const reveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
  };

  // Paint the gold foil once per mount.
  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = Math.max(1, canvas.offsetWidth * 2));
    const h = (canvas.height = Math.max(1, canvas.offsetHeight * 2));
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#FFE9A8");
    g.addColorStop(0.45, "#F2C14E");
    g.addColorStop(0.6, "#E8A33D");
    g.addColorStop(1, "#FFD66B");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // diagonal texture
    ctx.strokeStyle = "rgba(120,72,0,0.14)";
    ctx.lineWidth = Math.max(4, w * 0.012);
    for (let x = -h; x < w + h; x += w * 0.06) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    // sparkle dots
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 97) % 100) / 100 * w;
      const sy = ((i * 61) % 100) / 100 * h;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // label
    ctx.fillStyle = "rgba(122,84,16,0.85)";
    ctx.font = `800 ${Math.round(w * 0.052)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH TO REVEAL", w / 2, h / 2);
  }, [revealed]);

  // Nothing to hide → nothing to show (after hooks — the creator's words
  // are the contract, an empty scratch card renders nothing).
  if (!image && !message) return null;

  const checkProgress = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        total += 1;
        if (data[(y * w + x) * 4 + 3] < 40) clear += 1;
      }
    }
    if (clear / total >= 0.55) reveal();
  };

  const scratchAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || revealedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const last = lastRef.current ?? { x, y };
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = canvas.width * 0.15;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastRef.current = { x, y };
    checkCount.current += 1;
    if (checkCount.current % 14 === 0) checkProgress(canvas, ctx);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">A little surprise</p>

      <div className="relative mt-4 aspect-[4/3] w-full max-w-[360px] select-none" style={{ touchAction: "none" }}>
        {/* The surprise underneath */}
        <div className="absolute inset-0 overflow-hidden rounded-[20px] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
          {image ? (
            <img src={image} alt="The surprise hidden under the foil" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#FFF6FB_0%,#FDE7F0_100%)] px-6">
              <Heart size={30} className="text-[#FF375F]" fill="currentColor" aria-hidden />
            </div>
          )}
          {message ? (
            <div className={`absolute inset-x-0 ${image ? "bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10" : "px-4 pb-1 pt-2"}`}>
              <p className={`text-center text-[15px] font-bold leading-snug tracking-[-0.01em] ${image ? "text-white drop-shadow-md" : "text-[#1D1D1F]"}`}>
                {message}
              </p>
            </div>
          ) : null}
        </div>

        {/* The foil on top */}
        <AnimatePresence>
          {!revealed ? (
            <motion.canvas
              ref={canvasRef}
              aria-label="Scratch card — rub to reveal the surprise"
              role="img"
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 h-full w-full cursor-grab rounded-[20px] shadow-[0_18px_40px_-16px_rgba(122,84,16,0.55)] ring-1 ring-black/10 active:cursor-grabbing"
              onPointerDown={(e) => {
                e.stopPropagation();
                scratchingRef.current = true;
                lastRef.current = null;
                scratchAt(e);
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                if (scratchingRef.current) scratchAt(e);
              }}
              onPointerUp={() => {
                scratchingRef.current = false;
                lastRef.current = null;
              }}
              onPointerLeave={() => {
                scratchingRef.current = false;
                lastRef.current = null;
              }}
            />
          ) : (
            <ConfettiFX key="fx" style="Burst" onDark className="rounded-[20px]" />
          )}
        </AnimatePresence>
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            reveal();
          }}
          className="mt-4 rounded-full bg-white/15 px-4 py-2 text-[12px] font-bold text-white/85 backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
        >
          Reveal it instead
        </button>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Fireworks — a night sky that answers every tap                      */
/* ------------------------------------------------------------------ */

const FIREWORK_COLORS = ["#FF375F", "#FFD60A", "#30D158", "#64D2FF", "#FF9F0A", "#BF5AF2", "#FF6B35"];
const FIREWORKS_NEEDED = 3;

function FireworksBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const message = (block.data?.message ?? "").trim();
  const [bursts, setBursts] = useState(0);
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const launchRef = useRef<((xRatio?: number) => void) | null>(null);
  const done = bursts >= FIREWORKS_NEEDED;

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = Math.max(1, canvas.offsetWidth * 2));
    const h = (canvas.height = Math.max(1, canvas.offsetHeight * 2));
    const scale = w / 640;
    const stars = Array.from({ length: 42 }, (_, i) => ({
      x: (((i * 53) % 100) / 100) * w,
      y: (((i * 29) % 60) / 100) * h,
      r: (i % 6 === 0 ? 2.6 : 1.5) * scale,
      a: 0.22 + (i % 5) * 0.14,
    }));

    interface Particle {
      x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
    }
    interface Rocket {
      x: number; y: number; vy: number; targetY: number; color: string;
    }
    let particles: Particle[] = [];
    let rockets: Rocket[] = [];
    let alive = true;
    let raf = 0;

    const explode = (x: number, y: number) => {
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const n = 44 + Math.floor(Math.random() * 20);
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.24;
        const speed = (2.1 + Math.random() * 3.6) * scale;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          maxLife: 0.7 + Math.random() * 0.55,
          color,
          size: (2.1 + Math.random() * 2.7) * scale,
        });
      }
    };

    const launch = (xRatio?: number) => {
      rockets.push({
        x: (xRatio ?? 0.25 + Math.random() * 0.5) * w,
        y: h + 12,
        vy: -(9.5 + Math.random() * 2.5) * scale,
        targetY: h * (0.16 + Math.random() * 0.3),
        color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      });
    };
    launchRef.current = launch;

    // The sky greets them with one burst — it feels alive from the first second.
    const initial = window.setTimeout(() => {
      launch();
      setBursts((b) => b + 1);
    }, 700);

    const frame = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rockets = rockets.filter((r) => {
        r.y += r.vy;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + 16 * scale);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (r.y <= r.targetY) {
          explode(r.x, r.y);
          return false;
        }
        return true;
      });
      ctx.globalCompositeOperation = "lighter";
      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.055 * scale;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 0.011;
        if (p.life <= 0) return false;
        ctx.globalAlpha = Math.min(1, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(initial);
      launchRef.current = null;
    };
  }, [reduced]);

  const tapSky = (e: React.PointerEvent) => {
    // Tapping the sky launches fireworks — it must never advance the scene.
    e.stopPropagation();
    if (!reduced && launchRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      launchRef.current(Math.min(0.92, Math.max(0.08, (e.clientX - rect.left) / rect.width)));
    }
    setBursts((b) => b + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      <div
        className="relative h-[300px] w-full max-w-[420px] cursor-pointer touch-none overflow-hidden rounded-[24px] ring-1 ring-white/15"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, #2B3A67 0%, #141A33 55%, #0B0E1E 100%)" }}
        onPointerDown={tapSky}
        role="button"
        aria-label="Night sky — tap to launch fireworks"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            if (!reduced && launchRef.current) launchRef.current();
            setBursts((b) => b + 1);
          }
        }}
      >
        {reduced ? (
          <>
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute rounded-full bg-white"
                style={{
                  left: `${(i * 41 + 7) % 96}%`,
                  top: `${(i * 27 + 9) % 75}%`,
                  width: i % 5 === 0 ? 2.5 : 1.5,
                  height: i % 5 === 0 ? 2.5 : 1.5,
                  opacity: 0.3 + (i % 4) * 0.15,
                }}
              />
            ))}
            <span aria-hidden className="absolute left-[30%] top-[28%] h-2 w-2 rounded-full bg-[#FFD60A] shadow-[0_0_22px_8px_rgba(255,214,10,0.55)]" />
            <span aria-hidden className="absolute right-[24%] top-[38%] h-2.5 w-2.5 rounded-full bg-[#FF375F] shadow-[0_0_24px_9px_rgba(255,55,95,0.55)]" />
          </>
        ) : (
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        )}

        {/* Hint / the rising message */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
          <AnimatePresence mode="wait">
            {message && done ? (
              <motion.p
                key="msg"
                initial={{ opacity: 0, y: 22, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className="text-center text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white drop-shadow-[0_4px_18px_rgba(255,214,10,0.45)] md:text-[30px]"
              >
                {message}
              </motion.p>
            ) : !done ? (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12.5px] font-bold tracking-[-0.01em] text-white/85 backdrop-blur-md"
              >
                <Sparkles size={13} aria-hidden />
                Tap the sky to celebrate — {FIREWORKS_NEEDED - bursts} more{" "}
                {FIREWORKS_NEEDED - bursts === 1 ? "burst" : "bursts"}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function FlowerBlockView({ block, index }: { block: BlockDoc; index: number }) {
  const d = block.data;
  const message = (d?.message ?? "").trim();
  const voiceNote = (d?.voiceNote ?? "").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      {/* Frameless stage — the bouquet floats directly on the scene at its
       * one best angle, or the 3D rose turns / holds the chosen angle.
       * No box, no border, no glow, no hints: nothing but the flowers.
       * Touches never move it. */}
      <div className="relative w-full max-w-[460px]">
        <div className="relative h-[330px] md:h-[370px]">
          <FlowerStage
            flowerId={d?.flower ?? d?.roseStyle}
            motion={d?.flowerMotion === "spin" ? "spin" : "still"}
            speed={typeof d?.flowerSpeed === "number" ? d.flowerSpeed : undefined}
            angle={typeof d?.flowerAngle === "number" ? d.flowerAngle : undefined}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* The sender's card — only when the sender actually wrote something
          (or left a voice note). Empty message + no voice → no card at all. */}
      {message || voiceNote ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.75 + index * 0.09, type: "spring", stiffness: 260, damping: 24 }}
          className="relative z-10 -mt-2 w-full max-w-[400px]"
        >
          <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF3E4_100%)] px-6 pb-5 pt-6 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06]">
            {/* subtle top thread the card hangs from */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent_0%,#FF375F33_18%,#FF375F66_50%,#FF375F33_82%,transparent_100%)]"
            />
            {message ? (
              <>
                <Heart size={13} className="mx-auto mb-2.5 text-[#FF375F]" fill="currentColor" aria-hidden />
                <p className="text-center font-serif text-[16.5px] italic leading-[1.55] tracking-[-0.005em] text-[#3E2A1E]">
                  {message}
                </p>
              </>
            ) : null}
            {voiceNote ? (
              <div className={message ? "mt-4" : ""}>
                <VoiceNotePlayer url={voiceNote} />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
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
  // The sender's words — empty means the viewer sees no message at all.
  const message = (d?.message ?? "").trim();
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      {open ? <GiftConfetti tint={wrap} /> : null}
      {!open && message ? (
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
        message ? (
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
              {message}
            </p>
          </motion.div>
        ) : null
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

function CouponBlockView({ block, index, momentId }: { block: BlockDoc; index: number; momentId: string }) {
  const { notify } = useMD();
  const d = block.data;
  const url = d?.url?.trim();
  const domain = url ? urlDomain(url) : null;

  /* The pile: one card per coupon in the creator's pool (legacy single-code
   * blocks fall back to a one-coupon pool — still server-assigned). */
  const cards: MachineCoupon[] = useMemo(
    () =>
      couponPool(d).map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        color: c.color,
      })),
    [d]
  );

  const sfx = useMachineSfx();

  /* PLAY → the SERVER decides the prize: first play assigns randomly from
   * the eligible pool + persists; every replay returns the same coupon. */
  const draw = useCallback(async () => {
    const res = await apiDrawCoupon({ momentId, blockId: block.id });
    if (!res.assignment) return { prize: null, reason: res.reason };
    return {
      prize: {
        couponId: res.assignment.couponId,
        code: res.assignment.code,
        title: res.assignment.title,
        color: res.assignment.color,
      },
    };
  }, [momentId, block.id]);

  const m = useCouponMachine({ draw, sfx });

  /* On mount: has this player already won? (Labels the button PLAY AGAIN —
   * never re-rolls; the draw itself is the only place a coupon is decided.) */
  useEffect(() => {
    let alive = true;
    apiPeekCoupon(momentId, block.id)
      .then((res) => {
        if (alive && res.assignment) m.setHasAssignment(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [momentId, block.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.09, duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center"
    >
      {/* The machine owns the whole flow: PLAY → the joystick goes live →
          the player aims + releases → the claw grabs a face-down ticket →
          golden reveal → COPY CODE (built in). */}
      <CouponMachine
        title={d?.heading?.trim() || "COUPON CODE"}
        subtitle={d?.body?.trim() || "REVEAL"}
        ticketLabel={d?.stepLabel?.trim() || "YOUR COUPON CODE"}
        buttonLabel={d?.label?.trim() || "PLAY & WIN"}
        coupons={cards}
        cardCount={d?.displayCount}
        prize={m.prize}
        phase={m.phase}
        playToken={m.playToken}
        hasAssignment={m.hasAssignment}
        error={m.error}
        soldOut={m.soldOut}
        onPlay={m.play}
        clawX={m.clawX}
        onAim={m.setClawX}
        onGrab={m.beginGrab}
        grabPlan={m.grabPlan}
        sfx={sfx}
      />

      {/* Post-reveal action — open the redeem link (copy lives on the machine) */}
      <AnimatePresence>
        {m.phase === "revealed" && url && domain ? (
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
  const { setTab, notify, sheet, trackLove } = useMD();
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

  /* Voice note — the sender's voice (shared singleton). While it plays the
   * soundtrack ducks; it keeps playing across scene changes; the top-bar pill
   * can pause it from any scene; closing the experience stops it. */
  const voice = useVoiceAudio();
  const voiceDuckRef = useRef(false);
  useEffect(() => {
    if (!moment.music) return;
    if (voice.playing) {
      if (soundtrack.state === "playing") {
        soundtrack.pause();
        voiceDuckRef.current = true;
      }
    } else if (voiceDuckRef.current && soundtrack.state === "paused" && !sceneHasAudio) {
      soundtrack.resume();
      voiceDuckRef.current = false;
    }
  }, [voice.playing, soundtrack, moment.music, sceneHasAudio]);
  // Closing the experience always stops the voice.
  useEffect(() => () => pauseVoiceNote(), []);

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
                    case "flower":
                    // legacy "rose" blocks render as the new flower block
                    case "rose":
                      return <FlowerBlockView key={b.id} block={b} index={i} />;
                    case "openwhen":
                      return <OpenWhenBlockView key={b.id} block={b} index={i} />;
                    case "letter":
                      return <LetterBlockView key={b.id} block={b} index={i} />;
                    case "scratch":
                      return <ScratchBlockView key={b.id} block={b} index={i} />;
                    case "fireworks":
                      return <FireworksBlockView key={b.id} block={b} index={i} />;
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
                      return <CouponBlockView key={b.id} block={b} index={i} momentId={moment.id} />;
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
                  <LogoMark size={68} />
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
          {voice.playing ? (
            <button
              type="button"
              aria-label="Pause voice note"
              onClick={(e) => {
                e.stopPropagation();
                pauseVoiceNote();
              }}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-3.5 transition-transform active:scale-95",
                isLightScene
                  ? "bg-white/80 text-[#1D1D1F] hairline backdrop-blur-xl"
                  : "bg-[#1D1D1F]/35 text-white backdrop-blur-md"
              )}
            >
              <VoiceBars active />
              <span className="text-[11.5px] font-bold uppercase tracking-[0.06em]">Voice</span>
              <Pause size={13} fill="currentColor" aria-hidden />
            </button>
          ) : null}
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
        </div>
      </div>
    </motion.div>
  );
}
