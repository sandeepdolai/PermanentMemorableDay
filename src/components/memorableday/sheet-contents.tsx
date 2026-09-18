"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Bell,
  CheckCheck,
  Copy,
  Eye,
  Heart,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { NOTIFICATIONS, SHARE_URL_BASE, shareSlug, type AppNotification, type NotificationKind } from "@/lib/mock-data";
import type { PlayerPayload } from "./md-context";
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
      <div className="max-h-[52vh] overflow-y-auto no-scrollbar card-shadow hairline overflow-hidden rounded-[22px] bg-white">
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
