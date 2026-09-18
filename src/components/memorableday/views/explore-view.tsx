"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Heart, SearchX } from "lucide-react";
import { EXPLORE_ITEMS, type ExploreItem } from "@/lib/mock-data";
import { CoverArt } from "../cover-art";
import { EmptyState, LargeTitle, SkeletonCard } from "../bits";
import { SegmentedControl } from "../segmented-control";
import { useSkeleton } from "../use-skeleton";
import { useMD } from "../md-context";
import { cn } from "@/lib/utils";

type Segment = "trending" | "new" | "picks";

const SEGMENTS: Array<{ value: Segment; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "new", label: "New" },
  { value: "picks", label: "Editor's Picks" },
];

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function ExploreView() {
  const { query, setQuery, openExplore } = useMD();
  const [segment, setSegment] = useState<Segment>("trending");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const loading = useSkeleton(segment);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXPLORE_ITEMS.filter((i) => i.segments.includes(segment)).filter((i) => {
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.creator.toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q))
      );
    });
  }, [segment, query]);

  return (
    <div className="space-y-5 px-5 pb-36 pt-[88px]">
      <header>
        <LargeTitle>Explore</LargeTitle>
        <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
          Discover experiences made by the community.
        </p>
      </header>

      <SegmentedControl
        id="explore-segments"
        options={SEGMENTS}
        value={segment}
        onChange={setSegment}
        className="mx-0.5"
      />

      {query.trim() ? (
        <div className="flex items-center justify-between gap-3 px-0.5">
          <p className="truncate text-[13px] text-[#AAAAAA]">
            Showing results for{" "}
            <span className="font-semibold text-[#1D1D1F]">“{query.trim()}”</span>
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 rounded-full bg-[#1D1D1F]/[0.06] px-3 py-1.5 text-[12px] font-semibold text-[#1D1D1F]/70 transition-transform active:scale-95"
          >
            Clear
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} aspect="aspect-[4/3.4]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX size={26} aria-hidden />}
          title="Nothing found"
          sub={`No experiences match “${query.trim()}”. Try a different search.`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, idx) => (
            <ExploreCard
              key={item.id}
              idx={idx}
              item={item}
              liked={Boolean(liked[item.id])}
              onOpen={() => openExplore(item)}
              onToggleLike={() => setLiked((l) => ({ ...l, [item.id]: !l[item.id] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Card with entrance animation, like toggle + template preview */
function ExploreCard({
  idx,
  item,
  liked,
  onOpen,
  onToggleLike,
}: {
  idx: number;
  item: ExploreItem;
  liked: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.3, ease: "easeOut" }}
      className="card-shadow hairline overflow-hidden rounded-[22px] bg-white text-left"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${item.title} by ${item.creator}. Open template preview`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="cursor-pointer transition-transform active:scale-[0.97]"
      >
        <CoverArt variant={item.cover} className="aspect-[4/3.4] w-full rounded-t-[22px]">
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[#1D1D1F]/30 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md">
            <Eye size={11} aria-hidden /> {formatCount(item.views)}
          </span>
        </CoverArt>
        <div className="p-3">
          <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
            {item.title}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-[18px] w-[18px] shrink-0 rounded-full"
                style={{
                  background: `linear-gradient(135deg, hsl(${(item.cover * 37) % 360} 70% 55%), hsl(${(item.cover * 37 + 60) % 360} 70% 65%))`,
                }}
              />
              <span className="truncate text-[12px] text-[#AAAAAA]">{item.creator}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Like row */}
      <div className="flex items-center justify-between border-t border-[#1D1D1F]/[0.05] px-3 py-2">
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? `Unlike ${item.title}` : `Like ${item.title}`}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-all active:scale-90",
            liked ? "bg-[#FF375F]/[0.1] text-[#FF375F]" : "text-[#AAAAAA] hover:bg-[#1D1D1F]/[0.04]"
          )}
        >
          <motion.span
            key={String(liked)}
            initial={{ scale: liked ? 0.5 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="flex items-center"
          >
            <Heart size={13} fill={liked ? "currentColor" : "none"} aria-hidden />
          </motion.span>
          {formatCount(item.likes + (liked ? 1 : 0))}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full bg-[#007AFF]/[0.08] px-3 py-1 text-[11.5px] font-semibold text-[#007AFF] transition-transform active:scale-95"
        >
          View
        </button>
      </div>
    </motion.div>
  );
}
