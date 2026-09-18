"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, Share2 } from "lucide-react";
import { MOMENTS, USER } from "@/lib/mock-data";
import { CoverArt } from "../cover-art";
import { CountUp, SectionHeader, StatusBadge } from "../bits";
import { useMD } from "../md-context";

const STATS = [
  { label: "Moments sent", value: String(USER.stats.sent) },
  { label: "Open rate", value: USER.stats.openRate },
  { label: "Loves", value: String(USER.stats.loves) },
];

export function HomeView() {
  const { setTab, notify, openMoment, openShare } = useMD();
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    // Update greeting after paint (avoids hydration mismatch, keeps render stable)
    const id = requestAnimationFrame(() => {
      const h = new Date().getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const drafts = MOMENTS.filter((m) => m.status === "draft");
  const recent = MOMENTS.filter((m) => m.status !== "draft").slice(0, 5);

  return (
    <div className="space-y-8 px-5 pb-36 pt-[88px]">
      {/* Greeting */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-[#AAAAAA]">{greeting}, Sandeep</p>
          <h1 className="mt-1 text-[32px] font-bold leading-[1.08] tracking-[-0.035em] text-[#1D1D1F]">
            Make every
            <br />
            moment memorable.
          </h1>
        </div>
      </header>

      {/* Featured hero — reference layout: art left, uppercase headline right */}
      <section aria-label="Featured">
        <article className="card-shadow hairline flex gap-3.5 rounded-[28px] bg-white p-3.5">
          <CoverArt variant={0} className="h-auto w-[42%] shrink-0 rounded-[20px]" >
            <span className="absolute left-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
              Featured
            </span>
          </CoverArt>
          <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1">
            <h2 className="text-[16px] font-extrabold uppercase leading-[1.18] tracking-[-0.015em] text-[#1D1D1F]">
              Turn ordinary moments into unforgettable experiences.
            </h2>
            <p className="mt-2 text-[13px] leading-snug text-[#AAAAAA]">
              Interactive scenes, reveals and rewards — no code needed.
            </p>
            <button
              type="button"
              onClick={() => setTab("create")}
              className="mt-3.5 self-start rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white pill-shadow transition-transform active:scale-95"
            >
              Create yours
            </button>
          </div>
        </article>
      </section>

      {/* Stats */}
      <section aria-label="Your stats">
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="card-shadow hairline rounded-[20px] bg-white px-3.5 py-3.5">
              <CountUp
                value={s.value}
                className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-[#1D1D1F]"
              />
              <p className="mt-0.5 text-[11px] font-medium leading-tight text-[#AAAAAA]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Continue creating */}
      <section aria-label="Continue creating">
        <SectionHeader title="Continue Creating" action="See all" onAction={() => setTab("gallery")} />
        <div className="-mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1 no-scrollbar">
          {drafts.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => notify("The experience builder opens here — UI preview")}
              className="card-shadow hairline w-[168px] shrink-0 rounded-[22px] bg-white p-2.5 text-left transition-transform active:scale-[0.97]"
            >
              <CoverArt variant={d.cover} className="aspect-[4/3] w-full rounded-[15px]" />
              <div className="px-1 pb-1 pt-2.5">
                <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{d.title}</p>
                <p className="mt-0.5 text-[11.5px] text-[#AAAAAA]">
                  {d.scenes - Math.round((d.progress ?? 0) / 100 * d.scenes)} of {d.scenes} scenes left
                </p>
                <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#1D1D1F]/[0.07]">
                  <div
                    className="h-full rounded-full bg-[#007AFF]"
                    style={{ width: `${d.progress ?? 0}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent moments */}
      <section aria-label="Recent moments">
        <SectionHeader title="Recent Moments" action="Gallery" onAction={() => setTab("gallery")} />
        <div className="card-shadow hairline divide-y divide-[#1D1D1F]/[0.06] overflow-hidden rounded-[24px] bg-white">
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
                className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-[#007AFF]/[0.04]"
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
        <div className="relative overflow-hidden rounded-[24px] bg-[#1D1D1F] p-5">
          <div
            aria-hidden
            className="absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-60 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(0,122,255,0.55), transparent 70%)" }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
              <Heart size={12} aria-hidden /> {USER.stats.loves} loves received
            </span>
            <h2 className="mt-3 text-[19px] font-bold leading-snug tracking-[-0.02em] text-white">
              Recipients remember moments, not messages.
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
              Every experience ends with your signature and an invitation to create one back.
            </p>
            <button
              type="button"
              onClick={() => setTab("explore")}
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1F] transition-transform active:scale-95"
            >
              See what others made
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
