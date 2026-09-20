"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Compass,
  Crown,
  Home,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  User,
} from "lucide-react";
import { USER } from "@/lib/mock-data";
import { useMD, type Tab } from "./md-context";
import { LogoMark } from "./bits";
import { cn } from "@/lib/utils";

const ITEMS: Array<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  { id: "home", label: "Home", icon: Home },
  { id: "create", label: "Create", icon: Plus },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "profile", label: "Profile", icon: User },
];

/**
 * iPad/macOS-style sidebar navigation — visible from the `md` breakpoint up.
 * Liquid-glass rail over the ambient background; the floating pill bottom nav
 * takes over below `md`. All overlays (sheets, builder, player, palette) live
 * in the content area beside it, so the rail stays reachable — like iPadOS.
 *
 * The rail collapses to an icon strip (macOS pattern) — state persists in
 * localStorage "md-rail" and hydrates after paint (SSR-safe).
 *
 * Styling note: every color class here is a BASE utility (no responsive
 * prefixes) because the whole rail is `hidden md:flex` — the dark-mode bridge
 * in globals.css already covers base utilities, so dark mode needs no extra
 * rules for this component.
 */
export function SideNav({
  unreadCount,
  onNotifications,
  onAccount,
  onNewMoment,
  onPalette,
}: {
  unreadCount: number;
  onNotifications: () => void;
  onAccount: () => void;
  onNewMoment: () => void;
  onPalette: () => void;
}) {
  const { tab, setTab } = useMD();
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate the persisted collapse state after paint (avoids SSR mismatch).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setCollapsed(window.localStorage.getItem("md-rail") === "collapsed");
      } catch {
        // storage unavailable — stay expanded
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("md-rail", next ? "collapsed" : "expanded");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "glass-panel relative z-50 hidden shrink-0 flex-col border-r border-[#1D1D1F]/[0.06] bg-white/70 pb-4 pt-6 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:flex",
        collapsed ? "w-[76px] px-[14px]" : "w-[248px] px-4 pb-5 xl:w-[264px]"
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "px-2")}>
        <LogoMark size={collapsed ? 40 : 44} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
              MemorableDay
            </p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#AAAAAA]">
              Make every moment
            </p>
          </div>
        )}
      </div>

      {/* ⌘K trigger — Spotlight entry point for pointer users */}
      <button
        type="button"
        onClick={onPalette}
        aria-label="Search and commands (⌘K)"
        title="Search and commands (⌘K)"
        className={cn(
          "mt-5 flex items-center rounded-[12px] text-left transition-all active:scale-[0.97]",
          collapsed
            ? "h-[38px] w-full justify-center"
            : "hairline h-9 w-full gap-2.5 border border-[#1D1D1F]/[0.06] bg-white/80 px-3 hover:bg-white"
        )}
      >
        <Search size={collapsed ? 17 : 14} strokeWidth={2.2} className="shrink-0 text-[#8A8A8E]" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 text-[13px] font-medium text-[#8A8A8E]">Search & commands</span>
            <kbd className="rounded-[5px] bg-[#1D1D1F]/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-[#8A8A8E]">⌘K</kbd>
          </>
        )}
      </button>

      {/* Primary action — mirrors the Create tab, one tap from anywhere */}
      <button
        type="button"
        onClick={onNewMoment}
        aria-label="New moment"
        title="New moment"
        className={cn(
          "mt-3 flex items-center justify-center gap-2 rounded-full bg-[#007AFF] text-white pill-shadow transition-all active:scale-[0.97]",
          collapsed ? "h-[42px] w-[42px]" : "py-[11px] text-[14.5px] font-semibold"
        )}
      >
        <Plus size={17} strokeWidth={2.6} aria-hidden />
        {!collapsed && <span>New moment</span>}
      </button>

      {/* Navigation */}
      {!collapsed && (
        <p className="mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.09em] text-[#AAAAAA]">Menu</p>
      )}
      {collapsed && <div className="mt-6 h-[9px]" aria-hidden />}
      <nav
        aria-label="Primary"
        className={cn("mt-2 flex flex-col gap-1", collapsed && "gap-1.5")}
      >
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              title={item.label}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex items-center rounded-[12px] text-left outline-none transition-colors",
                collapsed ? "h-[38px] justify-center" : "gap-3 px-3 py-[9px]",
                active ? "text-[#007AFF]" : "text-[#1D1D1F]/75 hover:bg-[#1D1D1F]/[0.04] hover:text-[#1D1D1F]"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidenav-active"
                  className="absolute inset-0 rounded-[12px] bg-[#007AFF]/[0.12]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon
                size={collapsed ? 19 : 19}
                strokeWidth={active ? 2.5 : 2.1}
                className="relative z-10 shrink-0"
                aria-hidden
              />
              {!collapsed && (
                <span
                  className={cn(
                    "relative z-10 text-[14.5px] tracking-[-0.01em]",
                    active ? "font-bold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* Collapse toggle (macOS-style rail collapse) */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center rounded-[10px] text-[#8A8A8E] transition-colors hover:bg-[#1D1D1F]/[0.05] hover:text-[#1D1D1F] active:scale-95",
            collapsed ? "h-[34px] w-full justify-center" : "h-[30px] gap-2 px-2.5"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={2.1} aria-hidden />
          ) : (
            <>
              <PanelLeftClose size={15} strokeWidth={2.1} aria-hidden />
              <span className="text-[11.5px] font-semibold tracking-[-0.01em]">Collapse</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button
          type="button"
          onClick={onNotifications}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          title="Notifications"
          className={cn(
            "hairline card-shadow flex items-center rounded-[14px] bg-white text-left transition-transform active:scale-[0.97]",
            collapsed ? "h-[46px] w-full justify-center" : "gap-3 px-3 py-2.5"
          )}
        >
          <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#FF375F]/[0.1] text-[#FF375F]">
            <Bell size={15} strokeWidth={2.2} aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#FF375F] px-[3px] text-[9px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                Notifications
              </span>
              <span className="block text-[11px] font-medium text-[#AAAAAA]">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </span>
            </span>
          )}
        </button>

        {/* Account */}
        <button
          type="button"
          onClick={onAccount}
          aria-label="Open account settings"
          title={USER.name}
          className={cn(
            "hairline card-shadow flex items-center rounded-[14px] bg-white text-left transition-transform active:scale-[0.97]",
            collapsed ? "h-[46px] w-full justify-center" : "gap-3 px-3 py-2.5"
          )}
        >
          <span
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13.5px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(0,122,255,0.55)]"
            style={{ background: "linear-gradient(135deg, #007AFF 0%, #40B4FF 60%, #64D2FF 100%)" }}
          >
            {USER.initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
                {USER.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#007AFF]">
                <Crown size={10} aria-hidden /> {USER.plan}
              </span>
            </span>
          )}
          {!collapsed && <ChevronRight size={15} className="shrink-0 text-[#C7C7CC]" aria-hidden />}
        </button>
      </div>
    </aside>
  );
}
