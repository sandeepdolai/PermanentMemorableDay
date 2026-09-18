"use client";

import { motion } from "framer-motion";
import { Compass, Home, Images, Plus, User } from "lucide-react";
import { useMD, type Tab } from "./md-context";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "create", label: "Create", icon: Plus },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "profile", label: "Profile", icon: User },
];

/**
 * Floating pill bottom navigation (reference UI / PRD §48.1.1).
 * Active item gets a System Blue capsule with white icon + label.
 */
export function BottomNav() {
  const { tab, setTab } = useMD();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[max(18px,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#1D1D1F]/[0.07] bg-white/80 px-2 py-1.5 float-shadow"
        style={{ WebkitBackdropFilter: "blur(28px) saturate(1.8)", backdropFilter: "blur(28px) saturate(1.8)" }}
      >
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative flex h-12 min-w-[62px] flex-col items-center justify-center gap-[3px] rounded-full px-3 outline-none",
                "focus-visible:ring-2 focus-visible:ring-[#007AFF]/40"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-[#007AFF] pill-shadow"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                size={active ? 20 : 21}
                strokeWidth={active ? 2.4 : 2}
                className={cn("relative z-10 transition-colors", active ? "text-white" : "text-[#AAAAAA]")}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-semibold leading-none tracking-[-0.01em] transition-colors",
                  active ? "text-white" : "text-[#AAAAAA]"
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
