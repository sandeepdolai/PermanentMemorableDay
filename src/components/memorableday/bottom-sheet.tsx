"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible label when no visual title is shown */
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * iOS-style adaptive sheet —
 * · phone: classic bottom sheet, edge-to-edge, rounded top corners
 * · tablet/desktop (≥ md): iPad-style form sheet — centered, 440px wide,
 *   fully rounded, floating 32px above the bottom edge. Positioned with
 *   left-1/2 + negative margin (NOT translate utilities) so framer-motion's
 *   inline y-transform never fights the centering.
 */
export function BottomSheet({ open, onClose, title, ariaLabel, children }: BottomSheetProps) {
  const controls = useDragControls();

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
            aria-label={ariaLabel ?? title}
            initial={{ y: "102%" }}
            animate={{ y: 0 }}
            exit={{ y: "102%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) onClose();
            }}
            className="absolute inset-x-0 bottom-0 z-[81] flex max-h-[calc(100dvh-72px)] flex-col rounded-t-[32px] border-t border-white/70 bg-white/95 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-12px_rgba(29,29,31,0.3)] md:bottom-8 md:left-1/2 md:right-auto md:ml-[-220px] md:w-[440px] md:max-w-[calc(100%-48px)] md:max-h-[calc(100dvh-120px)] md:rounded-[32px] md:border md:border-[#1D1D1F]/[0.08] md:shadow-[0_48px_110px_-24px_rgba(29,29,31,0.45)]"
            style={{ WebkitBackdropFilter: "blur(30px) saturate(1.8)", backdropFilter: "blur(30px) saturate(1.8)" }}
          >
            {/* Grabber + title — the drag-to-dismiss handle zone */}
            <div
              onPointerDown={(e) => controls.start(e)}
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            >
              <div className="mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-[#1D1D1F]/[0.14]" />
              {title ? (
                <h2 className="px-6 pb-1 pt-3 text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
                  {title}
                </h2>
              ) : (
                <div className="h-2" aria-hidden />
              )}
            </div>

            {/* Scrollable content — capped so tall sheets stay reachable */}
            <div className="md-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
