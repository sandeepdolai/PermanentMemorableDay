"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Eye } from "lucide-react";
import { MOMENTS, type MomentStatus } from "@/lib/mock-data";
import { CoverArt } from "../cover-art";
import { EmptyState, LargeTitle, SkeletonCard, StatusBadge } from "../bits";
import { useSkeleton } from "../use-skeleton";
import { useMD } from "../md-context";
import { cn } from "@/lib/utils";

type Filter = "all" | MomentStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "archived", label: "Archived" },
];

export function GalleryView() {
  const { openMoment } = useMD();
  const [filter, setFilter] = useState<Filter>("all");
  const loading = useSkeleton(filter);

  const moments = useMemo(
    () => MOMENTS.filter((m) => (filter === "all" ? true : m.status === filter)),
    [filter]
  );

  return (
    <div className="space-y-5 px-5 pb-36 pt-[88px]">
      <header className="flex items-end justify-between gap-3">
        <div>
          <LargeTitle>Gallery</LargeTitle>
          <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
            {MOMENTS.length} moments · {MOMENTS.filter((m) => m.status === "draft").length} in progress
          </p>
        </div>
      </header>

      {/* Filter chips */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-95",
                active
                  ? "bg-[#1D1D1F] text-white shadow-[0_8px_20px_-8px_rgba(29,29,31,0.5)]"
                  : "bg-white text-[#1D1D1F]/70 hairline card-shadow"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} aspect="aspect-square" />
          ))}
        </div>
      ) : moments.length === 0 ? (
        <EmptyState
          icon={<Archive size={26} aria-hidden />}
          title="Nothing here yet"
          sub="Moments you archive will live here. Finished ones can be archived from their menu."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {moments.map((m, idx) => (
            <motion.button
              key={m.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.035, 0.25), duration: 0.3, ease: "easeOut" }}
              onClick={() => openMoment({ id: m.id, title: m.title, cover: m.cover, dedication: `For ${m.recipient}` })}
              className="card-shadow hairline overflow-hidden rounded-[22px] bg-white text-left transition-transform active:scale-[0.97]"
            >
              <CoverArt variant={m.cover} className="aspect-square w-full">
                <StatusBadge status={m.status} className="absolute left-2.5 top-2.5 backdrop-blur-md" />
                {m.views ? (
                  <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[#1D1D1F]/30 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md">
                    <Eye size={11} aria-hidden /> {m.views}
                  </span>
                ) : null}
              </CoverArt>
              <div className="p-3">
                <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
                  {m.title}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">
                  {m.date} · {m.scenes} scenes
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
