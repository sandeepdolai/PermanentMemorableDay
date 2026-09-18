"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** iOS-style bottom sheet with grabber + drag-to-dismiss + Escape */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // Escape to close (sheet sits above the player, so it owns the Escape key while open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close sheet"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 z-[80] cursor-default bg-[#1D1D1F]/[0.35]"
            style={{ WebkitBackdropFilter: "blur(3px)", backdropFilter: "blur(3px)" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "102%" }}
            animate={{ y: 0 }}
            exit={{ y: "102%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) onClose();
            }}
            className="absolute inset-x-0 bottom-0 z-[81] rounded-t-[32px] border-t border-white/70 bg-white/95 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-12px_rgba(29,29,31,0.3)]"
            style={{ WebkitBackdropFilter: "blur(30px) saturate(1.8)", backdropFilter: "blur(30px) saturate(1.8)" }}
          >
            <div className="mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-[#1D1D1F]/[0.14]" />
            {title ? (
              <h2 className="px-6 pb-1 pt-3 text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
                {title}
              </h2>
            ) : null}
            <div className="px-5 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
