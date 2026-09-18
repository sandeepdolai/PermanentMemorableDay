"use client";

import { createContext, useContext } from "react";

export type Tab = "home" | "create" | "explore" | "gallery" | "profile";
export type Sheet = "create" | "pricing" | null;

export interface MDContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  query: string;
  setQuery: (q: string) => void;
  submitSearch: (q?: string) => void;
  notify: (message: string) => void;
  openSheet: (sheet: Exclude<Sheet, null>) => void;
}

export const MDContext = createContext<MDContextValue | null>(null);

export function useMD(): MDContextValue {
  const ctx = useContext(MDContext);
  if (!ctx) throw new Error("useMD must be used within MDContext.Provider");
  return ctx;
}
