"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronRight, Search, Sparkles, X } from "lucide-react";
import { SEARCH_SUGGESTIONS } from "@/lib/mock-data";
import { useMD } from "./md-context";
import { cn } from "@/lib/utils";

/**
 * Signature "What's the theme?" pill search bar (PRD §48.1.1).
 * White glassy pill + System Blue circular submit button.
 */
export function SearchBar() {
  const { query, setQuery, submitSearch } = useMD();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  // Desktop power-user shortcut: "/" focuses the search pill from anywhere.
  // Skipped while typing in a field or when a dialog/sheet/builder is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing || document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative z-10">
      {/* click-outside backdrop */}
      {open && (
        <button
          aria-label="Close suggestions"
          tabIndex={-1}
          className="fixed inset-0 z-0 cursor-default bg-[#1D1D1F]/[0.08]"
          onClick={close}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          close();
          submitSearch();
        }}
        className="relative z-10"
      >
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-full border border-[#1D1D1F]/[0.06] bg-white/90 py-1.5 pl-4 pr-1.5",
            "shadow-[0_10px_30px_-12px_rgba(29,29,31,0.25),inset_0_1px_0_rgba(255,255,255,1)]",
            "backdrop-blur-xl transition-shadow",
            open && "shadow-[0_18px_44px_-14px_rgba(29,29,31,0.32)]"
          )}
        >
          <Search size={18} strokeWidth={2.2} className="shrink-0 text-[#AAAAAA]" aria-hidden />
          <label htmlFor="theme-search" className="sr-only">
            Search themes
          </label>
          <input
            ref={inputRef}
            id="theme-search"
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="What's the theme?"
            className="min-w-0 flex-1 bg-transparent text-[16px] font-normal tracking-[-0.01em] text-[#1D1D1F] outline-none placeholder:text-[#AAAAAA]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F]/[0.08] text-[#8A8A8E] transition-transform active:scale-90"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          ) : null}
          <button
            type="submit"
            aria-label="Search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white pill-shadow transition-transform active:scale-90"
          >
            <ArrowUp size={17} strokeWidth={2.6} />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-[calc(100%+10px)] z-20 origin-top rounded-[24px] border border-[#1D1D1F]/[0.06] bg-white/95 p-2 shadow-[0_24px_60px_-16px_rgba(29,29,31,0.3)] backdrop-blur-2xl"
          >
            <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
              Try searching
            </p>
            {SEARCH_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  close();
                  submitSearch(s.label);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:bg-[#007AFF]/[0.06]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#007AFF]/[0.1] text-[#007AFF]">
                  {s.hint === "Generate an experience" ? <Sparkles size={15} /> : <Search size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                    {s.label}
                  </span>
                  <span className="block text-[12px] text-[#AAAAAA]">{s.hint}</span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-[#C7C7CC]" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
