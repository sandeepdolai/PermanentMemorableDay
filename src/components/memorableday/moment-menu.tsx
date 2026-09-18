"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Client-only mount flag (SSR-safe, no setState-in-effect) */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/* ------------------------------------------------------------------ */
/* iOS-style anchored popover menu (iPadOS pull-down look)             */
/* ------------------------------------------------------------------ */

export interface MomentMenuAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Icon-circle tint (iOS system color) */
  tint?: string;
  /** Destructive rows render in red */
  destructive?: boolean;
  /** Renders as a thin hairline divider instead of a row */
  separator?: boolean;
  onSelect?: () => void;
}

const MENU_W = 232;
const ROW_H = 44;

/**
 * Floating action menu anchored to a trigger button. Renders through a portal
 * (cards are overflow-hidden, so the menu must live at the page level),
 * clamps to the viewport, and flips above the anchor when space is tight.
 */
export function MomentMenu({
  anchor,
  actions,
  onClose,
}: {
  /** Element the menu should hang from (usually the ellipsis button) */
  anchor: HTMLElement | null;
  actions: MomentMenuAction[];
  onClose: () => void;
}) {
  const mounted = useMounted();
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  // Position from the anchor's live rect (re-measured on open + resize)
  useEffect(() => {
    if (!anchor) return;
    const measure = () => {
      const r = anchor.getBoundingClientRect();
      const menuH = actions.length * ROW_H + 12;
      const pad = 10;
      const up = r.bottom + menuH + pad > window.innerHeight && r.top - menuH - pad > 0;
      const left = Math.min(Math.max(r.right - MENU_W, pad), window.innerWidth - MENU_W - pad);
      const top = up ? r.top - menuH - 8 : r.bottom + 8;
      setPos({ top, left, up });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchor, actions.length]);

  // Escape closes the menu before any other layer reacts (capture + stop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!mounted || !anchor) return null;

  return createPortal(
    <div
      aria-modal="true"
      onMouseDown={(e) => {
        // Scrim press closes (mouse only — clicks inside the panel stop below)
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110]"
    >
      {/* Panel — measured, clamped, spring-originated from the anchor */}
      <AnimatePresence>
        {pos ? (
          <motion.nav
            key="menu"
            role="menu"
            aria-label="Moment actions"
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 640, damping: 32 }}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: MENU_W,
              transformOrigin: pos.up ? "bottom right" : "top right",
            }}
            className="overflow-hidden rounded-[18px] border border-[#1D1D1F]/[0.08] bg-[#FFFFFF]/[0.92] shadow-[0_24px_60px_-16px_rgba(29,29,31,0.35),0_4px_14px_-4px_rgba(29,29,31,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#2C2C2E]/[0.94]"
          >
            {actions.map((a, i) => {
              if (a.separator) {
                return i > 0 ? (
                  <div key={a.id} role="separator" className="mx-[52px] h-px bg-[#1D1D1F]/[0.08] dark:bg-white/10" />
                ) : null;
              }
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    onClose();
                    a.onSelect?.();
                  }}
                  className={cn(
                    "flex h-[44px] w-full items-center gap-3 px-2.5 text-left transition-colors active:bg-[#1D1D1F]/[0.05] dark:active:bg-white/10",
                    a.destructive ? "text-[#FF375F]" : "text-[#1D1D1F] dark:text-white"
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px]"
                    style={
                      a.tint
                        ? { backgroundColor: `${a.tint}1F`, color: a.tint }
                        : { backgroundColor: "rgba(29,29,31,0.06)" }
                    }
                  >
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                  <span className="flex-1 text-[14.5px] font-semibold tracking-[-0.01em]">{a.label}</span>
                </button>
              );
            })}
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* iOS-style rename alert                                              */
/* ------------------------------------------------------------------ */

/**
 * Centered system alert with a text field (the iOS "Rename" pattern —
 * generalized for any single-field prompt: rename, send-to, …).
 * Enter confirms, Escape cancels, focus + select on open.
 */
export function RenameDialog({
  open,
  initialTitle,
  title = "Rename draft",
  description,
  placeholder,
  confirmLabel = "Rename",
  maxLength = 50,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  initialTitle: string;
  /** Alert heading */
  title?: string;
  /** Optional sub-copy under the heading */
  description?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Character cap (counter appears at 88% of the cap) */
  maxLength?: number;
  /** While true the confirm shows a spinner and cancel is ignored */
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => void;
}) {
  const [value, setValue] = useState(initialTitle);
  const mounted = useMounted();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the field whenever the dialog opens for a new draft
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setValue(initialTitle);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // Autofocus + select after the entrance settles
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape cancels before other layers react (ignored while busy)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!busy) onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onCancel, busy]);

  if (!mounted) return null;

  const trimmed = value.trim();
  const valid = trimmed.length > 0 && trimmed.length <= maxLength;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="rename"
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1D1D1F]/35 px-6 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 560, damping: 30 }}
            className="w-full max-w-[300px] overflow-hidden rounded-[28px] bg-[#FFFFFF]/[0.96] shadow-[0_32px_80px_-20px_rgba(29,29,31,0.5)] backdrop-blur-2xl dark:bg-[#2C2C2E]/[0.96]"
          >
            <div className="px-5 pb-4 pt-5 text-center">
              <p className="text-[15.5px] font-bold tracking-[-0.01em] text-[#1D1D1F] dark:text-white">{title}</p>
              {description ? (
                <p className="mx-auto mt-1 max-w-[240px] text-[12px] font-medium leading-snug text-[#AAAAAA]">{description}</p>
              ) : null}
              <div className="mt-3.5">
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && valid && !busy) {
                      e.preventDefault();
                      onConfirm(trimmed);
                    }
                  }}
                  placeholder={placeholder}
                  aria-label={placeholder ?? "Draft title"}
                  className="w-full rounded-[13px] border-0 bg-[#F5F5F7] px-3.5 py-2.5 text-center text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F] outline-none ring-inset ring-[#1D1D1F]/[0.06] transition-shadow placeholder:text-[#AAAAAA] focus:ring-2 focus:ring-[#007AFF] dark:bg-white/10 dark:text-white dark:ring-white/10"
                />
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-medium tabular-nums",
                    value.length >= maxLength * 0.88 ? "text-[#FF9F0A]" : "text-[#AAAAAA]"
                  )}
                >
                  {value.trim().length}/{maxLength}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-[#1D1D1F]/[0.08] dark:border-white/10">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className={cn(
                  "h-[46px] text-[15.5px] font-medium text-[#007AFF] transition-colors hover:bg-[#1D1D1F]/[0.03] active:bg-[#1D1D1F]/[0.06] dark:hover:bg-white/5",
                  busy && "opacity-40"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!valid || busy}
                onClick={() => onConfirm(trimmed)}
                className={cn(
                  "h-[46px] border-l border-[#1D1D1F]/[0.08] text-[15.5px] font-bold text-[#007AFF] transition-colors dark:border-white/10",
                  valid ? "hover:bg-[#1D1D1F]/[0.03] active:bg-[#1D1D1F]/[0.06] dark:hover:bg-white/5" : "opacity-40"
                )}
              >
                {busy ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                    Sending…
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
