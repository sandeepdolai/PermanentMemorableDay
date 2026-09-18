"use client";

import { motion } from "framer-motion";
import { Bell, ChevronRight, Compass, Crown, Home, Images, Plus, User } from "lucide-react";
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
 * takes over below `md`. All overlays (sheets, builder, player) live in the
 * content area beside it, so the rail stays reachable — just like iPadOS.
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
}: {
  unreadCount: number;
  onNotifications: () => void;
  onAccount: () => void;
  onNewMoment: () => void;
}) {
  const { tab, setTab } = useMD();

  return (
    <aside
      aria-label="Sidebar"
      className="glass-panel relative z-50 hidden w-[248px] shrink-0 flex-col border-r border-[#1D1D1F]/[0.06] bg-white/70 px-4 pb-5 pt-6 md:flex xl:w-[264px]"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-2">
        <LogoMark size={38} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
            MemorableDay
          </p>
          <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#AAAAAA]">
            Make every moment
          </p>
        </div>
      </div>

      {/* Primary action — mirrors the Create tab, one tap from anywhere */}
      <button
        type="button"
        onClick={onNewMoment}
        className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#007AFF] py-[11px] text-[14.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
      >
        <Plus size={17} strokeWidth={2.6} aria-hidden />
        New moment
      </button>

      {/* Navigation */}
      <p className="mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.09em] text-[#AAAAAA]">
        Menu
      </p>
      <nav aria-label="Primary" className="mt-2 flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-[12px] px-3 py-[9px] text-left outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[#007AFF]/40",
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
                size={19}
                strokeWidth={active ? 2.5 : 2.1}
                className="relative z-10 shrink-0"
                aria-hidden
              />
              <span
                className={cn(
                  "relative z-10 text-[14.5px] tracking-[-0.01em]",
                  active ? "font-bold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* Notifications */}
        <button
          type="button"
          onClick={onNotifications}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          className="hairline card-shadow flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 text-left transition-transform active:scale-[0.97]"
        >
          <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#FF375F]/[0.1] text-[#FF375F]">
            <Bell size={15} strokeWidth={2.2} aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#FF375F] px-[3px] text-[9px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              Notifications
            </span>
            <span className="block text-[11px] font-medium text-[#AAAAAA]">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </span>
          </span>
        </button>

        {/* Account */}
        <button
          type="button"
          onClick={onAccount}
          aria-label="Open account settings"
          className="hairline card-shadow flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 text-left transition-transform active:scale-[0.97]"
        >
          <span
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13.5px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(0,122,255,0.55)]"
            style={{ background: "linear-gradient(135deg, #007AFF 0%, #40B4FF 60%, #64D2FF 100%)" }}
          >
            {USER.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
              {USER.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#007AFF]">
              <Crown size={10} aria-hidden /> {USER.plan}
            </span>
          </span>
          <ChevronRight size={15} className="shrink-0 text-[#C7C7CC]" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
