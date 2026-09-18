"use client";

import { useEffect, useState } from "react";
import { ChartPie, Eye, Heart, Share2, Trash2 } from "lucide-react";
import { MOMENTS, USER } from "@/lib/mock-data";
import { CoverArt } from "../cover-art";
import { CountUp, SectionHeader, StatusBadge } from "../bits";
import { useMD, type UserDraft } from "../md-context";

const STATS = [
  { label: "Moments sent", value: String(USER.stats.sent) },
  { label: "Open rate", value: USER.stats.openRate },
  { label: "Loves", value: String(USER.stats.loves) },
];

export function HomeView() {
  const { setTab, openMoment, openShare, openBuilder, openInsights, drafts: userDrafts, deleteDraft, saveDraft, notify } = useMD();
  const [greeting, setGreeting] = useState("Hello");
  const [dateLine, setDateLine] = useState("");

  /** Deletes one of the user's own drafts — toast offers Undo (re-inserts it) */
  const removeDraft = (d: UserDraft) => {
    deleteDraft(d.id);
    notify(`“${d.title}” deleted`, {
      label: "Undo",
      onClick: () => {
        saveDraft(d);
        notify(`“${d.title}” restored`);
      },
    });
  };

  useEffect(() => {
    // Update greeting + date after paint (avoids hydration mismatch, keeps render stable)
    const id = requestAnimationFrame(() => {
      const h = new Date().getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
      setDateLine(
        new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())
      );
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // User-saved drafts first (fresh from the builder), then the seeded preview drafts
  const drafts: Array<{
    id: string;
    title: string;
    cover: number;
    scenes: number;
    progress?: number;
    isUser?: boolean;
    blocks?: number;
    editedAt?: string;
  }> = [
    ...userDrafts.map((d) => ({
      id: d.id,
      title: d.title,
      cover: d.cover,
      scenes: Math.max(1, d.scenes),
      progress: 60,
      isUser: true,
      blocks: d.blocks,
      editedAt: d.editedAt,
    })),
    ...MOMENTS.filter((m) => m.status === "draft").map((m) => ({
      id: m.id,
      title: m.title,
      cover: m.cover,
      scenes: m.scenes,
      progress: m.progress,
    })),
  ];
  const recent = MOMENTS.filter((m) => m.status !== "draft").slice(0, 5);

  return (
    <div className="px-5 pb-36 pt-[88px] md:px-8 md:pb-16 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-8">
      {/* Greeting */}
      <header className="flex items-start justify-between gap-3">
        <div>
          {dateLine ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#007AFF]">{dateLine}</p>
          ) : null}
          <p className="mt-1 text-[15px] font-medium text-[#AAAAAA]">{greeting}, Sandeep</p>
          <h1 className="mt-1 text-[32px] font-bold leading-[1.08] tracking-[-0.035em] text-[#1D1D1F]">
            Make every
            <br />
            moment memorable.
          </h1>
        </div>
      </header>

      {/* Hero + stats — side by side from `lg` (hero grows, stats stack vertically) */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.55fr_1fr] lg:items-stretch lg:gap-6">
        {/* Featured hero — reference layout: art left, uppercase headline right */}
        <section aria-label="Featured" className="lg:flex">
          <article className="card-shadow hairline lift flex w-full gap-3.5 rounded-[28px] bg-white p-3.5 lg:flex-none lg:items-center lg:gap-5 lg:p-5">
            <CoverArt variant={0} className="h-auto w-[42%] shrink-0 rounded-[20px] lg:w-[38%] lg:rounded-[24px]" >
              <span className="absolute left-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                Featured
              </span>
            </CoverArt>
            <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1 lg:py-0">
              <h2 className="text-[16px] font-extrabold uppercase leading-[1.18] tracking-[-0.015em] text-[#1D1D1F] lg:text-[19px] lg:leading-[1.16]">
                Turn ordinary moments into unforgettable experiences.
              </h2>
              <p className="mt-2 text-[13px] leading-snug text-[#AAAAAA] lg:text-[14px]">
                Interactive scenes, reveals and rewards — no code needed.
              </p>
              <button
                type="button"
                onClick={() => setTab("create")}
                className="mt-3.5 self-start rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white pill-shadow transition-transform active:scale-95 lg:mt-5"
              >
                Create yours
              </button>
            </div>
          </article>
        </section>

        {/* Stats — tap through to the full Insights dashboard */}
        <section aria-label="Your stats" className="flex flex-col lg:h-full">
          <SectionHeader title="Your stats" action="Insights" onAction={() => openInsights("7d")} />
          <button
            type="button"
            onClick={() => openInsights("7d")}
            aria-label="Open insights dashboard"
            className="lift w-full flex-1 rounded-[24px] transition-transform active:scale-[0.98]"
          >
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-2.5">
              {STATS.map((s) => (
                <div key={s.label} className="card-shadow hairline flex items-baseline justify-between gap-3 rounded-[20px] bg-white px-4 py-3.5 lg:py-[15px]">
                  <CountUp
                    value={s.value}
                    className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-[#1D1D1F]"
                  />
                  <p className="text-right text-[11px] font-medium leading-tight text-[#AAAAAA] lg:text-[12.5px]">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11.5px] font-semibold text-[#007AFF]">
              <ChartPie size={12} aria-hidden /> See the full funnel, trends and top moments
            </p>
          </button>
        </section>
      </div>

      {/* Continue creating */}
      <section aria-label="Continue creating">
        <SectionHeader title="Continue Creating" action="See all" onAction={() => setTab("gallery")} />
        <div className="-mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
          {drafts.map((d) => {
            const draft = d.isUser ? userDrafts.find((x) => x.id === d.id) : undefined;
            return (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={`Continue editing ${d.title}`}
              onClick={() =>
                openBuilder({
                  title: d.title,
                  cover: d.cover,
                  scenes: d.scenes,
                  ...(d.isUser ? { draftId: d.id } : {}),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).click();
                }
              }}
              className="card-shadow hairline lift w-[168px] shrink-0 cursor-pointer rounded-[22px] bg-white p-2.5 text-left transition-transform active:scale-[0.97] lg:w-auto"
            >
              <span className="relative block">
                <CoverArt variant={d.cover} className="aspect-[4/3] w-full rounded-[15px]" />
                {d.isUser ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-[0_4px_10px_-2px_rgba(0,122,255,0.55)]">
                    Mine
                  </span>
                ) : null}
                {d.isUser && draft ? (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete draft ${d.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDraft(draft);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        removeDraft(draft);
                      }
                    }}
                    className="absolute right-1.5 top-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/85 text-[#8A8A8E] shadow-[0_6px_16px_-6px_rgba(29,29,31,0.4)] backdrop-blur-md transition-all hover:bg-[#FF375F] hover:text-white active:scale-90"
                  >
                    <Trash2 size={13} strokeWidth={2.2} aria-hidden />
                  </span>
                ) : null}
              </span>
              <div className="px-1 pb-1 pt-2.5">
                <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{d.title}</p>
                <p className="mt-0.5 text-[11.5px] text-[#AAAAAA]">
                  {d.isUser
                    ? `${d.blocks ?? 0} blocks · ${d.editedAt ?? "saved"}`
                    : `${d.scenes - Math.round((d.progress ?? 0) / 100 * d.scenes)} of ${d.scenes} scenes left`}
                </p>
                <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#1D1D1F]/[0.07]">
                  <div
                    className="h-full rounded-full bg-[#007AFF]"
                    style={{ width: `${d.progress ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Recent moments */}
      <section aria-label="Recent moments">
        <SectionHeader title="Recent Moments" action="Gallery" onAction={() => setTab("gallery")} />
        <div className="card-shadow hairline divide-y divide-[#1D1D1F]/[0.06] overflow-hidden rounded-[24px] bg-white lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {recent.map((m) => {
            const open = () =>
              openMoment({ id: m.id, title: m.title, cover: m.cover, dedication: `For ${m.recipient}` });
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`${m.title}, for ${m.recipient}, ${m.date}`}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-[#007AFF]/[0.04] lg:card-shadow lg:hairline lg:rounded-[20px] lg:bg-white lg:py-3.5"
              >
                <CoverArt variant={m.cover} className="h-[52px] w-[52px] shrink-0 rounded-[14px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                    {m.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[#AAAAAA]">
                    <span className="truncate">For {m.recipient}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{m.date}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.views ? (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[#AAAAAA]">
                      <Eye size={13} aria-hidden /> {m.views}
                    </span>
                  ) : null}
                  <StatusBadge status={m.status} />
                  <button
                    type="button"
                    aria-label={`Share ${m.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openShare({ id: m.id, title: m.title });
                    }}
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#007AFF]/[0.09] text-[#007AFF] transition-transform active:scale-90"
                  >
                    <Share2 size={14.5} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Loved by recipients */}
      <section aria-label="Loved by recipients">
        <div className="relative overflow-hidden rounded-[24px] bg-[#1D1D1F] p-5 lg:p-7">
          <div
            aria-hidden
            className="md-float absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-60 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(0,122,255,0.55), transparent 70%)" }}
          />
          <div className="relative lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
                <Heart size={12} aria-hidden /> {USER.stats.loves} loves received
              </span>
              <h2 className="mt-3 text-[19px] font-bold leading-snug tracking-[-0.02em] text-white lg:text-[22px]">
                Recipients remember moments, not messages.
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/60 lg:mt-2 lg:text-[14px]">
                Every experience ends with your signature and an invitation to create one back.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab("explore")}
              className="mt-4 shrink-0 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1F] transition-transform active:scale-95 lg:mt-0"
            >
              See what others made
            </button>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
