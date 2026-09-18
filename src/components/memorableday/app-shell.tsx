"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bell, Check, Info, LayoutTemplate, Sparkles } from "lucide-react";
import { NOTIFICATIONS, PRICING_PLANS, type AppNotification, type InsightRange } from "@/lib/mock-data";
import {
  MDContext,
  type AiInsertFn,
  type AuthMode,
  type BuilderOptions,
  type PlayerPayload,
  type SettingsTopic,
  type SharePayload,
  type Sheet,
  type StatsPayload,
  type Tab,
  type ThemeMode,
  type ToastAction,
  type UserDraft,
} from "./md-context";
import type { ExploreItem } from "@/lib/mock-data";
import { SearchBar } from "./search-bar";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";
import { BottomSheet } from "./bottom-sheet";
import { CommandPalette } from "./command-palette";
import { MomentPlayer } from "./moment-player";
import { ExperienceBuilder } from "./builder";
import { WelcomeTour } from "./welcome-tour";
import { AuthContent, ExploreContent, InsightsContent, NotificationsContent, SETTINGS_TITLES, SettingsContent, ShareContent, StatsContent, AIComposerContent } from "./sheet-contents";
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

/** iOS-style dark glass toast — optional action button (e.g. Undo) */
function GlassToast({ message, action, onAction }: { message: string; action?: ToastAction; onAction: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[70px] z-[90] flex justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="pointer-events-auto relative flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-[#1D1D1F]/88 px-4 py-2.5 shadow-[0_16px_40px_-10px_rgba(29,29,31,0.5)] md:max-w-[520px]"
        style={{ WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)" }}
      >
        <Info size={14} className="shrink-0 text-[#64D2FF]" aria-hidden />
        <span className="truncate text-[13px] font-medium text-white">{message}</span>
        {action ? (
          <>
            <span aria-hidden className="h-3.5 w-px shrink-0 bg-white/20" />
            <button
              type="button"
              onClick={() => {
                onAction();
                action.onClick();
              }}
              className="shrink-0 rounded-full bg-white/[0.14] px-3 py-1 text-[12px] font-bold tracking-[-0.01em] text-white transition-colors hover:bg-white/25 active:scale-95"
            >
              {action.label}
            </button>
          </>
        ) : null}
        {/* auto-dismiss progress hairline — longer when an action needs a click */}
        <motion.span
          aria-hidden
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: action ? 4.2 : 2.4, ease: "linear" }}
          className="absolute inset-x-0 bottom-0 h-[2.5px] origin-left rounded-full bg-[#64D2FF]/60"
        />
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
  const [toast, setToast] = useState<{ id: number; message: string; action?: ToastAction } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [player, setPlayer] = useState<PlayerPayload | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [builder, setBuilder] = useState<BuilderOptions | null>(null);
  const [settingsTopic, setSettingsTopic] = useState<SettingsTopic | null>(null);
  const [exploreItem, setExploreItem] = useState<ExploreItem | null>(null);
  const [insightsRange, setInsightsRange] = useState<InsightRange>("7d");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [tourOpen, setTourOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [drafts, setDrafts] = useState<UserDraft[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [statsMoment, setStatsMoment] = useState<StatsPayload | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const aiInsertRef = useRef<AiInsertFn | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS);
  const scrollRef = useRef<HTMLDivElement>(null);

  // First-run welcome tour (shown once, remembered in localStorage).
  // Checked after paint — async so the render stays stable (and SSR-safe).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (!window.localStorage.getItem("md-onboarded")) setTourOpen(true);
        const saved = window.localStorage.getItem("md-saved");
        if (saved) setSavedIds(JSON.parse(saved) as string[]);
        const storedTheme = window.localStorage.getItem("md-theme");
        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
          setThemeState(storedTheme);
        }
        const storedDrafts = window.localStorage.getItem("md-drafts");
        if (storedDrafts) setDrafts(JSON.parse(storedDrafts) as UserDraft[]);
        const storedArchived = window.localStorage.getItem("md-archived");
        if (storedArchived && Array.isArray(JSON.parse(storedArchived))) {
          setArchivedIds(JSON.parse(storedArchived) as string[]);
        }
      } catch {
        // storage unavailable — skip the tour
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Apply the resolved theme to <html> and follow OS changes while in "system".
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);

  /** Sets the appearance mode (persisted in localStorage) */
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      window.localStorage.setItem("md-theme", mode);
    } catch {
      // ignore
    }
  }, []);

  /** Creates or updates a draft (deduped by id, newest first, persisted) */
  const saveDraft = useCallback((draft: UserDraft) => {
    setDrafts((prev) => {
      const next = [draft, ...prev.filter((d) => d.id !== draft.id)].slice(0, 12);
      try {
        window.localStorage.setItem("md-drafts", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  /** Deletes a draft — returns the removed draft so callers can offer Undo */
  const deleteDraft = useCallback((id: string): UserDraft | null => {
    let removed: UserDraft | null = null;
    setDrafts((prev) => {
      removed = prev.find((d) => d.id === id) ?? null;
      const next = prev.filter((d) => d.id !== id);
      try {
        window.localStorage.setItem("md-drafts", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    return removed;
  }, []);

  /** Renames a draft in place (persisted) */
  const renameDraft = useCallback((id: string, title: string) => {
    setDrafts((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, title } : d));
      try {
        window.localStorage.setItem("md-drafts", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  /** Duplicates a draft (new id, " (copy)" suffix) — returns the copy */
  const duplicateDraft = useCallback((id: string): UserDraft | null => {
    let copy: UserDraft | null = null;
    setDrafts((prev) => {
      const source = prev.find((d) => d.id === id);
      if (!source) return prev;
      copy = {
        ...source,
        id: `d${Date.now()}`,
        title: `${source.title.replace(/ \(copy\)$/, "")} (copy)`,
        editedAt: "Just now",
      };
      const next = [copy, ...prev].slice(0, 12);
      try {
        window.localStorage.setItem("md-drafts", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    return copy;
  }, []);

  /** Archives / unarchives a seeded moment (persisted) */
  const toggleArchived = useCallback((id: string) => {
    setArchivedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem("md-archived", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    try {
      window.localStorage.setItem("md-onboarded", "1");
    } catch {
      // ignore
    }
  }, []);

  const openTour = useCallback(() => setTourOpen(true), []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const openAuth = useCallback((mode?: AuthMode) => {
    setAuthMode(mode ?? "signin");
    setSheet("auth");
  }, []);

  /** Toggle a template in the saved collection (persisted in localStorage) */
  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem("md-saved", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const notify = useCallback((message: string, action?: ToastAction) => {
    setToast({ id: Date.now(), message, ...(action ? { action } : {}) });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 4300 : 2400);
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

  const openBuilder = useCallback((opts?: BuilderOptions) => {
    setBuilder(opts ?? {});
  }, []);

  const closeBuilder = useCallback(() => setBuilder(null), []);

  const openSettings = useCallback((topic: SettingsTopic) => {
    setSettingsTopic(topic);
    setSheet("settings");
  }, []);

  const openExplore = useCallback((item: ExploreItem) => {
    setExploreItem(item);
    setSheet("explore");
  }, []);

  const openInsights = useCallback((range?: InsightRange) => {
    if (range) setInsightsRange(range);
    setSheet("insights");
  }, []);

  const openComposer = useCallback(() => setSheet("composer"), []);

  /** Insert an AI-composed message: into the open builder, or open one seeded with it */
  const insertAiMessage = useCallback(
    (message: string) => {
      setSheet(null);
      if (builder && aiInsertRef.current) {
        aiInsertRef.current(message);
      } else {
        window.setTimeout(() => {
          setBuilder({ ai: true, cover: 9, title: "Untitled Experience", seedText: message });
        }, 240);
      }
    },
    [builder]
  );

  const openShare = useCallback((m: SharePayload) => {
    setSharePayload(m);
    setSheet("share");
  }, []);

  const openStats = useCallback((m: StatsPayload) => {
    setStatsMoment(m);
    setSheet("stats");
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.unread ? { ...n, unread: false } : n)));
    notify("All notifications marked as read");
  }, [notify]);

  /** Dismisses one notification — returns it so callers can offer Undo */
  const dismissNotification = useCallback((id: string): AppNotification | null => {
    let removed: AppNotification | null = null;
    setNotifications((prev) => {
      removed = prev.find((n) => n.id === id) ?? null;
      return prev.filter((n) => n.id !== id);
    });
    return removed;
  }, []);

  /** Re-inserts a dismissed notification (Undo) — returns to the end of its group */
  const insertNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [...prev, n]));
  }, []);

  /** Marks a single notification read (fires when it's opened) */
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id && n.unread ? { ...n, unread: false } : n)));
  }, []);

  const isSearchTab = tab === "home" || tab === "explore";

  /** Derived live from the feed — badge + sidebar stay in sync automatically */
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  return (
    <MotionConfig reducedMotion="user">
      <MDContext.Provider
        value={{
          tab,
          setTab,
          query,
          setQuery,
          submitSearch,
          notify,
          openSheet,
          sheet,
          openMoment,
          player,
          closePlayer: closeMoment,
          openShare,
          unreadCount,
          markAllRead,
          notifications,
          dismissNotification,
          insertNotification,
          markNotificationRead,
          openBuilder,
          builder,
          closeBuilder,
          openSettings,
          settingsTopic,
          openExplore,
          exploreItem,
          openInsights,
          openComposer,
          aiInsertRef,
          insertAiMessage,
          openAuth,
          tourOpen,
          openTour,
          closeTour,
          savedIds,
          toggleSaved,
          theme,
          setTheme,
          drafts,
          saveDraft,
          deleteDraft,
          renameDraft,
          duplicateDraft,
          archivedIds,
          toggleArchived,
          openStats,
          paletteOpen,
          openPalette,
          closePalette,
        }}
      >
      {/*
        Responsive app frame —
        · below `md`: phone column (max 480px, centered, hairline edges)
        · from `md`: iPad-style layout — glass sidebar rail + content area,
          capped at 1560px and framed with hairlines from `lg`
        All overlays (chrome, nav, sheets, builder, player, toast) are scoped
        to the content area, so the rail stays live beside them — like iPadOS.
      */}
      <div className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background sm:border-x sm:border-[#1D1D1F]/[0.05] md:max-w-none md:flex-row md:border-x-0 md:bg-transparent lg:max-w-[1560px] lg:border-x lg:border-[#1D1D1F]/[0.05]">
        <SideNav
          unreadCount={unreadCount}
          onNotifications={() => openSheet("notifications")}
          onAccount={() => openSettings("account")}
          onNewMoment={() => openSheet("create")}
          onPalette={openPalette}
        />

        <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Top chrome: signature search pill + bell (Home/Explore) or compact title + bell on scroll.
            From `md` the pill centers with a sensible max width and the bell
            moves into the sidebar; the compact title yields to the always-
            visible Large Titles in the content. */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-50 px-5 pb-5 pt-4 transition-colors duration-200 md:px-8",
            scrolled && !isSearchTab
              ? "border-b border-[#1D1D1F]/[0.06] glass-panel"
              : "bg-gradient-to-b from-[#F5F5F7] via-[#F5F5F7]/80 to-transparent dark:from-[#0A0A0C] dark:via-[#0A0A0C]/80"
          )}
        >
          {isSearchTab ? (
            <div className="relative flex items-center gap-2.5">
              <div className="min-w-0 flex-1 md:mx-auto md:max-w-[560px]">
                <SearchBar />
              </div>
              <div className="shrink-0 md:hidden">
                <BellButton count={unreadCount} onClick={() => openSheet("notifications")} />
              </div>
            </div>
          ) : (
            <div className="relative flex h-[46px] items-center justify-center">
              <span
                className={cn(
                  "text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F] transition-opacity duration-200 md:opacity-0",
                  scrolled ? "opacity-100" : "opacity-0"
                )}
              >
                {TAB_TITLES[tab]}
              </span>
              <div className="absolute right-0 md:hidden">
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

        {/* Floating pill navigation — phone only (sidebar takes over ≥ md) */}
        <BottomNav />

        {/* Toast — topmost layer, above sheets and the player */}
        <AnimatePresence>
          {toast ? (
            <GlassToast
              key={toast.id}
              message={toast.message}
              action={toast.action}
              onAction={() => setToast(null)}
            />
          ) : null}
        </AnimatePresence>

        {/* Sheets */}
        <BottomSheet open={sheet === "create"} onClose={() => setSheet(null)} title="How would you like to start?">
          <CreateStartContent
            onStart={(mode) => {
              setSheet(null);
              openBuilder(mode === "ai" ? { ai: true, cover: 9, title: "Untitled Experience" } : { cover: 5 });
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

        {/* Settings detail sheet */}
        <BottomSheet
          open={sheet === "settings"}
          onClose={() => setSheet(null)}
          title={settingsTopic ? SETTINGS_TITLES[settingsTopic] : "Settings"}
        >
          {settingsTopic ? (
            <SettingsContent
              key={settingsTopic}
              topic={settingsTopic}
              onOpenPricing={() => {
                setSheet(null);
                window.setTimeout(() => setSheet("pricing"), 260);
              }}
              onOpenTour={() => {
                setSheet(null);
                window.setTimeout(openTour, 300);
              }}
              onNotify={notify}
            />
          ) : null}
        </BottomSheet>

        {/* Explore template preview sheet */}
        <BottomSheet
          open={sheet === "explore"}
          onClose={() => setSheet(null)}
          ariaLabel={exploreItem ? `Template: ${exploreItem.title}` : "Template"}
        >
          {exploreItem ? (
            <ExploreContent
              item={exploreItem}
              saved={savedIds.includes(exploreItem.id)}
              onToggleSaved={() => toggleSaved(exploreItem.id)}
              onPreview={() => {
                const it = exploreItem;
                setSheet(null);
                window.setTimeout(
                  () => openMoment({ id: it.id, title: it.title, cover: it.cover, dedication: `By ${it.creator}` }),
                  220
                );
              }}
              onUseLayout={() => {
                const it = exploreItem;
                setSheet(null);
                window.setTimeout(
                  () => openBuilder({ title: it.title, cover: it.cover, scenes: 3 }),
                  260
                );
              }}
              onNotify={notify}
            />
          ) : null}
        </BottomSheet>

        {/* Insights / analytics sheet */}
        <BottomSheet open={sheet === "insights"} onClose={() => setSheet(null)} title="Insights">
          <InsightsContent initialRange={insightsRange} onNotify={notify} />
        </BottomSheet>

        {/* Per-moment stats sheet */}
        <BottomSheet
          open={sheet === "stats"}
          onClose={() => setSheet(null)}
          title={statsMoment ? `${statsMoment.title} — insights` : "Moment insights"}
        >
          {statsMoment ? (
            <StatsContent
              moment={statsMoment}
              onNotify={notify}
              onOpenFullInsights={() => {
                setSheet(null);
                window.setTimeout(() => openInsights("7d"), 260);
              }}
            />
          ) : null}
        </BottomSheet>

        {/* AI message composer sheet */}
        <BottomSheet open={sheet === "composer"} onClose={() => setSheet(null)} title="AI Message Composer">
          <AIComposerContent onInsert={insertAiMessage} onNotify={notify} />
        </BottomSheet>

        {/* Auth sheet (sign in / create account) */}
        <BottomSheet open={sheet === "auth"} onClose={() => setSheet(null)} ariaLabel="Sign in or create an account">
          <AuthContent
            initialMode={authMode}
            onDone={(mode) => {
              setSheet(null);
              notify(mode === "signin" ? "Signed in — UI preview" : "Account created — UI preview");
            }}
            onNotify={notify}
          />
        </BottomSheet>

        {/* Experience builder layer */}
        <AnimatePresence>
          {builder ? <ExperienceBuilder key="builder" opts={builder} onClose={closeBuilder} /> : null}
        </AnimatePresence>

        {/* Recipient experience player */}
        <AnimatePresence>
          {player ? (
            <MomentPlayer key={player.id} moment={player} onClose={closeMoment} />
          ) : null}
        </AnimatePresence>

        {/* First-run welcome tour — topmost layer */}
        <WelcomeTour
          open={tourOpen}
          onClose={closeTour}
          onSignIn={() => {
            closeTour();
            window.setTimeout(() => openAuth("signin"), 300);
          }}
        />

        {/* Spotlight command palette (⌘K) — desktop power layer */}
        <CommandPalette />
        </div>
      </div>
      </MDContext.Provider>
    </MotionConfig>
  );
}
