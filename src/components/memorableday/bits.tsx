import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MomentStatus } from "@/lib/mock-data";

/** iOS Large Title */
export function LargeTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        "text-[34px] font-bold leading-[1.06] tracking-[-0.035em] text-[#1D1D1F]",
        className
      )}
    >
      {children}
    </h1>
  );
}

/** Section header with optional trailing action */
export function SectionHeader({
  title,
  sub,
  action,
  onAction,
}: {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
      <div>
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{title}</h2>
        {sub ? <p className="mt-0.5 text-[13px] text-[#AAAAAA]">{sub}</p> : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="text-[14px] font-semibold text-[#007AFF] transition-opacity active:opacity-50"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

const STATUS_STYLES: Record<MomentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#1D1D1F]/[0.06] text-[#1D1D1F]/70" },
  scheduled: { label: "Scheduled", className: "bg-[#FF9F0A]/[0.14] text-[#B26A00]" },
  sent: { label: "Sent", className: "bg-[#007AFF]/[0.12] text-[#007AFF]" },
  viewed: { label: "Opened", className: "bg-[#30D158]/[0.14] text-[#1E9E4A]" },
  archived: { label: "Archived", className: "bg-[#AAAAAA]/[0.18] text-[#8A8A8E]" },
};

export function StatusBadge({ status, className }: { status: MomentStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
        s.className,
        className
      )}
    >
      {s.label}
    </span>
  );
}

/** MemorableDay logo mark — the official brand emblem (public/logo.png).
 *  `unoptimized` ships the exact uploaded PNG bytes — no recompression,
 *  no color reduction, no resizing. The browser downsamples for display. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        unoptimized
        className="h-full w-full select-none object-contain"
        draggable={false}
      />
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#1D1D1F]/[0.12] bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF]/[0.08] text-[#007AFF]">
        {icon}
      </span>
      <p className="text-[16px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{title}</p>
      <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-[#AAAAAA]">{sub}</p>
    </div>
  );
}

/**
 * Animated numeric count-up (iOS-style stat entrance).
 * Accepts values like "87%" or "34" — animates the digits, keeps the suffix.
 * Respects prefers-reduced-motion.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^(\d+)(.*)$/);
  const target = m ? Number(m[1]) : null;
  const suffix = m ? m[2] : "";
  const [n, setN] = useState(0);

  useEffect(() => {
    if (target === null || Number.isNaN(target)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion or zero target → jump straight to the value (async, so SSR-safe)
    if (reduce || target === 0) {
      const jump = requestAnimationFrame(() => setN(target));
      return () => cancelAnimationFrame(jump);
    }

    let raf = 0;
    const DURATION = 850;
    const tick = (t: number, t0: number) => {
      const p = Math.min((t - t0) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(eased * (target ?? 0)));
      if (p < 1) raf = requestAnimationFrame((tt) => tick(tt, t0));
    };
    raf = requestAnimationFrame((t0) => {
      raf = requestAnimationFrame((t) => tick(t, t0));
    });
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (target === null || Number.isNaN(target)) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span className={className} aria-label={value}>
      {n}
      {suffix}
    </span>
  );
}

/** Shimmering skeleton card for loading states (grid preview) */
export function SkeletonCard({ aspect }: { aspect: string }) {
  return (
    <div aria-hidden className="card-shadow hairline overflow-hidden rounded-[22px] bg-white">
      <div className={cn("skeleton w-full", aspect)} />
      <div className="space-y-2.5 p-3">
        <div className="skeleton h-3.5 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
