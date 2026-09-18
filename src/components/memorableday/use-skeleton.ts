"use client";

import { useEffect, useState } from "react";

/**
 * Brief skeleton loading state whenever `dep` changes (including mount).
 * Simulates a data fetch so the UI shows its loading design language.
 * Uses rAF + timeout (async state updates — lint/hydration safe).
 */
export function useSkeleton(dep: unknown, ms = 340): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      setLoading(true); // re-arm on dep change (no-op on first mount)
      timeout = setTimeout(() => setLoading(false), ms);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
  }, [dep, ms]);

  return loading;
}
