/**
 * MemorableDay — UI/UX preview data.
 * Content is intentionally abstract (art-style titles, neutral recipients).
 * No themed templates are built — this is the app shell UI only.
 */

export type MomentStatus = "draft" | "scheduled" | "sent" | "viewed" | "archived";

export interface Moment {
  id: string;
  title: string;
  recipient: string;
  status: MomentStatus;
  date: string;
  cover: number;
  scenes: number;
  views?: number;
  completion?: string;
  progress?: number;
  tags: string[];
}

export interface ExploreItem {
  id: string;
  title: string;
  creator: string;
  cover: number;
  views: number;
  likes: number;
  segments: Array<"trending" | "new" | "picks">;
  tags: string[];
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  note: string;
  recommended?: boolean;
}

export const USER = {
  name: "Sandeep Dolai",
  email: "sandeep@memorableday.in",
  initials: "SD",
  plan: "Free",
  credits: 240,
  stats: {
    created: 12,
    sent: 9,
    openRate: "87%",
    loves: 34,
  },
};

export const MOMENTS: Moment[] = [
  {
    id: "m1",
    title: "Golden Hour",
    recipient: "Maya",
    status: "sent",
    date: "Sent Oct 12",
    cover: 1,
    scenes: 5,
    views: 42,
    completion: "88%",
    tags: ["warm", "sunset", "calm"],
  },
  {
    id: "m2",
    title: "Midnight Sky",
    recipient: "Aarav",
    status: "draft",
    date: "Edited 2h ago",
    cover: 5,
    scenes: 4,
    progress: 64,
    tags: ["night", "stars", "quiet"],
  },
  {
    id: "m3",
    title: "Paper Planes",
    recipient: "Jordan",
    status: "scheduled",
    date: "Oct 24 · 9:00 AM",
    cover: 2,
    scenes: 3,
    tags: ["playful", "light"],
  },
  {
    id: "m4",
    title: "Neon District",
    recipient: "Alex",
    status: "sent",
    date: "Sent Oct 8",
    cover: 6,
    scenes: 6,
    views: 67,
    completion: "91%",
    tags: ["neon", "city", "bold"],
  },
  {
    id: "m5",
    title: "First Light",
    recipient: "Sara",
    status: "viewed",
    date: "Opened 3m ago",
    cover: 7,
    scenes: 3,
    views: 12,
    completion: "100%",
    tags: ["dawn", "soft"],
  },
  {
    id: "m6",
    title: "Ocean Drive",
    recipient: "Riya",
    status: "draft",
    date: "Edited yesterday",
    cover: 3,
    scenes: 5,
    progress: 35,
    tags: ["sea", "breeze"],
  },
  {
    id: "m7",
    title: "Static Dreams",
    recipient: "Kabir",
    status: "sent",
    date: "Sent Oct 2",
    cover: 8,
    scenes: 4,
    views: 29,
    completion: "76%",
    tags: ["retro", "grain"],
  },
  {
    id: "m8",
    title: "Amber Waves",
    recipient: "Noah",
    status: "archived",
    date: "Archived Sep 28",
    cover: 4,
    scenes: 5,
    tags: ["amber", "flow"],
  },
];

export const EXPLORE_ITEMS: ExploreItem[] = [
  { id: "e1", title: "Velvet Motion", creator: "@mono.studio", cover: 1, views: 12840, likes: 2140, segments: ["trending", "picks"], tags: ["smooth", "bold"] },
  { id: "e2", title: "Chrome Bloom", creator: "@lightfield", cover: 9, views: 9310, likes: 1810, segments: ["trending"], tags: ["metal", "bloom"] },
  { id: "e3", title: "Soft Machine", creator: "@auralux", cover: 3, views: 7420, likes: 1290, segments: ["trending", "new"], tags: ["soft", "minimal"] },
  { id: "e4", title: "Paper Moon", creator: "@paperlab", cover: 4, views: 6890, likes: 980, segments: ["picks"], tags: ["paper", "night"] },
  { id: "e5", title: "Neon Rain", creator: "@gridnine", cover: 6, views: 5980, likes: 1120, segments: ["trending", "new"], tags: ["neon", "city"] },
  { id: "e6", title: "Low Orbit", creator: "@auralux", cover: 5, views: 5410, likes: 870, segments: ["new"], tags: ["space", "calm"] },
  { id: "e7", title: "Glass Garden", creator: "@softserve", cover: 2, views: 5120, likes: 1040, segments: ["picks", "new"], tags: ["glass", "fresh"] },
  { id: "e8", title: "Sun Machine", creator: "@lightfield", cover: 4, views: 4870, likes: 760, segments: ["trending"], tags: ["sun", "warm"] },
  { id: "e9", title: "Slow Tide", creator: "@mono.studio", cover: 3, views: 4210, likes: 690, segments: ["picks"], tags: ["sea", "calm"] },
  { id: "e10", title: "Midnight Parade", creator: "@gridnine", cover: 8, views: 3860, likes: 720, segments: ["new"], tags: ["night", "bold"] },
  { id: "e11", title: "Aurora Kids", creator: "@softserve", cover: 7, views: 3540, likes: 640, segments: ["picks", "new"], tags: ["aurora", "light"] },
  { id: "e12", title: "Static Bloom", creator: "@paperlab", cover: 0, views: 3120, likes: 580, segments: ["trending", "picks"], tags: ["retro", "grain"] },
];

export const PRICING_PLANS: Plan[] = [
  { id: "free", name: "Starter", price: "$0", period: "forever", note: "3 moments / month" },
  { id: "personal", name: "Personal", price: "$9", period: "/month", note: "Unlimited moments · 3D · AI credits", recommended: true },
  { id: "pro", name: "Pro", price: "$19", period: "/month", note: "Everything in Personal + premium 3D packs" },
  { id: "business", name: "Business", price: "$49", period: "/month", note: "Teams, automation & analytics" },
];

export const SEARCH_SUGGESTIONS: Array<{ label: string; hint: string }> = [
  { label: "3D gift box", hint: "Interactive scene" },
  { label: "Countdown reveal", hint: "Interaction" },
  { label: "Golden hour", hint: "Aesthetic" },
  { label: "Neon", hint: "Aesthetic" },
  { label: "Minimal", hint: "Aesthetic" },
  { label: "AI Creator", hint: "Generate an experience" },
];

/* ------------------------------------------------------------------ */
/* Notifications (activity feed — abstract, no themed content)         */
/* ------------------------------------------------------------------ */

export type NotificationKind = "opened" | "loved" | "milestone" | "reminder" | "credits";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  group: "today" | "earlier";
  unread: boolean;
  /** Moment reference — tapping the notification opens the player */
  moment?: { id: string; title: string; cover: number; dedication: string };
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    kind: "opened",
    title: "Maya opened your moment",
    body: "“Golden Hour” was just opened and finished",
    time: "2m",
    group: "today",
    unread: true,
    moment: { id: "m1", title: "Golden Hour", cover: 1, dedication: "For Maya" },
  },
  {
    id: "n2",
    kind: "loved",
    title: "Alex loved “Neon District”",
    body: "Your moment received a new love reaction",
    time: "18m",
    group: "today",
    unread: true,
    moment: { id: "m4", title: "Neon District", cover: 6, dedication: "For Alex" },
  },
  {
    id: "n3",
    kind: "milestone",
    title: "“First Light” was completed",
    body: "Sara finished every scene — 100% completion",
    time: "1h",
    group: "today",
    unread: true,
    moment: { id: "m5", title: "First Light", cover: 7, dedication: "For Sara" },
  },
  {
    id: "n4",
    kind: "reminder",
    title: "“Paper Planes” sends tomorrow",
    body: "Scheduled for Oct 24 · 9:00 AM — review it before it goes",
    time: "3h",
    group: "today",
    unread: true,
    moment: { id: "m3", title: "Paper Planes", cover: 2, dedication: "For Jordan" },
  },
  {
    id: "n5",
    kind: "credits",
    title: "AI credits refilled",
    body: "Your monthly 240 credits are ready to use",
    time: "1d",
    group: "earlier",
    unread: false,
  },
  {
    id: "n6",
    kind: "milestone",
    title: "“Static Dreams” passed 25 views",
    body: "Recipients keep coming back to it",
    time: "2d",
    group: "earlier",
    unread: false,
    moment: { id: "m7", title: "Static Dreams", cover: 8, dedication: "For Kabir" },
  },
  {
    id: "n7",
    kind: "loved",
    title: "3 new loves this week",
    body: "People loved your recent moments",
    time: "4d",
    group: "earlier",
    unread: false,
  },
];

/** Deterministic share slug for the QR/link preview (8 chars, non-guessable per PRD §sharing) */
export function shareSlug(id: string): string {
  const seed = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7);
  return seed.toString(36).padStart(4, "0").slice(0, 4) + "K" + seed.toString(36).slice(-3);
}

export const SHARE_URL_BASE = "memorableday.in/e/";
