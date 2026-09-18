"use client";

import { createContext, useContext } from "react";
import type { ExploreItem } from "@/lib/mock-data";

export type Tab = "home" | "create" | "explore" | "gallery" | "profile";
export type Sheet = "create" | "pricing" | "notifications" | "share" | "settings" | "explore" | null;
export type SettingsTopic = "account" | "notifications" | "privacy" | "help";

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

/** Options when opening the Experience Builder */
export interface BuilderOptions {
  /** Draft title (defaults to "Untitled Experience") */
  title?: string;
  /** Cover variant for scene art */
  cover?: number;
  /** Pre-seeded scene count */
  scenes?: number;
  /** AI-assisted start (pre-sketches scenes, shows the AI badge) */
  ai?: boolean;
  /** Seed a first block of this type */
  initialBlock?: string;
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
  /** Currently open player payload (lets the builder defer Escape) */
  player: PlayerPayload | null;
  closePlayer: () => void;
  /** Opens the share sheet for a moment */
  openShare: (moment: SharePayload) => void;
  /** Number of unread activity notifications (drives the bell badge) */
  unreadCount: number;
  markAllRead: () => void;
  /** Opens the Experience Builder layer */
  openBuilder: (opts?: BuilderOptions) => void;
  /** Currently open builder payload (null = closed) */
  builder: BuilderOptions | null;
  closeBuilder: () => void;
  /** Opens a settings detail sheet */
  openSettings: (topic: SettingsTopic) => void;
  /** Currently open settings topic */
  settingsTopic: SettingsTopic | null;
  /** Opens the explore template preview sheet */
  openExplore: (item: ExploreItem) => void;
  /** Currently previewed explore item */
  exploreItem: ExploreItem | null;
}

export const MDContext = createContext<MDContextValue | null>(null);

export function useMD(): MDContextValue {
  const ctx = useContext(MDContext);
  if (!ctx) throw new Error("useMD must be used within MDContext.Provider");
  return ctx;
}
