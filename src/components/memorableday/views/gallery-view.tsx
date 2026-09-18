"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Eye, Sparkles } from "lucide-react";
import { MOMENTS, type MomentStatus } from "@/lib/mock-data";
import { CoverArt } from "../cover-art";
import { EmptyState, LargeTitle, SkeletonCard, StatusBadge } from "../bits";
import { useSkeleton } from "../use-skeleton";
import { useMD, type UserDraft } from "../md-context";
import { cn } from "@/lib/utils";

type Filter = "all" | MomentStatus;

type GalleryItem =
  | ({ kind: "moment" } & (typeof MOMENTS)[number])
  | ({ kind: "user-draft" } & UserDraft);

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "archived", label: "Archived" },
];

export function GalleryView() {
  const { openMoment, openBuilder, drafts: userDrafts } = useMD();
  const [filter, setFilter] = useState<Filter>("all");
  const loading = useSkeleton(filter);

  const items = useMemo<GalleryItem[]>(() => {
    const user: GalleryItem[] = userDrafts.map((d) => ({ kind: "user-draft", ...d }));
    const seeded = MOMENTS.map((m) => ({ kind: "moment" as const, ...m }));
    if (filter === "draft") return [...user, ...seeded.filter((m) => m.status === "draft")];
    if (filter === "all") return [...user, ...seeded];
    return seeded.filter((m) => m.status === filter);
  }, [filter, userDrafts]);

  return (
    <div className="px-5 pb-36 pt-[88px] md:px-8 md:pb-16 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <LargeTitle>Gallery</LargeTitle>
          <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
            {MOMENTS.length + userDrafts.length} moments ·{" "}
            {MOMENTS.filter((m) => m.status === "draft").length + userDrafts.length} in progress
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} aspect="aspect-square" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Archive size={26} aria-hidden />}
          title="Nothing here yet"
          sub="Moments you archive will live here. Finished ones can be archived from their menu."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
          {items.map((it, idx) => {
            const isUser = it.kind === "user-draft";
            const isDraft = isUser || (it.kind === "moment" && it.status === "draft");
            const title = it.title;
            const cover = it.cover;
            const draftId = isUser ? it.id : undefined;
            const scenes = isUser ? Math.max(1, it.scenes) : it.scenes;
            const dateLine = isUser ? `${it.blocks} blocks · ${it.editedAt}` : `${it.date} · ${it.scenes} scenes`;
            return (
              <motion.button
                key={it.id}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.035, 0.25), duration: 0.3, ease: "easeOut" }}
                onClick={() =>
                  isDraft
                    ? openBuilder({
                        title,
                        cover,
                        scenes,
                        ...(draftId ? { draftId } : {}),
                      })
                    : openMoment({ id: it.id, title: it.title, cover: it.cover, dedication: `For ${it.recipient}` })
                }
                aria-label={`${title}, ${isDraft ? "continue editing" : "play moment"}`}
                className="card-shadow hairline lift overflow-hidden rounded-[22px] bg-white text-left transition-transform active:scale-[0.97]"
              >
                <CoverArt variant={cover} className="aspect-square w-full">
                  {isUser ? (
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_4px_12px_-2px_rgba(0,122,255,0.55)] backdrop-blur-md">
                      <Sparkles size={10} aria-hidden /> Mine
                    </span>
                  ) : it.kind === "moment" ? (
                    <StatusBadge status={it.status} className="absolute left-2.5 top-2.5 backdrop-blur-md" />
                  ) : null}
                  {!isUser && it.kind === "moment" && it.views ? (
                    <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[#1D1D1F]/30 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md">
                      <Eye size={11} aria-hidden /> {it.views}
                    </span>
                  ) : null}
                </CoverArt>
                <div className="p-3">
                  <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
                    {title}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">{dateLine}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
