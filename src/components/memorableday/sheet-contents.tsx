"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Award,
  Bell,
  BellOff,
  Send,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  Feather,
  Gift,
  Heart,
  LifeBuoy,
  ListChecks,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  Music,
  PartyPopper,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Ticket,
  TrendingUp,
  Trash2,
  Type,
  User,
  Download,
  Lock,
  FileText,
  ShieldCheck,
  LogOut,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AI_TONES,
  INSIGHTS,
  SHARE_URL_BASE,
  shareSlug,
  type AppNotification,
  type InsightRange,
  type InsightSnapshot,
  type NotificationKind,
  type ExploreItem,
  USER,
} from "@/lib/mock-data";
import { useMD, type AuthMode, type PlayerPayload, type SettingsTopic, type StatsPayload } from "./md-context";
import type { SceneDoc } from "@/lib/md-blocks";
import { CoverArt } from "./cover-art";
import { LogoMark } from "./bits";
import { SegmentedControl } from "./segmented-control";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Notifications sheet                                                 */
/* ------------------------------------------------------------------ */

const KIND_META: Record<NotificationKind, { icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; tint: string; bg: string }> = {
  opened: { icon: Eye, tint: "#007AFF", bg: "rgba(0,122,255,0.10)" },
  loved: { icon: Heart, tint: "#FF375F", bg: "rgba(255,55,95,0.10)" },
  milestone: { icon: TrendingUp, tint: "#30D158", bg: "rgba(48,209,88,0.12)" },
  reminder: { icon: Bell, tint: "#FF9F0A", bg: "rgba(255,159,10,0.12)" },
  credits: { icon: Sparkles, tint: "#64D2FF", bg: "rgba(100,210,255,0.14)" },
  sent: { icon: Send, tint: "#30D158", bg: "rgba(48,209,88,0.12)" },
};

const GROUP_LABELS: Record<AppNotification["group"], string> = {
  today: "Today",
  earlier: "Earlier this week",
};

/**
 * Notification row with iOS-style swipe-to-dismiss (direction-locked:
 * `touch-action: pan-y` keeps the vertical feed scroll native while
 * leftward swipes reveal a delete backdrop). Dismissed rows exit with a
 * slide+fade; Undo re-inserts them. Tapping a row marks it read and opens
 * the referenced moment.
 */
function NotificationRow({
  n,
  onOpenMoment,
}: {
  n: AppNotification;
  onOpenMoment: (m: PlayerPayload) => void;
}) {
  const { dismissNotification, insertNotification, markNotificationRead, notify } = useMD();
  const meta = KIND_META[n.kind];
  const Icon = meta.icon;
  const clickable = Boolean(n.moment);

  /* swipe state */
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: "undecided" | "x" | "y" } | null>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const justSwiped = useRef(false);

  const dismiss = () => {
    const removed = dismissNotification(n.id);
    if (removed) {
      notify("Notification dismissed", {
        label: "Undo",
        onClick: () => insertNotification(removed),
      });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, axis: "undecided" };
    last.current = { x: e.clientX, t: Date.now() };
    // NOTE: pointer capture is deliberately NOT taken here. Capturing on
    // pointer-down retargets pointer-up to this row, which retargets the
    // synthesized click to the row too — the dismiss button then never
    // receives clicks (taps dismissed nothing / opened the moment instead).
    // Capture is taken only once a horizontal swipe is locked below.
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.axis === "undecided") {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        s.axis = "x";
        setDragging(true);
        // Swipe intent locked — NOW capture so the gesture keeps tracking
        // even if the pointer leaves the row (taps stay native above).
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // capture can fail for non-active pointer ids — bubbling continues
        }
      } else if (Math.abs(dy) > 12) {
        s.axis = "y"; // vertical — native scroll takes over
      }
    }
    if (s.axis === "x") {
      setSwipeX(Math.min(0, dx));
      last.current = { x: e.clientX, t: Date.now() };
    }
  };

  const onPointerUp = () => {
    const s = start.current;
    if (s?.axis === "x") {
      const l = last.current;
      const dt = l ? Math.max(1, Date.now() - l.t) : 1;
      const velocity = l ? (l.x - s.x) / dt : 0; // px/ms, leftward negative
      if (swipeX < -84 || velocity < -0.55) {
        dismiss();
      } else {
        setSwipeX(0); // spring back
      }
      justSwiped.current = true;
      window.setTimeout(() => (justSwiped.current = false), 300);
    }
    start.current = null;
    last.current = null;
    setDragging(false);
  };

  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: -72, transition: { duration: 0.22, ease: "easeOut" } }}
      className="relative select-none bg-white"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* delete backdrop revealed behind the swipe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 flex w-[96px] items-center justify-center rounded-l-[16px] bg-[#FF375F] text-white"
      >
        <Trash2 size={17} strokeWidth={2.2} />
      </div>

      {/* row content — slides with the swipe */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? `${n.title}. Opens the moment.` : undefined}
        onClick={() => {
          if (justSwiped.current) return;
          if (n.unread) markNotificationRead(n.id);
          if (n.moment) onOpenMoment(n.moment);
        }}
        onKeyDown={(e) => {
          if (clickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            if (n.unread) markNotificationRead(n.id);
            if (n.moment) onOpenMoment(n.moment);
          }
        }}
        className={cn(
          "relative flex w-full items-start gap-3 bg-white px-4 py-3 text-left",
          clickable && "cursor-pointer transition-colors active:bg-[#007AFF]/[0.05]"
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: dragging ? "none" : "transform 0.24s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <span
          aria-hidden
          className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: meta.bg, color: meta.tint }}
        >
          <Icon size={17} strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-[14.5px] tracking-[-0.01em] text-[#1D1D1F]",
                n.unread ? "font-bold" : "font-medium"
              )}
            >
              {n.title}
            </span>
            {n.unread ? (
              <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#007AFF]" />
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-[#AAAAAA]">{n.body}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 pt-0.5">
          <span className="text-[11.5px] font-medium text-[#AAAAAA]">{n.time}</span>
          <button
            type="button"
            aria-label={`Dismiss notification: ${n.title}`}
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[#C7C7CC] transition-all hover:bg-[#FF375F]/[0.1] hover:text-[#FF375F] active:scale-90"
          >
            <Trash2 size={12} strokeWidth={2.4} aria-hidden />
          </button>
        </span>
      </div>
    </motion.div>
  );
}

export function NotificationsContent({
  onOpenMoment,
}: {
  onMarkAllRead?: () => void;
  onOpenMoment: (m: PlayerPayload) => void;
}) {
  const { notifications, markAllRead, unreadCount } = useMD();
  const groups: Array<"today" | "earlier"> = ["today", "earlier"];
  const hasUnread = unreadCount > 0;

  return (
    <div className="pb-2">
      {/* Mark all read */}
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[12.5px] font-medium text-[#AAAAAA]">
          {unreadCount} new · {notifications.length} total
        </p>
        <button
          type="button"
          disabled={!hasUnread}
          onClick={markAllRead}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95",
            hasUnread
              ? "bg-[#007AFF]/[0.1] text-[#007AFF]"
              : "cursor-default bg-[#1D1D1F]/[0.05] text-[#AAAAAA]"
          )}
        >
          <CheckCheck size={13} strokeWidth={2.4} aria-hidden /> Mark all read
        </button>
      </div>

      {/* Grouped feed — dismissible rows animate out, empty groups collapse */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#007AFF]/[0.08] text-[#007AFF]">
            <BellOff size={22} aria-hidden />
          </span>
          <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            You're all caught up
          </p>
          <p className="max-w-[240px] text-[12.5px] leading-relaxed text-[#AAAAAA]">
            New opens, loves and milestones will land here. Swipe left or tap the
            bin to clear what you've seen.
          </p>
        </div>
      ) : (
        <div className="max-h-[52vh] overflow-y-auto md-scroll card-shadow hairline overflow-hidden rounded-[22px] bg-white">
          <AnimatePresence initial={false}>
            {groups.map((g) => {
              const items = notifications.filter((n) => n.group === g);
              if (items.length === 0) return null;
              return (
                <motion.div
                  key={g}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.18 } }}
                >
                  <p className="px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
                    {GROUP_LABELS[g]}
                  </p>
                  <div className="divide-y divide-[#1D1D1F]/[0.05]">
                    <AnimatePresence initial={false}>
                      {items.map((n) => (
                        <NotificationRow key={n.id} n={n} onOpenMoment={onOpenMoment} />
                      ))}
                    </AnimatePresence>
                  </div>
                  {g === "today" && notifications.some((n) => n.group === "earlier") ? (
                    <div className="mx-4 h-px bg-[#1D1D1F]/[0.06]" />
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Share sheet                                                         */
/* ------------------------------------------------------------------ */

const SHARE_CHANNELS = [
  { id: "messages", label: "Messages", icon: MessageCircle, tint: "#30D158", bg: "rgba(48,209,88,0.12)" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, tint: "#30D158", bg: "rgba(48,209,88,0.12)" },
  { id: "email", label: "Mail", icon: Mail, tint: "#007AFF", bg: "rgba(0,122,255,0.10)" },
  { id: "more", label: "More", icon: MoreHorizontal, tint: "#8E8E93", bg: "rgba(142,142,147,0.12)" },
];

const EXPIRY_OPTIONS = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "never", label: "No expiry", days: null },
] as const;

export function ShareContent({
  moment,
  onNotify,
}: {
  moment: { id: string; title: string; slug?: string };
  onNotify: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]["id"]>("30d");
  const [locked, setLocked] = useState(false);
  const slug = moment.slug ?? shareSlug(moment.id);
  const url = `https://${SHARE_URL_BASE}${slug}`;
  const displayUrl = `${SHARE_URL_BASE}${slug}`;

  const selected = EXPIRY_OPTIONS.find((o) => o.id === expiry) ?? EXPIRY_OPTIONS[1];
  const expiryNote = selected.days
    ? `Link expires ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(Date.now() + selected.days * 86400000)
      )}`
    : "Link never expires — replay it anytime";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be unavailable (insecure context) — still show feedback
    }
    setCopied(true);
    onNotify("Link copied to clipboard");
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="pb-2">
      {/* QR card */}
      <div className="flex flex-col items-center rounded-[24px] border border-[#1D1D1F]/[0.06] bg-white px-6 pb-5 pt-6 card-shadow">
        <div
          aria-hidden
          className="rounded-[20px] bg-white p-3.5 shadow-[0_12px_32px_-12px_rgba(29,29,31,0.22),inset_0_0_0_1px_rgba(29,29,31,0.06)]"
        >
          <QRCodeSVG
            value={url}
            size={132}
            level="M"
            marginSize={0}
            fgColor="#1D1D1F"
            bgColor="#FFFFFF"
            style={{ width: 132, height: 132, borderRadius: 10 }}
          />
        </div>
        <p className="mt-4 text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{moment.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-[#AAAAAA]">
          <Share2 size={11} aria-hidden /> Scan to open the experience
        </p>
      </div>

      {/* Link row */}
      <div className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-[#1D1D1F]/[0.06] bg-white p-2 pl-4 card-shadow">
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">Share link</span>
          <span className="block truncate font-mono text-[13px] font-medium text-[#1D1D1F]">{displayUrl}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy link for ${moment.title}`}
          className={cn(
            "flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white transition-transform active:scale-95",
            copied ? "bg-[#30D158]" : "bg-[#007AFF] pill-shadow"
          )}
        >
          {copied ? <CheckCheck size={14} strokeWidth={2.4} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Channels */}
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {SHARE_CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onNotify(`${c.label} share sheet — UI preview`)}
              aria-label={`Share via ${c.label}`}
              className="flex flex-col items-center gap-1.5 rounded-[18px] border border-[#1D1D1F]/[0.06] bg-white px-1 py-3 transition-transform active:scale-[0.96] card-shadow"
            >
              <span
                aria-hidden
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full"
                style={{ backgroundColor: c.bg, color: c.tint }}
              >
                <Icon size={19} strokeWidth={2.1} />
              </span>
              <span className="text-[10.5px] font-semibold text-[#1D1D1F]/80">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Link controls — expiry + password (PRD sharing options) */}
      <div className="card-shadow hairline mt-3 overflow-hidden rounded-[20px] bg-white">
        <div className="px-4 pb-3 pt-3.5">
          <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
            Link settings
          </p>
          <div className="mt-2 flex gap-2" role="group" aria-label="Link expiry">
            {EXPIRY_OPTIONS.map((o) => {
              const active = expiry === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setExpiry(o.id)}
                  className={cn(
                    "flex-1 rounded-full border py-2 text-[12.5px] font-semibold transition-all active:scale-[0.96]",
                    active
                      ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                      : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] font-medium text-[#AAAAAA]">{expiryNote}</p>
        </div>
        <div className="flex items-center gap-3 border-t border-[#1D1D1F]/[0.06] px-4 py-3">
          <span
            aria-hidden
            className={cn(
              "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] transition-colors",
              locked ? "bg-[#FF9F0A]/[0.12] text-[#B26A00]" : "bg-[#8E8E93]/[0.12] text-[#8E8E93]"
            )}
          >
            <Lock size={15} strokeWidth={2.1} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-medium tracking-[-0.01em] text-[#1D1D1F]">
              Password-protect
            </span>
            <span className="mt-0.5 block text-[11.5px] font-medium text-[#AAAAAA]">
              {locked ? "Recipients enter a password to open it" : "Anyone with the link can open it"}
            </span>
          </span>
          <Switch
            checked={locked}
            onCheckedChange={(v) => {
              setLocked(v);
              onNotify(v ? "Password protection on" : "Password protection off");
            }}
            aria-label="Password protect this moment"
          />
        </div>
      </div>

      <p className="mt-3.5 px-1 text-center text-[11.5px] font-medium leading-relaxed text-[#AAAAAA]">
        Anyone with the link can view it — no account needed.
        <br />
        <RotateCcw size={10} className="mr-1 inline" aria-hidden />
        Recipients can replay it anytime before it expires.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings detail sheets (Account / Notifications / Privacy / Help)   */
/* ------------------------------------------------------------------ */

type SettingIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface SettingsRowDef {
  icon: SettingIcon;
  tint: string;
  label: string;
  kind: "value" | "link" | "toggle" | "danger";
  value?: string;
  initial?: boolean;
  action?: () => void;
}

const SETTINGS_META: Record<SettingsTopic, { title: string; caption: string }> = {
  account: { title: "Account", caption: "Your identity, plan and data" },
  notifications: { title: "Notification Preferences", caption: "Choose what reaches you" },
  privacy: { title: "Privacy & Security", caption: "Control protection and data sharing" },
  help: { title: "Help Center", caption: "Guides and answers" },
};

/** Sheet header titles per settings topic (used by the shell) */
export const SETTINGS_TITLES: Record<SettingsTopic, string> = Object.fromEntries(
  (Object.keys(SETTINGS_META) as SettingsTopic[]).map((k) => [k, SETTINGS_META[k].title])
);

export function SettingsContent({
  topic,
  onOpenPricing,
  onOpenTour,
  onNotify,
}: {
  topic: SettingsTopic;
  onOpenPricing: () => void;
  onOpenTour: () => void;
  onNotify: (message: string) => void;
}) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const rowsFor = (t: SettingsTopic): SettingsRowDef[] => {
    switch (t) {
      case "account":
        return [
          { kind: "value", icon: Crown, tint: "#FF9F0A", label: "Plan", value: `${USER.plan} plan`, action: onOpenPricing },
          { kind: "value", icon: Mail, tint: "#007AFF", label: "Email", value: USER.email },
          { kind: "link", icon: Lock, tint: "#8E8E93", label: "Change password", action: () => onNotify("Change password — UI preview") },
          { kind: "link", icon: Download, tint: "#30D158", label: "Export my data", action: () => onNotify("Data export will be emailed to you") },
          { kind: "danger", icon: LogOut, tint: "#FF375F", label: "Delete account", action: () => onNotify("Account deletion — UI preview") },
        ];
      case "notifications":
        return [
          { kind: "toggle", icon: Eye, tint: "#007AFF", label: "Moment opened", initial: true },
          { kind: "toggle", icon: Heart, tint: "#FF375F", label: "Loves & reactions", initial: true },
          { kind: "toggle", icon: TrendingUp, tint: "#30D158", label: "Milestones", initial: true },
          { kind: "toggle", icon: Bell, tint: "#FF9F0A", label: "Scheduled reminders", initial: false },
          { kind: "toggle", icon: Sparkles, tint: "#64D2FF", label: "Product updates", initial: false },
          { kind: "toggle", icon: Mail, tint: "#5E5CE6", label: "Weekly digest", initial: true },
        ];
      case "privacy":
        return [
          { kind: "toggle", icon: Lock, tint: "#8E8E93", label: "Password-protect new moments", initial: false },
          { kind: "toggle", icon: ShieldCheck, tint: "#30D158", label: "Share anonymous analytics", initial: true },
          { kind: "toggle", icon: Sparkles, tint: "#64D2FF", label: "Personalized tips", initial: true },
          { kind: "link", icon: FileText, tint: "#007AFF", label: "Privacy policy", action: () => onNotify("Privacy policy — UI preview") },
          { kind: "link", icon: FileText, tint: "#007AFF", label: "Terms of service", action: () => onNotify("Terms of service — UI preview") },
        ];
      case "help":
        return [
          { kind: "link", icon: Sparkles, tint: "#64D2FF", label: "Getting started guide", action: onOpenTour },
          { kind: "link", icon: FileText, tint: "#007AFF", label: "Blocks & scenes explained", action: () => onNotify("Guide opens here — UI preview") },
          { kind: "link", icon: Share2, tint: "#30D158", label: "Sharing & delivery", action: () => onNotify("Guide opens here — UI preview") },
          { kind: "link", icon: CreditCard, tint: "#FF9F0A", label: "Billing & Dodo Payments", action: () => onNotify("Guide opens here — UI preview") },
        ];
    }
  };

  const meta = SETTINGS_META[topic];
  const rows = rowsFor(topic);

  return (
    <div className="pb-2">
      <p className="mb-3 px-1 text-[12.5px] font-medium text-[#AAAAAA]">{meta.caption}</p>

      {/* Account header card */}
      {topic === "account" ? (
        <div className="mb-3 flex items-center gap-3.5 rounded-[22px] border border-[#1D1D1F]/[0.06] bg-white p-4 card-shadow">
          <span
            aria-hidden
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[19px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,122,255,0.55)]"
            style={{ background: "linear-gradient(135deg, #007AFF 0%, #40B4FF 60%, #64D2FF 100%)" }}
          >
            {USER.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold tracking-[-0.015em] text-[#1D1D1F]">{USER.name}</p>
            <p className="truncate text-[12.5px] text-[#AAAAAA]">{USER.email}</p>
          </div>
          <User size={18} className="shrink-0 text-[#C7C7CC]" aria-hidden />
        </div>
      ) : null}

      <div className="card-shadow hairline divide-y divide-[#1D1D1F]/[0.06] overflow-hidden rounded-[22px] bg-white">
        {rows.map((row) => {
          const Icon = row.icon;
          const isOn = toggles[row.label] ?? row.initial ?? false;
          return (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
                style={{ backgroundColor: `${row.tint}1A`, color: row.tint }}
              >
                <Icon size={16} strokeWidth={2.1} aria-hidden />
              </span>
              {row.kind === "toggle" ? (
                <>
                  <span className="flex-1 text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F]">{row.label}</span>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(v) => {
                      setToggles((t) => ({ ...t, [row.label]: v }));
                      onNotify(`${row.label} ${v ? "on" : "off"}`);
                    }}
                    className="data-[state=checked]:bg-[#30D158]"
                    aria-label={row.label}
                  />
                </>
              ) : (
                <button
                  type="button"
                  onClick={row.action}
                  className={cn(
                    "flex flex-1 items-center justify-between text-left",
                    row.kind === "danger" ? "text-[#FF375F]" : "text-[#1D1D1F]"
                  )}
                >
                  <span className={cn("text-[15px] tracking-[-0.01em]", row.kind === "danger" ? "font-semibold" : "font-medium")}>
                    {row.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {row.value ? <span className="text-[14px] text-[#AAAAAA]">{row.value}</span> : null}
                    <ChevronRight size={15} className={row.kind === "danger" ? "text-[#FF375F]/50" : "text-[#C7C7CC]"} aria-hidden />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Help contact card */}
      {topic === "help" ? (
        <div className="mt-3 flex items-center gap-3.5 rounded-[22px] border border-[#1D1D1F]/[0.06] bg-white p-4 card-shadow">
          <span
            aria-hidden
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{ background: "linear-gradient(135deg, #007AFF 0%, #40B4FF 100%)" }}
          >
            <LifeBuoy size={20} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Still stuck?</p>
            <p className="text-[12.5px] text-[#AAAAAA]">We usually reply within a day.</p>
          </div>
          <button
            type="button"
            onClick={() => onNotify("Support composer opens here — UI preview")}
            className="shrink-0 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-95"
          >
            Email us
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore template preview sheet                                      */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function ExploreContent({
  item,
  saved,
  onToggleSaved,
  onPreview,
  onUseLayout,
  onNotify,
}: {
  item: ExploreItem;
  saved: boolean;
  onToggleSaved: () => void;
  onPreview: () => void;
  onUseLayout: () => void;
  onNotify: (message: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const segments = item.segments
    .map((s) => (s === "picks" ? "Editor's Pick" : s === "trending" ? "Trending" : "New"));

  return (
    <div className="pb-2">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[24px] card-shadow">
        <CoverArt variant={item.cover} className="aspect-[16/10] w-full" />
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#1D1D1F]/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <Eye size={12} aria-hidden /> {formatCount(item.views)} views
        </span>
        <button
          type="button"
          onClick={() => {
            onToggleSaved();
            onNotify(saved ? "Removed from saved" : "Saved to your collection");
          }}
          aria-label={saved ? "Remove from saved" : "Save template"}
          aria-pressed={saved}
          className="absolute right-2.5 top-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/85 text-[#1D1D1F] shadow-[0_8px_20px_-8px_rgba(29,29,31,0.4)] backdrop-blur-md transition-transform active:scale-90"
        >
          {saved ? <BookmarkCheck size={17} className="text-[#007AFF]" aria-hidden /> : <Bookmark size={17} aria-hidden />}
        </button>
      </div>

      {/* Title + creator */}
      <div className="mt-4 flex items-center gap-3 px-0.5">
        <span
          aria-hidden
          className="h-[40px] w-[40px] shrink-0 rounded-full shadow-sm"
          style={{
            background: `linear-gradient(135deg, hsl(${(item.cover * 37) % 360} 70% 55%), hsl(${(item.cover * 37 + 60) % 360} 70% 65%))`,
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[18px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{item.title}</h3>
          <p className="truncate text-[12.5px] font-medium text-[#AAAAAA]">Community template · {item.creator}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLiked((l) => !l);
          }}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className={cn(
            "flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all active:scale-90",
            liked ? "bg-[#FF375F]/[0.12] text-[#FF375F]" : "bg-[#1D1D1F]/[0.06] text-[#1D1D1F]/70"
          )}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} aria-hidden />
          {formatCount(item.likes + (liked ? 1 : 0))}
        </button>
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap gap-2 px-0.5">
        {segments.map((s) => (
          <span
            key={s}
            className="rounded-full bg-[#007AFF]/[0.09] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#007AFF]"
          >
            {s}
          </span>
        ))}
        {item.tags.map((t) => (
          <span key={t} className="rounded-full bg-[#1D1D1F]/[0.05] px-3 py-1 text-[11px] font-semibold text-[#AAAAAA]">
            #{t}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onPreview}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#1D1D1F]/[0.1] bg-white py-3 text-[14.5px] font-semibold text-[#1D1D1F] card-shadow transition-transform active:scale-[0.97]"
        >
          <Play size={15} fill="currentColor" aria-hidden /> Preview
        </button>
        <button
          type="button"
          onClick={onUseLayout}
          className="flex-[1.4] rounded-full bg-[#007AFF] py-3 text-[14.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
        >
          Use this layout
        </button>
      </div>
      <p className="mt-3 px-1 text-center text-[11.5px] font-medium text-[#AAAAAA]">
        Layouts copy scenes and blocks into your editor — content stays yours.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights / analytics sheet (PRD §analytics funnel)                  */
/* ------------------------------------------------------------------ */

/** Animated horizontal funnel bar row */
function FunnelRow({
  stage,
  value,
  note,
  pct,
  delay,
}: {
  stage: string;
  value: number;
  note: string;
  pct: number;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{stage}</span>
        <span className="text-[12.5px] font-semibold tabular-nums text-[#1D1D1F]/70">
          {value.toLocaleString()}
          <span className="ml-1.5 text-[11px] font-medium text-[#AAAAAA]">{pct}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-[9px] w-full overflow-hidden rounded-full bg-[#1D1D1F]/[0.05]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 4)}%` }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{
            background:
              stage === "Delivered"
                ? "linear-gradient(90deg, #C7C7CC, #AEAEB2)"
                : "linear-gradient(90deg, #007AFF, #40B4FF)",
          }}
        />
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#AAAAAA]">{note}</p>
    </div>
  );
}

/** Smooth SVG area trend chart with animated line draw-in */
function TrendChart({ data }: { data: Array<{ d: string; v: number }> }) {
  const W = 320;
  const H = 108;
  const PAD = { l: 6, r: 14, t: 12, b: 20 };
  const max = Math.max(...data.map((p) => p.v));
  const min = Math.min(...data.map((p) => p.v));
  const span = Math.max(max - min, 1);

  const pts = data.map((p, i) => ({
    x: PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r),
    y: PAD.t + (1 - (p.v - min) / span) * (H - PAD.t - PAD.b),
    ...p,
  }));

  // Catmull-Rom-ish smooth path through the points
  const line = pts
    .map((p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const px = a[i - 1].x;
      const py = a[i - 1].y;
      const cx = (px + p.x) / 2;
      return `C ${cx} ${py}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${H - PAD.b} L ${pts[0].x} ${H - PAD.b} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[108px] w-full" role="img" aria-label="Opens over time">
      <defs>
        <linearGradient id="md-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="md-trend-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#40B4FF" />
        </linearGradient>
      </defs>

      {/* grid hairlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="#1D1D1F" strokeOpacity="0.05" strokeDasharray="3 5" />
      ))}

      <motion.path
        d={area}
        fill="url(#md-trend-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="url(#md-trend-line)"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.85, type: "spring", stiffness: 400, damping: 22 }}
      >
        <circle cx={last.x} cy={last.y} r={4.5} fill="#007AFF" stroke="white" strokeWidth={2} />
      </motion.g>
      {data.map((p, i) => (
        <text
          key={p.d}
          x={pts[i].x}
          y={H - 5}
          textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
          fontSize="9.5"
          fontWeight="600"
          fill="#AAAAAA"
        >
          {p.d}
        </text>
      ))}
    </svg>
  );
}

export function InsightsContent({
  initialRange,
  onNotify,
}: {
  initialRange: InsightRange;
  onNotify: (message: string) => void;
}) {
  const [range, setRange] = useState<InsightRange>(initialRange);
  const data = INSIGHTS[range];
  const funnelMax = data.funnel[0].value;
  const rangeLabel = range === "7d" ? "last 7 days" : range === "30d" ? "last 30 days" : "last 90 days";

  const KPI_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
    "Open rate": Eye,
    Completion: CheckCheck,
    "Avg time": Clock,
    Loves: Heart,
  };

  return (
    <div className="pb-2">
      {/* Range switcher */}
      <SegmentedControl
        id="insights-range"
        options={[
          { value: "7d", label: "7D" },
          { value: "30d", label: "30D" },
          { value: "90d", label: "90D" },
        ]}
        value={range}
        onChange={(v) => {
          setRange(v);
          onNotify(`Showing the ${v === "7d" ? "last 7 days" : v === "30d" ? "last 30 days" : "last 90 days"}`);
        }}
      />

      {/* KPI grid */}
      <div key={`kpi-${range}`} className="mt-3.5 grid grid-cols-2 gap-2.5">
        {data.kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="card-shadow hairline rounded-[20px] bg-white px-3.5 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#AAAAAA]">
                {(() => {
                  const KIcon = KPI_ICONS[k.label];
                  return KIcon ? <KIcon size={11} strokeWidth={2.4} aria-hidden /> : null;
                })()}
                {k.label}
              </p>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
                  k.up ? "text-[#1E9E4A]" : "text-[#FF375F]"
                )}
              >
                {k.up ? <ArrowUp size={10} strokeWidth={3} aria-hidden /> : <ArrowDown size={10} strokeWidth={3} aria-hidden />}
                {k.delta}
              </span>
            </div>
            <p className="mt-1 text-[22px] font-bold tabular-nums tracking-[-0.02em] text-[#1D1D1F]">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Funnel */}
      <div key={`funnel-${range}`} className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Recipient journey</h3>
          <span className="text-[11px] font-medium text-[#AAAAAA]">{rangeLabel}</span>
        </div>
        <div className="space-y-3">
          {data.funnel.map((f, i) => (
            <FunnelRow
              key={f.stage}
              stage={f.stage}
              value={f.value}
              note={f.note}
              pct={Math.round((f.value / funnelMax) * 100)}
              delay={0.08 * i}
            />
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <div key={`trend-${range}`} className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">
            <TrendingUp size={14} className="text-[#007AFF]" aria-hidden /> Opens over time
          </h3>
          <span className="text-[11px] font-medium text-[#AAAAAA]">
            {data.trend[data.trend.length - 1].v} latest
          </span>
        </div>
        <TrendChart data={data.trend} />
      </div>

      {/* Scene retention */}
      <div key={`ret-${range}`} className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Scene retention</h3>
          <span className="text-[11px] font-medium text-[#AAAAAA]">viewers remaining</span>
        </div>
        <div className="space-y-2">
          {data.sceneRetention.map((s, i) => (
            <div key={s.scene} className="flex items-center gap-2.5">
              <span className="w-[52px] shrink-0 text-[11.5px] font-semibold text-[#1D1D1F]/70">
                Scene {s.scene}
              </span>
              <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-[#1D1D1F]/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{ duration: 0.6, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #007AFF ${s.pct}%, #40B4FF 100%)` }}
                />
              </div>
              <span className="w-[34px] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-[#1D1D1F]/70">
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top moments */}
      <div className="card-shadow hairline mt-3 overflow-hidden rounded-[22px] bg-white">
        <div className="px-4 pb-2 pt-3.5">
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Top moments</h3>
        </div>
        <div className="divide-y divide-[#1D1D1F]/[0.05]">
          {data.top.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-[18px] shrink-0 text-center text-[13px] font-bold tabular-nums text-[#AAAAAA]">
                {i + 1}
              </span>
              <CoverArt variant={m.cover} className="h-[42px] w-[42px] shrink-0 rounded-[12px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{m.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-[4px] w-[64px] overflow-hidden rounded-full bg-[#1D1D1F]/[0.07]">
                    <div className="h-full rounded-full bg-[#30D158]" style={{ width: `${m.completion}%` }} />
                  </div>
                  <span className="text-[10.5px] font-medium text-[#AAAAAA]">{m.completion}% done</span>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold tabular-nums text-[#AAAAAA]">
                <Eye size={12} aria-hidden /> {m.views}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI insight */}
      <div className="mt-3 overflow-hidden rounded-[22px] bg-[#1D1D1F] p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#64D2FF]/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#64D2FF]">
          <Sparkles size={10} aria-hidden /> AI insight
        </span>
        <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed text-white/85">{data.aiNote}</p>
      </div>

      {/* Share report — exportable snapshot card */}
      <ShareReportCard data={data} rangeLabel={rangeLabel} onNotify={onNotify} />
    </div>
  );
}

/** Branded, exportable performance snapshot with copy/share actions */
function ShareReportCard({
  data,
  rangeLabel,
  onNotify,
}: {
  data: InsightSnapshot;
  rangeLabel: string;
  onNotify: (message: string) => void;
}) {
  const trendMax = Math.max(...data.trend.map((t) => t.v), 1);

  const summary = [
    `MemorableDay — Performance report (${rangeLabel})`,
    ...data.kpis.map((k) => `${k.label}: ${k.value}`),
    data.top[0] ? `Top moment: “${data.top[0].title}” — ${data.top[0].views} views, ${data.top[0].completion}% completion` : null,
    "memorableday.in",
  ]
    .filter(Boolean)
    .join("\n");

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      onNotify("Report summary copied to clipboard");
    } catch {
      onNotify("Copy blocked by the browser — summary preview only");
    }
  };

  return (
    <div className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Share report</h3>
        <span className="text-[11px] font-medium text-[#AAAAAA]">snapshot card</span>
      </div>

      {/* The snapshot — a branded dark card like what a recipient would see */}
      <div className="relative overflow-hidden rounded-[18px] bg-[#1D1D1F] p-4 text-white shadow-[0_16px_36px_-14px_rgba(29,29,31,0.55)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
                Performance report
              </p>
              <p className="text-[10px] font-medium text-white/50">{rangeLabel} · memorableday.in</p>
            </div>
          </div>
          <span className="rounded-full bg-[#64D2FF]/15 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#64D2FF]">
            {data.funnel[0].value} sent
          </span>
        </div>

        {/* KPI strip */}
        <div className="mt-3.5 grid grid-cols-4 gap-2">
          {data.kpis.map((k) => (
            <div key={k.label} className="text-center">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-white/45">{k.label}</p>
              <p className="mt-0.5 text-[15px] font-bold tabular-nums tracking-[-0.01em] text-white">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Mini trend bars */}
        <div className="mt-3.5 flex h-[44px] items-end gap-[3px]" aria-hidden>
          {data.trend.map((t, i) => (
            <div
              key={t.d}
              className="flex-1 rounded-[2px]"
              style={{
                height: `${Math.max(12, Math.round((t.v / trendMax) * 44))}px`,
                background: i === data.trend.length - 1 ? "#64D2FF" : "rgba(255,255,255,0.22)",
              }}
            />
          ))}
        </div>

        <p className="mt-3 flex items-center justify-between text-[9.5px] font-medium text-white/40">
          <span>
            Top: “{data.top[0]?.title ?? "—"}” · {data.top[0]?.views ?? 0} views
          </span>
          <span>Generated {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2.5">
        <button
          type="button"
          onClick={copySummary}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.06] py-2.5 text-[13px] font-semibold text-[#1D1D1F]/80 transition-transform active:scale-[0.98]"
        >
          <Copy size={14} strokeWidth={2.2} aria-hidden /> Copy summary
        </button>
        <button
          type="button"
          onClick={() => onNotify("Report link shared — UI preview")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#007AFF] py-2.5 text-[13px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
        >
          <Share2 size={14} strokeWidth={2.2} aria-hidden /> Share
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI message composer sheet (PRD AI system — tone control, 3 options)  */
/* ------------------------------------------------------------------ */

const TONE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  heart: Heart,
  smile: MessageCircle,
  feather: Feather,
  minus: Minus,
  zap: Zap,
};

export function AIComposerContent({
  onInsert,
  onNotify,
}: {
  onInsert: (message: string) => void;
  onNotify: (message: string) => void;
}) {
  const { credits, spendCredits } = useMD();
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("heartfelt");
  const [phase, setPhase] = useState<"compose" | "generating" | "done">("compose");
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  /** Real AI generation — POST /api/md/ai/compose (z-ai-web-dev-sdk server-side) */
  const generate = async () => {
    if (!brief.trim() || phase === "generating") return;
    if (!spendCredits(3)) {
      onNotify("Out of AI credits — upgrade your plan for more");
      return;
    }
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch("/api/md/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim(), tone }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; messages?: string[]; error?: string } | null;
      if (!res.ok || !json?.ok || !Array.isArray(json.messages) || json.messages.length !== 3) {
        throw new Error(json?.error ?? "The AI couldn't write right now — try again");
      }
      setOptions(json.messages);
      setPhase("done");
    } catch (e) {
      // Failed generation — refund the credits it burned.
      spendCredits(-3);
      const msg =
        e instanceof TypeError
          ? "Couldn't reach the AI — check your connection and try again"
          : e instanceof Error
            ? e.message
            : "The AI couldn't write right now — try again";
      setError(msg);
      setPhase("compose");
    }
  };

  const copy = async (msg: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      // Clipboard may be unavailable — still show feedback
    }
    setCopiedIdx(idx);
    onNotify("Message copied to clipboard");
    window.setTimeout(() => setCopiedIdx(null), 1600);
  };

  return (
    <div className="pb-2">
      {/* Live AI credit balance (server-synced — each insert spends 4) */}
      <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#5E5CE6]/[0.07] px-3.5 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5E5CE6]">
          <Sparkles size={13} aria-hidden /> AI Credits
        </span>
        <span className="text-[12.5px] font-bold tabular-nums text-[#1D1D1F] dark:text-white">
          {credits} <span className="font-medium text-[#AAAAAA]">available · 4 per insert</span>
        </span>
      </div>
      {phase === "compose" ? (
        <>
          {/* Brief */}
          <label htmlFor="md-brief" className="mb-1.5 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
            Describe the moment
          </label>
          <textarea
            id="md-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            maxLength={220}
            placeholder="Who is it for, and what should it feel like?"
            className="w-full resize-none rounded-[18px] border border-[#1D1D1F]/[0.09] bg-white px-4 py-3 text-[14.5px] leading-relaxed text-[#1D1D1F] outline-none placeholder:text-[#AAAAAA]/70 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
          />
          <p className="mt-1 px-1 text-right text-[11px] font-medium tabular-nums text-[#AAAAAA]">{brief.length}/220</p>

          {/* Tone */}
          <p className="mb-2 mt-1 px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Tone</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Message tone">
            {AI_TONES.map((t) => {
              const Icon = TONE_ICONS[t.icon] ?? Sparkles;
              const active = tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTone(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.96]",
                    active
                      ? "border-[#007AFF] bg-[#007AFF] text-white pill-shadow"
                      : "border-[#1D1D1F]/[0.09] bg-white text-[#1D1D1F]/75"
                  )}
                >
                  <Icon size={13} strokeWidth={2.3} aria-hidden /> {t.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!brief.trim() || phase === "generating"}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]",
              !brief.trim() || phase === "generating" ? "opacity-40" : ""
            )}
          >
            <Sparkles size={16} aria-hidden /> Write 3 messages
          </button>
          {error ? (
            <p
              role="alert"
              className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] font-semibold text-[#FF375F]"
            >
              <AlertCircle size={13} aria-hidden /> {error}
            </p>
          ) : (
            <p className="mt-2.5 text-center text-[11.5px] font-medium text-[#AAAAAA]">
              Uses 3 of your AI credits — tailored to your brief
            </p>
          )}
        </>
      ) : phase === "generating" ? (
        <div aria-live="polite" aria-label="Writing messages">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-shadow hairline mb-2.5 rounded-[18px] bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="skeleton h-3.5 w-3.5 rounded-full" />
                <span className="skeleton h-3 w-1/3 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                <span className="skeleton block h-3 w-full rounded-full" style={{ animationDelay: `${i * 120}ms` }} />
                <span className="skeleton block h-3 w-5/6 rounded-full" style={{ animationDelay: `${i * 120 + 90}ms` }} />
                <span className="skeleton block h-3 w-2/3 rounded-full" style={{ animationDelay: `${i * 120 + 180}ms` }} />
              </div>
            </div>
          ))}
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[#007AFF]">
            <Sparkles size={12} className="animate-pulse" aria-hidden /> Writing in a {AI_TONES.find((t) => t.id === tone)?.label.toLowerCase()} tone…
          </p>
        </div>
      ) : (
        <>
          <div aria-live="polite">
            {options.map((msg, i) => (
              <motion.div
                key={`${options[0]?.slice(0, 24)}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * i, duration: 0.3 }}
                className="card-shadow hairline mb-2.5 rounded-[18px] bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
                    <Sparkles size={10} className="text-[#5E5CE6]" aria-hidden /> Option {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(msg, i)}
                    aria-label={`Copy option ${i + 1}`}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95",
                      copiedIdx === i ? "bg-[#30D158]/[0.12] text-[#1E9E4A]" : "bg-[#1D1D1F]/[0.05] text-[#1D1D1F]/70"
                    )}
                  >
                    {copiedIdx === i ? <Check size={11} strokeWidth={3} aria-hidden /> : <Copy size={11} aria-hidden />}
                    {copiedIdx === i ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed tracking-[-0.01em] text-[#1D1D1F]">{msg}</p>
                <button
                  type="button"
                  onClick={() => onInsert(msg)}
                  className="mt-3 w-full rounded-full bg-[#007AFF] py-2.5 text-[13.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.97]"
                >
                  Use this message
                </button>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={generate}
              className="flex-1 rounded-full bg-[#5E5CE6]/[0.1] py-2.5 text-[13.5px] font-semibold text-[#5E5CE6] transition-transform active:scale-[0.98]"
            >
              <RotateCcw size={12} className="mr-1 inline" aria-hidden /> Write again
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("compose");
                setOptions([]);
              }}
              className="flex-1 rounded-full bg-[#1D1D1F]/[0.05] py-2.5 text-[13.5px] font-semibold text-[#1D1D1F]/75 transition-transform active:scale-[0.98]"
            >
              New brief
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI Creator — describe the moment, get a full experience             */
/* ------------------------------------------------------------------ */

/** Sketch block-type display meta (labels + tints match the builder palette). */
const SKETCH_BLOCK_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; tint: string }> = {
  text: { label: "Message", icon: Type, tint: "#007AFF" },
  gift: { label: "Gift", icon: Gift, tint: "#5E5CE6" },
  countdown: { label: "Countdown", icon: Clock, tint: "#FF9F0A" },
  quiz: { label: "Quiz", icon: ListChecks, tint: "#007AFF" },
  reward: { label: "Reward", icon: Award, tint: "#30D158" },
  coupon: { label: "Coupon", icon: Ticket, tint: "#218CF4" },
  cta: { label: "Button", icon: MousePointerClick, tint: "#007AFF" },
  confetti: { label: "Confetti", icon: PartyPopper, tint: "#FF375F" },
  audio: { label: "Song", icon: Music, tint: "#FF375F" },
};

/** Starter briefs — one tap fills the textarea with a workable description. */
const STARTER_BRIEFS: Array<{ chip: string; brief: string }> = [
  { chip: "Birthday", brief: "a birthday experience for my best friend — fun, playful, with a quiz about our friendship and a gift at the end" },
  { chip: "Anniversary", brief: "an anniversary surprise for my partner — romantic and warm, remembering our favorite trip together, ending with a gift" },
  { chip: "Thank you", brief: "a thank-you experience for a mentor who changed my year — sincere, with a small reward as a token of gratitude" },
  { chip: "Congrats", brief: "a congratulations experience for a friend who landed their dream job — celebratory and proud, ending with confetti" },
  { chip: "Love", brief: "a love-letter experience for the person I adore — soft, cinematic, with a countdown before the final message" },
  { chip: "Farewell", brief: "a farewell experience for a coworker moving abroad — warm and funny, with a quiz about the office and a goodbye gift" },
  { chip: "Just because", brief: "a just-because pick-me-up for someone having a rough week — gentle and encouraging, ending with a small treat" },
];

const SKETCH_STATUSES = [
  "Reading your brief…",
  "Designing the scenes…",
  "Writing the copy…",
  "Arranging the reveals…",
];

interface SketchResult {
  title: string;
  cover: number;
  scenes: SceneDoc[];
}

export function AICreatorContent({
  onOpenDraft,
}: {
  onOpenDraft: (draft: SketchResult) => void;
}) {
  const { credits, spendCredits } = useMD();
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<"compose" | "generating" | "done">("compose");
  const [result, setResult] = useState<SketchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);

  // Rotate the status line while generating
  useEffect(() => {
    if (phase !== "generating") return;
    setStatusIdx(0);
    const t = window.setInterval(() => setStatusIdx((i) => Math.min(i + 1, SKETCH_STATUSES.length - 1)), 2600);
    return () => window.clearInterval(t);
  }, [phase]);

  /** Real AI sketch — POST /api/md/ai/sketch (z-ai-web-dev-sdk server-side) */
  const generate = async () => {
    if (!brief.trim() || phase === "generating") return;
    if (!spendCredits(6)) {
      setError("Out of AI credits — upgrade your plan for more");
      return;
    }
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch("/api/md/ai/sketch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        title?: string;
        cover?: number;
        scenes?: SceneDoc[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !Array.isArray(json.scenes) || json.scenes.length === 0) {
        throw new Error(json?.error ?? "The AI couldn't sketch right now — try again");
      }
      setResult({ title: json.title ?? "Untitled Experience", cover: json.cover ?? 5, scenes: json.scenes });
      setPhase("done");
    } catch (e) {
      // Failed sketch — refund the credits it burned.
      spendCredits(-6);
      const msg =
        e instanceof TypeError
          ? "Couldn't reach the AI — check your connection and try again"
          : e instanceof Error
            ? e.message
            : "The AI couldn't sketch right now — try again";
      setError(msg);
      setPhase("compose");
    }
  };

  const blockCount = result?.scenes.reduce((n, s) => n + s.blocks.length, 0) ?? 0;

  return (
    <div className="pb-2">
      {/* Live AI credit balance (server-synced — each sketch spends 6) */}
      <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#5E5CE6]/[0.07] px-3.5 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5E5CE6]">
          <Sparkles size={13} aria-hidden /> AI Credits
        </span>
        <span className="text-[12.5px] font-bold tabular-nums text-[#1D1D1F] dark:text-white">
          {credits} <span className="font-medium text-[#AAAAAA]">available · 6 per sketch</span>
        </span>
      </div>

      {phase === "compose" ? (
        <>
          {/* Brief */}
          <label htmlFor="md-sketch-brief" className="mb-1.5 block px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
            Describe the moment
          </label>
          <textarea
            id="md-sketch-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder="Who is it for, what's the occasion, and how should it feel? The AI designs the scenes, copy and reveals."
            className="w-full resize-none rounded-[18px] border border-[#1D1D1F]/[0.09] bg-white px-4 py-3 text-[14.5px] leading-relaxed text-[#1D1D1F] outline-none placeholder:text-[#AAAAAA]/70 focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/25"
          />
          <p className="mt-1 px-1 text-right text-[11px] font-medium tabular-nums text-[#AAAAAA]">{brief.length}/300</p>

          {/* Starter briefs */}
          <p className="mb-2 mt-1 px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Need a start?</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_BRIEFS.map((s) => (
              <button
                key={s.chip}
                type="button"
                onClick={() => setBrief(s.brief)}
                className="rounded-full border border-[#1D1D1F]/[0.09] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D1D1F]/75 transition-all active:scale-[0.96]"
              >
                {s.chip}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!brief.trim() || phase === "generating"}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#5E5CE6] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]",
              !brief.trim() ? "opacity-40" : ""
            )}
          >
            <Sparkles size={16} aria-hidden /> Sketch my experience
          </button>
          {error ? (
            <p role="alert" className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] font-semibold text-[#FF375F]">
              <AlertCircle size={13} aria-hidden /> {error}
            </p>
          ) : (
            <p className="mt-2.5 text-center text-[11.5px] font-medium text-[#AAAAAA]">
              Uses 6 of your AI credits — scenes, copy & reveals included
            </p>
          )}
        </>
      ) : phase === "generating" ? (
        <div aria-live="polite" aria-label="Designing your experience">
          {/* Skeleton storyboard */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-shadow hairline mb-2.5 rounded-[18px] bg-white p-4">
              <div className="flex items-center gap-2.5">
                <span className="skeleton h-[26px] w-[26px] rounded-full" />
                <span className="skeleton h-3 w-1/3 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                <span className="skeleton block h-3 w-full rounded-full" style={{ animationDelay: `${i * 120}ms` }} />
                <span className="skeleton block h-3 w-5/6 rounded-full" style={{ animationDelay: `${i * 120 + 90}ms` }} />
              </div>
              <div className="mt-3 flex gap-1.5">
                <span className="skeleton h-6 w-16 rounded-full" style={{ animationDelay: `${i * 120 + 180}ms` }} />
                <span className="skeleton h-6 w-14 rounded-full" style={{ animationDelay: `${i * 120 + 260}ms` }} />
              </div>
            </div>
          ))}
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[#5E5CE6]">
            <Loader2 size={12} className="animate-spin" aria-hidden /> {SKETCH_STATUSES[statusIdx]}
          </p>
        </div>
      ) : result ? (
        <>
          <div aria-live="polite">
            {/* Title + summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-shadow hairline mb-2.5 rounded-[18px] bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <CoverArt variant={result.cover} className="h-[52px] w-[72px] shrink-0 rounded-[12px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{result.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#AAAAAA]">
                    {result.scenes.length} {result.scenes.length === 1 ? "scene" : "scenes"} · {blockCount} {blockCount === 1 ? "block" : "blocks"} · AI composed
                  </p>
                </div>
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#5E5CE6]/[0.12] text-[#5E5CE6]">
                  <Sparkles size={13} aria-hidden />
                </span>
              </div>
            </motion.div>

            {/* Scene preview cards */}
            {result.scenes.map((s, i) => {
              const firstText = s.blocks.find((b) => b.type === "text")?.data?.body ?? null;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (i + 1), duration: 0.3 }}
                  className="card-shadow hairline mb-2.5 rounded-[18px] bg-white p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1D1D1F]/[0.07] text-[11px] font-bold text-[#1D1D1F]/70">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Scene {i + 1}</span>
                  </div>
                  {firstText ? (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-[#1D1D1F]/80">{firstText}</p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {s.blocks.map((b) => {
                      const meta = SKETCH_BLOCK_META[b.type];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <span
                          key={b.id}
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: `${meta.tint}14`, color: meta.tint }}
                        >
                          <Icon size={11} strokeWidth={2.4} aria-hidden /> {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onOpenDraft(result)}
              className="flex-[1.4] rounded-full bg-[#007AFF] py-3 text-[14.5px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
            >
              Open in Builder
            </button>
            <button
              type="button"
              onClick={generate}
              className="flex-1 rounded-full bg-[#1D1D1F]/[0.05] py-3 text-[13.5px] font-semibold text-[#1D1D1F]/75 transition-transform active:scale-[0.98]"
            >
              <RotateCcw size={12} className="mr-1 inline" aria-hidden /> Try again
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11.5px] font-medium text-[#AAAAAA]">
            Everything stays fully editable — scenes, copy, blocks.
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auth sheet — Sign in / Create account (UI preview)                   */
/* ------------------------------------------------------------------ */

function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09c.95-2.85 3.6-4.97 6.73-4.97Z"
      />
    </svg>
  );
}

export function AuthContent({
  initialMode,
  onDone,
  onNotify,
}: {
  initialMode: AuthMode;
  onDone: (mode: AuthMode) => void;
  onNotify: (message: string) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const isSignIn = mode === "signin";
  const field =
    "w-full rounded-[16px] border border-[#1D1D1F]/[0.09] bg-white py-3 pl-11 pr-11 text-[15px] tracking-[-0.01em] text-[#1D1D1F] outline-none placeholder:text-[#AAAAAA]/70 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25";

  return (
    <div className="pb-2">
      {/* Brand */}
      <div className="mb-4 flex flex-col items-center pt-1">
        <LogoMark size={64} />
        <h3 className="mt-3 text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
          {isSignIn ? "Welcome back" : "Create your account"}
        </h3>
        <p className="mt-0.5 text-[13px] text-[#AAAAAA]">
          {isSignIn ? "Sign in to keep making moments" : "Make every moment memorable"}
        </p>
      </div>

      <SegmentedControl
        id="auth-mode"
        options={[
          { value: "signin", label: "Sign In" },
          { value: "signup", label: "Create Account" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {/* Fields */}
      <div className="mt-4 space-y-2.5">
        {!isSignIn ? (
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" aria-hidden />
            <input
              type="text"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              autoComplete="name"
              className={field}
            />
          </div>
        ) : null}
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" aria-hidden />
          <input
            type="email"
            value={email}
            maxLength={60}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
            className={field}
          />
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" aria-hidden />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            maxLength={60}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            className={field}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#AAAAAA] transition-transform active:scale-90"
          >
            {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>
      </div>

      {isSignIn ? (
        <button
          type="button"
          onClick={() => onNotify("Reset link sent — UI preview")}
          className="mt-2.5 px-1 text-[13px] font-semibold text-[#007AFF] transition-opacity active:opacity-60"
        >
          Forgot password?
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onDone(mode)}
        className="mt-4 w-full rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
      >
        {isSignIn ? "Sign In" : "Create Account"}
      </button>

      {/* Social */}
      <div className="mt-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[#1D1D1F]/[0.08]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#AAAAAA]">or continue with</span>
        <span className="h-px flex-1 bg-[#1D1D1F]/[0.08]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onDone(mode)}
          className="flex items-center justify-center gap-2 rounded-full bg-[#1D1D1F] py-3 text-[14.5px] font-semibold text-white transition-transform active:scale-[0.97]"
        >
          <AppleIcon size={16} /> Apple
        </button>
        <button
          type="button"
          onClick={() => onDone(mode)}
          className="hairline flex items-center justify-center gap-2 rounded-full bg-white py-3 text-[14.5px] font-semibold text-[#1D1D1F] transition-transform active:scale-[0.97]"
        >
          <GoogleIcon size={16} /> Google
        </button>
      </div>

      {!isSignIn ? (
        <p className="mt-4 px-2 text-center text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
          By continuing you agree to MemorableDay&apos;s Terms of Service and Privacy Policy.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-moment stats sheet                                              */
/* ------------------------------------------------------------------ */

/** Deterministic 0–99 pseudo-random from a seed string (stable per moment) */
function hashSeed(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return Math.abs(h) % 100;
  };
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function StatsContent({
  moment,
  onNotify,
  onOpenFullInsights,
}: {
  moment: StatsPayload;
  onNotify: (message: string) => void;
  onOpenFullInsights: () => void;
}) {
  const stats = useMemo(() => {
    const r = hashSeed(moment.id);
    // Real tracked loves when the payload carries them; generated estimate otherwise
    const loves = moment.loves !== undefined ? moment.loves : Math.max(2, Math.round(moment.views * (0.42 + r() / 250)));
    const completionPct = moment.completion === "—" ? 64 + r() % 30 : parseInt(moment.completion, 10) || 78;
    const minutes = 1 + r() % 2;
    const seconds = 12 + r() % 48;
    const avgTime = `${minutes}:${String(seconds).padStart(2, "0")}`;
    // 7-day view bars — gently rising, today strongest
    const bars = Array.from({ length: 7 }, (_, i) => {
      const base = 28 + r() % 34;
      const lift = i === 6 ? 26 : i >= 4 ? 10 : 0;
      return Math.min(100, base + lift);
    });
    const topScene = Math.min(moment.scenes, 1 + (r() % Math.max(1, moment.scenes - 1)));
    const topSceneDrop = 100 - (r() % 22);
    const sharedBack = 18 + r() % 20;
    return { loves, completionPct, avgTime, bars, topScene, topSceneDrop, sharedBack };
  }, [moment.id, moment.views, moment.completion, moment.scenes, moment.loves]);

  const journey = [
    { label: "Sent", detail: moment.date.replace(/^Sent /, ""), done: true },
    { label: "Opened", detail: `${moment.views} views`, done: moment.views > 0 },
    { label: "Completed", detail: `${stats.completionPct}% finished all scenes`, done: true },
    { label: "Loved", detail: `${stats.loves} hearts received`, done: stats.loves > 0 },
  ];

  return (
    <div className="pb-2">
      {/* Hero — cover + identity */}
      <div className="card-shadow hairline flex items-center gap-3.5 rounded-[22px] bg-white p-3.5">
        <CoverArt variant={moment.cover} className="h-[62px] w-[62px] shrink-0 rounded-[16px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16.5px] font-bold tracking-[-0.015em] text-[#1D1D1F]">{moment.title}</p>
          <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#AAAAAA]">
            To {moment.recipient} · {moment.date} · {moment.scenes} scenes
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#007AFF]/[0.1] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#007AFF]">
          Live
        </span>
      </div>

      {/* KPI grid */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {[
          { label: "Views", value: String(moment.views), icon: Eye, tint: "#007AFF", note: "unique opens" },
          { label: "Loves", value: String(stats.loves), icon: Heart, tint: "#FF375F", note: "hearts tapped" },
          { label: "Completion", value: `${stats.completionPct}%`, icon: CheckCheck, tint: "#30D158", note: "finished all scenes" },
          { label: "Avg. time", value: stats.avgTime, icon: Clock, tint: "#FF9F0A", note: "per session" },
        ].map((k, i) => {
          const KIcon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="card-shadow hairline rounded-[20px] bg-white px-3.5 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#AAAAAA]">
                  <KIcon size={11} strokeWidth={2.4} aria-hidden />
                  {k.label}
                </p>
              </div>
              <p className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] tabular-nums text-[#1D1D1F]">{k.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#AAAAAA]">{k.note}</p>
            </motion.div>
          );
        })}
      </div>

      {/* 7-day views chart */}
      <div className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">Views · last 7 days</p>
          <p className="flex items-center gap-1 text-[11.5px] font-bold text-[#1E9E4A]">
            <TrendingUp size={12} strokeWidth={2.6} aria-hidden /> trending
          </p>
        </div>
        <div className="mt-3 flex h-[96px] items-end gap-2" role="img" aria-label="Daily views, last 7 days">
          {stats.bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: Math.max(8, Math.round(h * 0.72)) }}
                transition={{ delay: 0.08 + i * 0.05, type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "w-full rounded-[6px]",
                  i === 6
                    ? "bg-gradient-to-t from-[#007AFF] to-[#64D2FF] shadow-[0_6px_14px_-4px_rgba(0,122,255,0.55)]"
                    : "bg-[#007AFF]/[0.16]"
                )}
              />
              <span className={cn("text-[10px] font-semibold", i === 6 ? "text-[#007AFF]" : "text-[#AAAAAA]")}>
                {DAY_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scene retention — top scene */}
      <div className="card-shadow hairline mt-3 rounded-[22px] bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">Strongest scene</p>
        <div className="mt-2.5 flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#AF52DE]/[0.1] text-[14px] font-bold text-[#AF52DE]">
            {stats.topScene}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">Scene {stats.topScene} retention</p>
              <p className="text-[12.5px] font-bold tabular-nums text-[#1D1D1F]">{stats.topSceneDrop}%</p>
            </div>
            <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[#1D1D1F]/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.topSceneDrop}%` }}
                transition={{ delay: 0.25, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#AF52DE] to-[#FF6482]"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-[#AAAAAA]">
              Recipients who reach this scene keep going to the end · {stats.sharedBack}% shared it forward
            </p>
          </div>
        </div>
      </div>

      {/* Recipient journey */}
      <div className="card-shadow hairline mt-3 overflow-hidden rounded-[22px] bg-white">
        <p className="px-4 pb-1 pt-3.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
          Recipient journey
        </p>
        <div className="px-4 pb-3 pt-1.5">
          {journey.map((j, i) => (
            <div key={j.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-[22px] w-[22px] items-center justify-center rounded-full text-white",
                    j.done ? "bg-[#30D158]" : "bg-[#D1D1D6]"
                  )}
                >
                  <Check size={12} strokeWidth={3.2} aria-hidden />
                </span>
                {i < journey.length - 1 ? (
                  <span className={cn("h-[16px] w-[2px] rounded-full", journey[i + 1].done ? "bg-[#30D158]/50" : "bg-[#D1D1D6]/60")} />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pb-3">
                <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{j.label}</p>
                <p className="truncate text-[12px] font-medium text-[#AAAAAA]">{j.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open the full dashboard */}
      <button
        type="button"
        onClick={onOpenFullInsights}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#007AFF]/[0.08] py-3 text-[13.5px] font-semibold text-[#007AFF] transition-transform active:scale-[0.98]"
      >
        Open full insights <ChevronRight size={14} strokeWidth={2.6} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onNotify(`Report for “${moment.title}” copied`)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold text-[#AAAAAA] transition-colors active:text-[#1D1D1F]"
      >
        <Copy size={13} aria-hidden /> Copy stats summary
      </button>
    </div>
  );
}
