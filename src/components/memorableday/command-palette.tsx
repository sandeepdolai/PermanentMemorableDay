"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChartPie,
  Compass,
  Crown,
  FileEdit,
  Images,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  LogIn,
  Moon,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { EXPLORE_ITEMS } from "@/lib/mock-data";
import { useMD, type Tab } from "./md-context";
import { cn } from "@/lib/utils";

/* ================================================================== */
/* Spotlight-style command palette (⌘K / Ctrl+K)                      */
/*                                                                    */
/* The desktop power layer: one field that reaches every corner of   */
/* the app — navigation, creation, actions, moments, drafts and      */
/* templates — with full keyboard control (↑↓ ↵ esc) like macOS      */
/* Spotlight. Rendered inside the content area so the sidebar rail   */
/* stays live beside it, consistent with every other overlay.        */
/* ================================================================== */

type Group = "Navigate" | "Create" | "Actions" | "Moments" | "Drafts" | "Templates";

const GROUP_ORDER: Group[] = ["Navigate", "Create", "Actions", "Moments", "Drafts", "Templates"];

/** Per-group iOS system tint for the icon tiles (Apple Settings-style variety) */
const GROUP_TINT: Record<Group, string> = {
  Navigate: "#007AFF",
  Create: "#34C759",
  Actions: "#64D2FF",
  Moments: "#AF52DE",
  Drafts: "#FF9F0A",
  Templates: "#FF2D92",
};

interface PaletteCommand {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  group: Group;
  /** Right-aligned keyboard hint */
  kbd?: string;
  /** Extra searchable text (recipient names, statuses, creators…) */
  keywords?: string;
  run: () => void;
}

/** Case-insensitive relevance scoring — higher is better, 0 = hidden */
function scoreCommand(cmd: PaletteCommand, q: string): number {
  if (!q) return 1;
  const t = cmd.title.toLowerCase();
  const s = (cmd.subtitle ?? "").toLowerCase();
  const k = (cmd.keywords ?? "").toLowerCase();
  if (t.startsWith(q)) return 5;
  if (t.includes(q)) return 4;
  if (s.includes(q)) return 3;
  if (k.includes(q)) return 2;
  return 0;
}

export function CommandPalette() {
  const md = useMD();
  const { paletteOpen, openPalette, closePalette, tourOpen } = md;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** timestamp of the last bare "g" press (g-then-key navigation) */
  const gArmed = useRef(0);

  /* ---------------- commands ---------------- */

  const commands = useMemo<PaletteCommand[]>(() => {
    const resolvedDark =
      md.theme === "dark" ||
      (md.theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const list: PaletteCommand[] = [
      // Navigate
      { id: "nav-home", title: "Home", subtitle: "Dashboard & activity", icon: LayoutGrid, group: "Navigate", kbd: "G H", run: () => md.setTab("home") },
      { id: "nav-create", title: "Create", subtitle: "Start a new experience", icon: Plus, group: "Navigate", kbd: "G C", run: () => md.setTab("create") },
      { id: "nav-explore", title: "Explore", subtitle: "Trending templates", icon: Compass, group: "Navigate", kbd: "G E", run: () => md.setTab("explore") },
      { id: "nav-gallery", title: "Gallery", subtitle: "All your moments", icon: Images, group: "Navigate", kbd: "G G", run: () => md.setTab("gallery") },
      { id: "nav-profile", title: "Profile", subtitle: "Account & preferences", icon: User, group: "Navigate", kbd: "G P", run: () => md.setTab("profile") },

      // Create
      { id: "create-new", title: "New moment", subtitle: "Blank or AI-assisted start", icon: Plus, group: "Create", kbd: "N", run: () => md.openSheet("create") },
      { id: "create-blank", title: "Blank canvas", subtitle: "Open the builder empty", icon: LayoutTemplate, group: "Create", run: () => md.openBuilder({ cover: 5 }) },
      { id: "create-ai", title: "AI-assisted moment", subtitle: "Describe it — AI sketches the scenes", icon: PenLine, group: "Create", keywords: "sparkles assistant generate", run: () => md.openSheet("ai-creator") },
      { id: "create-composer", title: "AI Message Composer", subtitle: "Compose a message to insert", icon: PenLine, group: "Create", keywords: "write tone", run: () => md.openComposer() },

      // Actions
      { id: "act-notifications", title: "Notifications", subtitle: md.unreadCount > 0 ? `${md.unreadCount} unread` : "You're all caught up", icon: Bell, group: "Actions", run: () => md.openSheet("notifications") },
      { id: "act-insights", title: "Insights", subtitle: "Opens, completion, loves", icon: ChartPie, group: "Actions", keywords: "analytics stats", run: () => md.openInsights() },
      { id: "act-account", title: "Account settings", subtitle: "Name, email, plan", icon: User, group: "Actions", run: () => md.openSettings("account") },
      { id: "act-pricing", title: "Plans & pricing", subtitle: "Upgrade via Dodo Payments", icon: Crown, group: "Actions", keywords: "upgrade credits billing", run: () => md.openSheet("pricing") },
      {
        id: "act-theme",
        title: resolvedDark ? "Switch to light mode" : "Switch to dark mode",
        subtitle: `Appearance — currently ${resolvedDark ? "dark" : "light"}`,
        icon: resolvedDark ? Sun : Moon,
        group: "Actions",
        run: () => md.setTheme(resolvedDark ? "light" : "dark"),
      },
      { id: "act-tour", title: "Replay welcome tour", subtitle: "See the getting-started slides", icon: RotateCcw, group: "Actions", run: () => md.openTour() },
      { id: "act-shortcuts", title: "Keyboard shortcuts", subtitle: "See every shortcut in one place", icon: Keyboard, group: "Actions", kbd: "?", run: () => setHelpOpen(true) },
      { id: "act-signin", title: "Sign in", subtitle: "Or create an account", icon: LogIn, group: "Actions", run: () => md.openAuth("signin") },

      // Moments (gallery library — server-synced, excludes editable drafts)
      ...md.moments
        .filter((m) => !(m.source === "user" && m.status === "draft"))
        .map<PaletteCommand>((m) => ({
          id: `moment-${m.id}`,
          title: m.title,
          subtitle: `Moment · for ${m.recipient} · ${m.scenes} scenes`,
          icon: Play,
          group: "Moments",
          keywords: `${m.status} ${m.tags.join(" ")} ${m.recipient}`,
          run: () =>
            md.openMoment({
              id: m.id,
              title: m.title,
              cover: m.cover,
              dedication: `For ${m.recipient}`,
              ...(m.sceneData?.length ? { scenes: m.sceneData } : {}),
              ...(m.track ? { music: m.track } : {}),
            }),
        })),

      // Drafts (user-saved, newest first)
      ...md.drafts.map<PaletteCommand>((d) => ({
        id: `draft-${d.id}`,
        title: `Continue “${d.title}”`,
        subtitle: `Draft · ${d.scenes} scenes · ${d.blocks} blocks`,
        icon: FileEdit,
        group: "Drafts",
        run: () =>
          md.openBuilder({
            title: d.title,
            cover: d.cover,
            draftId: d.id,
            scenes: d.scenes,
            ...(d.sceneData?.length ? { doc: { scenes: d.sceneData, track: d.track ?? null } } : {}),
          }),
      })),

      // Templates (explore collection)
      ...EXPLORE_ITEMS.map<PaletteCommand>((t) => ({
        id: `template-${t.id}`,
        title: t.title,
        subtitle: `Template · by ${t.creator}`,
        icon: LayoutGrid,
        group: "Templates",
        keywords: t.tags.join(" "),
        run: () => md.openExplore(t),
      })),
    ];
    return list;
  }, [md]);

  /* ---------------- filtering ---------------- */

  const { sections, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = commands
      .map((cmd) => ({ cmd, score: scoreCommand(cmd, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const hasSearchFallback = q.length > 0;
    const sections: Array<{ group: string; tint: string; items: PaletteCommand[] }> = [];
    for (const g of GROUP_ORDER) {
      const items = scored.filter((x) => x.cmd.group === g).map((x) => x.cmd);
      if (items.length) sections.push({ group: g, tint: GROUP_TINT[g], items });
    }

    // Flat selectable list: ranked commands first, the "Search for…"
    // fallback LAST (Spotlight behavior — matches outrank the fallback).
    const flat: PaletteCommand[] = [];
    for (const s of sections) flat.push(...s.items);
    if (hasSearchFallback) {
      flat.push({
        id: "search-fallback",
        title: `Search for “${query.trim()}”`,
        subtitle: "Show template & moment results",
        icon: Search,
        group: "Navigate",
        run: () => md.submitSearch(query.trim()),
      });
    }
    return { sections, flat };
  }, [commands, query, md]);

  /* Clamp the active index at render time (no effect needed) and keep the
     highlighted row in view while arrowing through the list. */
  const activeIdx = flat.length ? Math.min(active, flat.length - 1) : 0;

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, flat.length]);

  const runCommand = (cmd: PaletteCommand) => {
    closePalette();
    setQuery("");
    // Let the exit animation start before the command mutates the layout.
    window.setTimeout(() => cmd.run(), 30);
  };

  /* ---------------- global keyboard layer ---------------- */

  // ⌘K / Ctrl+K toggles the palette; single-key shortcuts (N, G-then-key)
  // work while nothing modal is open. Mounted for the app's lifetime.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (tourOpen) return;
        // A transient card menu (z-110) is open — it owns the stage until
        // Escape/scrim dismisses it; the palette must not open beneath it.
        if (document.querySelector('[role="menu"]')) return;
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }
      if (paletteOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;

      // "?" opens the shortcuts help from anywhere (except over a card menu,
      // which sits above the help layer — close it first).
      if (e.key === "?") {
        e.preventDefault();
        if (tourOpen) return;
        if (document.querySelector('[role="menu"]')) return;
        setHelpOpen((o) => !o);
        return;
      }

      if (e.key === "/") return; // the search pill owns this key
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      if (e.key === "n") {
        e.preventDefault();
        md.openSheet("create");
        return;
      }
      // "g" then h/e/c/g/p — sequential navigation, mail-app style.
      if (e.key === "g") {
        gArmed.current = Date.now();
        return;
      }
      const map: Record<string, Tab> = { h: "home", e: "explore", c: "create", g: "gallery", p: "profile" };
      if (Date.now() - gArmed.current < 800 && map[e.key]) {
        e.preventDefault();
        gArmed.current = 0;
        md.setTab(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, tourOpen, openPalette, closePalette, md]);

  // While the palette or the shortcuts help is open, Escape must close ONLY
  // that layer — capture phase keeps it away from the sheets' / builder's /
  // player's bubble-phase handlers. Help sits above the palette, so it wins.
  useEffect(() => {
    if (!paletteOpen && !helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (helpOpen) setHelpOpen(false);
        else closePalette();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [paletteOpen, helpOpen, closePalette]);

  // Reset the field whenever the palette (re)opens —
  // "previous render" pattern (adjusting state when a prop changes, render-safe)
  const [prevOpen, setPrevOpen] = useState(paletteOpen);
  if (paletteOpen !== prevOpen) {
    setPrevOpen(paletteOpen);
    if (paletteOpen) {
      setQuery("");
      setActive(0);
    }
  }

  // Focus the field each time the palette opens (rAF — after paint).
  useEffect(() => {
    if (!paletteOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [paletteOpen]);

  /* ---------------- render ---------------- */

  let flatIndex = -1;

  return (
    <>
    <AnimatePresence>
      {paletteOpen ? (
        <div className="absolute inset-0 z-[96] flex items-start justify-center">
          {/* ink scrim */}
          <motion.button
            type="button"
            aria-label="Close command palette"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={closePalette}
            className="absolute inset-0 cursor-default bg-[#1D1D1F]/[0.3] backdrop-blur-[3px]"
          />

          {/* Spotlight panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            className="relative mt-[max(72px,10vh)] w-[calc(100%-32px)] max-w-[560px] overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.08] bg-white/95 shadow-[0_48px_100px_-24px_rgba(29,29,31,0.45),0_4px_10px_rgba(29,29,31,0.08)] backdrop-blur-2xl dark:border-white/12 dark:bg-[#1C1C1E]/95"
          >
            {/* Input row */}
            <div className="flex h-[54px] items-center gap-3 border-b border-[#1D1D1F]/[0.07] px-4 dark:border-white/10">
              <Search size={17} strokeWidth={2.2} className="shrink-0 text-[#AAAAAA]" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!flat.length) return;
                    setActive((a) => (a + (e.key === "ArrowDown" ? 1 : flat.length - 1)) % flat.length);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (flat[activeIdx]) runCommand(flat[activeIdx]);
                  }
                }}
                placeholder="Search moments, templates, actions…"
                aria-label="Search commands"
                aria-controls="command-results"
                className="min-w-0 flex-1 bg-transparent text-[16px] font-medium tracking-[-0.01em] text-[#1D1D1F] outline-none placeholder:font-normal placeholder:text-[#AAAAAA] dark:text-white dark:placeholder:text-[#8A8A8E]"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery("");
                    setActive(0);
                    inputRef.current?.focus();
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F]/[0.08] text-[#8A8A8E] transition-transform active:scale-90"
                >
                  <span className="text-[13px] leading-none">×</span>
                </button>
              ) : (
                <kbd className="shrink-0 rounded-[6px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]">
                  esc
                </kbd>
              )}
            </div>

            {/* Results */}
            <div
              ref={listRef}
              id="command-results"
              role="listbox"
              aria-label="Commands"
              className="no-scrollbar max-h-[min(380px,52vh)] overflow-y-auto p-2"
            >
              {flat.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#1D1D1F]/[0.05] text-[#AAAAAA] dark:bg-white/10">
                    <SearchX size={19} aria-hidden />
                  </span>
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-white">
                    No results for “{query.trim()}”
                  </p>
                  <p className="text-[12.5px] text-[#AAAAAA]">Try a moment name, template or action</p>
                </div>
              ) : query.trim() ? (
                /* Searched: one flat ranked list (Spotlight style) */
                <div className="flex flex-col gap-0.5">
                  {flat.map((cmd, i) => (
                    <PaletteRow key={cmd.id} cmd={cmd} tint={cmd.id === "search-fallback" ? "#007AFF" : GROUP_TINT[cmd.group]} active={i === activeIdx} index={i} onHover={setActive} onRun={runCommand} />
                  ))}
                </div>
              ) : (
                /* Empty query: grouped sections */
                sections.map((s) => (
                  <div key={s.group} className="mb-1">
                    <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">
                      {s.group === "Moments" ? "Moments" : s.group}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {s.items.map((cmd) => {
                        flatIndex += 1;
                        const i = flatIndex;
                        return <PaletteRow key={cmd.id} cmd={cmd} tint={s.tint} active={i === activeIdx} index={i} onHover={setActive} onRun={runCommand} />;
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="flex h-[38px] items-center justify-between border-t border-[#1D1D1F]/[0.07] px-4 dark:border-white/10">
              <div className="flex items-center gap-3.5 text-[11px] font-medium text-[#AAAAAA]">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-[5px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-[5px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]">↵</kbd>
                  Run
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <kbd className="rounded-[5px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]">⌘K</kbd>
                  Toggle
                </span>
              </div>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#C7C7CC]">MemorableDay</span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>

    {/* Keyboard shortcuts help — "?" from anywhere, or the palette command */}
    <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ */

const SHORTCUT_GROUPS: Array<{
  title: string;
  rows: Array<{ keys: string[]; label: string }>;
}> = [
  {
    title: "Global",
    rows: [
      { keys: ["⌘", "K"], label: "Open search & commands" },
      { keys: ["/"], label: "Focus the theme search" },
      { keys: ["N"], label: "New moment" },
      { keys: ["?"], label: "This shortcuts guide" },
    ],
  },
  {
    title: "Navigation",
    rows: [
      { keys: ["G", "H"], label: "Go to Home" },
      { keys: ["G", "C"], label: "Go to Create" },
      { keys: ["G", "E"], label: "Go to Explore" },
      { keys: ["G", "G"], label: "Go to Gallery" },
      { keys: ["G", "P"], label: "Go to Profile" },
    ],
  },
  {
    title: "In the palette & layers",
    rows: [
      { keys: ["↑", "↓"], label: "Move through results" },
      { keys: ["↵"], label: "Run the selected command" },
      { keys: ["esc"], label: "Close the topmost layer" },
    ],
  },
];

function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-[97] flex items-start justify-center">
          <motion.button
            type="button"
            aria-label="Close shortcuts"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#1D1D1F]/[0.3] backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            className="relative mt-[max(72px,14vh)] w-[calc(100%-32px)] max-w-[440px] overflow-hidden rounded-[22px] border border-[#1D1D1F]/[0.08] bg-white/95 shadow-[0_48px_100px_-24px_rgba(29,29,31,0.45),0_4px_10px_rgba(29,29,31,0.08)] backdrop-blur-2xl dark:border-white/12 dark:bg-[#1C1C1E]/95"
          >
            <div className="flex items-center justify-between border-b border-[#1D1D1F]/[0.07] px-4 py-3 dark:border-white/10">
              <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F] dark:text-white">
                Keyboard shortcuts
              </p>
              <kbd className="rounded-[6px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]">
                esc
              </kbd>
            </div>
            <div className="max-h-[min(420px,56vh)] overflow-y-auto no-scrollbar px-4 py-3">
              {SHORTCUT_GROUPS.map((g) => (
                <div key={g.title} className="mb-3 last:mb-0">
                  <p className="px-0.5 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AAAAAA]">
                    {g.title}
                  </p>
                  <div className="hairline overflow-hidden rounded-[14px] bg-white dark:bg-white/[0.04]">
                    {g.rows.map((r, i) => (
                      <div
                        key={r.label}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2.5",
                          i > 0 && "border-t border-[#1D1D1F]/[0.05] dark:border-white/[0.06]"
                        )}
                      >
                        <span className="text-[13.5px] font-medium tracking-[-0.01em] text-[#1D1D1F] dark:text-white">
                          {r.label}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {r.keys.map((k) => (
                            <kbd
                              key={k}
                              className="min-w-[22px] rounded-[6px] border border-[#1D1D1F]/[0.08] bg-[#F5F5F7] px-1.5 py-1 text-center text-[11px] font-bold text-[#1D1D1F] shadow-[0_1px_0_rgba(29,29,31,0.08)] dark:border-white/12 dark:bg-white/10 dark:text-white"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex h-[40px] items-center justify-center border-t border-[#1D1D1F]/[0.07] dark:border-white/10">
              <p className="text-[11px] font-medium text-[#AAAAAA]">
                Press <span className="font-bold text-[#8A8A8E] dark:text-[#C7C7CC]">?</span> anytime to see this guide
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */

function PaletteRow({
  cmd,
  tint,
  active,
  index,
  onHover,
  onRun,
}: {
  cmd: PaletteCommand;
  tint: string;
  active: boolean;
  index: number;
  onHover: (i: number) => void;
  onRun: (cmd: PaletteCommand) => void;
}) {
  const Icon = cmd.icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-active={active}
      // keep the input focused so arrow keys keep working
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => onHover(index)}
      onClick={() => onRun(cmd)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors",
        active ? "bg-[#007AFF]" : "hover:bg-[#1D1D1F]/[0.04] dark:hover:bg-white/[0.06]"
      )}
    >
      <span
        aria-hidden
        className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]")}
        style={active ? { background: "rgba(255,255,255,0.22)", color: "#fff" } : { background: `${tint}1A`, color: tint }}
      >
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[14px] font-semibold tracking-[-0.01em]", active ? "text-white" : "text-[#1D1D1F] dark:text-white")}>
          {cmd.title}
        </span>
        {cmd.subtitle ? (
          <span className={cn("block truncate text-[11.5px] font-medium", active ? "text-white/75" : "text-[#AAAAAA]")}>
            {cmd.subtitle}
          </span>
        ) : null}
      </span>
      {cmd.kbd ? (
        <kbd
          className={cn(
            "shrink-0 rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-white/20 text-white/85" : "bg-[#1D1D1F]/[0.06] text-[#8A8A8E] dark:bg-white/10 dark:text-[#C7C7CC]"
          )}
        >
          {cmd.kbd}
        </kbd>
      ) : null}
    </button>
  );
}
