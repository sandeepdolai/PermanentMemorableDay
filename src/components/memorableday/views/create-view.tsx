"use client";

import {
  Award,
  Clock,
  Gift,
  Images as ImagesIcon,
  ListChecks,
  MousePointerClick,
  Music,
  PartyPopper,
  Sparkles,
  Type,
  Video,
} from "lucide-react";
import { CoverArt } from "../cover-art";
import { LargeTitle, SectionHeader } from "../bits";
import { useMD } from "../md-context";

/** Scene block types from the PRD Experience Builder */
const SCENE_BLOCKS = [
  { label: "Text", icon: Type },
  { label: "Photo", icon: ImagesIcon },
  { label: "Video", icon: Video },
  { label: "Audio", icon: Music },
  { label: "3D Gift", icon: Gift },
  { label: "Countdown", icon: Clock },
  { label: "Quiz", icon: ListChecks },
  { label: "Reward", icon: Award },
  { label: "Button", icon: MousePointerClick },
  { label: "Confetti", icon: PartyPopper },
];

export function CreateView() {
  const { openSheet, notify } = useMD();

  return (
    <div className="space-y-8 px-5 pb-36 pt-[88px]">
      <header>
        <LargeTitle>Create</LargeTitle>
        <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
          Design an interactive experience, scene by scene.
        </p>
      </header>

      {/* Start a new experience */}
      <section aria-label="New experience">
        <div className="card-shadow hairline overflow-hidden rounded-[28px] bg-white">
          <div className="relative h-36">
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
          <div className="p-4">
            <p className="text-[14px] leading-relaxed text-[#AAAAAA]">
              Start from a blank canvas or let the AI Creator sketch it for you.
            </p>
            <button
              type="button"
              onClick={() => openSheet("create")}
              className="mt-3.5 w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
            >
              Start Creating
            </button>
          </div>
        </div>
      </section>

      {/* Scene blocks */}
      <section aria-label="Scene blocks">
        <SectionHeader title="Scene Blocks" sub="Drop-ready blocks for your story" />
        <div className="grid grid-cols-3 gap-3">
          {SCENE_BLOCKS.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => notify(`“${b.label}” block — builder UI preview`)}
                className="card-shadow hairline flex flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 transition-transform active:scale-[0.94]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#007AFF]/[0.1] text-[#007AFF]">
                  <Icon size={21} strokeWidth={2.1} aria-hidden />
                </span>
                <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Creator promo */}
      <section aria-label="AI Creator">
        <div className="relative overflow-hidden rounded-[26px] p-5 text-white" style={{ background: "linear-gradient(135deg, #007AFF 0%, #40A9FF 60%, #64D2FF 100%)" }}>
          <div aria-hidden className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/25 blur-2xl" />
          <div aria-hidden className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm">
              <Sparkles size={11} aria-hidden /> AI Creator
            </span>
            <h2 className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.02em]">
              Describe the moment. Get an experience.
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
              One brief in, a complete interactive experience out — scenes, copy and reveals included.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => notify("AI Creator opens here — UI preview")}
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
  );
}
