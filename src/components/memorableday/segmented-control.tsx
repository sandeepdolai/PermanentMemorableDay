"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  id: string;
  className?: string;
}

/** iOS-style segmented control with sliding thumb */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  id,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={id}
      className={cn("flex rounded-full bg-[#1D1D1F]/[0.05] p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-full px-2 py-[7px] text-[13px] font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId={`${id}-thumb`}
                className="absolute inset-0 rounded-full bg-[#FFFFFF] shadow-[0_2px_8px_rgba(29,29,31,0.12),inset_0_1px_0_rgba(255,255,255,1)] dark:bg-[#636366] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.14)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className={cn("relative z-10", active ? "text-[#1D1D1F]" : "text-[#AAAAAA]")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
