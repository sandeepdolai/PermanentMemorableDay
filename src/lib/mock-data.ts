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
  { id: "personal", name: "Personal", price: "$9", period: "/month", note: "Every moment · 3D · AI credits", recommended: true },
  { id: "pro", name: "Pro", price: "$19", period: "/month", note: "Everything in Personal + premium 3D packs" },
  { id: "business", name: "Business", price: "$49", period: "/month", note: "Teams, automation & analytics" },
];

export const SEARCH_SUGGESTIONS: Array<{ label: string; hint: string }> = [
  { label: "Gift box reveal", hint: "Interactive scene" },
  { label: "Countdown reveal", hint: "Interaction" },
  { label: "Golden hour", hint: "Aesthetic" },
  { label: "Neon", hint: "Aesthetic" },
  { label: "Minimal", hint: "Aesthetic" },
  { label: "AI Creator", hint: "Generate an experience" },
];

/* ------------------------------------------------------------------ */
/* Notifications (activity feed — abstract, no themed content)         */
/* ------------------------------------------------------------------ */

export type NotificationKind = "opened" | "loved" | "milestone" | "reminder" | "credits" | "sent";

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

/* ------------------------------------------------------------------ */
/* Insights / analytics (PRD §analytics funnel — abstract UI data)      */
/* ------------------------------------------------------------------ */

export type InsightRange = "7d" | "30d" | "90d";

export interface InsightSnapshot {
  /** Funnel stage labels + counts (delivery → engagement → completion → action → outcome) */
  funnel: Array<{ stage: string; value: number; note: string }>;
  /** Headline KPIs with deltas */
  kpis: Array<{ label: string; value: string; delta: string; up: boolean }>;
  /** Opens per day for the trend chart */
  trend: Array<{ d: string; v: number }>;
  /** % of openers still present at each scene position */
  sceneRetention: Array<{ scene: number; pct: number }>;
  /** Best performing moments in the range */
  top: Array<{ id: string; title: string; cover: number; views: number; completion: number; recipient: string }>;
  /** Derived, cross-range note shown in the AI insight card */
  aiNote: string;
}

export const INSIGHTS: Record<InsightRange, InsightSnapshot> = {
  "7d": {
    funnel: [
      { stage: "Delivered", value: 148, note: "links sent" },
      { stage: "Opened", value: 129, note: "87% open rate" },
      { stage: "Completed", value: 111, note: "86% finish all scenes" },
      { stage: "Acted", value: 52, note: "CTA taps & reward claims" },
      { stage: "Shared", value: 26, note: "forwarded or re-sent" },
    ],
    kpis: [
      { label: "Open rate", value: "87%", delta: "+6", up: true },
      { label: "Completion", value: "86%", delta: "+3", up: true },
      { label: "Avg time", value: "2:41", delta: "+12s", up: true },
      { label: "Loves", value: "34", delta: "+8", up: true },
    ],
    trend: [
      { d: "Mon", v: 14 }, { d: "Tue", v: 19 }, { d: "Wed", v: 24 }, { d: "Thu", v: 17 },
      { d: "Fri", v: 22 }, { d: "Sat", v: 28 }, { d: "Sun", v: 26 },
    ],
    sceneRetention: [
      { scene: 1, pct: 100 }, { scene: 2, pct: 94 }, { scene: 3, pct: 88 },
      { scene: 4, pct: 81 }, { scene: 5, pct: 74 },
    ],
    top: [
      { id: "m4", title: "Neon District", cover: 6, views: 67, completion: 91, recipient: "Alex" },
      { id: "m1", title: "Golden Hour", cover: 1, views: 42, completion: 88, recipient: "Maya" },
      { id: "m7", title: "Static Dreams", cover: 8, views: 29, completion: 76, recipient: "Kabir" },
    ],
    aiNote: "Moments sent mid-week get ~23% more opens. Scene 4 is your soft spot — try a reveal block there to hold attention.",
  },
  "30d": {
    funnel: [
      { stage: "Delivered", value: 612, note: "links sent" },
      { stage: "Opened", value: 516, note: "84% open rate" },
      { stage: "Completed", value: 421, note: "82% finish all scenes" },
      { stage: "Acted", value: 198, note: "CTA taps & reward claims" },
      { stage: "Shared", value: 91, note: "forwarded or re-sent" },
    ],
    kpis: [
      { label: "Open rate", value: "84%", delta: "+4", up: true },
      { label: "Completion", value: "82%", delta: "-2", up: false },
      { label: "Avg time", value: "2:33", delta: "+9s", up: true },
      { label: "Loves", value: "117", delta: "+31", up: true },
    ],
    trend: [
      { d: "W1", v: 96 }, { d: "W2", v: 124 }, { d: "W3", v: 111 },
      { d: "W4", v: 138 }, { d: "Now", v: 147 },
    ],
    sceneRetention: [
      { scene: 1, pct: 100 }, { scene: 2, pct: 92 }, { scene: 3, pct: 85 },
      { scene: 4, pct: 76 }, { scene: 5, pct: 68 },
    ],
    top: [
      { id: "m4", title: "Neon District", cover: 6, views: 67, completion: 91, recipient: "Alex" },
      { id: "m5", title: "First Light", cover: 7, views: 12, completion: 100, recipient: "Sara" },
      { id: "m1", title: "Golden Hour", cover: 1, views: 42, completion: 88, recipient: "Maya" },
    ],
    aiNote: "Longer experiences (5+ scenes) complete 9% more often when a gift or reward appears in the middle — not the end.",
  },
  "90d": {
    funnel: [
      { stage: "Delivered", value: 1738, note: "links sent" },
      { stage: "Opened", value: 1401, note: "81% open rate" },
      { stage: "Completed", value: 1096, note: "78% finish all scenes" },
      { stage: "Acted", value: 502, note: "CTA taps & reward claims" },
      { stage: "Shared", value: 214, note: "forwarded or re-sent" },
    ],
    kpis: [
      { label: "Open rate", value: "81%", delta: "+7", up: true },
      { label: "Completion", value: "78%", delta: "+5", up: true },
      { label: "Avg time", value: "2:47", delta: "+18s", up: true },
      { label: "Loves", value: "322", delta: "+96", up: true },
    ],
    trend: [
      { d: "Jun", v: 312 }, { d: "Jul", v: 389 }, { d: "Aug", v: 464 },
      { d: "Sep", v: 528 }, { d: "Oct", v: 445 },
    ],
    sceneRetention: [
      { scene: 1, pct: 100 }, { scene: 2, pct: 91 }, { scene: 3, pct: 83 },
      { scene: 4, pct: 72 }, { scene: 5, pct: 63 },
    ],
    top: [
      { id: "m1", title: "Golden Hour", cover: 1, views: 42, completion: 88, recipient: "Maya" },
      { id: "m7", title: "Static Dreams", cover: 8, views: 29, completion: 76, recipient: "Kabir" },
      { id: "m4", title: "Neon District", cover: 6, views: 67, completion: 91, recipient: "Alex" },
    ],
    aiNote: "Your completion rate climbs every month. Recipients who replay a moment are 3× more likely to create one back.",
  },
};

/* ------------------------------------------------------------------ */
/* Soundtrack library (PRD audio system — abstract tracks, UI only)    */
/* ------------------------------------------------------------------ */

export interface Soundtrack {
  id: string;
  title: string;
  artist: string;
  /** seconds */
  duration: number;
  bpm: number;
  mood: string;
  /** vibe gradient endpoints */
  vibe: string;
  vibe2: string;
}

export const SOUNDTRACKS: Soundtrack[] = [
  { id: "t1", title: "Slow Orbit", artist: "Auralux", duration: 154, bpm: 72, mood: "Calm", vibe: "#007AFF", vibe2: "#64D2FF" },
  { id: "t2", title: "Paper Skies", artist: "Mono Studio", duration: 132, bpm: 84, mood: "Dreamy", vibe: "#5E5CE6", vibe2: "#B4A7FF" },
  { id: "t3", title: "Neon Rainfall", artist: "Grid Nine", duration: 141, bpm: 96, mood: "Bold", vibe: "#FF375F", vibe2: "#FF9F0A" },
  { id: "t4", title: "First Light", artist: "Softserve", duration: 168, bpm: 64, mood: "Warm", vibe: "#FF9F0A", vibe2: "#FFD60A" },
  { id: "t5", title: "Glasswork", artist: "Lightfield", duration: 122, bpm: 90, mood: "Fresh", vibe: "#30D158", vibe2: "#64D2FF" },
  { id: "t6", title: "Low Tide", artist: "Mono Studio", duration: 187, bpm: 58, mood: "Calm", vibe: "#007AFF", vibe2: "#5E5CE6" },
  { id: "t7", title: "Static Bloom", artist: "Paperlab", duration: 138, bpm: 104, mood: "Bold", vibe: "#FF375F", vibe2: "#5E5CE6" },
  { id: "t8", title: "Quiet Machine", artist: "Auralux", duration: 149, bpm: 78, mood: "Minimal", vibe: "#8E8E93", vibe2: "#C7C7CC" },
];

/** mm:ss */
export function formatDuration(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* AI message composer (PRD AI system — tones + 3 options, abstract)    */
/* ------------------------------------------------------------------ */

export const AI_TONES: Array<{ id: string; label: string; icon: string }> = [
  { id: "heartfelt", label: "Heartfelt", icon: "heart" },
  { id: "playful", label: "Playful", icon: "smile" },
  { id: "poetic", label: "Poetic", icon: "feather" },
  { id: "minimal", label: "Minimal", icon: "minus" },
  { id: "bold", label: "Bold", icon: "zap" },
];

/** Three deterministic message options per tone — abstract, no themed content */
export const AI_MESSAGE_OPTIONS: Record<string, [string, string, string]> = {
  heartfelt: [
    "Some things are easier to show than to say — so I built this instead. Every scene is a small thank you, and every pause is meant for you.",
    "I kept this short because the important part isn't the words. It's that I thought of you first when it was time to make something worth opening.",
    "If a moment could wrap itself around you quietly, it would look like this. No noise, no rush — just a reminder that you matter, from the first scene to the last.",
  ],
  playful: [
    "Warning: this experience contains moderate levels of joy, at least one surprise, and absolutely no boring parts. Scroll responsibly.",
    "I made you a thing. It has scenes. It has buttons. One of them might even do something. Okay — go tap stuff.",
    "Officially classified as 'a whole vibe.' Side effects may include smiling, replaying, and sending one back. You've been warned.",
  ],
  poetic: [
    "Light leans in through every scene — the way attention leans toward what it loves. What follows is less a message, more a held breath.",
    "Between one scene and the next there is a silence shaped like you. I filled it the only way I know: slowly, and on purpose.",
    "This is what a small hour looks like when you press it flat and keep it. Fold it open whenever the day needs a softer edge.",
  ],
  minimal: [
    "Three things: I made this, it's for you, and it's short on purpose. That's the whole message.",
    "No long intro. No big finish. Just a few quiet scenes and one clear thought — you were worth making this for.",
    "Less, but better. A handful of moments, arranged with care. The rest is up to the pauses.",
  ],
  bold: [
    "Most messages get read. This one gets remembered. Big type, zero apologies — exactly the way this moment deserves to land.",
    "I didn't make something subtle. I made something that walks into the room, turns the lights up, and says your name out loud.",
    "Skip the small talk — this starts loud and stays honest. Every scene commits. So did I.",
  ],
};
