"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCheck,
  ChevronRight,
  Copy,
  CreditCard,
  Crown,
  Eye,
  Feather,
  Heart,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  TrendingUp,
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
  AI_MESSAGE_OPTIONS,
  INSIGHTS,
  NOTIFICATIONS,
  SHARE_URL_BASE,
  shareSlug,
  type AppNotification,
  type InsightRange,
  type NotificationKind,
  type ExploreItem,
  USER,
} from "@/lib/mock-data";
import type { PlayerPayload, SettingsTopic } from "./md-context";
import { CoverArt } from "./cover-art";
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
};

const GROUP_LABELS: Record<AppNotification["group"], string> = {
  today: "Today",
  earlier: "Earlier this week",
};

function NotificationRow({
  n,
  onOpenMoment,
}: {
  n: AppNotification;
  onOpenMoment: (m: PlayerPayload) => void;
}) {
  const meta = KIND_META[n.kind];
  const Icon = meta.icon;
  const clickable = Boolean(n.moment);

  const Row = clickable ? "button" : "div";
  return (
    <Row
      {...(clickable
        ? {
            type: "button" as const,
            onClick: () => n.moment && onOpenMoment(n.moment),
            "aria-label": `${n.title}. Opens the moment.`,
          }
        : {})}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left",
        clickable && "transition-colors active:bg-[#007AFF]/[0.05]"
      )}
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
      <span className="shrink-0 pt-0.5 text-[11.5px] font-medium text-[#AAAAAA]">{n.time}</span>
    </Row>
  );
}

export function NotificationsContent({
  onMarkAllRead,
  onOpenMoment,
}: {
  onMarkAllRead: () => void;
  onOpenMoment: (m: PlayerPayload) => void;
}) {
  const groups: Array<"today" | "earlier"> = ["today", "earlier"];
  const hasUnread = NOTIFICATIONS.some((n) => n.unread);

  return (
    <div className="pb-2">
      {/* Mark all read */}
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[12.5px] font-medium text-[#AAAAAA]">
          {NOTIFICATIONS.filter((n) => n.unread).length} new · {NOTIFICATIONS.length} total
        </p>
        <button
          type="button"
          disabled={!hasUnread}
          onClick={onMarkAllRead}
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

      {/* Grouped feed */}
      <div className="max-h-[52vh] overflow-y-auto md-scroll card-shadow hairline overflow-hidden rounded-[22px] bg-white">
        {groups.map((g, gi) => {
          const items = NOTIFICATIONS.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g}>
              {gi > 0 ? <div className="mx-4 h-px bg-[#1D1D1F]/[0.06]" /> : null}
              <p className="px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">
                {GROUP_LABELS[g]}
              </p>
              <div className="divide-y divide-[#1D1D1F]/[0.05]">
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpenMoment={onOpenMoment} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
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

export function ShareContent({
  moment,
  onNotify,
}: {
  moment: { id: string; title: string };
  onNotify: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const slug = shareSlug(moment.id);
  const url = `https://${SHARE_URL_BASE}${slug}`;
  const displayUrl = `${SHARE_URL_BASE}${slug}`;

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
  onNotify,
}: {
  topic: SettingsTopic;
  onOpenPricing: () => void;
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
          { kind: "link", icon: Sparkles, tint: "#64D2FF", label: "Getting started guide", action: () => onNotify("Guide opens here — UI preview") },
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
  onPreview,
  onUseLayout,
  onNotify,
}: {
  item: ExploreItem;
  onPreview: () => void;
  onUseLayout: () => void;
  onNotify: (message: string) => void;
}) {
  const [saved, setSaved] = useState(false);
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
            setSaved((s) => !s);
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#AAAAAA]">{k.label}</p>
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
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("heartfelt");
  const [phase, setPhase] = useState<"compose" | "generating" | "done">("compose");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Deterministic option set — shifts with the brief so it feels reactive
  const options = useMemo(() => {
    const base = AI_MESSAGE_OPTIONS[tone] ?? AI_MESSAGE_OPTIONS.heartfelt;
    if (!brief.trim()) return base;
    const shift = Math.min(brief.trim().length, 2);
    return ([...base.slice(shift), ...base.slice(0, shift)] as [string, string, string]).slice(0, 3);
  }, [tone, brief]);

  const generate = () => {
    setPhase("generating");
    window.setTimeout(() => setPhase("done"), 1400);
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] py-3.5 text-[16px] font-semibold text-white pill-shadow transition-transform active:scale-[0.98]"
          >
            <Sparkles size={16} aria-hidden /> Write 3 messages
          </button>
          <p className="mt-2.5 text-center text-[11.5px] font-medium text-[#AAAAAA]">
            Uses 3 of your {USER.credits - 64} AI credits
          </p>
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
                key={`${tone}-${i}`}
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
                  Use in Scene 1
                </button>
              </motion.div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPhase("compose")}
            className="w-full rounded-full bg-[#1D1D1F]/[0.05] py-2.5 text-[13.5px] font-semibold text-[#1D1D1F]/75 transition-transform active:scale-[0.98]"
          >
            Try another brief
          </button>
        </>
      )}
    </div>
  );
}
