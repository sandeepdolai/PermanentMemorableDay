"use client";

import {
  Award,
  BookHeart,
  Clock,
  Flower2,
  Gift,
  Images as ImagesIcon,
  ListChecks,
  Mail,
  MousePointerClick,
  Music,
  PartyPopper,
  PenLine,
  Rocket,
  Sparkles,
  Stamp,
  Type,
  Video,
  Wallpaper,
} from "lucide-react";
import { CoverArt } from "../cover-art";
import { LargeTitle, SectionHeader } from "../bits";
import { useMD } from "../md-context";

/** Scene block types from the PRD Experience Builder — ids + tints match the builder palette 1:1 */
/* Coupon Reveal ships in a later phase — hidden from scene blocks for now. */
const SCENE_BLOCKS = [
  { label: "Text", type: "text", icon: Type, tint: "#007AFF" },
  { label: "Photo", type: "photo", icon: ImagesIcon, tint: "#30D158" },
  { label: "Video", type: "video", icon: Video, tint: "#FF9F0A" },
  { label: "Audio", type: "audio", icon: Music, tint: "#FF375F" },
  { label: "Background", type: "background", icon: Wallpaper, tint: "#64D2FF" },
  { label: "Gift", type: "gift", icon: Gift, tint: "#5E5CE6" },
  { label: "Flower", type: "flower", icon: Flower2, tint: "#FF375F" },
  { label: "Digital Album", type: "album", icon: BookHeart, tint: "#C2185B" },
  { label: "Open When…", type: "openwhen", icon: Mail, tint: "#E84393" },
  { label: "Letter", type: "letter", icon: PenLine, tint: "#AF52DE" },
  { label: "Scratch Card", type: "scratch", icon: Stamp, tint: "#FFB340" },
  { label: "Fireworks", type: "fireworks", icon: Rocket, tint: "#FF6B35" },
  { label: "Countdown", type: "countdown", icon: Clock, tint: "#FF9F0A" },
  { label: "Quiz", type: "quiz", icon: ListChecks, tint: "#007AFF" },
  { label: "Reward", type: "reward", icon: Award, tint: "#30D158" },
  { label: "Button", type: "cta", icon: MousePointerClick, tint: "#007AFF" },
  { label: "Confetti", type: "confetti", icon: PartyPopper, tint: "#FF375F" },
];

/** The Digital Album hero — a mini leather book rendered in the same design
 *  language as the player's album cover (leather, gold frame, heart emblem). */
function AlbumHeroCard({ onStart }: { onStart: () => void }) {
  return (
    <section aria-label="Digital Album" className="lg:order-2 lg:col-span-2">
      <div className="card-shadow relative overflow-hidden rounded-[28px] text-white">
        {/* leather ground */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg,#6B2237 0%,#54172A 46%,#3E0F1F 100%)" }}
        />
        {/* light sheen on the leather */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 18% 0%, rgba(255,214,170,0.14) 0%, rgba(255,214,170,0.03) 34%, transparent 60%)",
          }}
        />
        {/* stitched border */}
        <div aria-hidden className="absolute inset-[10px] rounded-[20px] border border-dashed border-[#E8C88A]/[0.28]" />
        {/* embossed gold frame */}
        <div aria-hidden className="absolute inset-[16px] rounded-[15px] border border-[#E8C88A]/[0.34]" />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
          {/* the mini book */}
          <div className="mx-auto w-[150px] shrink-0 sm:mx-0" aria-hidden>
            <div
              className="relative aspect-[3/4] overflow-hidden rounded-[12px] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.75)]"
              style={{ background: "linear-gradient(160deg,#6B2237 0%,#54172A 46%,#3E0F1F 100%)" }}
            >
              <span
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 90% at 18% 0%, rgba(255,214,170,0.16) 0%, rgba(255,214,170,0.03) 34%, transparent 60%)",
                }}
              />
              {/* spine */}
              <span className="absolute inset-y-0 left-0 w-[10px] bg-[linear-gradient(90deg,rgba(0,0,0,0.42),rgba(0,0,0,0.12)_60%,transparent)]" />
              <span className="absolute inset-y-[8px] left-[10px] w-px bg-[#E8C88A]/25" />
              {/* stitched inner border */}
              <span className="absolute inset-[6px] rounded-[8px] border border-dashed border-[#E8C88A]/[0.28]" />
              {/* gold frame */}
              <span className="absolute inset-[11px] rounded-[6px] border border-[#E8C88A]/[0.34]" />
              {/* gold ring + heart emblem */}
              <span className="absolute left-1/2 top-[26%] flex h-[46px] w-[46px] -translate-x-1/2 items-center justify-center rounded-full border border-[#E8C88A]/[0.55]">
                <span
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#E8C88A]/40"
                  style={{ background: "radial-gradient(circle at 35% 30%, #8A3B4C 0%, #55202F 100%)" }}
                >
                  <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="#E8C88A">
                    <path d="M12 21s-7.5-4.9-10-9.3C.5 8.4 2.5 5 5.7 5c2 0 3.4 1.1 4.3 2.6h4c.9-1.5 2.3-2.6 4.3-2.6 3.2 0 5.2 3.4 3.7 6.7-2.5 4.4-10 9.3-10 9.3z" opacity="0.9" />
                  </svg>
                </span>
              </span>
              {/* gold-foil title */}
              <span className="absolute inset-x-4 top-[52%] text-center">
                <span className="block font-serif text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#E8C88A]">
                  Our Story
                </span>
                <span className="mx-auto mt-1.5 block h-px w-10 bg-[#E8C88A]/45" />
                <span className="mt-1.5 block font-serif text-[9.5px] italic tracking-[0.05em] text-[#E8C88A]/80">
                  a memory book
                </span>
              </span>
              {/* page edges peeking on the right */}
              <span className="absolute inset-y-[6px] -right-[3px] w-[6px] rounded-r-[3px] bg-[repeating-linear-gradient(180deg,#F6EFDF_0px,#F6EFDF_2px,#E4D9C2_2px,#E4D9C2_3px)] opacity-90" />
            </div>
            {/* soft ground shadow */}
            <div className="mx-auto mt-2 h-3 w-[80%] rounded-full bg-black/45 blur-md" />
          </div>

          {/* the pitch */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8C88A]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#E8C88A]">
              <BookHeart size={12} aria-hidden /> Digital Album
            </span>
            <h2
              className="mt-3 font-serif text-[24px] font-semibold leading-snug tracking-[-0.01em] sm:text-[27px]"
              style={{ color: "#F3DCA8", textShadow: "0 1px 0 rgba(0,0,0,0.35)" }}
            >
              A diary-style memory book they flip through, page by page.
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/75">
              A leather cover, unlimited pages — each one carrying a photo, a few words, or a voice
              note — and a signed ending. Photos mount in archival corners; pages turn with a paper
              rustle. The keepsake they keep.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {["Photos", "Voice notes", "Handwritten words", "Unlimited pages"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[#E8C88A]/25 bg-white/[0.06] px-2.5 py-1 text-[11.5px] font-semibold text-[#F3DCA8]/90"
                >
                  {t}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-5 w-full rounded-full bg-[#E8C88A] py-3.5 text-[15.5px] font-bold text-[#3E0F1F] shadow-[0_10px_26px_-8px_rgba(232,200,138,0.55)] transition-transform active:scale-[0.98] sm:w-auto sm:px-8"
            >
              Start a Digital Album
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CreateView() {
  const { openSheet, openBuilder } = useMD();

  return (
    <div className="px-5 pb-36 pt-[88px] md:px-8 md:pb-16 lg:px-10">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8">
      <header>
        <LargeTitle>Create</LargeTitle>
        <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
          Design an interactive experience, scene by scene — unlimited scenes, unlimited blocks.
        </p>
      </header>

      {/* Digital Album — the flagship keepsake */}
      <AlbumHeroCard onStart={() => openBuilder({ initialBlock: "album", cover: 5 })} />

      {/* Start a new experience + AI promo — side by side from `lg` */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
      <section aria-label="New experience" className="lg:order-1">
        <div className="card-shadow hairline flex h-full flex-col overflow-hidden rounded-[28px] bg-white">
          <div className="relative h-36 lg:h-44 lg:flex-none">
            <CoverArt variant={5} className="absolute inset-0">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
                  <Sparkles size={22} className="text-white" aria-hidden />
                </span>
                <p className="mt-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/95">
                  New Experience
                </p>
              </div>
            </CoverArt>
          </div>
          <div className="flex flex-1 flex-col p-4 lg:p-5">
            <p className="text-[14px] leading-relaxed text-[#AAAAAA]">
              Start from a blank canvas or let the AI Creator sketch it for you.
            </p>
            <button
              type="button"
              onClick={() => openSheet("create")}
              className="mt-3.5 w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98] lg:mt-auto"
            >
              Start Creating
            </button>
          </div>
        </div>
      </section>

      {/* AI Creator promo */}
      <section aria-label="AI Creator" className="lg:order-3 lg:flex lg:flex-col">
        <div className="md-gradient-drift relative flex h-full flex-col overflow-hidden rounded-[26px] p-5 text-white lg:p-6" style={{ background: "linear-gradient(135deg, #007AFF 0%, #40A9FF 60%, #64D2FF 100%)" }}>
          <div aria-hidden className="md-float absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/25 blur-2xl" />
          <div aria-hidden className="md-float-slow absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-1 flex-col">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm">
              <Sparkles size={11} aria-hidden /> AI Creator
            </span>
            <h2 className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.02em]">
              Describe the moment. Get an experience.
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
              One brief in, a complete interactive experience out — scenes, copy and reveals included.
            </p>
            <div className="mt-4 flex items-center gap-3 lg:mt-auto">
              <button
                type="button"
                onClick={() => openSheet("ai-creator")}
                className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#007AFF] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25)] transition-transform active:scale-95"
              >
                Try it
              </button>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur-sm">
                240 credits
              </span>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Scene blocks */}
      <section aria-label="Scene blocks" className="lg:order-4">
        <SectionHeader
          title="Scene Blocks"
          sub={`${SCENE_BLOCKS.length} kinds · tap one to drop it into a new scene`}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {SCENE_BLOCKS.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.label}
                type="button"
                aria-label={`Start a scene with a ${b.label} block`}
                onClick={() => openBuilder({ initialBlock: b.type, cover: 5 })}
                className="card-shadow hairline flex flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 transition-transform active:scale-[0.94]"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-[14px]"
                  style={{ backgroundColor: `${b.tint}1A`, color: b.tint }}
                >
                  <Icon size={21} strokeWidth={2.1} aria-hidden />
                </span>
                <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[12px] font-medium text-[#AAAAAA]">
          Every block is unlimited — stack as many as you like in every scene, and add as many
          scenes as your story needs.
        </p>
      </section>
      </div>
    </div>
  );
}
