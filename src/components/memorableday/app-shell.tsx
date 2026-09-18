"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bell, Check, Info, LayoutTemplate, Sparkles } from "lucide-react";
import { NOTIFICATIONS, PRICING_PLANS } from "@/lib/mock-data";
import { MDContext, type PlayerPayload, type SharePayload, type Sheet, type Tab } from "./md-context";
import { SearchBar } from "./search-bar";
import { BottomNav } from "./bottom-nav";
import { BottomSheet } from "./bottom-sheet";
import { MomentPlayer } from "./moment-player";
import { NotificationsContent, ShareContent } from "./sheet-contents";
import { HomeView } from "./views/home-view";
import { CreateView } from "./views/create-view";
import { ExploreView } from "./views/explore-view";
import { GalleryView } from "./views/gallery-view";
import { ProfileView } from "./views/profile-view";
import { cn } from "@/lib/utils";

const TAB_TITLES: Record<Tab, string> = {
  home: "Home",
  create: "Create",
  explore: "Explore",
  gallery: "Gallery",
  profile: "Profile",
};

/** iOS-style dark glass toast */
function GlassToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[70px] z-[90] flex justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="flex max-w-full items-center gap-2 rounded-full bg-[#1D1D1F]/88 px-4 py-2.5 shadow-[0_16px_40px_-10px_rgba(29,29,31,0.5)]"
        style={{ WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)" }}
      >
        <Info size={14} className="shrink-0 text-[#64D2FF]" aria-hidden />
        <span className="truncate text-[13px] font-medium text-white">{message}</span>
      </motion.div>
    </div>
  );
}

/** Notification bell — fixed top chrome, iOS badge style */
function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      className="relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-[#1D1D1F]/[0.06] bg-white/90 text-[#1D1D1F] shadow-[0_10px_30px_-12px_rgba(29,29,31,0.25)] backdrop-blur-xl transition-transform active:scale-90"
    >
      <Bell size={19} strokeWidth={2.1} aria-hidden />
      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-0.5 -top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#FF375F] px-1 text-[10.5px] font-bold leading-none text-white shadow-[0_4px_10px_-2px_rgba(255,55,95,0.6)] ring-2 ring-white"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}

/** "How to start" sheet content */
function CreateStartContent({ onStart }: { onStart: (mode: "blank" | "ai") => void }) {
  const [mode, setMode] = useState<"blank" | "ai">("blank");
  const options = [
    {
      id: "blank" as const,
      icon: LayoutTemplate,
      title: "Blank canvas",
      sub: "Start from an empty scene stack",
    },
    {
      id: "ai" as const,
      icon: Sparkles,
      title: "AI-assisted",
      sub: "Describe the moment — AI sketches it",
    },
  ];
  return (
    <div className="pb-2">
      <div className="space-y-2.5">
        {options.map((o) => {
          const selected = mode === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-[20px] border-2 p-3.5 text-left transition-all active:scale-[0.98]",
                selected
                  ? "border-[#007AFF] bg-[#007AFF]/[0.05]"
                  : "border-[#1D1D1F]/[0.07] bg-white"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                  selected ? "bg-[#007AFF] text-white" : "bg-[#007AFF]/[0.1] text-[#007AFF]"
                )}
              >
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-[#AAAAAA]">{o.sub}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected ? "border-[#007AFF] bg-[#007AFF]" : "border-[#D1D1D6]"
                )}
              >
                {selected ? <Check size={13} strokeWidth={3} className="text-white" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onStart(mode)}
        className="mt-5 w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
      >
        Start Creating
      </button>
    </div>
  );
}

/** Pricing sheet content */
function PricingContent({ onChoose }: { onChoose: (plan: string) => void }) {
  const [selected, setSelected] = useState("personal");
  return (
    <div className="pb-2">
      <div className="space-y-2.5">
        {PRICING_PLANS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-[20px] border-2 p-3.5 text-left transition-all active:scale-[0.98]",
                active ? "border-[#007AFF] bg-[#007AFF]/[0.05]" : "border-[#1D1D1F]/[0.07] bg-white"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{p.name}</span>
                  {p.recommended ? (
                    <span className="rounded-full bg-[#007AFF]/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#007AFF]">
                      Popular
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-[#AAAAAA]">{p.note}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[17px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{p.price}</span>
                <span className="block text-[11px] text-[#AAAAAA]">{p.period}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChoose(selected)}
        className="mt-5 w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
      >
        Continue
      </button>
      <p className="mt-3 text-center text-[11px] font-medium text-[#AAAAAA]">
        Secure checkout via Dodo Payments
      </p>
    </div>
  );
}

export function AppShell() {
  const [tab, setTabState] = useState<Tab>("home");
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [player, setPlayer] = useState<PlayerPayload | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [unreadCount, setUnreadCount] = useState(() => NOTIFICATIONS.filter((n) => n.unread).length);
  const scrollRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const scrollTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const setTab = useCallback(
    (t: Tab) => {
      setTabState(t);
      scrollTop();
    },
    [scrollTop]
  );

  const submitSearch = useCallback(
    (q?: string) => {
      const value = (q ?? query).trim();
      if (!value) {
        notify("Type something to search");
        return;
      }
      setQuery(value);
      setTab("explore");
      notify(`Showing results for “${value}”`);
    },
    [query, notify, setTab]
  );

  const openSheet = useCallback((s: Exclude<Sheet, null>) => setSheet(s), []);

  const openMoment = useCallback((m: PlayerPayload) => setPlayer(m), []);

  const closeMoment = useCallback(() => setPlayer(null), []);

  const openShare = useCallback((m: SharePayload) => {
    setSharePayload(m);
    setSheet("share");
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    notify("All notifications marked as read");
  }, [notify]);

  const isSearchTab = tab === "home" || tab === "explore";

  return (
    <MotionConfig reducedMotion="user">
      <MDContext.Provider
        value={{ tab, setTab, query, setQuery, submitSearch, notify, openSheet, sheet, openMoment, openShare, unreadCount, markAllRead }}
      >
      <div className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background sm:border-x sm:border-[#1D1D1F]/[0.05]">
        {/* Top chrome: signature search pill + bell (Home/Explore) or compact title + bell on scroll */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-50 px-5 pb-5 pt-4 transition-colors duration-200",
            scrolled && !isSearchTab
              ? "border-b border-[#1D1D1F]/[0.06] glass-panel"
              : "bg-gradient-to-b from-[#F5F5F7] via-[#F5F5F7]/80 to-transparent"
          )}
        >
          {isSearchTab ? (
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <SearchBar />
              </div>
              <BellButton count={unreadCount} onClick={() => openSheet("notifications")} />
            </div>
          ) : (
            <div className="relative flex h-[46px] items-center justify-center">
              <span
                className={cn(
                  "text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F] transition-opacity duration-200",
                  scrolled ? "opacity-100" : "opacity-0"
                )}
              >
                {TAB_TITLES[tab]}
              </span>
              <div className="absolute right-0">
                <BellButton count={unreadCount} onClick={() => openSheet("notifications")} />
              </div>
            </div>
          )}
        </div>

        {/* Main scroll area */}
        <main
          ref={scrollRef}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 24)}
          className="no-scrollbar relative z-10 flex-1 overflow-y-auto overscroll-contain"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {tab === "home" && <HomeView />}
              {tab === "create" && <CreateView />}
              {tab === "explore" && <ExploreView />}
              {tab === "gallery" && <GalleryView />}
              {tab === "profile" && <ProfileView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating pill navigation */}
        <BottomNav />

        {/* Toast — topmost layer, above sheets and the player */}
        <AnimatePresence>
          {toast ? <GlassToast key={toast.id} message={toast.message} /> : null}
        </AnimatePresence>

        {/* Sheets */}
        <BottomSheet open={sheet === "create"} onClose={() => setSheet(null)} title="How would you like to start?">
          <CreateStartContent
            onStart={(mode) => {
              setSheet(null);
              notify(
                mode === "ai"
                  ? "AI Creator will open here — UI preview"
                  : "The experience builder will open here — UI preview"
              );
            }}
          />
        </BottomSheet>

        <BottomSheet open={sheet === "pricing"} onClose={() => setSheet(null)} title="Choose your plan">
          <PricingContent
            onChoose={(plan) => {
              setSheet(null);
              const p = PRICING_PLANS.find((x) => x.id === plan);
              notify(`Checkout preview — ${p?.name} plan via Dodo Payments`);
            }}
          />
        </BottomSheet>

        {/* Notifications sheet */}
        <BottomSheet open={sheet === "notifications"} onClose={() => setSheet(null)} title="Notifications">
          <NotificationsContent
            onMarkAllRead={markAllRead}
            onOpenMoment={(m) => {
              setSheet(null);
              openMoment(m);
            }}
          />
        </BottomSheet>

        {/* Share sheet */}
        <BottomSheet
          open={sheet === "share"}
          onClose={() => setSheet(null)}
          title={sharePayload ? `Share “${sharePayload.title}”` : "Share moment"}
        >
          {sharePayload ? <ShareContent moment={sharePayload} onNotify={notify} /> : null}
        </BottomSheet>

        {/* Recipient experience player */}
        <AnimatePresence>
          {player ? (
            <MomentPlayer key={player.id} moment={player} onClose={closeMoment} />
          ) : null}
        </AnimatePresence>
      </div>
      </MDContext.Provider>
    </MotionConfig>
  );
}
