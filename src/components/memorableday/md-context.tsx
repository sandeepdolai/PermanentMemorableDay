"use client";

import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { AppNotification, ExploreItem, InsightRange, MomentStatus } from "@/lib/mock-data";
import type { ClientMoment, SendMomentPayload } from "@/lib/md-types";

export type Tab = "home" | "create" | "explore" | "gallery" | "profile";
export type ThemeMode = "light" | "dark" | "system";
export type Sheet =
  | "create"
  | "pricing"
  | "notifications"
  | "share"
  | "settings"
  | "explore"
  | "insights"
  | "stats"
  | "composer"
  | "auth"
  | null;
export type SettingsTopic = "account" | "notifications" | "privacy" | "help";
export type AuthMode = "signin" | "signup";

/** Payload for the recipient experience player */
export interface PlayerPayload {
  id: string;
  title: string;
  cover: number;
  dedication: string;
  /** Optional soundtrack to surface in the player ("Now playing" chip) */
  trackId?: string;
}

/** Payload for the share sheet */
export interface SharePayload {
  id: string;
  title: string;
  /** Real server-assigned share slug (falls back to the deterministic one) */
  slug?: string;
}

/** Payload for the per-moment stats sheet */
export interface StatsPayload {
  id: string;
  title: string;
  cover: number;
  recipient: string;
  date: string;
  status: MomentStatus;
  views: number;
  completion: string;
  scenes: number;
  /** Real tracked love count (server) — falls back to the generated estimate */
  loves?: number;
}

/** A moment draft saved by the user from the builder (persisted in localStorage) */
export interface UserDraft {
  id: string;
  title: string;
  /** Cover-art palette index (0–9) */
  cover: number;
  scenes: number;
  blocks: number;
  editedAt: string;
}

/** Options when opening the Experience Builder */
export interface BuilderOptions {
  /** Draft title (defaults to "Untitled Experience") */
  title?: string;
  /** Cover variant for scene art */
  cover?: number;
  /** Draft id — lets "Save Draft" update an existing draft instead of duplicating */
  draftId?: string;
  /** Pre-seeded scene count */
  scenes?: number;
  /** AI-assisted start (pre-sketches scenes, shows the AI badge) */
  ai?: boolean;
  /** Seed a first block of this type */
  initialBlock?: string;
  /** Seed an AI-composed message into Scene 1 as a text block */
  seedText?: string;
}

/** Optional action button rendered inside a toast (e.g. "Undo") */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Inserts a composed AI message into the open builder's current scene */
export type AiInsertFn = (message: string) => void;

export interface MDContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  query: string;
  setQuery: (q: string) => void;
  submitSearch: (q?: string) => void;
  notify: (message: string, action?: ToastAction) => void;
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
  /** Live notification feed (seeded from mock data, session state) */
  notifications: AppNotification[];
  /** Dismisses one notification — returns it so callers can offer Undo */
  dismissNotification: (id: string) => AppNotification | null;
  /** Re-inserts a dismissed notification (Undo) */
  insertNotification: (n: AppNotification) => void;
  /** Marks a single notification read (fires when it's opened) */
  markNotificationRead: (id: string) => void;
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
  /** Opens the insights/analytics sheet (optionally at a range) */
  openInsights: (range?: InsightRange) => void;
  /** Opens the AI message composer sheet */
  openComposer: () => void;
  /** Builder-registered handler that inserts an AI message into the open draft (event, not effect) */
  aiInsertRef: RefObject<AiInsertFn | null>;
  /** Inserts an AI-composed message: into the open builder, or opens one seeded with it */
  insertAiMessage: (message: string) => void;
  /** Opens the sign-in / create-account sheet */
  openAuth: (mode?: AuthMode) => void;
  /** First-run welcome tour visibility */
  tourOpen: boolean;
  /** Re-opens the welcome tour (Help → guide, Profile) */
  openTour: () => void;
  /** Dismisses the tour and marks it seen */
  closeTour: () => void;
  /** Ids of templates saved to the user's collection (Explore → Saved) */
  savedIds: string[];
  /** Toggles a template in the saved collection (persisted in localStorage) */
  toggleSaved: (id: string) => void;
  /** Selected appearance mode (persisted in localStorage, "system" follows the OS) */
  theme: ThemeMode;
  /** Sets the appearance mode */
  setTheme: (mode: ThemeMode) => void;
  /** Full moment collection — server-synced via /api/md (seeds + user moments) */
  moments: ClientMoment[];
  /** True once the bootstrap fetch has settled (views gate skeletons on it) */
  ready: boolean;
  /** Drafts the user saved from the builder (derived from `moments`, server-persisted) */
  drafts: UserDraft[];
  /** Creates or updates a draft (deduped by id, newest first, persisted) */
  saveDraft: (draft: UserDraft) => void;
  /** Deletes a draft — returns the removed draft so callers can offer Undo */
  deleteDraft: (id: string) => UserDraft | null;
  /** Renames a draft in place (persisted) */
  renameDraft: (id: string, title: string) => void;
  /** Duplicates a draft — returns the copy (or null if the original vanished) */
  duplicateDraft: (id: string) => UserDraft | null;
  /** Ids of archived moments (derived from `moments`) */
  archivedIds: string[];
  /** Archives / unarchives a moment (persisted, restores the remembered status) */
  toggleArchived: (id: string) => void;
  /** Sends (or schedules) a moment for real — share link + activity, server-side */
  sendMoment: (payload: SendMomentPayload) => Promise<ClientMoment | null>;
  /** Fires a recipient love reaction (server-tracked) */
  trackLove: (id: string) => void;
  /** Live AI credits balance (server-synced) */
  credits: number;
  /** Spends n AI credits (optimistic + server) — returns false when short */
  spendCredits: (n: number) => boolean;
  /** Opens the per-moment stats sheet */
  openStats: (moment: StatsPayload) => void;
  /** Spotlight-style command palette (⌘K) visibility */
  paletteOpen: boolean;
  /** Opens the command palette */
  openPalette: () => void;
  /** Closes the command palette */
  closePalette: () => void;
}

export const MDContext = createContext<MDContextValue | null>(null);

export function useMD(): MDContextValue {
  const ctx = useContext(MDContext);
  if (!ctx) throw new Error("useMD must be used within MDContext.Provider");
  return ctx;
}
