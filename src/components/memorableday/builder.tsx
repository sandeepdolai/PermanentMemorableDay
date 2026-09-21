"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  AudioLines,
  Award,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileMusic,
  Flower2,
  Focus,
  Gift,
  GripVertical,
  Heart,
  Images as ImagesIcon,
  LayoutGrid,
  Link2,
  ListChecks,
  Mic,
  MousePointerClick,
  Music,
  Pause,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCw,
  Search as SearchIcon,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Ticket,
  Type,
  Undo2,
  Upload,
  Video,
  Wallpaper,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/mock-data";
import { apiSearchMusic, apiUploadFile } from "@/lib/md-client";
import {
  backgroundDimClass,
  COUPON_COLORS,
  couponPool,
  dedupeScenes,
  eligibleCoupons,
  formatClock,
  freshBlockId,
  freshSceneId,
  photoFilterCss,
  FLOWERS,
  flower as resolveFlower,
  uid,
  urlDomain,
  BACKGROUND_DIMS,
  BACKGROUND_MOTIONS,
  PHOTO_FILTERS,
  type BlockData,
  type BlockDoc,
  type CouponDef,
  type SceneDoc,
  type SongPick,
  type SongResult,
} from "@/lib/md-blocks";
import { SegmentedControl } from "./segmented-control";
import {
  CONFETTI_DESCRIPTIONS,
  CONFETTI_PALETTES,
  CONFETTI_STYLES,
  ConfettiFX,
  type ConfettiStyleName,
} from "./confetti";
import { RewardTicket, rewardKindMeta } from "./reward-ticket";
import { FlowerStage } from "./flower-stage";
import { CouponMachine, useCouponMachine, type MachinePrize } from "./coupon-machine";
import { useMachineSfx } from "./coupon-sfx";
import {
  GiftBox,
  GiftConfetti,
  GIFT_RIBBON_STYLES,
  GIFT_WRAP_PALETTE,
  isLightWrap,
  useRevealDemo,
} from "./gift-box";
import { CoverArt, COVER_NAMES } from "./cover-art";
import { BottomSheet } from "./bottom-sheet";
import { ConfirmDialog, RenameDialog } from "./moment-menu";
import { useMD, type BuilderOptions } from "./md-context";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Block catalogue (PRD Experience Builder scene blocks)               */
/* ------------------------------------------------------------------ */

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface BlockDef {
  type: string;
  label: string;
  icon: IconType;
  tint: string;
}

const BLOCKS: BlockDef[] = [
  { type: "text", label: "Text", icon: Type, tint: "#007AFF" },
  { type: "photo", label: "Photo", icon: ImagesIcon, tint: "#30D158" },
  { type: "video", label: "Video", icon: Video, tint: "#FF9F0A" },
  { type: "audio", label: "Audio", icon: Music, tint: "#FF375F" },
  { type: "background", label: "Background", icon: Wallpaper, tint: "#64D2FF" },
  { type: "gift", label: "Gift", icon: Gift, tint: "#5E5CE6" },
  { type: "flower", label: "Flower", icon: Flower2, tint: "#FF375F" },
  { type: "countdown", label: "Countdown", icon: Clock, tint: "#FF9F0A" },
  { type: "quiz", label: "Quiz", icon: ListChecks, tint: "#007AFF" },
  { type: "reward", label: "Reward", icon: Award, tint: "#30D158" },
  { type: "coupon", label: "Coupon Reveal", icon: Ticket, tint: "#218CF4" },
  { type: "cta", label: "Button", icon: MousePointerClick, tint: "#007AFF" },
  { type: "confetti", label: "Confetti", icon: PartyPopper, tint: "#FF375F" },
];

/* Coupon Reveal (the claw machine) ships in a later phase — hidden from
   every creation surface (tray, library, scene blocks, AI sketch) for now.
   Existing moments that already contain coupon blocks keep playing fine. */
const COUPON_REVEAL_ENABLED = false;

/** Block kinds creators can currently add (BLOCK_BY_TYPE stays complete so
 *  already-authored coupon blocks still get their icon/label in the editor). */
const ADDABLE_BLOCKS = COUPON_REVEAL_ENABLED
  ? BLOCKS
  : BLOCKS.filter((b) => b.type !== "coupon");

const BLOCK_BY_TYPE = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));

type Block = BlockDoc;
type Scene = SceneDoc;

/** Undo/redo snapshot of the whole draft */
interface Snapshot {
  label: string;
  title: string;
  scenes: Scene[];
  track: SongPick | null;
  cover: number;
}

/* Block editor option catalogues (abstract, no themed content) —
   gift wrap colors + ribbon styles live in ./gift-box (shared with the player) */
const COUNTDOWN_PRESETS = [
  { label: "1 min", minutes: 1 },
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "24 hours", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
];
const REWARD_KINDS = ["Coupon", "Gift card", "Download"];
const CTA_ACTIONS = ["Open link", "Claim", "Reply"];
const SCHEDULE_TIMES = ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM", "12:00 AM"];

/** Pretty countdown label from a minutes value */
function countdownLabel(minutes?: number): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${h} hour${h > 1 ? "s" : ""}`;
  }
  const d = minutes / 1440;
  return `${d} day${d > 1 ? "s" : ""}`;
}

const fieldInput =
  "w-full rounded-[14px] border border-[#1D1D1F]/[0.09] bg-white px-3.5 py-2.5 text-[14.5px] tracking-[-0.01em] text-[#1D1D1F] outline-none placeholder:text-[#AAAAAA]/70 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25";

const MAX_SCENES = 8;
const HISTORY_CAP = 30;

/** Deterministic draft layouts — abstract, no themed content */
const DRAFT_PATTERNS: string[][] = [
  ["text", "photo"],
  ["video", "text"],
  ["gift", "confetti"],
  ["countdown", "cta"],
  ["quiz", "text"],
  ["audio", "photo"],
  ["text", "cta"],
  ["reward", "confetti"],
];

function seedScenes(opts: BuilderOptions): Scene[] {
  // Edit-in-Builder restore — the full authored document wins over sketching.
  if (opts.doc && opts.doc.scenes.length > 0) {
    // Repair legacy duplicate block ids (the old resettable b-counter bug) while cloning.
    return dedupeScenes(
      opts.doc.scenes.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b })) }))
    );
  }
  if (opts.ai) {
    const scenes: Scene[] = [
      { id: "s1", blocks: [{ id: "b1", type: "text" }, { id: "b2", type: "photo" }] },
      { id: "s2", blocks: [{ id: "b3", type: "gift" }, { id: "b4", type: "confetti" }] },
      { id: "s3", blocks: [{ id: "b5", type: "text" }, { id: "b6", type: "cta" }] },
    ];
    if (opts.seedText) {
      scenes[0].blocks = [{ id: "bAi0", type: "text", text: opts.seedText }, ...scenes[0].blocks];
    }
    return scenes;
  }
  const wantsSeedBlock = !!opts.initialBlock && !!BLOCK_BY_TYPE[opts.initialBlock];
  const count = Math.max(1, Math.min(opts.scenes ?? 1, MAX_SCENES));
  // Single-scene starts are honest about what was asked for:
  // - "Blank canvas" → a truly empty scene stack (no hidden pattern blocks)
  // - "Start with a X block" → just that block, nothing else
  if (count <= 1) {
    const blocks: Block[] = wantsSeedBlock ? [{ id: "bSeed", type: opts.initialBlock!, data: starterBlockData(opts.initialBlock!) }] : [];
    if (opts.seedText) {
      return [{ id: "s1", blocks: [{ id: "bAi0", type: "text", text: opts.seedText }, ...blocks] }];
    }
    return [{ id: "s1", blocks }];
  }
  // Multi-scene layout starts (template remix / gallery layouts) sketch
  // deterministic patterns so the storyboard communicates the flow.
  const scenes: Scene[] = [];
  for (let i = 0; i < count; i++) {
    const pattern = DRAFT_PATTERNS[(i + (opts.cover ?? 0)) % DRAFT_PATTERNS.length];
    scenes.push({
      id: `s${i + 1}`,
      blocks: pattern.map((t, j) => ({ id: `b${i * 4 + j + 1}`, type: t })),
    });
  }
  if (wantsSeedBlock) {
    scenes[0].blocks.push({ id: "bSeed", type: opts.initialBlock!, data: starterBlockData(opts.initialBlock!) });
  }
  if (opts.seedText) {
    scenes[0].blocks = [{ id: "bAi0", type: "text", text: opts.seedText }, ...scenes[0].blocks];
  }
  return scenes;
}

/* ------------------------------------------------------------------ */
/* Block visual previews                                               */
/* ------------------------------------------------------------------ */

function BlockPreview({ block, cover }: { block: Block; cover: number }) {
  const type = block.type;
  const d = block.data;
  switch (type) {
    case "text": {
      const body = d?.body?.trim();
      return (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#007AFF]/[0.1] text-[#007AFF]">
            <Type size={16} strokeWidth={2.2} aria-hidden />
          </span>
          {block.text ? (
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium italic leading-relaxed tracking-[-0.01em] text-[#1D1D1F]">
                “{block.text}”
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#5E5CE6]">
                <Sparkles size={10} aria-hidden /> AI composed
              </p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              {body ? (
                <>
                  <p className="text-[14px] font-semibold leading-relaxed tracking-[-0.01em] text-[#1D1D1F]">
                    {body}
                  </p>
                  <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#AAAAAA]">
                    {body.length} characters
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#1D1D1F]">
                    A few words that land.
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#AAAAAA]">
                    Your message renders here — big type, generous spacing, one idea per scene.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    case "photo": {
      const filtered = d?.filter && d.filter !== "Original" ? d.filter : null;
      const src = d?.image;
      return (
        <div className="flex items-center gap-3">
          <span className="relative block shrink-0">
            {src ? (
              <img src={src} alt={d?.caption?.trim() || "Uploaded photo"} style={photoFilterCss(d?.filter)} className="h-16 w-24 rounded-[12px] object-cover" />
            ) : (
              <CoverArt variant={filtered ? (cover + 1) % 10 : cover} className="h-16 w-24 rounded-[12px]" />
            )}
            {filtered ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#1D1D1F]/45 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-md">
                {filtered}
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              {src ? "Your photo" : "Photo block"}
            </p>
            {d?.caption?.trim() ? (
              <p className="mt-1 text-[12.5px] italic leading-snug text-[#1D1D1F]/70">“{d.caption.trim()}”</p>
            ) : (
              <p className="mt-1 text-[12.5px] text-[#AAAAAA]">
                {src ? "Uploaded — tap Edit to adjust" : "Full-bleed image with a soft caption"}
              </p>
            )}
          </div>
        </div>
      );
    }
    case "video": {
      const src = d?.video;
      return (
        <div className="relative overflow-hidden rounded-[14px]">
          {src ? (
            <video
              src={src}
              muted
              playsInline
              preload="metadata"
              aria-label="Uploaded video"
              className="h-24 w-full bg-[#1D1D1F] object-cover"
            />
          ) : (
            <CoverArt variant={(cover + 3) % 10} className="h-24 w-full" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
              <Play size={18} className="ml-0.5 text-white" fill="white" aria-hidden />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-[#1D1D1F]/45 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-md">
            {formatDuration(d?.duration ?? 12)}
          </span>
        </div>
      );
    }
    case "background": {
      const img = d?.image;
      const vid = d?.video;
      const dim = d?.dim ?? "Medium";
      return (
        <div className="flex items-center gap-3">
          {/* mini "screen" — the whole scene viewport in miniature */}
          <span className="relative block h-16 w-[74px] shrink-0 overflow-hidden rounded-[10px] ring-1 ring-[#1D1D1F]/[0.08]">
            {vid ? (
              <video src={vid} muted playsInline preload="metadata" aria-hidden className="h-full w-full bg-[#1D1D1F] object-cover" />
            ) : img ? (
              <img src={img} alt="" aria-hidden className="h-full w-full object-cover" />
            ) : (
              <CoverArt variant={(cover + 5) % 10} className="h-full w-full" />
            )}
            <span className={cn("absolute inset-0", backgroundDimClass(dim))} aria-hidden />
            {/* stacked-content mock: two soft lines the cover sits behind */}
            <span className="absolute inset-x-2 bottom-1.5 flex flex-col gap-[3px]" aria-hidden>
              <span className="h-[3px] w-3/5 rounded-full bg-white/70" />
              <span className="h-[3px] w-2/5 rounded-full bg-white/45" />
            </span>
            {vid ? (
              <span className="absolute right-1 top-1 rounded-full bg-[#1D1D1F]/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white backdrop-blur-md">
                Video
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              {img || vid ? "Full-screen cover" : "Background block"}
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-[#AAAAAA]">
              {img || vid ? "Covers the whole scene — blocks layer on top" : "Upload any photo or video as the scene backdrop"}
            </p>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-[#64D2FF]/[0.14] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0E7490]">
              Full screen
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#AAAAAA]">{dim} dim</span>
          </span>
        </div>
      );
    }
    case "audio": {
      const song = d?.song;
      const background = d?.playMode === "background";
      if (song) {
        return (
          <div className="flex items-center gap-3">
            {song.artwork ? (
              <img src={song.artwork} alt="" aria-hidden className="h-10 w-10 shrink-0 rounded-[12px] object-cover" />
            ) : (
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FF375F] to-[#5E5CE6] text-white"
              >
                {song.source === "upload" ? <FileMusic size={15} /> : <Music size={15} />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                {song.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#AAAAAA]">
                {background ? <AudioLines size={11} aria-hidden className="text-[#FF375F]" /> : null}
                <span className="truncate">{song.artist}</span>
              </p>
            </div>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-[#FF375F]/[0.1] px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#FF375F]">
                {formatClock(song.length)} clip
              </span>
              {background ? (
                <span className="flex items-center gap-1 rounded-full bg-[#5E5CE6]/[0.1] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#5E5CE6]">
                  <AudioLines size={9} aria-hidden /> Background
                </span>
              ) : null}
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.12] text-[#FF375F]">
            <Play size={16} fill="currentColor" aria-hidden />
          </span>
          <div className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden>
            {[10, 18, 26, 14, 30, 22, 12, 28, 16, 24, 11, 20, 15, 27, 13, 25, 17, 9, 21, 14].map((h, i) => (
              <span
                key={i}
                className="w-[3px] shrink-0 rounded-full bg-[#FF375F]/45"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#AAAAAA]">0:34</span>
        </div>
      );
    }
    case "gift": {
      const wrap = d?.wrap ?? "#5E5CE6";
      const message = d?.message?.trim();
      return (
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-[92px] w-[72px] shrink-0 items-center justify-center">
            <GiftBox wrap={wrap} ribbon={d?.ribbon ?? "classic"} still scale={0.5} sparkle={false} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Gift reveal</p>
            {message ? (
              <p className="mt-1 text-[12.5px] italic leading-snug text-[#1D1D1F]/70">“{message}”</p>
            ) : (
              <p className="mt-1 text-[12.5px] text-[#AAAAAA]">Recipient taps to open — confetti included</p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {d?.wrap ? (
              <span aria-hidden className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ backgroundColor: wrap }} />
            ) : null}
            <span className="rounded-full bg-[#5E5CE6]/[0.1] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#5E5CE6]">
              Reveal
            </span>
          </span>
        </div>
      );
    }
    case "flower": {
      const f = resolveFlower(d?.flower ?? d?.roseStyle);
      const note = d?.message?.trim();
      const hasVoice = !!d?.voiceNote?.trim();
      return (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_50%_35%,#3A1526_0%,#1D1D1F_78%)]"
          >
            <img src={f.thumb} alt="" width={58} height={58} className="h-full w-full object-cover" draggable={false} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Rose Bouquet</p>
            <p className="mt-1 truncate text-[12.5px] text-[#AAAAAA]">
              {note ? `“${note}”` : "A bouquet with a note card"}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {hasVoice ? (
              <span
                className="flex items-center gap-1 rounded-full bg-[#FF375F]/[0.1] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#FF375F]"
                title="Voice note attached"
              >
                <Mic size={10} aria-hidden /> Voice
              </span>
            ) : null}
          </span>
        </div>
      );
    }
    case "countdown": {
      const label = countdownLabel(d?.minutes);
      return (
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#FF9F0A]/[0.08] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-[#B26A00]" aria-hidden />
            <p className="text-[13px] font-semibold text-[#B26A00]">Unlocks in</p>
          </div>
          <p className="text-[17px] font-bold tabular-nums tracking-wide text-[#1D1D1F]">
            {label ?? "03 : 12 : 45"}
          </p>
        </div>
      );
    }
    case "quiz": {
      const question = d?.question?.trim() || "Pick the answer that fits —";
      const options = d?.options?.length ? d.options : ["Option A", "Option B"];
      const answer = d?.answer ?? -1;
      return (
        <div>
          <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{question}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {options.map((o, i) => {
              const correct = i === answer;
              return (
                <span
                  key={i}
                  className={cn(
                    "flex items-center gap-1 rounded-full border py-2 pl-3 pr-2.5 text-center text-[12.5px] font-semibold",
                    correct
                      ? "border-[#30D158]/45 bg-[#30D158]/[0.1] text-[#1E9E4A]"
                      : "border-[#1D1D1F]/[0.08] bg-white text-[#1D1D1F]/70"
                  )}
                >
                  {o}
                  {correct ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    case "reward": {
      const kind = d?.rewardKind;
      const meta = rewardKindMeta(kind);
      const code = d?.code?.trim();
      const domain = d?.url?.trim() ? urlDomain(d.url) : null;
      return (
        <div className="flex items-center gap-3 rounded-[14px] border border-[#1D1D1F]/[0.06] bg-white px-3.5 py-3 shadow-[0_8px_20px_-12px_rgba(30,158,74,0.35)]">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#5BE07E] to-[#1E9E4A] text-white shadow-[0_6px_14px_-4px_rgba(48,209,88,0.55)]">
            <Award size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
              {meta.label} reveal
            </p>
            {code ? (
              <p className="mt-0.5 truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-[#1E9E4A]/80">
                {code}
              </p>
            ) : (
              <p className="text-[12px] text-[#AAAAAA]">{meta.blurb}</p>
            )}
            {domain ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#1E9E4A]/70">
                <ExternalLink size={10} aria-hidden /> Redeem at {domain}
              </p>
            ) : null}
          </div>
        </div>
      );
    }
    case "coupon": {
      const heading = d?.heading?.trim() || "COUPON CODE";
      const pool = couponPool(d);
      const prizeLine =
        pool.length === 0
          ? ""
          : pool.length === 1
            ? pool[0].code
            : `${pool[0].code} +${pool.length - 1} more`;
      const domain = d?.url?.trim() ? urlDomain(d.url) : null;
      return (
        <div className="flex items-center gap-3 rounded-[14px] bg-[#F5F5F7] px-3.5 py-3 shadow-[0_10px_24px_-14px_rgba(23,43,77,0.45)]">
          {/* a miniature of the blue claw machine */}
          <span
            aria-hidden
            className="relative flex h-[56px] w-[46px] shrink-0 flex-col items-center overflow-hidden rounded-[9px] bg-gradient-to-b from-[#45A7FF] to-[#1277DE] pb-[4px] pt-[3px]"
          >
            {/* marquee */}
            <span className="flex h-[15px] w-[78%] flex-col items-center justify-center rounded-[4px] bg-gradient-to-b from-[#7C3AED] to-[#5B21B6]">
              <span className="text-[4.5px] font-black leading-none text-[#FFD84D]">COUPON</span>
              <span className="text-[3.5px] font-extrabold leading-[1.35] tracking-[0.16em] text-white">REVEAL</span>
            </span>
            {/* glass window */}
            <span className="relative mt-[3px] h-[24px] w-[78%] overflow-hidden rounded-[4px] bg-[#EAF3FD]">
              <span className="absolute left-1/2 top-0 h-[7px] w-[1.5px] -translate-x-1/2 bg-[#23252E]" />
              <span className="absolute left-1/2 top-[6px] h-[2.5px] w-[8px] -translate-x-1/2 rounded-[1px] bg-[#C3CBD6]" />
              <span className="absolute left-1/2 top-[8px] h-[3.5px] w-[2px] -translate-x-1/2 rounded-b-full border-[1.5px] border-t-0 border-[#C3CBD6]" />
              {/* golden ticket in the claw */}
              <span className="absolute left-1/2 top-[11px] h-[6px] w-[17px] -translate-x-1/2 -rotate-3 rounded-[1.5px] bg-gradient-to-b from-[#FFEDB0] to-[#F5B93B]" />
              {/* colorful pile */}
              <span className="absolute bottom-[1px] left-[2px] h-[4px] w-[10px] -rotate-[12deg] rounded-[1px] bg-[#9B59B6]" />
              <span className="absolute bottom-[0.5px] left-[8px] h-[4px] w-[11px] rotate-[8deg] rounded-[1px] bg-[#E84393]" />
              <span className="absolute bottom-[1px] left-[16px] h-[4px] w-[10px] -rotate-[6deg] rounded-[1px] bg-[#2ECC71]" />
              <span className="absolute bottom-[0.5px] right-[2px] h-[4px] w-[10px] rotate-[10deg] rounded-[1px] bg-[#FF7A3D]" />
            </span>
            {/* control panel */}
            <span className="mt-[3px] flex h-[8px] w-[78%] items-center justify-between rounded-[3px] bg-gradient-to-b from-[#54B2FF] to-[#2E93F7] px-[3px]">
              <span className="relative h-[5px] w-[5px] rounded-full bg-[#23252B]">
                <span className="absolute -top-[2.5px] left-1/2 h-[2.5px] w-[1.5px] -translate-x-1/2 rounded-full bg-[#2A2D35]" />
                <span className="absolute -top-[4px] left-1/2 h-[2.5px] w-[2.5px] -translate-x-1/2 rounded-full bg-[#E02424]" />
              </span>
              <span className="h-[4px] w-[18px] rounded-full bg-gradient-to-b from-[#A96BFF] to-[#8B3FE8]" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{heading} reveal</p>
            {prizeLine ? (
              <p className="mt-0.5 truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-[#8A5A16]">
                {prizeLine}
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Add coupons to fill the machine</p>
            )}
            {domain ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#218CF4]/80">
                <ExternalLink size={10} aria-hidden /> Redeem at {domain}
              </p>
            ) : null}
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-[#218CF4]/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#1277DE]">
              Play
            </span>
          </span>
        </div>
      );
    }
    case "cta": {
      const label = d?.label?.trim();
      const action = d?.action;
      const domain = d?.url?.trim() ? urlDomain(d.url) : null;
      return (
        <div className="flex flex-col items-center py-1">
          <span className="flex items-center gap-1.5 rounded-full bg-[#007AFF] px-7 py-2.5 text-[14px] font-semibold text-white pill-shadow">
            {label || "Continue"}
            {domain ? <ExternalLink size={12} aria-hidden className="opacity-80" /> : null}
          </span>
          <p className="mt-2 text-[11px] font-medium text-[#AAAAAA]">
            {domain ? (
              <span className="inline-flex items-center gap-1">
                <Link2 size={10} aria-hidden className="text-[#007AFF]" />
                <span className="font-semibold text-[#007AFF]">{domain}</span>
                <span>· opens in a new tab</span>
              </span>
            ) : (
              action ?? "Opens a link, claim or reply"
            )}
          </p>
        </div>
      );
    }
    case "confetti": {
      const raw = d?.style as string | undefined;
      const style: ConfettiStyleName = (CONFETTI_STYLES as string[]).includes(raw ?? "")
        ? (raw as ConfettiStyleName)
        : "Burst";
      const palette = CONFETTI_PALETTES[style];
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#FF6482] to-[#FF9F0A] text-white shadow-[0_6px_14px_-4px_rgba(255,100,130,0.55)]">
            <PartyPopper size={16} strokeWidth={2.2} aria-hidden />
          </span>
          <p className="flex-1 text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            {style} celebration
          </p>
          {/* a tiny confetti cluster echoing the style's palette */}
          <span className="flex shrink-0 items-center gap-1" aria-hidden>
            <span className="h-3.5 w-[4px] rounded-full" style={{ backgroundColor: palette[0] }} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[1] }} />
            <span className="h-2.5 w-[7px] rounded-[2px]" style={{ backgroundColor: palette[2] }} />
            <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: palette[3] }} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[4] }} />
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Draggable block card (grip handle initiates drag)                    */
/* ------------------------------------------------------------------ */

function BlockCard({
  block,
  cover,
  scenePos,
  active,
  onSelect,
  onRemove,
  onEdit,
  onGripDown,
}: {
  block: Block;
  cover: number;
  scenePos: number;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onGripDown: (e: React.PointerEvent) => void;
}) {
  const controls = useDragControls();
  const def = BLOCK_BY_TYPE[block.type];
  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${def?.label ?? "Block"} in scene ${scenePos}. ${active ? "Selected" : "Tap to select"}. Drag the handle to reorder.`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative cursor-pointer rounded-[18px] border bg-white p-3.5 outline-none transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-[#007AFF]",
        active
          ? "border-[#007AFF] shadow-[0_0_0_3px_rgba(0,122,255,0.12),0_12px_28px_-14px_rgba(0,122,255,0.35)]"
          : "border-[#1D1D1F]/[0.07] card-shadow"
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          aria-label={`Reorder ${def?.label ?? "block"} in scene ${scenePos}`}
          onPointerDown={(e) => {
            onGripDown(e);
            controls.start(e);
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-[#C7C7CC] transition-colors active:cursor-grabbing hover:text-[#1D1D1F]/50",
            active && "text-[#007AFF]"
          )}
        >
          <GripVertical size={15} strokeWidth={2.2} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <BlockPreview block={block} cover={cover} />
        </div>
      </div>

      {/* Block meta + edit / delete */}
      <div className="mt-3 flex items-center justify-between border-t border-[#1D1D1F]/[0.05] pt-2.5">
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
          {def ? (
            <def.icon size={11} strokeWidth={2.4} aria-hidden style={{ color: def.tint }} />
          ) : null}
          {def?.label ?? block.type}
        </span>
        {active ? (
          <span className="relative z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Edit ${def?.label ?? "block"} content`}
              className="flex items-center gap-1 rounded-full bg-[#007AFF]/[0.1] px-2.5 py-1 text-[11px] font-semibold text-[#007AFF] transition-transform active:scale-90"
            >
              <Pencil size={11} strokeWidth={2.4} aria-hidden /> Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Remove ${def?.label ?? "block"}`}
              className="flex items-center gap-1 rounded-full bg-[#FF375F]/[0.1] px-2.5 py-1 text-[11px] font-semibold text-[#FF375F] transition-transform active:scale-90"
            >
              <Trash2 size={11} strokeWidth={2.4} aria-hidden /> Remove
            </button>
          </span>
        ) : null}
      </div>
    </Reorder.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Block editor — per-type configuration (sheet content)               */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">{children}</p>;
}

function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  groupLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | undefined;
  onChange: (v: T) => void;
  groupLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={groupLabel}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.96]",
              active
                ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media upload field (photo / video blocks)                           */
/* ------------------------------------------------------------------ */

const UPLOAD_LIMIT_MB = 16;

function MediaUploadField({
  kind,
  value,
  valueIsVideo,
  onUploaded,
  onRemove,
}: {
  kind: "photo" | "video" | "auto";
  value?: string;
  /** For kind="auto": how the current value should preview (photo vs video) */
  valueIsVideo?: boolean;
  onUploaded: (url: string, mediaKind: "photo" | "video") => void;
  onRemove: () => void;
}) {
  const { notify } = useMD();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  /** Real upload progress from the XHR (null = idle) */
  const [pct, setPct] = useState<number | null>(null);
  const isPhoto = kind === "photo";
  const isAuto = kind === "auto";
  // In auto mode the preview kind comes from the caller's hint; in the
  // dropzone state we track the last picked kind so the icon stays honest.
  const [autoIsVideo, setAutoIsVideo] = useState(false);
  const showVideo = isAuto ? (value ? !!valueIsVideo : autoIsVideo) : !isPhoto;

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const okType = isPhoto ? isImage : kind === "video" ? isVideo : isImage || isVideo;
    if (!okType) {
      notify(
        isAuto ? "That file isn't a photo or video" : isPhoto ? "That file isn't a photo" : "That file isn't a video"
      );
      return;
    }
    if (file.size > UPLOAD_LIMIT_MB * 1024 * 1024) {
      notify(`Too large — keep it under ${UPLOAD_LIMIT_MB} MB`);
      return;
    }
    setBusy(true);
    setPct(0);
    try {
      const url = await apiUploadFile(file, (p) => setPct(p));
      setAutoIsVideo(isVideo);
      onUploaded(url, isVideo ? "video" : "photo");
      notify(isVideo ? "Video uploaded" : "Photo uploaded");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed — try again");
    } finally {
      setBusy(false);
      setPct(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={isAuto ? "image/*,video/*" : isPhoto ? "image/*" : "video/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-picking the same file
          if (file) void upload(file);
        }}
      />
      {value ? (
        <div className="space-y-2.5">
          <div className="relative overflow-hidden rounded-[16px] border border-[#1D1D1F]/[0.07]">
            {showVideo ? (
              <video src={value} controls muted playsInline preload="metadata" className="max-h-[220px] w-full bg-[#1D1D1F] object-cover" />
            ) : (
              <img src={value} alt="Uploaded photo preview" className="max-h-[220px] w-full object-cover" />
            )}
            {isAuto ? (
              <span className="absolute left-2.5 top-2.5 rounded-full bg-[#1D1D1F]/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-md">
                {showVideo ? "Video cover" : "Photo cover"}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="flex-1 rounded-full border border-[#1D1D1F]/[0.09] bg-white py-2.5 text-[13px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? `Uploading…${pct !== null ? ` ${pct}%` : ""}` : "Replace"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="flex-1 rounded-full bg-[#FF375F]/[0.08] py-2.5 text-[13px] font-semibold text-[#FF375F] transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="flex w-full flex-col items-center rounded-[18px] border-2 border-dashed border-[#1D1D1F]/[0.14] bg-white px-6 py-8 transition-all hover:border-[#007AFF]/45 hover:bg-[#007AFF]/[0.03] active:scale-[0.98] disabled:opacity-60"
        >
          <span className={cn(
            "mb-2.5 flex h-11 w-11 items-center justify-center rounded-full",
            isPhoto || (isAuto && !autoIsVideo)
              ? "bg-[#30D158]/[0.1] text-[#1E9E4A]"
              : "bg-[#FF9F0A]/[0.12] text-[#B26A00]"
          )}>
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            ) : isPhoto || (isAuto && !autoIsVideo) ? (
              <ImagesIcon size={19} aria-hidden />
            ) : (
              <Video size={19} aria-hidden />
            )}
          </span>
          <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            {busy ? `Uploading…${pct !== null ? ` ${pct}%` : ""}` : isAuto ? "Upload a photo or video" : isPhoto ? "Upload a photo" : "Upload a video"}
          </span>
          {busy && pct !== null ? (
            <span className="mt-2.5 block h-[5px] w-40 overflow-hidden rounded-full bg-[#1D1D1F]/[0.08]" aria-hidden>
              <span
                className="block h-full rounded-full bg-[#007AFF] transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </span>
          ) : null}
          <span className="mt-1 text-[11.5px] text-[#AAAAAA]">
            {isAuto ? "Any image or video · covers the whole scene · up to 16 MB" : isPhoto ? "JPG, PNG, WebP or GIF · up to 16 MB" : "MP4 or WebM · up to 16 MB"}
          </span>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Song picker — Instagram-Notes-style search + snippet selection      */
/* ------------------------------------------------------------------ */

const SNIPPET_LENGTHS = [10, 15, 30];

/** Row preview + snippet playback state machine for one shared <audio>. */
function usePreviewAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  /** Plays a clip — from `start` for `length` seconds (preview clips are ~30s). */
  const play = useCallback(
    (id: string, url: string, start: number, length: number) => {
      stop();
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);
      const onTime = () => {
        if (audio.currentTime >= start + length) {
          stop();
        }
      };
      const onReady = () => {
        try {
          audio.currentTime = Math.min(start, Math.max(0, (audio.duration || 30) - 0.5));
        } catch {
          // seek before metadata — the assignment still queues on most browsers
        }
        void audio.play().catch(() => stop());
      };
      const onEnd = () => stop();
      audio.addEventListener("loadedmetadata", onReady, { once: true });
      audio.addEventListener("timeupdate", onTime);
      audio.addEventListener("ended", onEnd);
      audio.addEventListener("error", onEnd);
      // If metadata is already available (cached), loadedmetadata may not fire.
      if (audio.readyState >= 1) onReady();
      stopRef.current = () => {
        audio.removeEventListener("timeupdate", onTime);
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("ended", onEnd);
        audio.removeEventListener("error", onEnd);
      };
    },
    [stop]
  );

  // Stop on unmount (sheet close)
  useEffect(() => () => stop(), [stop]);

  return { playingId, play, stop };
}

/**
 * SongPickerContent — search any song, preview it, pick the exact part.
 * Used for both the audio block editor and the experience soundtrack.
 */
function SongPickerContent({
  selected,
  onConfirm,
}: {
  selected: SongPick | null;
  onConfirm: (song: SongPick | null) => void;
}) {
  const [query, setQuery] = useState("");
  /** Last settled search result — {q} ties it to the query it answers. */
  const [results, setResults] = useState<{ q: string; songs: SongResult[]; error: boolean } | null>(null);
  const [chosen, setChosen] = useState<SongResult | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(15);
  const { playingId, play, stop } = usePreviewAudio();

  // Debounced search — fires when the query settles (≥2 chars).
  // Spinner / results / empty states are all DERIVED from (query, results),
  // so nothing needs a synchronous reset when the query changes.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      apiSearchMusic(q)
        .then((songs) => setResults({ q, songs, error: false }))
        .catch(() => setResults({ q, songs: [], error: true }));
    }, 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const q = query.trim();
  const active = q.length >= 2;
  const settled = active && results?.q === q;
  const searching = active && !settled; // includes the debounce window
  const songs = settled ? results.songs : [];
  const searched = settled && !results.error;
  const error = settled && results.error;

  const choose = (s: SongResult) => {
    stop();
    if (chosen?.id === s.id) {
      setChosen(null);
      return;
    }
    setChosen(s);
    // Sensible default: drop the needle 5s in, 15s clip.
    setStart(Math.min(5, Math.max(0, 30 - 15)));
    setLength(15);
  };

  const confirm = () => {
    if (!chosen) return;
    stop();
    onConfirm({
      id: chosen.id,
      title: chosen.title,
      artist: chosen.artist,
      album: chosen.album,
      artwork: chosen.artwork,
      previewUrl: chosen.previewUrl,
      durationMs: chosen.durationMs,
      start,
      length,
      source: chosen.source,
    });
  };

  return (
    <div className="pb-2">
      {/* Current selection */}
      {selected && !chosen ? (
        <div className="mb-3 flex items-center gap-3 rounded-[18px] border-2 border-[#007AFF] bg-[#007AFF]/[0.04] p-3">
          {selected.artwork ? (
            <img src={selected.artwork} alt="" aria-hidden className="h-11 w-11 shrink-0 rounded-[12px] object-cover" />
          ) : (
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#FF375F]/15 text-[#FF375F]">
              <Music size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{selected.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">
              {selected.artist} · {formatClock(selected.start)}–{formatClock(selected.start + selected.length)} clip
            </p>
          </div>
          <button
            type="button"
            onClick={() => onConfirm(null)}
            aria-label="Remove song"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.09] text-[#FF375F] transition-transform active:scale-90"
          >
            <Trash2 size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      ) : null}

      {/* Search field */}
      <div className="relative">
        <SearchIcon
          size={15}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists…"
          aria-label="Search songs"
          autoComplete="off"
          className={cn(fieldInput, "pl-9")}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setChosen(null);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#1D1D1F]/[0.08] text-[#AAAAAA] transition-colors hover:text-[#1D1D1F]"
          >
            <X size={11} strokeWidth={2.6} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Results */}
      <div className="mt-3 space-y-2">
        {searching ? (
          <div className="flex flex-col gap-2.5 py-4" aria-live="polite">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="h-11 w-11 shrink-0 animate-pulse rounded-[12px] bg-[#1D1D1F]/[0.06]" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-3 w-2/3 animate-pulse rounded-full bg-[#1D1D1F]/[0.06]" />
                  <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-[#1D1D1F]/[0.06]" />
                </span>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-[13px] font-medium text-[#FF375F]">
            Search is unavailable right now — try again
          </p>
        ) : songs.length === 0 ? (
          <div className="py-8 text-center">
            <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#FF375F]/[0.08] text-[#FF375F]">
              <Music size={17} aria-hidden />
            </span>
            <p className="text-[13px] font-semibold text-[#1D1D1F]">
              {searched ? "Nothing found — try another search" : "Find the song that sets the mood"}
            </p>
            <p className="mt-1 px-6 text-[11.5px] leading-relaxed text-[#AAAAAA]">
              {searched
                ? "Check the spelling or try the artist's name."
                : "Search any artist or track, listen to the preview, then pick the exact part that plays."}
            </p>
          </div>
        ) : (
          songs.map((s) => {
            const isChosen = chosen?.id === s.id;
            const playing = playingId === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-[16px] border-2 bg-white p-2.5 transition-all",
                  isChosen ? "border-[#007AFF] bg-[#007AFF]/[0.04]" : "border-[#1D1D1F]/[0.07]"
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    playing
                      ? stop()
                      : play(s.id, s.previewUrl, 0, 30)
                  }
                  aria-label={playing ? `Pause preview of ${s.title}` : `Preview ${s.title}`}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
                >
                  {s.artwork ? (
                    <img src={s.artwork} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden className="absolute inset-0 bg-[#1D1D1F]/[0.08]" />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 flex items-center justify-center bg-black/35 text-white transition-opacity",
                      playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                  </span>
                </button>
                <button type="button" onClick={() => choose(s)} className="min-w-0 flex-1 text-left">
                  <p className={cn("truncate text-[14px] font-bold tracking-[-0.01em]", isChosen ? "text-[#007AFF]" : "text-[#1D1D1F]")}>
                    {s.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-[#AAAAAA]">
                    {playing ? <EqBars className="h-3 w-4 text-[#007AFF]" /> : null}
                    <span className="truncate">{s.artist}</span>
                  </p>
                </button>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#AAAAAA]">
                  {formatClock(s.durationMs / 1000)}
                </span>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  aria-label={isChosen ? `Unselect ${s.title}` : `Select ${s.title}`}
                  aria-pressed={isChosen}
                  className={cn(
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isChosen ? "border-[#007AFF] bg-[#007AFF]" : "border-[#D1D1D6]"
                  )}
                >
                  {isChosen ? <Check size={13} strokeWidth={3} className="text-white" aria-hidden /> : null}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Snippet picker — Instagram-Notes style “choose the part” */}
      {chosen ? (
        <SnippetPicker
          title={chosen.title}
          artwork={chosen.artwork}
          previewUrl={chosen.previewUrl}
          pickId={chosen.id}
          maxSeconds={30}
          start={start}
          length={length}
          lengthOptions={SNIPPET_LENGTHS}
          onStart={setStart}
          onLength={(len) => {
            setLength(len);
            setStart((s) => Math.min(s, Math.max(0, 30 - len)));
          }}
          playingId={playingId}
          play={play}
          stop={stop}
          onConfirm={confirm}
          confirmLabel="Use this song"
        />
      ) : null}

      <p className="mt-3 px-1 text-center text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
        Previews are 30-second catalog clips — pick the exact part that plays, Instagram-style.
      </p>
    </div>
  );
}

/** Instagram-Notes-style “choose the part” picker — waveform scrubber,
 *  length chips, snippet preview + confirm. Shared by the catalog search
 *  and the audio-upload flow. */
function SnippetPicker({
  title,
  artwork,
  previewUrl,
  pickId,
  maxSeconds,
  start,
  length,
  lengthOptions,
  onStart,
  onLength,
  playingId,
  play,
  stop,
  onConfirm,
  confirmLabel,
}: {
  title: string;
  artwork?: string;
  previewUrl: string;
  pickId: string;
  maxSeconds: number;
  start: number;
  length: number;
  lengthOptions: number[];
  onStart: (v: number) => void;
  onLength: (v: number) => void;
  playingId: string | null;
  play: (id: string, url: string, start: number, length: number) => void;
  stop: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  const cap = Math.max(1, maxSeconds);
  const maxStart = Math.max(0, cap - length);
  const previewing = playingId === `snippet-${pickId}`;
  return (
    <div className="mt-4 rounded-[20px] border border-[#007AFF]/25 bg-[#007AFF]/[0.04] p-4">
      <div className="flex items-center gap-3">
        {artwork ? (
          <img src={artwork} alt="" aria-hidden className="h-12 w-12 shrink-0 rounded-[13px] object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#FF375F] to-[#5E5CE6] text-white"
          >
            <FileMusic size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-[#AAAAAA]">Pick the part that plays</p>
        </div>
      </div>

      {/* Waveform-ish scrubber */}
      <div className="mt-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Start</span>
          <span className="text-[12.5px] font-bold tabular-nums text-[#1D1D1F]">
            {formatClock(start)} → {formatClock(start + length)}
          </span>
        </div>
        <div aria-hidden className="flex h-8 items-center gap-[2px]">
          {Array.from({ length: 40 }, (_, i) => {
            const frac = i / 40;
            const inSnippet = frac >= start / cap && frac <= (start + length) / cap;
            const h = 8 + ((i * 37) % 19);
            return (
              <span
                key={i}
                className={cn("flex-1 rounded-full transition-colors", inSnippet ? "bg-[#007AFF]" : "bg-[#1D1D1F]/[0.12]")}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <Slider
          value={[Math.min(start, maxStart)]}
          min={0}
          max={maxStart}
          step={0.5}
          onValueChange={(v) => onStart(v[0])}
          aria-label="Snippet start time"
          className="mt-1"
        />
      </div>

      {/* Length chips */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Length</p>
        <div className="flex gap-2">
          {lengthOptions.map((len) => {
            const isFull = len >= cap && cap > 30;
            return (
              <button
                key={len}
                type="button"
                aria-pressed={length === len}
                onClick={() => onLength(len)}
                className={cn(
                  "flex-1 rounded-full border py-2 text-[13px] font-semibold tabular-nums transition-all active:scale-[0.96]",
                  length === len
                    ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                    : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                )}
              >
                {isFull ? "Full" : formatClock(len)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => (previewing ? stop() : play(`snippet-${pickId}`, previewUrl, start, length))}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#1D1D1F]/[0.09] bg-white py-2.5 text-[13.5px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.97]"
        >
          {previewing ? (
            <>
              <Pause size={13} aria-hidden /> Pause
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" aria-hidden /> Preview
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-[1.6] rounded-full bg-[#007AFF] py-2.5 text-[14px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audio upload — pick a file, choose the part, just like a song pick   */
/* ------------------------------------------------------------------ */

const AUDIO_LIMIT_MB = 16;

/** Reads the real duration (seconds) of an audio URL via metadata. */
function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    const settle = (v: number) => {
      probe.onloadedmetadata = null;
      probe.onerror = null;
      resolve(v);
    };
    probe.onloadedmetadata = () =>
      settle(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 30);
    probe.onerror = () => settle(30);
    window.setTimeout(
      () => settle(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 30),
      4000
    );
    probe.src = url;
  });
}

function UploadAudioContent({
  selected,
  onConfirm,
}: {
  selected: SongPick | null;
  onConfirm: (song: SongPick | null) => void;
}) {
  const { notify } = useMD();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  /** Real upload progress from the XHR (null = idle) */
  const [pct, setPct] = useState<number | null>(null);
  /** A freshly uploaded (or re-staged) file awaiting snippet confirmation */
  const [staged, setStaged] = useState<{ url: string; name: string; duration: number } | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(30);
  const { playingId, play, stop } = usePreviewAudio();

  const upload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      notify("That file isn't audio");
      return;
    }
    if (file.size > AUDIO_LIMIT_MB * 1024 * 1024) {
      notify(`Too large — keep it under ${AUDIO_LIMIT_MB} MB`);
      return;
    }
    setBusy(true);
    setPct(0);
    try {
      const url = await apiUploadFile(file, (p) => setPct(p));
      const secs = Math.max(1, Math.round(await probeAudioDuration(url)));
      setStaged({ url, name: file.name.replace(/\.[^.]+$/, ""), duration: secs });
      setStart(0);
      setLength(Math.min(30, secs));
      notify("Audio uploaded — pick the part that plays");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed — try again");
    } finally {
      setBusy(false);
      setPct(null);
    }
  };

  /** Re-opens the snippet picker on the current pick (change part) */
  const stageSelected = () => {
    if (!selected || selected.source !== "upload") return;
    setStaged({
      url: selected.previewUrl,
      name: selected.title,
      duration: Math.max(1, Math.round(selected.durationMs / 1000)),
    });
    setStart(selected.start);
    setLength(selected.length);
  };

  const confirmStaged = () => {
    if (!staged) return;
    stop();
    onConfirm({
      id: uid("up-"),
      title: staged.name,
      artist: "Your upload",
      artwork: "",
      previewUrl: staged.url,
      durationMs: staged.duration * 1000,
      start,
      length,
      source: "upload",
    });
    setStaged(null);
  };

  const isUpload = selected?.source === "upload";
  const selPlaying = isUpload && playingId === `sel-${selected.id}`;
  const lengthOptions = staged
    ? [...new Set([10, 15, 30, staged.duration].filter((s) => s <= staged.duration))].sort((a, b) => a - b)
    : [];

  return (
    <div className="pb-2">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-picking the same file
          if (file) void upload(file);
        }}
      />

      {/* Current uploaded pick */}
      {isUpload && !staged ? (
        <div className="mb-3 space-y-2.5">
          <div className="flex items-center gap-3 rounded-[18px] border-2 border-[#007AFF] bg-[#007AFF]/[0.04] p-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FF375F] to-[#5E5CE6] text-white"
            >
              <FileMusic size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{selected.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">
                Your upload · {formatClock(selected.start)}–{formatClock(selected.start + selected.length)} clip
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                selPlaying
                  ? stop()
                  : play(`sel-${selected.id}`, selected.previewUrl, selected.start, selected.length)
              }
              aria-label={selPlaying ? "Pause preview" : "Preview clip"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/[0.12] text-[#007AFF] transition-transform active:scale-90"
            >
              {selPlaying ? <Pause size={15} aria-hidden /> : <Play size={15} fill="currentColor" className="ml-0.5" aria-hidden />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={stageSelected}
              className="flex-1 rounded-full border border-[#1D1D1F]/[0.09] bg-white py-2.5 text-[13px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.97]"
            >
              Change part
            </button>
            <button
              type="button"
              onClick={() => onConfirm(null)}
              aria-label="Remove uploaded audio"
              className="flex-1 rounded-full bg-[#FF375F]/[0.08] py-2.5 text-[13px] font-semibold text-[#FF375F] transition-transform active:scale-[0.97]"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full rounded-full bg-[#1D1D1F]/[0.06] py-2.5 text-[13px] font-semibold text-[#1D1D1F]/75 transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? `Uploading…${pct !== null ? ` ${pct}%` : ""}` : "Upload a different file"}
          </button>
        </div>
      ) : null}

      {/* Staged upload — snippet picker (big dropzone only when nothing is picked) */}
      {staged ? (
        <div>
          <SnippetPicker
            title={staged.name}
            previewUrl={staged.url}
            pickId="upload"
            maxSeconds={staged.duration}
            start={start}
            length={length}
            lengthOptions={lengthOptions}
            onStart={setStart}
            onLength={(len) => {
              setLength(len);
              setStart((s) => Math.min(s, Math.max(0, staged.duration - len)));
            }}
            playingId={playingId}
            play={play}
            stop={stop}
            onConfirm={confirmStaged}
            confirmLabel="Use this audio"
          />
          <button
            type="button"
            onClick={() => setStaged(null)}
            className="mt-2 w-full rounded-full bg-[#1D1D1F]/[0.06] py-2 text-[12.5px] font-semibold text-[#1D1D1F]/70 transition-transform active:scale-[0.97]"
          >
            Cancel
          </button>
        </div>
      ) : isUpload ? null : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center rounded-[18px] border-2 border-dashed border-[#1D1D1F]/[0.14] bg-white px-6 py-8 transition-all hover:border-[#007AFF]/45 hover:bg-[#007AFF]/[0.03] active:scale-[0.98] disabled:opacity-60"
        >
          <span className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#FF375F]/[0.1] text-[#FF375F]">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            ) : (
              <Upload size={19} aria-hidden />
            )}
          </span>
          <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            {busy ? `Uploading…${pct !== null ? ` ${pct}%` : ""}` : "Upload an audio file"}
          </span>
          {busy && pct !== null ? (
            <span className="mt-2.5 block h-[5px] w-40 overflow-hidden rounded-full bg-[#1D1D1F]/[0.08]" aria-hidden>
              <span
                className="block h-full rounded-full bg-[#FF375F] transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </span>
          ) : null}
          <span className="mt-1 text-center text-[11.5px] leading-relaxed text-[#AAAAAA]">
            MP3, M4A, WAV or OGG · up to 16 MB — voice notes, demos, anything
          </span>
        </button>
      )}

      {isUpload ? null : (
        <p className="mt-3 px-1 text-center text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
          Your file plays straight from the scene — no streaming, no catalog limits.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flower block — the still bouquet at one best angle + the message card   */
/* (+ optional voice note). The bouquet itself is never configurable:   */
/* no angles, no motion — it sits perfectly still at its best angle.    */
/* ------------------------------------------------------------------ */

/** Picking the browser's best recording format: Chrome/Android record
 *  audio/webm, Safari audio/mp4 — each plays back fine where it records. */
function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

const VOICE_NOTE_MAX_SECS = 120;

function FlowerBlockEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const selected = resolveFlower(d.flower ?? d.roseStyle);
  const { notify } = useMD();

  const message = d.message ?? "";
  const voiceUrl = (d.voiceNote ?? "").trim();

  /* ---- voice note: mic recorder ---- */
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  /* ---- voice note: editor preview playback ---- */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stopEverything = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recRef.current;
    if (rec && rec.state === "recording") rec.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setRecording(false);
  }, []);

  // Release mic + stop preview when the sheet closes
  useEffect(
    () => () => {
      stopEverything();
      audioRef.current?.pause();
    },
    [stopEverything]
  );

  const uploadVoice = useCallback(
    async (file: File) => {
      if (file.size > AUDIO_LIMIT_MB * 1024 * 1024) {
        notify(`Too large — keep it under ${AUDIO_LIMIT_MB} MB`);
        return;
      }
      setUploading(true);
      setUploadPct(0);
      try {
        const url = await apiUploadFile(file, (p) => setUploadPct(p));
        set({ voiceNote: url });
        notify("Voice note added to the card");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Upload failed — try again");
      } finally {
        setUploading(false);
        setUploadPct(null);
      }
    },
    [notify, d]
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) {
          notify("Didn't catch that — hold the mic a little longer");
          return;
        }
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        void uploadVoice(new File([blob], `voice-note.${ext}`, { type: blob.type }));
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => {
        setRecSecs((s) => {
          if (s + 1 >= VOICE_NOTE_MAX_SECS) stopEverything();
          return s + 1;
        });
      }, 1000);
    } catch {
      notify("Microphone access was blocked — check your browser permissions");
    }
  };

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewing) {
      audio.pause();
    } else {
      audio.currentTime = 0;
      void audio.play().catch(() => setPreviewing(false));
    }
  };

  const previewMessage = message.trim() || "A bouquet for you.";

  return (
    <div className="space-y-4 pb-2">
      {/* Live preview — frameless, exactly what the recipient sees: the
       * still bouquet at its best angle, then the card beneath it. */}
      <div className="overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_18%,#3A1526_0%,#1D1D1F_74%)]">
        <div className="h-[205px]">
          <FlowerStage flowerId={selected.id} />
        </div>
      </div>
      <div className="mx-1 overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF3E4_100%)] px-4 py-3.5 shadow-[0_10px_24px_-14px_rgba(29,29,31,0.35)] ring-1 ring-black/[0.05]">
        <Heart size={11} className="mx-auto mb-1.5 text-[#FF375F]" fill="currentColor" aria-hidden />
        <p className="text-center font-serif text-[13.5px] italic leading-[1.5] text-[#3E2A1E]">
          {previewMessage}
        </p>
        {voiceUrl ? (
          <p className="mt-2.5 flex items-center justify-center gap-1.5 border-t border-[#B45309]/[0.12] pt-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#8A5A2B]/75">
            <Mic size={10} aria-hidden /> Voice note attached
          </p>
        ) : null}
      </div>

      {/* The ONLY flower setting: which flower */}
      <div>
        <FieldLabel>Flower</FieldLabel>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Flower selection">
          {FLOWERS.map((f) => {
            const active = selected.id === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ flower: f.id })}
                className={cn(
                  "flex items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-bold transition-all active:scale-[0.96]",
                  active
                    ? "border-[#FF375F] bg-[#FF375F]/[0.06] text-[#D6336C]"
                    : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                )}
              >
                <span
                  aria-hidden
                  className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-black/10"
                  style={{ background: f.accent }}
                >
                  <img src={f.thumb} alt="" width={24} height={24} className="h-full w-full object-cover" draggable={false} />
                </span>
                {f.name}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 px-1 text-[11px] font-medium text-[#AAAAAA]">{selected.caption}</p>
      </div>

      {/* The card message */}
      <div>
        <label
          htmlFor="md-flower-note"
          className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]"
        >
          Message on the card
        </label>
        <textarea
          id="md-flower-note"
          rows={3}
          maxLength={220}
          value={message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="We're so sorry your parcel is delayed — thank you for your patience. These roses are for you 💐"
          className={cn(fieldInput, "resize-none leading-relaxed")}
        />
        <div className="mt-1.5 flex justify-end">
          <span className="text-[10.5px] font-semibold tabular-nums text-[#AAAAAA]">
            {message.length}/220
          </span>
        </div>
      </div>

      {/* The optional voice note */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
            Voice note
          </span>
          <span className="rounded-full bg-[#1D1D1F]/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#AAAAAA]">
            Optional
          </span>
        </div>

        {voiceUrl ? (
          /* Attached — preview + replace + remove */
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-[#FF375F]/[0.35] bg-[#FF375F]/[0.04] p-3">
            <button
              type="button"
              onClick={togglePreview}
              aria-label={previewing ? "Pause voice note" : "Play voice note"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF375F] text-white transition-transform active:scale-90"
            >
              {previewing ? (
                <Pause size={15} aria-hidden />
              ) : (
                <Play size={15} fill="currentColor" className="ml-0.5" aria-hidden />
              )}
            </button>
            <audio
              ref={audioRef}
              src={voiceUrl}
              preload="metadata"
              onPlay={() => setPreviewing(true)}
              onPause={() => setPreviewing(false)}
              onEnded={() => setPreviewing(false)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Your voice note</p>
              <p className="mt-0.5 text-[11.5px] text-[#AAAAAA]">Plays right from the card</p>
            </div>
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                set({ voiceNote: undefined });
              }}
              aria-label="Remove voice note"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.1] text-[#FF375F] transition-transform active:scale-90"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ) : recording ? (
          /* Recording — live timer + stop */
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-[#FF375F]/[0.4] bg-[#FF375F]/[0.05] p-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#FF375F]/25" aria-hidden />
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF375F] text-white">
                <Mic size={15} aria-hidden />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                Recording… <span className="tabular-nums">{formatClock(recSecs)}</span>
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#AAAAAA]">Up to {VOICE_NOTE_MAX_SECS / 60} minutes</p>
            </div>
            <button
              type="button"
              onClick={stopEverything}
              aria-label="Stop recording"
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#1D1D1F] px-4 text-[12.5px] font-bold text-white transition-transform active:scale-95"
            >
              <Square size={11} fill="currentColor" aria-hidden /> Stop
            </button>
          </div>
        ) : uploading ? (
          /* Uploading the take */
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-dashed border-[#FF375F]/[0.3] bg-[#FF375F]/[0.03] p-3.5">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF375F] border-t-transparent" aria-hidden />
            <p className="text-[13px] font-semibold text-[#1D1D1F]/80">
              Saving your voice note{uploadPct !== null ? ` · ${uploadPct}%` : "…"}
            </p>
          </div>
        ) : (
          /* Idle — record or upload */
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startRecording()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF375F] py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(255,55,95,0.6)] transition-transform active:scale-[0.97]"
            >
              <Mic size={15} aria-hidden /> Record
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#1D1D1F]/[0.09] bg-white py-2.5 text-[13px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.97]"
            >
              <Upload size={14} aria-hidden /> Upload audio
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.flac"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) {
                  if (!file.type.startsWith("audio/")) {
                    notify("That file isn't audio");
                    return;
                  }
                  void uploadVoice(file);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gift block — wrapped box reveal (note, wrap color, ribbon)           */
/* ------------------------------------------------------------------ */

function GiftBlockEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const wrap = d.wrap ?? "#5E5CE6";
  const ribbon = d.ribbon ?? "classic";
  const { demoOpen, play } = useRevealDemo();

  return (
    <div className="space-y-4 pb-2">
      {/* Live preview stage — exactly what the recipient will see */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.06]"
        style={{
          background: `radial-gradient(120% 85% at 50% 0%, ${wrap}24 0%, transparent 58%), linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)`,
        }}
      >
        {demoOpen ? <GiftConfetti tint={wrap} onDark={false} /> : null}
        <div className="relative flex flex-col items-center pt-12">
          <GiftBox wrap={wrap} ribbon={ribbon} open={demoOpen} onOpen={play} scale={0.9} />
          <div className="flex min-h-[44px] w-full max-w-[300px] items-start justify-center pt-1">
            <AnimatePresence>
              {demoOpen ? (
                <motion.p
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.18 }}
                  className="relative z-10 rounded-[18px] border border-[#1D1D1F]/[0.06] bg-white/90 px-4 py-2.5 text-center text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-[#1D1D1F] shadow-[0_10px_24px_-10px_rgba(29,29,31,0.25)] backdrop-blur"
                >
                  {d.message?.trim() || "This is for you."}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <div className="relative flex items-center justify-between border-t border-[#1D1D1F]/[0.05] px-3.5 py-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">
            {demoOpen ? "What they’ll see" : "Live preview — tap the box"}
          </p>
          <button
            type="button"
            onClick={play}
            className="flex items-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.05] px-3 py-1.5 text-[11.5px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.09] active:scale-95"
          >
            <Play size={11} aria-hidden /> Preview the reveal
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="md-gift-note"
          className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]"
        >
          Note inside the gift
        </label>
        <textarea
          id="md-gift-note"
          rows={2}
          maxLength={90}
          value={d.message ?? ""}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Shown when the box opens"
          className={cn(fieldInput, "resize-none leading-relaxed")}
        />
        <div className="mt-1.5 flex justify-end">
          <span className="text-[10.5px] font-semibold tabular-nums text-[#AAAAAA]">
            {(d.message ?? "").length}/90
          </span>
        </div>
      </div>

      <div>
        <FieldLabel>Wrap color</FieldLabel>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Gift wrap color">
          {GIFT_WRAP_PALETTE.map((c) => {
            const active = wrap === c.value;
            const light = isLightWrap(c.value);
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${c.name} wrap`}
                title={c.name}
                onClick={() => set({ wrap: c.value })}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90",
                  active && "ring-2 ring-[#1D1D1F] ring-offset-2 ring-offset-white"
                )}
                style={{
                  backgroundColor: c.value,
                  boxShadow: "inset 0 2px 3px rgba(255,255,255,0.32), inset 0 -3px 5px rgba(0,0,0,0.18)",
                }}
              >
                {active ? (
                  <Check
                    size={15}
                    strokeWidth={3}
                    className={cn("drop-shadow", light ? "text-[#1D1D1F]" : "text-white")}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel>Ribbon</FieldLabel>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Ribbon style">
          {GIFT_RIBBON_STYLES.map((r) => {
            const active = ribbon === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ ribbon: r.value })}
                className={cn(
                  "rounded-[14px] border-2 px-2 py-2.5 text-[12.5px] font-bold transition-all active:scale-[0.97]",
                  active
                    ? "border-[#5E5CE6] bg-[#5E5CE6]/[0.06] text-[#5E5CE6]"
                    : "border-[#1D1D1F]/[0.08] bg-white text-[#1D1D1F]/60"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 px-1 text-[11.5px] leading-relaxed text-[#AAAAAA]">
          The recipient taps the box — the lid pops, confetti bursts, and your note appears.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reward block editor — the golden coupon with a live reveal stage    */
/* ------------------------------------------------------------------ */

/** Visual tiles for the three reward kinds (icon + blurb). */
const REWARD_KIND_TILES: { value: string; icon: IconType; blurb: string }[] = [
  { value: "Coupon", icon: Ticket, blurb: "Discount at checkout" },
  { value: "Gift card", icon: CreditCard, blurb: "Prepaid balance" },
  { value: "Download", icon: Download, blurb: "File or unlock link" },
];

function RewardBlockEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const kind = d.rewardKind && REWARD_KINDS.includes(d.rewardKind) ? d.rewardKind : "Coupon";
  const code = (d.code ?? "").trim() || "MD-REWARD";
  const domain = d.url?.trim() ? urlDomain(d.url) : null;
  const { demoOpen, play } = useRevealDemo(3000);

  return (
    <div className="space-y-4 pb-2">
      {/* Live preview stage — exactly what the recipient will see */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.06]"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 0%, rgba(48,209,88,0.12) 0%, transparent 58%), linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        }}
      >
        <div className="relative flex flex-col items-center px-5 pt-4">
          <RewardTicket
            kind={kind}
            code={code}
            open={demoOpen}
            onOpen={play}
            onDark={false}
          />
          <div className="h-2" />
        </div>
        <div className="relative flex items-center justify-between border-t border-[#1D1D1F]/[0.05] px-3.5 py-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">
            {demoOpen ? "What they’ll see" : "Live preview — tap the ticket"}
          </p>
          <button
            type="button"
            onClick={play}
            className="flex items-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.05] px-3 py-1.5 text-[11.5px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.09] active:scale-95"
          >
            <Play size={11} aria-hidden /> Preview the reveal
          </button>
        </div>
      </div>

      <div>
        <FieldLabel>Reward type</FieldLabel>
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Reward type"
        >
          {REWARD_KIND_TILES.map((t) => {
            const active = kind === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ rewardKind: t.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[16px] border-2 px-2 py-3 transition-all active:scale-[0.97]",
                  active
                    ? "border-[#30D158] bg-[#30D158]/[0.06]"
                    : "border-[#1D1D1F]/[0.08] bg-white hover:border-[#1D1D1F]/[0.16]"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-gradient-to-br from-[#5BE07E] to-[#1E9E4A] text-white"
                      : "bg-[#1D1D1F]/[0.05] text-[#1D1D1F]/55"
                  )}
                >
                  <Icon size={15} aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-[12px] font-bold tracking-[-0.01em]",
                    active ? "text-[#1E9E4A]" : "text-[#1D1D1F]/70"
                  )}
                >
                  {t.value}
                </span>
                <span className="text-[9.5px] font-medium leading-tight text-[#AAAAAA]">
                  {t.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="md-reward-code" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
          Code
        </label>
        <input
          id="md-reward-code"
          maxLength={24}
          value={d.code ?? ""}
          onChange={(e) => set({ code: e.target.value })}
          placeholder="Summer-24!"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(fieldInput, "font-mono tracking-[0.08em]")}
        />
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
            Any format works — capitals, lowercase, numbers &amp; symbols.
          </p>
          <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-[#AAAAAA]">
            {(d.code ?? "").length}/24
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="md-reward-url" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
          Redeem link · optional
        </label>
        <div className="relative">
          <Link2
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]"
          />
          <input
            id="md-reward-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            maxLength={200}
            value={d.url ?? ""}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://your-shop.com/redeem"
            className={cn(fieldInput, "pl-9")}
          />
        </div>
        {domain ? (
          <p className="mt-2 flex items-center gap-1.5 rounded-full bg-[#1E9E4A]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#1E9E4A]">
            <ExternalLink size={12} aria-hidden />
            Redeem at <span className="font-bold">{domain}</span>
          </p>
        ) : (
          <p className="mt-1.5 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            Where they use the code — a button appears after the reveal.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti block editor — four curated styles with a live preview     */
/* stage that plays exactly what the recipient will see                */
/* ------------------------------------------------------------------ */

function ConfettiBlockEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const raw = d.style as string | undefined;
  const style: ConfettiStyleName = (CONFETTI_STYLES as string[]).includes(raw ?? "")
    ? (raw as ConfettiStyleName)
    : "Burst";
  // Starts at 1 so the preview auto-plays on mount; bumping it remounts the
  // one-shot ConfettiFX (its particles settle at opacity 0, so it can stay
  // mounted between runs with zero visual or interaction cost).
  const [runId, setRunId] = useState(1);

  const replay = () => setRunId((r) => r + 1);

  return (
    <div className="space-y-4 pb-2">
      {/* Live preview stage — exactly what the recipient will see */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.06]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(255,55,95,0.09) 0%, transparent 58%), linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        }}
      >
        <ConfettiFX key={runId} style={style} onDark={false} />
        <div className="relative flex h-[150px] flex-col items-center justify-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6482] to-[#FF9F0A] text-white shadow-[0_10px_26px_-8px_rgba(255,100,130,0.6)]">
            <PartyPopper size={21} aria-hidden />
          </span>
          <p className="mt-3 text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            {style} celebration
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[#AAAAAA]">Fires the moment this scene opens</p>
        </div>
        <div className="relative flex items-center justify-between border-t border-[#1D1D1F]/[0.05] px-3.5 py-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">Live preview</p>
          <button
            type="button"
            onClick={replay}
            className="flex items-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.05] px-3 py-1.5 text-[11.5px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.09] active:scale-95"
          >
            <Play size={11} aria-hidden /> Replay
          </button>
        </div>
      </div>

      <div>
        <FieldLabel>Celebration style</FieldLabel>
        <ChipGroup
          options={CONFETTI_STYLES.map((s) => ({ value: s, label: s }))}
          value={style}
          onChange={(v) => {
            set({ style: v });
            replay();
          }}
          groupLabel="Confetti style"
        />
        <p className="mt-3 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
          {CONFETTI_DESCRIPTIONS[style]}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block Library — a categorized gallery of ready-made blocks.          */
/* Every entry is a template: block type + curated defaults, dropped    */
/* into the current scene fully editable. The Coupon Reveal (blue       */
/* claw machine) is the flagship template.                              */
/* ------------------------------------------------------------------ */

const LIBRARY_CATEGORIES = [
  { id: "All", label: "All", icon: LayoutGrid },
  { id: "Rewards", label: "Rewards & Prizes", icon: Gift },
  { id: "Story", label: "Story", icon: Type },
  { id: "Media", label: "Media", icon: ImagesIcon },
  { id: "Interactive", label: "Interactive", icon: MousePointerClick },
  { id: "Celebration", label: "Celebration", icon: PartyPopper },
] as const;

type LibraryCategoryId = (typeof LIBRARY_CATEGORIES)[number]["id"];

interface LibraryTemplate {
  id: string;
  type: string;
  name: string;
  blurb: string;
  category: Exclude<LibraryCategoryId, "All">;
  accent: string;
  /** Curated starting configuration — block drops in pre-styled. */
  data?: BlockData;
  isNew?: boolean;
}

const LIBRARY_TEMPLATES_ALL: LibraryTemplate[] = [
  {
    id: "coupon-reveal",
    type: "coupon",
    name: "Coupon Reveal",
    blurb: "Blue claw machine — they play, grab & reveal a winning code",
    category: "Rewards",
    accent: "#218CF4",
    isNew: true,
    data: {
      heading: "COUPON CODE",
      body: "REVEAL",
      stepLabel: "YOUR COUPON CODE",
      label: "PLAY & WIN",
      coupons: [
        { id: "tpl-cpn-1", code: "SAVE20", title: "20% off your next order", description: "Use it at checkout — our treat", color: "#9B59B6", enabled: true, stock: null },
        { id: "tpl-cpn-2", code: "FREESHIP", title: "Free shipping, any order", color: "#2ECC71", enabled: true, stock: null },
        { id: "tpl-cpn-3", code: "WELCOME15", title: "15% off for new friends", color: "#F59E0B", enabled: true, stock: 50 },
      ],
    },
  },
  {
    id: "flower-3d",
    type: "flower",
    name: "Rose Bouquet",
    blurb: "A still bouquet with a message card and an optional voice note — perfect for apologies and thank-yous",
    category: "Rewards",
    accent: "#FF375F",
    isNew: true,
    data: {
      flower: "bouquet",
      message: "We're so sorry your parcel is delayed — thank you for your patience. These roses are for you 💐",
    },
  },
  {
    id: "flower-grand",
    type: "flower",
    name: "Grand Rose Bouquet",
    blurb: "A dozen red roses with baby's breath and a satin bow — a grander way to say sorry or thank you",
    category: "Rewards",
    accent: "#C81E3C",
    isNew: true,
    data: {
      flower: "bouquet2",
      message: "Thank you for waiting — your parcel is on its way. A dozen roses to make it up to you 💐",
    },
  },
  {
    id: "gift-box",
    type: "gift",
    name: "Gift Box",
    blurb: "A wrapped surprise that opens with confetti",
    category: "Rewards",
    accent: "#5E5CE6",
  },
  {
    id: "reward-ticket",
    type: "reward",
    name: "Reward Ticket",
    blurb: "A golden ticket that reveals a secret code",
    category: "Rewards",
    accent: "#30D158",
  },
  {
    id: "message",
    type: "text",
    name: "Message",
    blurb: "Say it with words — any length, any language",
    category: "Story",
    accent: "#007AFF",
  },
  {
    id: "photo",
    type: "photo",
    name: "Photo",
    blurb: "A framed photo with warm, mono & vivid filters",
    category: "Media",
    accent: "#30D158",
  },
  {
    id: "video",
    type: "video",
    name: "Video",
    blurb: "A clip that plays right inside the scene",
    category: "Media",
    accent: "#FF9F0A",
  },
  {
    id: "song",
    type: "audio",
    name: "Song Card",
    blurb: "A track with the exact snippet you choose",
    category: "Media",
    accent: "#FF375F",
  },
  {
    id: "backdrop",
    type: "background",
    name: "Backdrop",
    blurb: "A full-screen photo behind everything",
    category: "Media",
    accent: "#64D2FF",
  },
  {
    id: "quiz",
    type: "quiz",
    name: "Quiz",
    blurb: "A question with tappable answers",
    category: "Interactive",
    accent: "#007AFF",
  },
  {
    id: "countdown",
    type: "countdown",
    name: "Countdown",
    blurb: "A timed lock before the next scene opens",
    category: "Interactive",
    accent: "#FF9F0A",
  },
  {
    id: "button",
    type: "cta",
    name: "Button",
    blurb: "A link, claim or reply button",
    category: "Interactive",
    accent: "#007AFF",
  },
  {
    id: "confetti-pop",
    type: "confetti",
    name: "Confetti Pop",
    blurb: "The luminous burst of paper and sparkles",
    category: "Celebration",
    accent: "#FF375F",
    data: { style: "Burst" },
  },
  {
    id: "gold-rush",
    type: "confetti",
    name: "Gold Rush",
    blurb: "An elegant champagne-gold shimmer",
    category: "Celebration",
    accent: "#FFB340",
    data: { style: "Gold" },
  },
];

/** Templates currently offered in the library (coupon hidden until relaunch). */
const LIBRARY_TEMPLATES: LibraryTemplate[] = COUPON_REVEAL_ENABLED
  ? LIBRARY_TEMPLATES_ALL
  : LIBRARY_TEMPLATES_ALL.filter((t) => t.type !== "coupon");

/** Miniature art for one library card — a hand-tuned vignette per type. */
function LibraryThumb({ t }: { t: LibraryTemplate }) {
  switch (t.type) {
    case "coupon":
      /* The flagship: a miniature of the blue claw machine. */
      return (
        <span
          aria-hidden
          className="relative flex h-[72px] w-[56px] flex-col items-center overflow-hidden rounded-[10px] bg-gradient-to-b from-[#45A7FF] to-[#1277DE] pb-[5px] pt-[4px]"
          style={{ boxShadow: "0 8px 18px -8px rgba(23,43,77,0.65)" }}
        >
          {/* marquee with golden 3D lettering */}
          <span className="flex h-[18px] w-[80%] flex-col items-center justify-center rounded-[4px] bg-gradient-to-b from-[#7C3AED] to-[#5B21B6]">
            <span className="text-[5.5px] font-black leading-none text-[#8A4A0E]">COUPON</span>
            <span className="-mt-[4px] text-[5.5px] font-black leading-none text-[#FFD84D]">COUPON</span>
            <span className="mt-[0.5px] text-[4px] font-extrabold leading-[1.3] tracking-[0.18em] text-white">REVEAL</span>
          </span>
          {/* bulbs */}
          <span className="absolute left-[2px] top-[4px] h-[3px] w-[3px] rounded-full bg-[#FFD84D]" />
          <span className="absolute left-[2px] top-[9px] h-[2.5px] w-[2.5px] rounded-full bg-[#FFE9A8]" />
          <span className="absolute right-[2px] top-[4px] h-[3px] w-[3px] rounded-full bg-[#FFD84D]" />
          <span className="absolute right-[2px] top-[9px] h-[2.5px] w-[2.5px] rounded-full bg-[#FFE9A8]" />
          {/* glass window with claw + golden ticket + pile */}
          <span className="relative mt-[3px] h-[34px] w-[80%] overflow-hidden rounded-[4px] bg-[#EAF3FD]">
            {/* coiled cable + claw */}
            <span className="absolute left-1/2 top-0 h-[10px] w-[2px] -translate-x-1/2 rounded-full bg-[#23252E]" />
            <span className="absolute left-1/2 top-[9px] h-[3px] w-[10px] -translate-x-1/2 rounded-[1.5px] bg-[#C3CBD6]" />
            <span className="absolute left-[calc(50%-6px)] top-[11px] h-[5px] w-[4px] origin-top-right rotate-[18deg] rounded-b-full border-[1.5px] border-t-0 border-[#C3CBD6]" />
            <span className="absolute left-[calc(50%+2px)] top-[11px] h-[5px] w-[4px] origin-top-left -rotate-[18deg] rounded-b-full border-[1.5px] border-t-0 border-[#C3CBD6]" />
            {/* golden ticket held high */}
            <span className="absolute left-1/2 top-[14px] h-[8px] w-[24px] -translate-x-1/2 -rotate-3 rounded-[2px] border-[0.5px] border-[#B45309] bg-gradient-to-b from-[#FFEDB0] to-[#F5B93B]">
              <span className="absolute inset-[1px] rounded-[1px] border-[0.5px] border-dashed border-[#B45309]/50" />
            </span>
            {/* colorful pile */}
            <span className="absolute bottom-[1.5px] left-[2px] h-[5px] w-[13px] -rotate-[12deg] rounded-[1.5px] bg-[#9B59B6]" />
            <span className="absolute bottom-[0.5px] left-[9px] h-[5px] w-[14px] rotate-[7deg] rounded-[1.5px] bg-[#E84393]" />
            <span className="absolute bottom-[1px] left-[19px] h-[5px] w-[12px] -rotate-[6deg] rounded-[1.5px] bg-[#2ECC71]" />
            <span className="absolute bottom-[0.5px] right-[2px] h-[5px] w-[12px] rotate-[11deg] rounded-[1.5px] bg-[#FF7A3D]" />
          </span>
          {/* control panel: joystick + PLAY & WIN pill */}
          <span className="mt-[3px] flex h-[10px] w-[80%] items-center justify-between rounded-[3px] bg-gradient-to-b from-[#54B2FF] to-[#2E93F7] px-[3px]">
            <span className="relative h-[6px] w-[6px] rounded-full bg-[#23252B]">
              <span className="absolute -top-[3px] left-1/2 h-[3px] w-[2px] -translate-x-1/2 rounded-full bg-[#2A2D35]" />
              <span className="absolute -top-[5px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#E02424]" />
            </span>
            <span className="h-[5px] w-[22px] rounded-full bg-gradient-to-b from-[#A96BFF] to-[#8B3FE8]" />
          </span>
        </span>
      );
    case "gift":
      return (
        <span aria-hidden className="flex items-center justify-center">
          <GiftBox wrap="#5E5CE6" ribbon="classic" still scale={0.3} sparkle={false} />
        </span>
      );
    case "flower":
      return (
        <span
          aria-hidden
          className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_50%_35%,#3A1526_0%,#1D1D1F_78%)]"
        >
          <img
            src={resolveFlower(t.data?.flower ?? t.data?.roseStyle).thumb}
            alt=""
            width={72}
            height={72}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </span>
      );
    case "reward":
      return (
        <span
          aria-hidden
          className="flex w-[86px] flex-col items-center rounded-[10px] bg-white px-2.5 py-2 shadow-[0_8px_18px_-8px_rgba(30,158,74,0.4)]"
        >
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#5BE07E] to-[#1E9E4A]" />
          <span className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[#1D1D1F]/25" />
          <span className="mt-1 flex w-full items-center gap-0.5">
            <span className="h-1 w-1 rotate-45 rounded-[1px] bg-[#1D1D1F]/20" />
            <span className="h-px flex-1 border-t border-dashed border-[#1D1D1F]/25" />
            <span className="h-1 w-1 rotate-45 rounded-[1px] bg-[#1D1D1F]/20" />
          </span>
        </span>
      );
    case "text":
      return (
        <span aria-hidden className="flex w-[76px] flex-col items-center gap-[5px]">
          <span className="h-[7px] w-full rounded-full bg-[#1D1D1F]/70" />
          <span className="h-[6px] w-4/5 rounded-full bg-[#1D1D1F]/25" />
          <span className="h-[6px] w-3/5 rounded-full bg-[#1D1D1F]/25" />
          <span className="h-[6px] w-2/5 rounded-full bg-[#1D1D1F]/15" />
        </span>
      );
    case "photo":
      return (
        <span
          aria-hidden
          className="block rounded-[8px] bg-white p-[3px] shadow-[0_8px_18px_-8px_rgba(29,29,31,0.3)]"
        >
          <span className="relative block h-[52px] w-[72px] overflow-hidden rounded-[6px]">
            <span className="absolute inset-0" style={{ background: "linear-gradient(160deg, #64D2FF 0%, #A7F3C6 55%, #30D158 100%)" }} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FFD60A]" />
            <span className="absolute -bottom-2 left-1 h-8 w-8 rotate-[14deg] rounded-[6px] bg-white/60" />
            <span className="absolute -bottom-3 right-0 h-10 w-10 rotate-[-9deg] rounded-[6px] bg-white/85" />
          </span>
        </span>
      );
    case "video":
      return (
        <span
          aria-hidden
          className="relative flex h-[52px] w-[74px] items-center justify-center overflow-hidden rounded-[10px]"
          style={{ background: "linear-gradient(140deg, #3A3A44 0%, #1D1D1F 100%)" }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95">
            <Play size={11} className="ml-0.5 text-[#1D1D1F]" />
          </span>
          <span className="absolute inset-x-2 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-white/25">
            <span className="block h-full w-1/3 rounded-full bg-[#FF9F0A]" />
          </span>
        </span>
      );
    case "audio":
      return (
        <span
          aria-hidden
          className="flex items-end gap-[3px] rounded-[10px] bg-white px-3 pb-0 pt-0 shadow-[0_8px_18px_-8px_rgba(255,55,95,0.35)]"
          style={{ height: 52 }}
        >
          {[18, 30, 40, 26, 34, 16, 28, 38, 22].map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full"
              style={{ height: h - 12, backgroundColor: i % 2 ? "#FF375F" : "#FF8FA8" }}
            />
          ))}
        </span>
      );
    case "background":
      return (
        <span aria-hidden className="relative block h-[52px] w-[76px] overflow-hidden rounded-[10px]">
          <span className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0A84FF 0%, #5E5CE6 60%, #BF5AF2 100%)" }} />
          <span className="absolute inset-0 bg-[#1D1D1F]/45" />
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white/95">
            Aa
          </span>
        </span>
      );
    case "quiz":
      return (
        <span aria-hidden className="flex w-[80px] flex-col items-start gap-[5px]">
          <span className="h-[7px] w-full rounded-full bg-[#1D1D1F]/70" />
          <span className="flex w-full items-center gap-1 rounded-full border border-[#30D158]/45 bg-[#30D158]/[0.12] px-2 py-[3px]">
            <Check size={7} strokeWidth={3.5} className="text-[#1E9E4A]" />
            <span className="h-[4px] w-2/5 rounded-full bg-[#1E9E4A]/50" />
          </span>
          <span className="flex items-center gap-1 rounded-full border border-[#1D1D1F]/10 bg-white px-2 py-[3px]">
            <span className="h-[4px] w-3/5 rounded-full bg-[#1D1D1F]/25" />
          </span>
        </span>
      );
    case "countdown":
      return (
        <span
          aria-hidden
          className="flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/[0.12] px-3 py-2"
        >
          <Clock size={13} className="text-[#B26A00]" />
          <span className="text-[13px] font-bold tabular-nums tracking-wide text-[#1D1D1F]">
            24 : 00
          </span>
        </span>
      );
    case "cta":
      return (
        <span aria-hidden className="flex flex-col items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-[#007AFF] px-4 py-2 text-[11px] font-semibold text-white shadow-[0_8px_18px_-6px_rgba(0,122,255,0.55)]">
            Continue
          </span>
          <span className="h-[4px] w-2/3 rounded-full bg-[#1D1D1F]/15" />
        </span>
      );
    case "confetti": {
      const palette = CONFETTI_PALETTES[(t.data?.style as ConfettiStyleName) ?? "Burst"] ?? CONFETTI_PALETTES.Burst;
      return (
        <span aria-hidden className="flex items-center gap-1.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{
              background:
                t.data?.style === "Gold"
                  ? "linear-gradient(135deg, #FFD60A, #FF9F0A)"
                  : "linear-gradient(135deg, #FF6482, #FF9F0A)",
            }}
          >
            <PartyPopper size={15} strokeWidth={2.2} />
          </span>
          <span className="flex flex-col gap-[3px]">
            <span className="h-2 w-[10px] rotate-[-18deg] rounded-full" style={{ backgroundColor: palette[0] }} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[1] }} />
            <span className="h-[7px] w-[7px] rounded-[2px]" style={{ backgroundColor: palette[2] }} />
          </span>
          <span className="flex flex-col gap-[3px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette[3] }} />
            <span className="h-2.5 w-[5px] rotate-[24deg] rounded-full" style={{ backgroundColor: palette[4] }} />
          </span>
        </span>
      );
    }
    default:
      return null;
  }
}

/** Sheet body for the Block Library — categories + template grid. */
function BlockLibraryContent({
  scenePos,
  onPick,
}: {
  scenePos: number;
  onPick: (t: LibraryTemplate) => void;
}) {
  const [category, setCategory] = useState<LibraryCategoryId>("All");
  const shown =
    category === "All" ? LIBRARY_TEMPLATES : LIBRARY_TEMPLATES.filter((t) => t.category === category);
  const countFor = (id: LibraryCategoryId) =>
    id === "All" ? LIBRARY_TEMPLATES.length : LIBRARY_TEMPLATES.filter((t) => t.category === id).length;

  return (
    <div className="pb-2">
      <p className="px-1 text-[12.5px] font-medium leading-relaxed text-[#AAAAAA]">
        Ready-made blocks with curated defaults — everything drops into{" "}
        <span className="font-bold text-[#1D1D1F]">Scene {scenePos}</span> fully editable.
      </p>

      {/* Category pills */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Block categories">
        {LIBRARY_CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition-all active:scale-[0.96]",
                active
                  ? "border-transparent bg-[#1D1D1F] text-white"
                  : "border-[#1D1D1F]/[0.1] bg-white text-[#1D1D1F]/70 hover:border-[#1D1D1F]/[0.2]"
              )}
            >
              <Icon size={13} strokeWidth={2.3} aria-hidden />
              {c.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-extrabold tabular-nums",
                  active ? "bg-white/20 text-white/90" : "bg-[#1D1D1F]/[0.06] text-[#AAAAAA]"
                )}
              >
                {countFor(c.id)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {shown.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            aria-label={`Add ${t.name} block to Scene ${scenePos}`}
            whileTap={{ scale: 0.96 }}
            className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#1D1D1F]/[0.07] bg-white p-2.5 text-left transition-all hover:border-[#8B5CF6]/40 hover:shadow-[0_14px_30px_-14px_rgba(139,92,246,0.35)]"
          >
            {t.isNew ? (
              <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-[#8B5CF6] px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_4px_10px_-3px_rgba(139,92,246,0.7)]">
                New
              </span>
            ) : null}
            <span
              aria-hidden
              className="relative flex h-[84px] items-center justify-center overflow-hidden rounded-[14px]"
              style={{
                background: `radial-gradient(120% 100% at 50% 0%, ${t.accent}17 0%, transparent 70%), #FAFAFC`,
              }}
            >
              <LibraryThumb t={t} />
            </span>
            <span className="flex items-center gap-1.5 px-1 pt-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: t.accent }}
                aria-hidden
              />
              <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                {t.name}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 min-h-[28px] px-1 text-[11px] font-medium leading-snug text-[#AAAAAA]">
              {t.blurb}
            </span>
            <span
              className={cn(
                "mt-2 flex items-center justify-between rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                "bg-[#1D1D1F]/[0.04] text-[#1D1D1F]/70 group-hover:bg-[#8B5CF6] group-hover:text-white"
              )}
            >
              <span className="flex items-center gap-1">
                <Plus size={11} strokeWidth={2.6} aria-hidden /> Add to Scene {scenePos}
              </span>
              <ChevronRight
                size={12}
                strokeWidth={2.6}
                aria-hidden
                className="opacity-0 transition-opacity group-hover:opacity-100"
              />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coupon Reveal editor — machine copy + the creator's coupon pool     */
/* ------------------------------------------------------------------ */

/** Curated starting data for freshly-added blocks so every block is
 * playable the moment it lands (coupon machines come pre-filled — an
 * empty machine reads as broken to creators who just want to try it). */
function starterBlockData(type: string): BlockData | undefined {
  if (type === "coupon") {
    return {
      heading: "COUPON CODE",
      body: "REVEAL",
      stepLabel: "YOUR COUPON CODE",
      label: "PLAY & WIN",
      coupons: samplePool(),
    };
  }
  if (type === "flower") {
    return {
      flower: "bouquet",
      message: "We're so sorry your parcel is delayed — thank you for your patience. These roses are for you 💐",
    };
  }
  return undefined;
}

/** Quick-start pool for empty machines (fresh ids every time). */
function samplePool(): CouponDef[] {
  return [
    { id: uid("cpn"), code: "SAVE10", title: "10% off your next order", color: "#9B59B6", enabled: true, stock: null },
    { id: uid("cpn"), code: "FREESHIP", title: "Free shipping, any order", color: "#2ECC71", enabled: true, stock: null },
    { id: uid("cpn"), code: "WELCOME15", title: "15% off for new friends", color: "#F59E0B", enabled: true, stock: 50 },
  ];
}

/** A blank coupon row (next unused card color). */
function newPoolCoupon(existing: CouponDef[]): CouponDef {
  const used = new Set(existing.map((c) => c.color));
  const color = COUPON_COLORS.find((c) => !used.has(c)) ?? COUPON_COLORS[existing.length % COUPON_COLORS.length];
  return { id: uid("cpn"), code: "", title: "", color, enabled: true, stock: null };
}

/** Tiny iOS-style switch (in-draw / limited-stock toggles). */
function PoolSwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-[#30D158]" : "bg-[#1D1D1F]/[0.16]"
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: on ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute left-[2px] top-[2px] block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
      />
    </button>
  );
}

function CouponRevealEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const domain = d.url?.trim() ? urlDomain(d.url) : null;

  /* The pool as the creator edits it. Legacy single-code blocks surface as a
   * one-row pool so the upgrade path is seamless (editing writes `coupons`). */
  const pool: CouponDef[] = useMemo(() => {
    if (d.coupons && d.coupons.length > 0) return d.coupons;
    const legacy = (d.code ?? "").trim();
    return legacy
      ? [{ id: "legacy", code: legacy, title: "", color: COUPON_COLORS[0], enabled: true, stock: null }]
      : [];
  }, [d.coupons, d.code]);

  /* What the machine will actually draw from — mirrors couponPool() so the
   * editor, the player and the server all agree (empty codes are skipped). */
  const effective = useMemo(() => couponPool({ coupons: pool }), [pool]);
  const eligibleCount = eligibleCoupons(effective).length;

  const writePool = (next: CouponDef[]) => set({ coupons: next });

  const updateCoupon = (id: string, patch: Partial<CouponDef>) =>
    writePool(pool.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addCoupon = () => {
    const c = newPoolCoupon(pool);
    writePool([...pool, c]);
    setExpandedId(c.id);
  };

  const removeCoupon = (id: string) => {
    const next = pool.filter((c) => c.id !== id);
    // Clear the legacy single code when the last row goes — an empty machine
    // should show "NO PRIZES", not resurrect the old code via the fallback.
    if (next.length === 0) set({ coupons: [], code: "" });
    else writePool(next);
    if (expandedId === id) setExpandedId(null);
  };

  /* Preview draw — local simulation of the server's rule (random pick from
   * the eligible pool). The real player flow is server-persisted. */
  const drawPreview = useCallback(async (): Promise<{ prize: MachinePrize | null; reason?: string }> => {
    await new Promise((r) => setTimeout(r, 420));
    const eligible = eligibleCoupons(effective);
    if (eligible.length === 0) return { prize: null, reason: "no-eligible-coupons" };
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    return {
      prize: {
        couponId: pick.id,
        code: pick.code,
        title: pick.title,
        description: pick.description,
        color: pick.color,
      },
    };
  }, [effective]);

  const sfx = useMachineSfx();
  const m = useCouponMachine({ draw: drawPreview, sfx });

  return (
    <div className="space-y-4 pb-2">
      {/* Live preview stage — the real machine, tap PLAY & WIN to run the claw */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.06]"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 0%, rgba(0,122,255,0.12) 0%, transparent 58%), linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        }}
      >
        <div className="relative flex flex-col items-center px-5 pt-4">
          <CouponMachine
            title={d.heading?.trim() || "COUPON CODE"}
            subtitle={d.body?.trim() || "REVEAL"}
            ticketLabel={d.stepLabel?.trim() || "YOUR COUPON CODE"}
            buttonLabel={d.label?.trim() || "PLAY & WIN"}
            coupons={effective.map((c) => ({ id: c.id, code: c.code, title: c.title, color: c.color }))}
            cardCount={d.displayCount}
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
          <div className="h-2" />
        </div>
        <div className="relative flex items-center justify-between border-t border-[#1D1D1F]/[0.05] px-3.5 py-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">
            {m.busy ? "What they’ll see" : "Live preview — tap PLAY & WIN, then steer the claw"}
          </p>
          <button
            type="button"
            onClick={m.play}
            className="flex items-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.05] px-3 py-1.5 text-[11.5px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.09] active:scale-95"
          >
            <Play size={11} aria-hidden /> Preview the draw
          </button>
        </div>
      </div>
      <p className="-mt-2 px-1 text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
        Preview draws locally — in the real experience the player steers the claw with the red joystick, and the server assigns one coupon per player that sticks on every replay.
      </p>

      {/* Copy fields */}
      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <FieldLabel>Marquee title</FieldLabel>
          <input
            value={d.heading ?? ""}
            onChange={(e) => set({ heading: e.target.value })}
            maxLength={14}
            placeholder="COUPON CODE"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={fieldInput}
            aria-label="Marquee title"
          />
        </div>
        <div className="w-[104px] shrink-0">
          <FieldLabel>Subtitle</FieldLabel>
          <input
            value={d.body ?? ""}
            onChange={(e) => set({ body: e.target.value })}
            maxLength={10}
            placeholder="REVEAL"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={fieldInput}
            aria-label="Marquee subtitle"
          />
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <FieldLabel>Ticket label</FieldLabel>
          <input
            value={d.stepLabel ?? ""}
            onChange={(e) => set({ stepLabel: e.target.value })}
            maxLength={20}
            placeholder="YOUR COUPON CODE"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={fieldInput}
            aria-label="Ticket label"
          />
        </div>
        <div className="w-[118px] shrink-0">
          <FieldLabel>Play button</FieldLabel>
          <input
            value={d.label ?? ""}
            onChange={(e) => set({ label: e.target.value })}
            maxLength={14}
            placeholder="PLAY & WIN"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={fieldInput}
            aria-label="Play button label"
          />
        </div>
      </div>

      {/* ===== Ticket pile size ===== */}
      <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#1D1D1F]/[0.07] bg-white px-3.5 py-2.5 shadow-[0_10px_24px_-18px_rgba(23,43,77,0.4)]">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Tickets in the machine</p>
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
            Every ticket is face-down — codes stay blurred until the claw reveals one.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Fewer tickets"
            onClick={() => set({ displayCount: Math.max(6, (d.displayCount ?? 12) - 2) })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D1D1F]/[0.06] text-[15px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.12] active:scale-90"
          >
            −
          </button>
          <span
            aria-live="polite"
            aria-label={`${d.displayCount ?? 12} tickets shown in the machine`}
            className="w-8 text-center font-mono text-[15px] font-bold tabular-nums text-[#1D1D1F]"
          >
            {d.displayCount ?? 12}
          </span>
          <button
            type="button"
            aria-label="More tickets"
            onClick={() => set({ displayCount: Math.min(28, (d.displayCount ?? 12) + 2) })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D1D1F]/[0.06] text-[15px] font-bold text-[#1D1D1F]/70 transition-all hover:bg-[#1D1D1F]/[0.12] active:scale-90"
          >
            +
          </button>
        </div>
      </div>

      {/* ===== Coupon pool ===== */}
      <div>
        <div className="mb-2 flex items-end justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Coupon pool</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-[#AAAAAA]">
              {effective.length === 0
                ? "Add at least one coupon to fill the machine"
                : `${eligibleCount} of ${effective.length} in the draw — first play picks one at random`}
            </p>
          </div>
          <button
            type="button"
            onClick={addCoupon}
            className="flex shrink-0 items-center gap-1 rounded-full bg-[#218CF4] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(33,140,244,0.8)] transition-all hover:brightness-105 active:scale-95"
          >
            <Plus size={12} aria-hidden /> Add coupon
          </button>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#1D1D1F]/[0.07] bg-white shadow-[0_10px_24px_-18px_rgba(23,43,77,0.4)]">
          {pool.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-4 py-6 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#218CF4]/10 text-[#218CF4]">
                <Ticket size={16} aria-hidden />
              </span>
              <p className="text-[13px] font-semibold text-[#1D1D1F]">The machine is empty</p>
              <p className="max-w-[270px] text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                Coupons live in the claw machine — the server deals one per player and it sticks on every replay.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => writePool(samplePool())}
                  className="rounded-full bg-[#218CF4] px-3.5 py-2 text-[11.5px] font-bold text-white transition-all hover:brightness-105 active:scale-95"
                >
                  Use sample pool
                </button>
                <button
                  type="button"
                  onClick={addCoupon}
                  className="rounded-full bg-[#1D1D1F]/[0.06] px-3.5 py-2 text-[11.5px] font-bold text-[#1D1D1F]/75 transition-all hover:bg-[#1D1D1F]/[0.1] active:scale-95"
                >
                  Add manually
                </button>
              </div>
            </div>
          ) : (
            pool.map((c) => {
              const expanded = expandedId === c.id;
              const hasCode = c.code.trim() !== "";
              const inDraw = hasCode && c.enabled !== false && (c.stock == null || c.stock > 0);
              const chip = inDraw
                ? "In draw"
                : c.stock === 0
                  ? "Empty"
                  : c.enabled === false
                    ? "Off"
                    : "No code";
              return (
                <div key={c.id} className="border-b border-[#1D1D1F]/[0.05] last:border-b-0">
                  {/* row */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className="h-8 w-[5px] shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={cn(
                          "block truncate font-mono text-[13px] font-bold tracking-[0.05em]",
                          hasCode ? "text-[#1D1D1F]" : "text-[#AAAAAA]/60"
                        )}
                      >
                        {hasCode ? c.code : "add a code…"}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] font-medium text-[#AAAAAA]">
                        {c.title.trim() || "No title"}
                        {c.stock != null ? ` · ${c.stock} left` : ""}
                      </span>
                    </button>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        inDraw ? "bg-[#30D158]/10 text-[#1F9D44]" : "bg-[#1D1D1F]/[0.06] text-[#AAAAAA]"
                      )}
                    >
                      {chip}
                    </span>
                    <PoolSwitch
                      on={c.enabled !== false}
                      onToggle={() => updateCoupon(c.id, { enabled: c.enabled === false })}
                      label={`${hasCode ? c.code : "coupon"} in the draw`}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      aria-label={expanded ? "Collapse coupon settings" : "Edit coupon settings"}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#AAAAAA] transition-colors hover:bg-[#1D1D1F]/[0.06] hover:text-[#1D1D1F]"
                    >
                      <ChevronRight size={14} className={cn("transition-transform", expanded && "rotate-90")} aria-hidden />
                    </button>
                  </div>

                  {/* expanded settings */}
                  <AnimatePresence initial={false}>
                    {expanded ? (
                      <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-[#1D1D1F]/[0.06] bg-[#F5F5F7]/70 px-3 py-3">
                          <div className="flex gap-2.5">
                            <div className="min-w-0 flex-1">
                              <label htmlFor={`cpn-code-${c.id}`} className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
                                Code
                              </label>
                              <input
                                id={`cpn-code-${c.id}`}
                                value={c.code}
                                onChange={(e) => updateCoupon(c.id, { code: e.target.value })}
                                maxLength={24}
                                placeholder="SAVE20"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                className={cn(fieldInput, "py-2 font-mono text-[13.5px] tracking-[0.08em]")}
                              />
                            </div>
                            <div className="min-w-0 flex-[1.4]">
                              <label htmlFor={`cpn-title-${c.id}`} className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
                                Title
                              </label>
                              <input
                                id={`cpn-title-${c.id}`}
                                value={c.title}
                                onChange={(e) => updateCoupon(c.id, { title: e.target.value })}
                                maxLength={40}
                                placeholder="20% off your next order"
                                className={cn(fieldInput, "py-2 text-[13.5px]")}
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor={`cpn-desc-${c.id}`} className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
                              Description · optional
                            </label>
                            <input
                              id={`cpn-desc-${c.id}`}
                              value={c.description ?? ""}
                              onChange={(e) => updateCoupon(c.id, { description: e.target.value })}
                              maxLength={80}
                              placeholder="Use it at checkout — our treat"
                              className={cn(fieldInput, "py-2 text-[13.5px]")}
                            />
                          </div>

                          <div>
                            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">Card color</p>
                            <div className="flex flex-wrap gap-2">
                              {COUPON_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  aria-label={`Card color ${color}`}
                                  aria-pressed={c.color === color}
                                  onClick={() => updateCoupon(c.id, { color })}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform active:scale-90",
                                    c.color === color ? "border-[#1D1D1F]" : "border-transparent"
                                  )}
                                  style={{ background: color }}
                                >
                                  {c.color === color ? <Check size={12} strokeWidth={3} className="text-white" aria-hidden /> : null}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <PoolSwitch
                              on={c.stock != null}
                              onToggle={() => updateCoupon(c.id, { stock: c.stock == null ? 10 : null })}
                              label="Limit stock"
                            />
                            <span className="text-[12px] font-semibold text-[#1D1D1F]/75">Limited stock</span>
                            {c.stock != null ? (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  max={99999}
                                  value={c.stock}
                                  onChange={(e) =>
                                    updateCoupon(c.id, { stock: Math.max(0, Math.min(99999, Math.floor(Number(e.target.value) || 0))) })
                                  }
                                  className="w-[84px] rounded-[10px] border border-[#1D1D1F]/[0.1] bg-white px-2.5 py-1.5 text-right font-mono text-[13px] font-semibold tabular-nums text-[#1D1D1F] outline-none focus:border-[#218CF4]"
                                  aria-label="Units remaining"
                                />
                                <span className="text-[11.5px] font-medium text-[#AAAAAA]">left · the server never oversells</span>
                              </>
                            ) : (
                              <span className="text-[11.5px] font-medium text-[#AAAAAA]">Unlimited — every player can win it</span>
                            )}
                          </div>

                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => removeCoupon(c.id)}
                              className="flex items-center gap-1.5 rounded-full bg-[#FF375F]/10 px-3 py-1.5 text-[11.5px] font-bold text-[#E0245A] transition-colors hover:bg-[#FF375F]/20 active:scale-95"
                            >
                              <Trash2 size={12} aria-hidden /> Remove coupon
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
          One coupon per player, forever — replays run the full claw show and always grab the same card. Winners keep
          their coupon even if you disable it later.
        </p>
      </div>

      <div>
        <label htmlFor="md-coupon-url" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
          Redeem link · optional
        </label>
        <div className="relative">
          <Link2
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]"
          />
          <input
            id="md-coupon-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            maxLength={200}
            value={d.url ?? ""}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://your-shop.com/redeem"
            className={cn(fieldInput, "pl-9")}
          />
        </div>
        {domain ? (
          <p className="mt-2 flex items-center gap-1.5 rounded-full bg-[#218CF4]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#1277DE]">
            <ExternalLink size={12} aria-hidden />
            Redeem at <span className="font-bold">{domain}</span>
          </p>
        ) : (
          <p className="mt-1.5 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            Where they use the code — a button appears after the draw.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audio block editor — catalog search | file upload + play mode        */
/* ------------------------------------------------------------------ */

function AudioBlockEditor({ block, onChange }: { block: Block; onChange: (data: BlockData) => void }) {
  const d = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });
  const song = d.song ?? null;
  const [tab, setTab] = useState<"search" | "upload">(song?.source === "upload" ? "upload" : "search");
  const playMode = d.playMode ?? "scene";

  return (
    <div className="pb-2">
      <SegmentedControl
        id="md-audio-source"
        options={[
          { value: "search", label: "Search songs" },
          { value: "upload", label: "Upload audio" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "search" ? (
          <SongPickerContent
            selected={song && song.source !== "upload" ? song : null}
            onConfirm={(s) => set(s ? { song: s } : { song: undefined })}
          />
        ) : (
          <UploadAudioContent
            selected={song && song.source === "upload" ? song : null}
            onConfirm={(s) => set(s ? { song: s } : { song: undefined })}
          />
        )}
      </div>

      {/* Play mode — visible card or unseen background music */}
      {song ? (
        <div className="mt-5 border-t border-[#1D1D1F]/[0.06] pt-4">
          <FieldLabel>Where it plays</FieldLabel>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Where the audio plays">
            {(
              [
                { value: "scene", icon: Music, title: "In scene", desc: "A song card appears — they tap play" },
                { value: "background", icon: AudioLines, title: "Background", desc: "Plays softly behind this scene" },
              ] as const
            ).map((o) => {
              const active = playMode === o.value;
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ playMode: o.value })}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-[16px] border-2 p-3 text-left transition-all active:scale-[0.97]",
                    active ? "border-[#007AFF] bg-[#007AFF]/[0.05]" : "border-[#1D1D1F]/[0.08] bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      active ? "bg-[#007AFF] text-white" : "bg-[#1D1D1F]/[0.06] text-[#AAAAAA]"
                    )}
                  >
                    <Icon size={15} aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "text-[13.5px] font-bold tracking-[-0.01em]",
                      active ? "text-[#007AFF]" : "text-[#1D1D1F]"
                    )}
                  >
                    {o.title}
                  </span>
                  <span className="text-[11px] font-medium leading-snug text-[#AAAAAA]">{o.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlockEditorContent({
  block,
  onChange,
}: {
  block: Block;
  onChange: (data: BlockData) => void;
}) {
  const d: BlockData = block.data ?? {};
  const set = (patch: Partial<BlockData>) => onChange({ ...d, ...patch });

  switch (block.type) {
    case "text":
      return (
        <div className="pb-2">
          <label htmlFor="md-block-text" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
            Message
          </label>
          <textarea
            id="md-block-text"
            rows={4}
            maxLength={240}
            value={d.body ?? ""}
            onChange={(e) => set({ body: e.target.value })}
            placeholder="Type the words your recipient will land on…"
            className={cn(fieldInput, "resize-none leading-relaxed")}
          />
          <p className="mt-1 px-1 text-right text-[11px] font-medium tabular-nums text-[#AAAAAA]">
            {(d.body ?? "").length}/240
          </p>
          <p className="mt-2 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            One idea per scene keeps recipients tapping through.
          </p>
        </div>
      );
    case "photo":
      return (
        <div className="space-y-4 pb-2">
          <div>
            <FieldLabel>Photo</FieldLabel>
            <MediaUploadField
              kind="photo"
              value={d.image}
              onUploaded={(url) => set({ image: url })}
              onRemove={() => set({ image: undefined })}
            />
          </div>
          <div>
            <FieldLabel>Filter</FieldLabel>
            <ChipGroup
              options={PHOTO_FILTERS.map((f) => ({ value: f as string, label: f }))}
              value={d.filter ?? "Original"}
              onChange={(v) => set({ filter: v })}
              groupLabel="Photo filter"
            />
          </div>
          <div>
            <label htmlFor="md-photo-caption" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
              Caption
            </label>
            <input
              id="md-photo-caption"
              maxLength={60}
              value={d.caption ?? ""}
              onChange={(e) => set({ caption: e.target.value })}
              placeholder="A soft line under the photo"
              className={fieldInput}
            />
          </div>
        </div>
      );
    case "video":
      return (
        <div className="space-y-4 pb-2">
          <div>
            <FieldLabel>Video</FieldLabel>
            <MediaUploadField
              kind="video"
              value={d.video}
              onUploaded={(url) => set({ video: url })}
              onRemove={() => set({ video: undefined, duration: undefined })}
            />
          </div>
          {d.video ? (
            <div>
              <div className="flex items-baseline justify-between">
                <FieldLabel>Play length</FieldLabel>
                <span className="text-[13px] font-bold tabular-nums text-[#1D1D1F]">{formatDuration(d.duration ?? 12)}</span>
              </div>
              <Slider
                value={[d.duration ?? 12]}
                min={5}
                max={60}
                step={1}
                onValueChange={(v) => set({ duration: v[0] })}
                aria-label="Clip length in seconds"
                className="mt-1"
              />
              <p className="mt-2 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                The clip plays for this long in the experience.
              </p>
            </div>
          ) : (
            <p className="px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
              Upload a clip — short videos hold attention best.
            </p>
          )}
        </div>
      );
    case "background":
      return (
        <div className="space-y-4 pb-2">
          <div>
            <FieldLabel>Cover art</FieldLabel>
            <MediaUploadField
              kind="auto"
              value={d.video ?? d.image}
              valueIsVideo={!!d.video}
              onUploaded={(url, mediaKind) =>
                set(mediaKind === "video" ? { video: url, image: undefined } : { image: url, video: undefined })
              }
              onRemove={() => set({ image: undefined, video: undefined })}
            />
          </div>
          {d.image || d.video ? (
            <>
              <div>
                <FieldLabel>Dim for readability</FieldLabel>
                <ChipGroup
                  options={BACKGROUND_DIMS.map((v) => ({ value: v as string, label: v }))}
                  value={d.dim ?? "Medium"}
                  onChange={(v) => set({ dim: v })}
                  groupLabel="Background dim"
                />
                <p className="mt-2 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                  A soft dark veil keeps white text readable over busy photos.
                </p>
              </div>
              {d.image ? (
                <div>
                  <FieldLabel>Photo motion</FieldLabel>
                  <ChipGroup
                    options={BACKGROUND_MOTIONS.map((v) => ({ value: v as string, label: v === "Zoom" ? "Slow zoom" : v }))}
                    value={d.motion ?? "Zoom"}
                    onChange={(v) => set({ motion: v })}
                    groupLabel="Background motion"
                  />
                  <p className="mt-2 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                    A gentle Ken Burns drift makes still photos feel cinematic.
                  </p>
                </div>
              ) : (
                <p className="px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                  The video loops silently behind this scene — sound comes from your Audio blocks.
                </p>
              )}
            </>
          ) : (
            <p className="px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
              Upload any image or video — it covers the entire screen of this scene, edge to edge.
            </p>
          )}
        </div>
      );
    case "audio":
      return <AudioBlockEditor block={block} onChange={onChange} />;
    case "flower":
      return <FlowerBlockEditor block={block} onChange={onChange} />;
    case "gift":
      return <GiftBlockEditor block={block} onChange={onChange} />;
    case "countdown": {
      const isCustom = !!d.minutes && !COUNTDOWN_PRESETS.some((p) => p.minutes === d.minutes);
      return (
        <div className="pb-2">
          <FieldLabel>Unlocks after</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Countdown duration">
            {COUNTDOWN_PRESETS.map((p) => {
              const active = d.minutes === p.minutes;
              return (
                <button
                  key={p.minutes}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ minutes: p.minutes })}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.96]",
                    active
                      ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                      : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={isCustom}
              onClick={() => set({ minutes: isCustom ? d.minutes : 45 })}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.96]",
                isCustom
                  ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                  : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
              )}
            >
              {isCustom ? countdownLabel(d.minutes) ?? "Custom" : "Custom"}
            </button>
          </div>
          {isCustom ? (
            <div className="mt-3 flex items-center gap-2.5">
              <input
                type="number"
                min={1}
                max={10080}
                value={d.minutes ?? 45}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(10080, Number(e.target.value) || 1));
                  set({ minutes: v });
                }}
                aria-label="Custom countdown minutes"
                className={cn(fieldInput, "w-28 tabular-nums")}
              />
              <span className="text-[12.5px] font-semibold text-[#AAAAAA]">minutes</span>
              <span className="ml-auto text-[12px] font-bold text-[#1D1D1F]/70">{countdownLabel(d.minutes)}</span>
            </div>
          ) : null}
          <p className="mt-3 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            The scene stays sealed until the timer runs out — perfect for a timed reveal.
          </p>
        </div>
      );
    }
    case "quiz": {
      const options = d.options?.length ? d.options : ["Option A", "Option B"];
      const answer = d.answer ?? 0;
      const setOptions = (next: string[]) =>
        set({ options: next, answer: Math.min(answer, next.length - 1) });
      return (
        <div className="space-y-4 pb-2">
          <div>
            <label htmlFor="md-quiz-q" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
              Question
            </label>
            <input
              id="md-quiz-q"
              maxLength={80}
              value={d.question ?? ""}
              onChange={(e) => set({ question: e.target.value })}
              placeholder="Ask something only they'd know"
              className={fieldInput}
            />
          </div>
          <div>
            <FieldLabel>Answers — tap the circle to mark the right one</FieldLabel>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => set({ answer: i })}
                    aria-pressed={answer === i}
                    aria-label={`Mark option ${i + 1} as correct`}
                    className={cn(
                      "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      answer === i ? "border-[#30D158] bg-[#30D158]" : "border-[#D1D1D6]"
                    )}
                  >
                    {answer === i ? <Check size={13} strokeWidth={3} className="text-white" aria-hidden /> : null}
                  </button>
                  <input
                    value={o}
                    maxLength={30}
                    aria-label={`Option ${i + 1}`}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                    className={cn(fieldInput, "flex-1 py-2")}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      aria-label={`Remove option ${i + 1}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.08] text-[#FF375F] transition-transform active:scale-90"
                    >
                      <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {options.length < 4 ? (
              <button
                type="button"
                onClick={() => setOptions([...options, `Option ${String.fromCharCode(65 + options.length)}`])}
                className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#007AFF]/[0.08] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#007AFF] transition-transform active:scale-95"
              >
                <Plus size={13} strokeWidth={2.4} aria-hidden /> Add option
              </button>
            ) : null}
          </div>
        </div>
      );
    }
    case "reward":
      return <RewardBlockEditor block={block} onChange={onChange} />;
    case "coupon":
      return <CouponRevealEditor block={block} onChange={onChange} />;
    case "cta": {
      const action = d.action ?? "Open link";
      const domain = d.url?.trim() ? urlDomain(d.url) : null;
      return (
        <div className="space-y-4 pb-2">
          <div>
            <label htmlFor="md-cta-label" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
              Button label
            </label>
            <input
              id="md-cta-label"
              maxLength={24}
              value={d.label ?? ""}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="Continue"
              className={fieldInput}
            />
          </div>
          <div>
            <FieldLabel>On tap</FieldLabel>
            <ChipGroup
              options={CTA_ACTIONS.map((a) => ({ value: a, label: a }))}
              value={action}
              onChange={(v) => set({ action: v })}
              groupLabel="Button action"
            />
          </div>
          {action === "Reply" ? (
            <p className="px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
              Reply taps show a toast — no link needed. Switch to “Open link” or “Claim” to paste a URL.
            </p>
          ) : (
            <div>
              <label htmlFor="md-cta-url" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
                Link — {action === "Claim" ? "where they claim it" : "opens in a new tab"}
              </label>
              <div className="relative">
                <Link2
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]"
                />
                <input
                  id="md-cta-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={200}
                  value={d.url ?? ""}
                  onChange={(e) => set({ url: e.target.value })}
                  placeholder="https://memorableday.in"
                  className={cn(fieldInput, "pl-9")}
                />
              </div>
              {domain ? (
                <p className="mt-2 flex items-center gap-1.5 rounded-full bg-[#007AFF]/[0.07] px-3 py-1.5 text-[12px] font-semibold text-[#007AFF]">
                  <ExternalLink size={12} aria-hidden />
                  Opens <span className="font-bold">{domain}</span> in a new tab
                </p>
              ) : (
                <p className="mt-1.5 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
                  Paste any link — Spotify, YouTube, your shop, a form, anything.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    case "confetti":
      return <ConfettiBlockEditor block={block} onChange={onChange} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Soundtrack picker (experience-level music) — shared equalizer bars   */
/* ------------------------------------------------------------------ */

/** Mini animated equalizer bars (playing state) */
function EqBars({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("md-eq", className)}>
      <span />
      <span />
      <span />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cover art picker (palette grid, sheet content)                       */
/* ------------------------------------------------------------------ */

function CoverArtContent({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (variant: number) => void;
}) {
  return (
    <div className="pb-2">
      <div className="grid grid-cols-2 gap-3">
        {COVER_NAMES.map((name, v) => {
          const selectedTile = selected === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={selectedTile}
              onClick={() => onSelect(v)}
              className={cn(
                "group relative overflow-hidden rounded-[18px] border-2 bg-white p-1.5 text-left transition-transform active:scale-[0.97]",
                selectedTile ? "border-[#007AFF]" : "border-transparent"
              )}
            >
              <span className="relative block">
                <CoverArt variant={v} className="aspect-[4/3] w-full rounded-[13px]" />
                <AnimatePresence>
                  {selectedTile ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="absolute right-1.5 top-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#007AFF] text-white shadow-[0_4px_12px_-2px_rgba(0,122,255,0.6)] ring-2 ring-white"
                    >
                      <Check size={14} strokeWidth={3.2} aria-hidden />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
              <span className="block truncate px-1.5 pb-1 pt-2 text-[12.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                {name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 px-1 text-center text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
        The palette colors every scene. Changes apply instantly — undo with ⌘Z.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule send (date + time picker, sheet content)                  */
/* ------------------------------------------------------------------ */

function ScheduleContent({ onConfirm }: { onConfirm: (label: string, iso: string) => void }) {
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState(SCHEDULE_TIMES[0]);

  const days = useMemo(() => {
    const out: Array<{ label: string; sub: string; full: string; date: Date }> = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out.push({
        label: i === 0 ? "Today" : i === 1 ? "Tmrw" : new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d),
        sub: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d),
        full: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d),
        date: d,
      });
    }
    return out;
  }, []);

  /** Combines the picked day + time chip into a real Date */
  const scheduledDate = useMemo(() => {
    const d = new Date(days[dayIdx].date);
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(time);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2]);
      const mer = m[3];
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    }
    return d;
  }, [days, dayIdx, time]);

  return (
    <div className="pb-2">
      {/* Live summary */}
      <div className="mb-4 rounded-[18px] bg-[#007AFF]/[0.07] px-4 py-3 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#007AFF]">Sends</p>
        <p className="mt-0.5 text-[16px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
          {days[dayIdx].full} · {time}
        </p>
      </div>

      <FieldLabel>Day</FieldLabel>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {days.map((d, i) => {
          const active = i === dayIdx;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={active}
              onClick={() => setDayIdx(i)}
              className={cn(
                "flex w-[72px] shrink-0 flex-col items-center rounded-[16px] border-2 py-2.5 transition-all active:scale-[0.96]",
                active ? "border-[#007AFF] bg-[#007AFF]/[0.06]" : "border-[#1D1D1F]/[0.07] bg-white"
              )}
            >
              <span className={cn("text-[10.5px] font-bold uppercase tracking-wide", active ? "text-[#007AFF]" : "text-[#AAAAAA]")}>
                {d.label}
              </span>
              <span className={cn("mt-0.5 text-[15px] font-bold tabular-nums", active ? "text-[#1D1D1F]" : "text-[#1D1D1F]/70")}>
                {d.sub}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <FieldLabel>Time</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {SCHEDULE_TIMES.map((t) => {
            const active = time === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => setTime(t)}
                className={cn(
                  "rounded-full border py-2.5 text-[13px] font-semibold tabular-nums transition-all active:scale-[0.96]",
                  active
                    ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                    : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3.5 px-1 text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
        Times shown in your local timezone. You can cancel anytime before it sends.
      </p>
      <button
        type="button"
        onClick={() => onConfirm(`${days[dayIdx].full} · ${time}`, scheduledDate.toISOString())}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
      >
        <CalendarDays size={16} aria-hidden /> Schedule send
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Draggable scene row (reorder mode)                                  */
/* ------------------------------------------------------------------ */

function SceneRow({
  scene,
  index,
  cover,
  active,
  onSelect,
  onRemove,
  onGripDown,
}: {
  scene: Scene;
  index: number;
  cover: number;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onGripDown: (e: React.PointerEvent) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={scene}
      dragListener={false}
      dragControls={controls}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={cn(
        "card-shadow hairline flex items-center gap-3 rounded-[18px] bg-white p-2.5",
        active && "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-[#F5F5F7]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Select scene ${index + 1}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
            active ? "bg-[#007AFF] text-white" : "bg-[#1D1D1F]/[0.08] text-[#1D1D1F]/70"
          )}
        >
          {index + 1}
        </span>
        <CoverArt variant={(cover + index) % 10} className="h-[44px] w-[64px] shrink-0 rounded-[10px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            Scene {index + 1}
          </span>
          <span className="mt-0.5 block text-[11.5px] font-medium text-[#AAAAAA]">
            {scene.blocks.length} {scene.blocks.length === 1 ? "block" : "blocks"}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove scene ${index + 1}`}
        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.09] text-[#FF375F] transition-transform active:scale-90"
      >
        <Trash2 size={14} strokeWidth={2.2} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Reorder scene ${index + 1}`}
        onPointerDown={(e) => {
          onGripDown(e);
          controls.start(e);
        }}
        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-[#C7C7CC] transition-colors active:cursor-grabbing hover:text-[#1D1D1F]/50"
      >
        <GripVertical size={18} strokeWidth={2.2} aria-hidden />
      </button>
    </Reorder.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Experience Builder                                                  */
/* ------------------------------------------------------------------ */

export function ExperienceBuilder({ opts, onClose }: { opts: BuilderOptions; onClose: () => void }) {
  const { notify, openMoment, openShare, sheet, player, aiInsertRef, openComposer, saveDraft, sendMoment } = useMD();
  const [title, setTitle] = useState(opts.title ?? "Untitled Experience");
  const [editing, setEditing] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>(() => seedScenes(opts));
  const [sceneIdx, setSceneIdx] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [track, setTrack] = useState<SongPick | null>(opts.doc?.track ?? null);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  /** Send-flow recipient prompt (iOS alert) + in-flight flag */
  const [sendPromptOpen, setSendPromptOpen] = useState(false);
  /** Scene-delete confirm (iOS alert) — id of the scene awaiting confirmation */
  const [deleteSceneId, setDeleteSceneId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const blocksEndRef = useRef<HTMLDivElement>(null);
  const blockDragStarted = useRef(false);
  const sceneDragStarted = useRef(false);
  const [cover, setCover] = useState(opts.cover ?? 5);
  /** Palette strip scrolled to the end? (mobile scroll-affordance) */
  const paletteRef = useRef<HTMLDivElement>(null);
  const [paletteAtEnd, setPaletteAtEnd] = useState(false);
  const checkPaletteScroll = useCallback(() => {
    const el = paletteRef.current;
    if (!el) return;
    setPaletteAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 24);
  }, []);

  const scene = scenes[Math.min(sceneIdx, scenes.length - 1)];
  const scenePos = sceneIdx + 1;
  const editBlock = editBlockId ? (scenes.flatMap((s) => s.blocks).find((b) => b.id === editBlockId) ?? null) : null;
  /** Scene awaiting delete confirmation (iOS alert) */
  const pendingDelete = deleteSceneId !== null ? scenes.find((s) => s.id === deleteSceneId) ?? null : null;
  const pendingDeleteIdx = pendingDelete ? scenes.indexOf(pendingDelete) : -1;
  /** Any builder-local sheet open? (Escape / ⌘Z defer to it) */
  const localSheet =
    editBlock !== null || musicOpen || scheduleOpen || coverOpen || sendPromptOpen || libraryOpen || deleteSceneId !== null;

  /* ---------- Undo / redo ---------- */

  const snapshot = useCallback(
    (label: string): Snapshot => ({ label, title, scenes, track, cover }),
    [title, scenes, track, cover]
  );

  /** Push the CURRENT state onto the past stack (call before every mutation) */
  const pushHistory = useCallback(
    (label: string) => {
      setPast((p) => [...p.slice(-(HISTORY_CAP - 1)), snapshot(label)]);
      setFuture([]);
    },
    [snapshot]
  );

  const applySnapshot = useCallback((s: Snapshot) => {
    setTitle(s.title);
    setScenes(s.scenes);
    setTrack(s.track);
    setCover(s.cover);
    setSceneIdx((i) => Math.min(i, s.scenes.length - 1));
    setSelectedBlock(null);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [snapshot("redo"), ...f]);
    applySnapshot(prev);
    notify(`Undo — ${prev.label}`);
  }, [past, snapshot, applySnapshot, notify]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, snapshot(next.label)]);
    applySnapshot(next);
    notify(`Redo — ${next.label}`);
  }, [future, snapshot, applySnapshot, notify]);

  /* ---------- Mutations (each pushes history) ---------- */

  const addBlock = (type: string, text?: string, data?: BlockData) => {
    const id = freshBlockId();
    pushHistory(
      data
        ? `${BLOCK_BY_TYPE[type]?.label ?? "Block"} added from library`
        : text
          ? "AI message added"
          : `${BLOCK_BY_TYPE[type]?.label ?? "Block"} added`
    );
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? { ...s, blocks: [...s.blocks, { id, type, text, ...(data ? { data } : {}) }] }
          : s
      )
    );
    setSelectedBlock(id);
    notify(`${BLOCK_BY_TYPE[type]?.label ?? "Block"} added to Scene ${scenePos}`);
    requestAnimationFrame(() => {
      blocksEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return id;
  };

  const removeBlock = (id: string) => {
    const b = scene.blocks.find((x) => x.id === id);
    pushHistory(`${BLOCK_BY_TYPE[b?.type ?? ""]?.label ?? "Block"} removed`);
    setScenes((prev) =>
      prev.map((s, i) => (i === sceneIdx ? { ...s, blocks: s.blocks.filter((b2) => b2.id !== id) } : s))
    );
    if (selectedBlock === id) setSelectedBlock(null);
    notify("Block removed");
  };

  const addScene = () => {
    if (scenes.length >= MAX_SCENES) {
      notify(`Scene limit reached (${MAX_SCENES}) in this preview`);
      return;
    }
    const id = freshSceneId();
    pushHistory("Scene added");
    setScenes((prev) => [...prev, { id, blocks: [] }]);
    setSceneIdx(scenes.length);
    setSelectedBlock(null);
    notify(`Scene ${scenes.length + 1} added`);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) {
      notify("Keep at least one scene");
      return;
    }
    const idx = scenes.findIndex((s) => s.id === id);
    if (idx === -1) return;
    pushHistory(`Scene ${idx + 1} removed`);
    setScenes((prev) => prev.filter((s) => s.id !== id));
    if (idx === sceneIdx) setSceneIdx(Math.max(0, idx - 1));
    else if (idx < sceneIdx) setSceneIdx((i) => Math.max(0, i - 1));
    setSelectedBlock(null);
    setEditBlockId(null);
    notify(`Scene ${idx + 1} removed`);
  };

  /** Opens the destructive-confirm alert for a scene (guard: keep ≥ 1) */
  const requestRemoveScene = (id: string) => {
    if (scenes.length <= 1) {
      notify("Keep at least one scene");
      return;
    }
    setDeleteSceneId(id);
  };

  const commitTitle = () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== (opts.title ?? "Untitled Experience")) notify("Title updated");
    if (!t) setTitle(opts.title ?? "Untitled Experience");
  };

  /* ---------- Block editing (sheet + live apply, history at open) ---------- */

  /** Live-applies block config changes from the editor sheet */
  const updateBlockData = (id: string, data: BlockData) => {
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, data } : b)),
      }))
    );
  };

  /** Opens the block editor (records the pre-edit state once for undo) */
  const openBlockEditor = (id: string) => {
    const b = scenes.flatMap((s) => s.blocks).find((x) => x.id === id);
    pushHistory(`${BLOCK_BY_TYPE[b?.type ?? ""]?.label ?? "Block"} edited`);
    setEditBlockId(id);
  };

  /* ---------- Soundtrack ---------- */

  const selectTrack = (song: SongPick | null) => {
    if ((track?.id ?? null) === (song?.id ?? null) && !!track === !!song) return;
    pushHistory(song ? "Soundtrack changed" : "Soundtrack removed");
    setTrack(song);
    notify(song ? `“${song.title}” set as soundtrack` : "Soundtrack removed");
  };

  /* ---------- Cover art ---------- */

  const selectCover = (variant: number) => {
    if (cover === variant) return;
    pushHistory("Cover art changed");
    setCover(variant);
    notify(`“${COVER_NAMES[variant]}” cover applied`);
  };

  /** Record the pre-edit title once, at edit start */
  const beginEditTitle = () => {
    pushHistory("Title renamed");
    setEditing(true);
  };

  /* ---------- Reorder handlers (history pushed once per drag) ---------- */

  const reorderBlocks = (next: Block[]) => {
    const sameOrder =
      next.length === scene.blocks.length &&
      next.every((b, i) => b.id === scene.blocks[i].id);
    if (sameOrder) return;
    if (blockDragStarted.current) {
      pushHistory("Blocks reordered");
      blockDragStarted.current = false;
    }
    setScenes((prev) =>
      prev.map((s, i) => (i === sceneIdx ? { ...s, blocks: next } : s))
    );
  };

  const reorderScenes = (next: Scene[]) => {
    const sameOrder =
      next.length === scenes.length && next.every((s, i) => s.id === scenes[i].id);
    if (sameOrder) return;
    if (sceneDragStarted.current) {
      pushHistory("Scenes reordered");
      sceneDragStarted.current = false;
    }
    const currentId = scene.id;
    setScenes(next);
    const newIdx = next.findIndex((s) => s.id === currentId);
    if (newIdx >= 0) setSceneIdx(newIdx);
  };

  /* ---------- AI message insertion (registered as an event handler via context ref) ---------- */

  /** Inserts a composed message into the current scene (called from the composer sheet) */
  const insertAiMessage = (message: string) => {
    const id = freshBlockId();
    pushHistory("AI message added");
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx ? { ...s, blocks: [...s.blocks, { id, type: "text", text: message }] } : s
      )
    );
    setSelectedBlock(id);
    notify(`AI message added to Scene ${sceneIdx + 1}`);
    requestAnimationFrame(() => {
      blocksEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  // Keep the context ref pointing at the latest handler (assigning a ref in an effect is cheap + lint-safe)
  useEffect(() => {
    aiInsertRef.current = insertAiMessage;
    return () => {
      if (aiInsertRef.current === insertAiMessage) aiInsertRef.current = null;
    };
  });

  /* ---------- Keyboard: Escape closes (deferred), ⌘Z / ⇧⌘Z undo-redo ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (sheet || player || editing || localSheet) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Escape" && !sheet && !player && !localSheet) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, player, editing, localSheet, onClose, undo, redo]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="absolute inset-0 z-[60] flex flex-col bg-[#F5F5F7]"
      role="dialog"
      aria-modal="true"
      aria-label="Experience builder"
    >
      {/* ---------- Top chrome ---------- */}
      <header className="relative z-10 flex items-center gap-3 border-b border-[#1D1D1F]/[0.07] bg-white/85 px-4 pb-3 pt-4 shadow-[0_10px_30px_-18px_rgba(29,29,31,0.25)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to app"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#007AFF]/[0.1] text-[#007AFF] transition-transform active:scale-90"
        >
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
        </button>

        <div className="min-w-0 flex-1 text-center">
          {editing ? (
            <input
              autoFocus
              value={title}
              maxLength={40}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setTitle(opts.title ?? "Untitled Experience");
                  setEditing(false);
                }
              }}
              aria-label="Experience title"
              className="w-full rounded-[10px] bg-[#F5F5F7] px-2.5 py-1 text-center text-[15.5px] font-bold tracking-[-0.02em] text-[#1D1D1F] outline-none ring-2 ring-[#007AFF]"
            />
          ) : (
            <button
              type="button"
              onClick={beginEditTitle}
              aria-label="Rename experience"
              className="max-w-full truncate rounded-[10px] px-2 py-0.5 text-[15.5px] font-bold tracking-[-0.02em] text-[#1D1D1F] transition-colors hover:bg-[#1D1D1F]/[0.04]"
            >
              {title}
            </button>
          )}
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#AAAAAA]">
            <Check size={10} strokeWidth={3} className="text-[#30D158]" aria-hidden /> Saved
            {opts.ai ? (
              <>
                <span aria-hidden>·</span>
                <Sparkles size={10} className="text-[#5E5CE6]" aria-hidden />
                <span className="font-semibold text-[#5E5CE6]">AI sketch</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openMoment({
                id: uid("preview-"),
                title: title || "Untitled Experience",
                cover,
                dedication: "Draft preview",
                ...(track ? { music: track } : {}),
                ...(scenes.some((s) => s.blocks.length > 0)
                  ? { scenes: scenes.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b })) })) }
                  : {}),
              })
            }
            aria-label="Preview experience"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#007AFF] text-white pill-shadow transition-transform active:scale-90"
          >
            <Play size={16} fill="currentColor" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => openShare({ id: `draft-${opts.cover ?? 0}`, title: title || "Untitled Experience" })}
            aria-label="Share draft"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1D1D1F]/[0.06] text-[#1D1D1F] transition-transform active:scale-90"
          >
            <Share2 size={15.5} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </header>

      {/* ---------- Scrollable workspace (centered column on wide screens) ---------- */}
      <main className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[720px] space-y-5 px-5 pb-6 pt-5">
          {/* Scene storyboard / reorder mode */}
          <section aria-label="Scenes">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
                Scenes · {scenes.length}
              </h2>
              {reorderMode ? (
                <button
                  type="button"
                  onClick={() => setReorderMode(false)}
                  className="rounded-full bg-[#007AFF] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-transform active:scale-95"
                >
                  Done
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Undo last change"
                    className={cn(
                      "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1D1D1F]/[0.05] transition-all active:scale-90",
                      canUndo ? "text-[#1D1D1F]" : "cursor-default text-[#1D1D1F]/25"
                    )}
                  >
                    <Undo2 size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    aria-label="Redo change"
                    className={cn(
                      "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1D1D1F]/[0.05] transition-all active:scale-90",
                      canRedo ? "text-[#1D1D1F]" : "cursor-default text-[#1D1D1F]/25"
                    )}
                  >
                    <Redo2 size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestRemoveScene(scene.id)}
                    aria-label={`Delete Scene ${scenePos}`}
                    title={`Delete Scene ${scenePos}`}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FF375F]/[0.1] text-[#FF375F] transition-all active:scale-90"
                  >
                    <Trash2 size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReorderMode(true);
                      setSelectedBlock(null);
                    }}
                    aria-label="Reorder scenes"
                    className="ml-1 rounded-full bg-[#007AFF]/[0.1] px-3 py-1.5 text-[12px] font-semibold text-[#007AFF] transition-transform active:scale-95"
                  >
                    Order
                  </button>
                </div>
              )}
            </div>

            {reorderMode ? (
              <div>
                <p className="mb-2.5 px-0.5 text-[11.5px] font-medium text-[#AAAAAA]">
                  Drag the handles to rearrange — recipients tap through in this order.
                </p>
                <Reorder.Group axis="y" values={scenes} onReorder={reorderScenes} className="space-y-2.5">
                  {scenes.map((s, i) => (
                    <SceneRow
                      key={s.id}
                      scene={s}
                      index={i}
                      cover={cover}
                      active={i === sceneIdx}
                      onSelect={() => {
                        setSceneIdx(i);
                        setSelectedBlock(null);
                      }}
                      onRemove={() => requestRemoveScene(s.id)}
                      onGripDown={() => {
                        sceneDragStarted.current = true;
                      }}
                    />
                  ))}
                </Reorder.Group>
              </div>
            ) : (
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
                {scenes.map((s, i) => {
                  const active = i === sceneIdx;
                  return (
                    <div key={s.id} className="group/scene relative w-[104px] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSceneIdx(i);
                          setSelectedBlock(null);
                        }}
                        aria-pressed={active}
                        aria-label={`Scene ${i + 1}, ${s.blocks.length} blocks`}
                        className={cn(
                          "relative w-full overflow-hidden rounded-[18px] bg-white text-left transition-all active:scale-[0.96]",
                          active
                            ? "card-shadow ring-2 ring-[#007AFF] ring-offset-2 ring-offset-[#F5F5F7]"
                            : "card-shadow hairline"
                        )}
                      >
                        <CoverArt variant={(cover + i) % 10} className="h-[64px] w-full">
                          <span
                            className={cn(
                              "absolute left-2 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold backdrop-blur-md",
                              active ? "bg-[#007AFF] text-white" : "bg-[#1D1D1F]/35 text-white"
                            )}
                          >
                            {i + 1}
                          </span>
                        </CoverArt>
                        <div className="px-2.5 py-2">
                          <p className="text-[12px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                            Scene {i + 1}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-[#AAAAAA]">
                            {s.blocks.length} {s.blocks.length === 1 ? "block" : "blocks"}
                          </p>
                          {s.blocks.length > 0 ? (
                            <span className="mt-1.5 flex items-center gap-[3px]" aria-hidden>
                              {s.blocks.slice(0, 5).map((b) => (
                                <span
                                  key={b.id}
                                  className="h-[5px] w-[5px] rounded-full"
                                  style={{ backgroundColor: BLOCK_BY_TYPE[b.type]?.tint ?? "#C7C7CC" }}
                                />
                              ))}
                              {s.blocks.length > 5 ? (
                                <span className="text-[8px] font-bold leading-none text-[#AAAAAA]">
                                  +{s.blocks.length - 5}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </button>
                      {scenes.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => requestRemoveScene(s.id)}
                          aria-label={`Delete Scene ${i + 1}`}
                          title={`Delete Scene ${i + 1}`}
                          className="absolute right-0.5 top-0.5 flex h-[44px] w-[44px] items-center justify-center transition-transform active:scale-90"
                        >
                          <span
                            className={cn(
                              "flex h-[22px] w-[22px] items-center justify-center rounded-full backdrop-blur-md transition-colors",
                              active ? "bg-[#FF375F] text-white" : "bg-[#1D1D1F]/45 text-white group-hover/scene:bg-[#FF375F]/85"
                            )}
                          >
                            <Trash2 size={10.5} strokeWidth={2.6} aria-hidden />
                          </span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addScene}
                  aria-label="Add scene"
                  className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[#1D1D1F]/[0.15] bg-white/50 text-[#AAAAAA] transition-all hover:border-[#007AFF]/40 hover:text-[#007AFF] active:scale-[0.96]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D1D1F]/[0.05]">
                    <Plus size={18} strokeWidth={2.4} aria-hidden />
                  </span>
                  <span className="text-[11.5px] font-semibold">Scene</span>
                </button>
              </div>
            )}
          </section>

          {/* Scene canvas */}
          <section aria-label={`Scene ${scenePos} canvas`} className="card-shadow hairline rounded-[24px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
                Scene {scenePos}
              </h3>
              <p className="text-[11.5px] font-medium text-[#AAAAAA]">
                {scene.blocks.length === 0 ? "Empty scene" : "Tap a block to select · drag ⠿ to reorder"}
              </p>
            </div>

            {scene.blocks.length === 0 ? (
              <div className="flex flex-col items-center rounded-[18px] border border-dashed border-[#1D1D1F]/[0.12] px-6 py-9 text-center">
                <span className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#007AFF]/[0.08] text-[#007AFF]">
                  <Plus size={20} aria-hidden />
                </span>
                <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Nothing here yet</p>
                <p className="mt-1 max-w-[210px] text-[12px] leading-relaxed text-[#AAAAAA]">
                  Add blocks from the palette below — they stack into this scene.
                </p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={scene.blocks} onReorder={reorderBlocks} className="space-y-3">
                <AnimatePresence initial={false}>
                  {scene.blocks.map((b) => {
                    const active = selectedBlock === b.id;
                    return (
                      <BlockCard
                        key={b.id}
                        block={b}
                        cover={(cover + sceneIdx * 2) % 10}
                        scenePos={scenePos}
                        active={active}
                        onSelect={() => setSelectedBlock(active ? null : b.id)}
                        onRemove={() => removeBlock(b.id)}
                        onEdit={() => openBlockEditor(b.id)}
                        onGripDown={() => {
                          blockDragStarted.current = true;
                        }}
                      />
                    );
                  })}
                </AnimatePresence>
                <div ref={blocksEndRef} aria-hidden />
              </Reorder.Group>
            )}
          </section>

          {/* Cover art */}
          <section aria-label="Cover art">
            <div className="card-shadow hairline flex items-center gap-3 rounded-[20px] bg-white p-3">
              <span className="relative shrink-0">
                <CoverArt variant={cover} className="h-[56px] w-[72px] rounded-[14px]" />
                <span className="absolute inset-0 rounded-[14px] ring-1 ring-[#1D1D1F]/[0.08] ring-inset" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Cover art</p>
                <p className="mt-0.5 truncate text-[11.5px] font-medium text-[#AAAAAA]">
                  {COVER_NAMES[cover]} · colors every scene
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverOpen(true)}
                className="shrink-0 rounded-full bg-[#1D1D1F]/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-95"
              >
                Browse
              </button>
            </div>
          </section>

          {/* Soundtrack */}
          <section aria-label="Soundtrack">
            <div className="card-shadow hairline flex items-center gap-3 rounded-[20px] bg-white p-3">
              {track ? (
                <>
                  {track.artwork ? (
                    <img src={track.artwork} alt="" aria-hidden className="h-11 w-11 shrink-0 rounded-[13px] object-cover" />
                  ) : (
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#FF375F]/15 text-[#FF375F]">
                      <Music size={17} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{track.title}</p>
                    <p className="mt-0.5 truncate text-[11.5px] font-medium text-[#AAAAAA]">
                      {track.artist} · {formatClock(track.start)}–{formatClock(track.start + track.length)} · all scenes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTrack(null)}
                    aria-label="Remove soundtrack"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.09] text-[#FF375F] transition-transform active:scale-90"
                  >
                    <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicOpen(true)}
                    className="shrink-0 rounded-full bg-[#1D1D1F]/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-95"
                  >
                    Change
                  </button>
                </>
              ) : (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF375F]/[0.1] text-[#FF375F]">
                    <Music size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Add a soundtrack</p>
                    <p className="mt-0.5 text-[11.5px] font-medium text-[#AAAAAA]">Search any song — plays under every scene</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMusicOpen(true)}
                    className="shrink-0 rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white pill-shadow transition-transform active:scale-95"
                  >
                    Browse
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Block palette */}
          <section aria-label="Block palette">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
                Add to Scene {scenePos}
              </h2>
              <p className="text-[11.5px] font-medium text-[#AAAAAA]">
                {ADDABLE_BLOCKS.length} block kinds · tap to drop
              </p>
            </div>
            <div className="relative">
            <div
              ref={paletteRef}
              onScroll={checkPaletteScroll}
              className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0 lg:overflow-visible"
            >
              {/* Block Library — the categorized gallery (featured, first) */}
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                aria-label="Browse the block library"
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#1D1D1F] py-2.5 pl-3 pr-4 text-white transition-transform active:scale-[0.94] pill-shadow"
              >
                <span
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
                >
                  <LayoutGrid size={15} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="text-[13px] font-semibold tracking-[-0.01em]">Library</span>
                <span className="rounded-full bg-[#8B5CF6] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                  New
                </span>
              </button>
              <button
                type="button"
                onClick={() => openComposer()}
                aria-label="Ask AI to write a message"
                className="flex shrink-0 items-center gap-2 rounded-full py-2.5 pl-3 pr-4 text-white transition-transform active:scale-[0.94] pill-shadow"
                style={{ background: "linear-gradient(135deg, #5E5CE6, #7D7AFF)" }}
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/25">
                  <Sparkles size={15} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="text-[13px] font-semibold tracking-[-0.01em]">Ask AI</span>
              </button>
              {ADDABLE_BLOCKS.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => addBlock(b.type, undefined, starterBlockData(b.type))}
                    aria-label={`Add ${b.label} block`}
                    className="card-shadow hairline flex shrink-0 items-center gap-2 rounded-full bg-white py-2.5 pl-3 pr-4 transition-transform active:scale-[0.94]"
                  >
                    <span
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
                      style={{ backgroundColor: `${b.tint}1A`, color: b.tint }}
                    >
                      <Icon size={15} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Scroll affordance — the strip holds 12 pills; without a hint,
                the back half (Gift → Confetti) looks "unavailable" on mobile. */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#F5F5F7] via-[#F5F5F7]/80 to-transparent transition-opacity duration-300 lg:hidden",
                paletteAtEnd ? "opacity-0" : "opacity-100"
              )}
            />
            {!paletteAtEnd ? (
              <button
                type="button"
                aria-label="Scroll for more blocks"
                onClick={() => paletteRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
                className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1D1D1F] card-shadow hairline transition-transform active:scale-90 lg:hidden"
              >
                <ChevronRight size={17} strokeWidth={2.4} aria-hidden />
              </button>
            ) : null}
            </div>
          </section>

          {/* Tip */}
          <p className="px-1 text-center text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            Blocks stack top-to-bottom. Recipients tap through scenes one by one.
            <br />
            <Undo2 size={10} className="mr-1 inline" aria-hidden />
            Undo anything with ⌘Z — redo with ⇧⌘Z.
          </p>
        </div>
      </main>

      {/* ---------- Bottom action bar ---------- */}
      <footer className="relative z-10 border-t border-[#1D1D1F]/[0.07] bg-white/85 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            saveDraft({
              id: opts.draftId ?? uid("d"),
              title: title || "Untitled Experience",
              cover,
              scenes: scenes.length,
              blocks: scenes.reduce((n, s) => n + s.blocks.length, 0),
              editedAt: "Just now",
              sceneData: scenes,
              track,
            });
            notify("Draft saved to your Gallery");
            onClose();
          }}
          className="flex-1 rounded-full bg-[#1D1D1F]/[0.06] py-3 text-[14.5px] font-semibold text-[#1D1D1F] transition-transform active:scale-[0.97]"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="flex-1 rounded-full bg-[#1D1D1F]/[0.06] py-3 text-[14.5px] font-semibold text-[#1D1D1F] transition-transform active:scale-[0.97]"
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => setSendPromptOpen(true)}
          disabled={sending}
          className="flex-[1.4] rounded-full bg-[#007AFF] py-3 text-[14.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        </div>
      </footer>

      {/* ---------- Builder-local sheets (above builder, below app sheets) ---------- */}
      <BottomSheet
        open={editBlock !== null}
        onClose={() => setEditBlockId(null)}
        title={editBlock ? `Edit ${BLOCK_BY_TYPE[editBlock.type]?.label ?? "Block"} block` : "Edit block"}
      >
        {editBlock ? (
          <BlockEditorContent
            block={editBlock}
            onChange={(data) => updateBlockData(editBlock.id, data)}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet open={musicOpen} onClose={() => setMusicOpen(false)} title="Soundtrack">
        <SongPickerContent selected={track} onConfirm={selectTrack} />
      </BottomSheet>

      <BottomSheet open={coverOpen} onClose={() => setCoverOpen(false)} title="Cover art">
        <CoverArtContent selected={cover} onSelect={selectCover} />
      </BottomSheet>

      {/* Block Library — categorized gallery of ready-made blocks */}
      <BottomSheet open={libraryOpen} onClose={() => setLibraryOpen(false)} title="Block Library">
        <BlockLibraryContent
          scenePos={scenePos}
          onPick={(t) => {
            const id = addBlock(t.type, undefined, t.data);
            setLibraryOpen(false);
            openBlockEditor(id);
          }}
        />
      </BottomSheet>

      <BottomSheet open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule send">
        <ScheduleContent
          onConfirm={(label, iso) => {
            setScheduleOpen(false);
            setSending(true);
            void sendMoment({
              id: opts.draftId ?? uid("d"),
              title: title || "Untitled Experience",
              cover,
              scenes: scenes.length,
              blocks: scenes.reduce((n, s) => n + s.blocks.length, 0),
              sceneData: scenes,
              track,
              scheduledFor: iso,
              label,
            }).then((moment) => {
              setSending(false);
              if (moment) {
                notify(`Scheduled for ${label}`);
                onClose();
              }
            });
          }}
        />
      </BottomSheet>

      {/* Send — recipient prompt (iOS alert), real server send with link */}
      <RenameDialog
        open={sendPromptOpen}
        title="Send this moment"
        description="Who is this experience for? They'll receive your link."
        placeholder="Recipient's name"
        confirmLabel="Send"
        initialTitle=""
        maxLength={30}
        busy={sending}
        onCancel={() => {
          if (!sending) setSendPromptOpen(false);
        }}
        onConfirm={(recipient) => {
          setSending(true);
          void sendMoment({
            id: opts.draftId ?? uid("d"),
            title: title || "Untitled Experience",
            cover,
            scenes: scenes.length,
            blocks: scenes.reduce((n, s) => n + s.blocks.length, 0),
            sceneData: scenes,
            track,
            recipient,
          }).then((moment) => {
            setSending(false);
            setSendPromptOpen(false);
            if (moment) {
              notify(`Sent to ${recipient} — the link is live`);
              onClose();
              openShare({
                id: moment.id,
                title: moment.title,
                ...(moment.shareSlug ? { slug: moment.shareSlug } : {}),
              });
            }
          });
        }}
      />

      {/* Scene delete — iOS destructive confirm */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete Scene ${pendingDeleteIdx + 1}?` : "Delete scene?"}
        description={
          pendingDelete
            ? pendingDelete.blocks.length > 0
              ? `This removes the scene and its ${pendingDelete.blocks.length} ${pendingDelete.blocks.length === 1 ? "block" : "blocks"}. You can undo right after.`
              : "This empty scene will be removed. You can undo right after."
            : undefined
        }
        onCancel={() => setDeleteSceneId(null)}
        onConfirm={() => {
          if (deleteSceneId) removeScene(deleteSceneId);
          setDeleteSceneId(null);
        }}
      />
    </motion.div>
  );
}
