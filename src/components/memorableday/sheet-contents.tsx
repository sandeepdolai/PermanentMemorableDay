"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  CheckCheck,
  ChevronRight,
  Copy,
  CreditCard,
  Crown,
  Eye,
  Heart,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATIONS,
  SHARE_URL_BASE,
  shareSlug,
  type AppNotification,
  type NotificationKind,
  type ExploreItem,
  USER,
} from "@/lib/mock-data";
import type { PlayerPayload, SettingsTopic } from "./md-context";
import { CoverArt } from "./cover-art";
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
