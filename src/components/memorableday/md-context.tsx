"use client";

import { createContext, useContext } from "react";

export type Tab = "home" | "create" | "explore" | "gallery" | "profile";
export type Sheet = "create" | "pricing" | "notifications" | "share" | null;

/** Payload for the recipient experience player */
export interface PlayerPayload {
  id: string;
  title: string;
  cover: number;
  dedication: string;
}

/** Payload for the share sheet */
export interface SharePayload {
  id: string;
  title: string;
}

export interface MDContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  query: string;
  setQuery: (q: string) => void;
  submitSearch: (q?: string) => void;
  notify: (message: string) => void;
  openSheet: (sheet: Exclude<Sheet, null>) => void;
  /** Currently open sheet (lets layered UI e.g. the player defer Escape) */
  sheet: Sheet;
  openMoment: (moment: PlayerPayload) => void;
  /** Opens the share sheet for a moment */
  openShare: (moment: SharePayload) => void;
  /** Number of unread activity notifications (drives the bell badge) */
  unreadCount: number;
  markAllRead: () => void;
}

export const MDContext = createContext<MDContextValue | null>(null);

export function useMD(): MDContextValue {
  const ctx = useContext(MDContext);
  if (!ctx) throw new Error("useMD must be used within MDContext.Provider");
  return ctx;
}
