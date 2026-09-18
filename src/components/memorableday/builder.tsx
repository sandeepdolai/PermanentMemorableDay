"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Check,
  ChevronLeft,
  Clock,
  Gift,
  GripVertical,
  Images as ImagesIcon,
  ListChecks,
  MousePointerClick,
  Music,
  PartyPopper,
  Play,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { CoverArt } from "./cover-art";
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
  { type: "gift", label: "3D Gift", icon: Gift, tint: "#5E5CE6" },
  { type: "countdown", label: "Countdown", icon: Clock, tint: "#FF9F0A" },
  { type: "quiz", label: "Quiz", icon: ListChecks, tint: "#007AFF" },
  { type: "reward", label: "Reward", icon: Award, tint: "#30D158" },
  { type: "cta", label: "Button", icon: MousePointerClick, tint: "#007AFF" },
  { type: "confetti", label: "Confetti", icon: PartyPopper, tint: "#FF375F" },
];

const BLOCK_BY_TYPE = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));

interface Block {
  id: string;
  type: string;
}

interface Scene {
  id: string;
  blocks: Block[];
}

const MAX_SCENES = 8;

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
  if (opts.ai) {
    return [
      { id: "s1", blocks: [{ id: "b1", type: "text" }, { id: "b2", type: "photo" }] },
      { id: "s2", blocks: [{ id: "b3", type: "gift" }, { id: "b4", type: "confetti" }] },
      { id: "s3", blocks: [{ id: "b5", type: "text" }, { id: "b6", type: "cta" }] },
    ];
  }
  const count = Math.max(1, Math.min(opts.scenes ?? 1, MAX_SCENES));
  const scenes: Scene[] = [];
  for (let i = 0; i < count; i++) {
    const pattern = DRAFT_PATTERNS[(i + (opts.cover ?? 0)) % DRAFT_PATTERNS.length];
    scenes.push({
      id: `s${i + 1}`,
      blocks: pattern.map((t, j) => ({ id: `b${i * 4 + j + 1}`, type: t })),
    });
  }
  if (opts.initialBlock && BLOCK_BY_TYPE[opts.initialBlock]) {
    scenes[0].blocks.push({ id: "bSeed", type: opts.initialBlock });
  }
  return scenes;
}

/* ------------------------------------------------------------------ */
/* Block visual previews                                               */
/* ------------------------------------------------------------------ */

function BlockPreview({ type, cover }: { type: string; cover: number }) {
  switch (type) {
    case "text":
      return (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#007AFF]/[0.1] text-[#007AFF]">
            <Type size={16} strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#1D1D1F]">
              A few words that land.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#AAAAAA]">
              Your message renders here — big type, generous spacing, one idea per scene.
            </p>
          </div>
        </div>
      );
    case "photo":
      return (
        <div className="flex items-center gap-3">
          <CoverArt variant={cover} className="h-16 w-24 shrink-0 rounded-[12px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Photo block</p>
            <p className="mt-1 text-[12.5px] text-[#AAAAAA]">Full-bleed image with a soft caption</p>
          </div>
        </div>
      );
    case "video":
      return (
        <div className="relative overflow-hidden rounded-[14px]">
          <CoverArt variant={(cover + 3) % 10} className="h-24 w-full" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
              <Play size={18} className="ml-0.5 text-white" fill="white" aria-hidden />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-[#1D1D1F]/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
            0:12
          </span>
        </div>
      );
    case "audio":
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
    case "gift":
      return (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-white"
            style={{ background: "linear-gradient(135deg, #5E5CE6 0%, #7D7AFF 60%, #B4A7FF 100%)" }}
          >
            <Gift size={22} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">3D gift box</p>
            <p className="mt-1 text-[12.5px] text-[#AAAAAA]">Recipient taps to open — confetti included</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#5E5CE6]/[0.1] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#5E5CE6]">
            Reveal
          </span>
        </div>
      );
    case "countdown":
      return (
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#FF9F0A]/[0.08] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-[#B26A00]" aria-hidden />
            <p className="text-[13px] font-semibold text-[#B26A00]">Unlocks in</p>
          </div>
          <p className="text-[17px] font-bold tabular-nums tracking-wide text-[#1D1D1F]">03 : 12 : 45</p>
        </div>
      );
    case "quiz":
      return (
        <div>
          <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            Pick the answer that fits —
          </p>
          <div className="mt-2.5 flex gap-2.5">
            <span className="flex-1 rounded-full border border-[#007AFF]/25 bg-[#007AFF]/[0.06] py-2 text-center text-[12.5px] font-semibold text-[#007AFF]">
              Option A
            </span>
            <span className="flex-1 rounded-full border border-[#1D1D1F]/[0.08] bg-white py-2 text-center text-[12.5px] font-semibold text-[#1D1D1F]/70">
              Option B
            </span>
          </div>
        </div>
      );
    case "reward":
      return (
        <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-[#30D158]/40 bg-[#30D158]/[0.06] px-4 py-3">
          <Award size={20} className="shrink-0 text-[#1E9E4A]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1E9E4A]">Reward reveal</p>
            <p className="text-[12px] text-[#AAAAAA]">Attach a coupon, gift card or download</p>
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="flex flex-col items-center py-1">
          <span className="rounded-full bg-[#007AFF] px-7 py-2.5 text-[14px] font-semibold text-white pill-shadow">
            Continue
          </span>
          <p className="mt-2 text-[11px] font-medium text-[#AAAAAA]">Opens a link, claim or reply</p>
        </div>
      );
    case "confetti":
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FF375F]/[0.1] text-[#FF375F]">
            <PartyPopper size={16} strokeWidth={2.2} aria-hidden />
          </span>
          <p className="flex-1 text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            Celebration burst
          </p>
          <span className="flex shrink-0 items-center gap-1" aria-hidden>
            {["#FF375F", "#FF9F0A", "#30D158", "#007AFF", "#5E5CE6"].map((c) => (
              <span key={c} className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </span>
        </div>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Experience Builder                                                  */
/* ------------------------------------------------------------------ */

export function ExperienceBuilder({ opts, onClose }: { opts: BuilderOptions; onClose: () => void }) {
  const { notify, openMoment, openShare, sheet, player } = useMD();
  const [title, setTitle] = useState(opts.title ?? "Untitled Experience");
  const [editing, setEditing] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>(() => seedScenes(opts));
  const [sceneIdx, setSceneIdx] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const idRef = useRef(100);
  const blocksEndRef = useRef<HTMLDivElement>(null);
  const cover = opts.cover ?? 5;

  // Escape closes the builder — deferred while a sheet or the player is layered above
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sheet && !player) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, player, onClose]);

  const scene = scenes[Math.min(sceneIdx, scenes.length - 1)];
  const scenePos = sceneIdx + 1;

  const addBlock = (type: string) => {
    const id = `b${idRef.current++}`;
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx ? { ...s, blocks: [...s.blocks, { id, type }] } : s
      )
    );
    setSelectedBlock(id);
    notify(`${BLOCK_BY_TYPE[type]?.label ?? "Block"} added to Scene ${scenePos}`);
    requestAnimationFrame(() => {
      blocksEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const removeBlock = (id: string) => {
    setScenes((prev) =>
      prev.map((s, i) => (i === sceneIdx ? { ...s, blocks: s.blocks.filter((b) => b.id !== id) } : s))
    );
    if (selectedBlock === id) setSelectedBlock(null);
    notify("Block removed");
  };

  const addScene = () => {
    if (scenes.length >= MAX_SCENES) {
      notify(`Scene limit reached (${MAX_SCENES}) in this preview`);
      return;
    }
    const id = `s${Date.now()}`;
    setScenes((prev) => [...prev, { id, blocks: [] }]);
    setSceneIdx(scenes.length);
    setSelectedBlock(null);
    notify(`Scene ${scenes.length + 1} added`);
  };

  const commitTitle = () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== (opts.title ?? "Untitled Experience")) notify("Title updated");
    if (!t) setTitle(opts.title ?? "Untitled Experience");
  };

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
              onClick={() => setEditing(true)}
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
                id: `preview-${Date.now()}`,
                title: title || "Untitled Experience",
                cover,
                dedication: "Draft preview",
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

      {/* ---------- Scrollable workspace ---------- */}
      <main className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-5 pb-6 pt-5">
          {/* Scene storyboard */}
          <section aria-label="Scenes">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
                Scenes · {scenes.length}
              </h2>
              <p className="text-[11.5px] font-medium text-[#AAAAAA]">Tap a scene to edit it</p>
            </div>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
              {scenes.map((s, i) => {
                const active = i === sceneIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSceneIdx(i);
                      setSelectedBlock(null);
                    }}
                    aria-pressed={active}
                    aria-label={`Scene ${i + 1}, ${s.blocks.length} blocks`}
                    className={cn(
                      "relative w-[104px] shrink-0 overflow-hidden rounded-[18px] bg-white text-left transition-all active:scale-[0.96]",
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
                      <p className="mt-0.5 text-[10.5px] font-medium text-[#AAAAAA]">
                        {s.blocks.length} {s.blocks.length === 1 ? "block" : "blocks"}
                      </p>
                    </div>
                  </button>
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
          </section>

          {/* Scene canvas */}
          <section aria-label={`Scene ${scenePos} canvas`} className="card-shadow hairline rounded-[24px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
                Scene {scenePos}
              </h3>
              <p className="text-[11.5px] font-medium text-[#AAAAAA]">
                {scene.blocks.length === 0 ? "Empty scene" : "Tap a block to select"}
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
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {scene.blocks.map((b) => {
                    const active = selectedBlock === b.id;
                    const def = BLOCK_BY_TYPE[b.type];
                    return (
                      <motion.div
                        key={b.id}
                        layout
                        initial={{ opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        aria-label={`${def?.label ?? "Block"} in scene ${scenePos}. ${active ? "Selected" : "Tap to select"}`}
                        onClick={() => setSelectedBlock(active ? null : b.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedBlock(active ? null : b.id);
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
                          <span
                            aria-hidden
                            className={cn(
                              "mt-0.5 shrink-0 text-[#C7C7CC] transition-colors",
                              active && "text-[#007AFF]"
                            )}
                          >
                            <GripVertical size={15} strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <BlockPreview type={b.type} cover={(cover + sceneIdx * 2) % 10} />
                          </div>
                        </div>

                        {/* Block meta + delete */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#1D1D1F]/[0.05] pt-2.5">
                          <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
                            {def ? (
                              <def.icon size={11} strokeWidth={2.4} aria-hidden style={{ color: def.tint }} />
                            ) : null}
                            {def?.label ?? b.type}
                          </span>
                          {active ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBlock(b.id);
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              aria-label={`Remove ${def?.label ?? "block"}`}
                              className="relative z-10 flex items-center gap-1 rounded-full bg-[#FF375F]/[0.1] px-2.5 py-1 text-[11px] font-semibold text-[#FF375F] transition-transform active:scale-90"
                            >
                              <Trash2 size={11} strokeWidth={2.4} aria-hidden /> Remove
                            </button>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={blocksEndRef} aria-hidden />
              </div>
            )}
          </section>

          {/* Block palette */}
          <section aria-label="Block palette">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
                Add to Scene {scenePos}
              </h2>
              <p className="text-[11.5px] font-medium text-[#AAAAAA]">Tap to drop a block</p>
            </div>
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 no-scrollbar">
              {BLOCKS.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => addBlock(b.type)}
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
          </section>

          {/* Tip */}
          <p className="px-1 text-center text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
            Blocks stack top-to-bottom. Recipients tap through scenes one by one.
          </p>
        </div>
      </main>

      {/* ---------- Bottom action bar ---------- */}
      <footer className="relative z-10 flex items-center gap-2.5 border-t border-[#1D1D1F]/[0.07] bg-white/85 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => notify("Draft saved to your Gallery")}
          className="flex-1 rounded-full bg-[#1D1D1F]/[0.06] py-3 text-[14.5px] font-semibold text-[#1D1D1F] transition-transform active:scale-[0.97]"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => notify("Scheduler opens here — UI preview")}
          className="flex-1 rounded-full bg-[#1D1D1F]/[0.06] py-3 text-[14.5px] font-semibold text-[#1D1D1F] transition-transform active:scale-[0.97]"
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => {
            openShare({ id: `draft-${opts.cover ?? 0}`, title: title || "Untitled Experience" });
          }}
          className="flex-[1.4] rounded-full bg-[#007AFF] py-3 text-[14.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
        >
          Send
        </button>
      </footer>
    </motion.div>
  );
}
