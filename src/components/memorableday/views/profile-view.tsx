"use client";

import { useState } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { USER } from "@/lib/mock-data";
import { LargeTitle } from "../bits";
import { useMD } from "../md-context";
import { cn } from "@/lib/utils";

interface RowBase {
  kind: "link" | "toggle" | "value";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tint: string;
  label: string;
}

interface LinkRow extends RowBase {
  kind: "link";
}
interface ToggleRow extends RowBase {
  kind: "toggle";
  initial: boolean;
}
interface ValueRow extends RowBase {
  kind: "value";
  value: string;
}
type Row = LinkRow | ToggleRow | ValueRow;

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: "Notifications",
    rows: [
      { kind: "toggle", icon: Bell, tint: "#FF375F", label: "Push notifications", initial: true },
      { kind: "toggle", icon: Mail, tint: "#007AFF", label: "Email updates", initial: false },
    ],
  },
  {
    title: "Billing",
    rows: [
      { kind: "value", icon: CreditCard, tint: "#30D158", label: "AI credits", value: `${USER.credits} left` },
      { kind: "link", icon: FileText, tint: "#FF9F0A", label: "Invoices" },
      { kind: "link", icon: ShieldCheck, tint: "#007AFF", label: "Payment method" },
    ],
  },
  {
    title: "Preferences",
    rows: [
      { kind: "value", icon: Globe, tint: "#007AFF", label: "Language", value: "English" },
      { kind: "toggle", icon: Lock, tint: "#8E8E93", label: "Password protect moments", initial: false },
    ],
  },
  {
    title: "Support",
    rows: [
      { kind: "link", icon: LifeBuoy, tint: "#FF9F0A", label: "Help center" },
      { kind: "link", icon: Mail, tint: "#007AFF", label: "Contact support" },
    ],
  },
];

const STATS = [
  { label: "Created", value: String(USER.stats.created) },
  { label: "Sent", value: String(USER.stats.sent) },
  { label: "Open rate", value: USER.stats.openRate },
  { label: "Loves", value: String(USER.stats.loves) },
];

export function ProfileView() {
  const { notify, openSheet } = useMD();
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SECTIONS.flatMap((s) => s.rows).map((r, i) => [`${r.kind}-${r.label}-${i}`, r.kind === "toggle" ? r.initial : false])
    )
  );

  return (
    <div className="space-y-6 px-5 pb-36 pt-[88px]">
      <header>
        <LargeTitle>Profile</LargeTitle>
      </header>

      {/* Identity card */}
      <section aria-label="Account" className="card-shadow hairline rounded-[26px] bg-white p-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full text-[22px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(0,122,255,0.55)]"
            style={{ background: "linear-gradient(135deg, #007AFF 0%, #40B4FF 60%, #64D2FF 100%)" }}
          >
            {USER.initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[19px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{USER.name}</h2>
            <p className="truncate text-[13px] text-[#AAAAAA]">{USER.email}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#007AFF]/[0.1] px-2.5 py-1 text-[11px] font-semibold text-[#007AFF]">
              <Crown size={11} aria-hidden /> {USER.plan} plan
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[16px] bg-[#F5F5F7] px-2 py-2.5 text-center">
              <p className="text-[17px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{s.value}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-[#AAAAAA]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade banner */}
      <button
        type="button"
        onClick={() => openSheet("pricing")}
        className="relative w-full overflow-hidden rounded-[26px] bg-[#1D1D1F] p-5 text-left transition-transform active:scale-[0.98]"
      >
        <div
          aria-hidden
          className="absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-70 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(0,122,255,0.6), transparent 70%)" }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#7DC0FF] backdrop-blur-sm">
            <Zap size={11} aria-hidden /> Upgrade
          </span>
          <h2 className="mt-3 text-[19px] font-bold leading-snug tracking-[-0.02em] text-white">
            MemorableDay Personal
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
            Unlimited moments, 3D scenes and AI credits — from $9/month.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1F]">
              See plans
            </span>
            <span className="text-[11px] font-medium text-white/45">Billing via Dodo Payments</span>
          </div>
        </div>
      </button>

      {/* Grouped settings */}
      {SECTIONS.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <h2 className="mb-2 px-4 text-[12px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
            {section.title}
          </h2>
          <div className="card-shadow hairline divide-y divide-[#1D1D1F]/[0.06] overflow-hidden rounded-[22px] bg-white">
            {section.rows.map((row) => {
              const key = `${row.kind}-${row.label}`;
              const Icon = row.icon;
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
                    style={{ backgroundColor: `${row.tint}1A`, color: row.tint }}
                  >
                    <Icon size={16} strokeWidth={2.1} aria-hidden />
                  </span>
                  {row.kind === "toggle" ? (
                    <>
                      <span className="flex-1 text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F]">
                        {row.label}
                      </span>
                      <Switch
                        checked={toggles[key] ?? row.initial}
                        onCheckedChange={(v) => {
                          setToggles((t) => ({ ...t, [key]: v }));
                          notify(`${row.label} ${v ? "on" : "off"}`);
                        }}
                        className="data-[state=checked]:bg-[#30D158]"
                        aria-label={row.label}
                      />
                    </>
                  ) : row.kind === "value" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => notify(`${row.label} — settings preview`)}
                        className="flex-1 text-left text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F]"
                      >
                        {row.label}
                      </button>
                      <span className="text-[14px] text-[#AAAAAA]">{row.value}</span>
                      <ChevronRight size={15} className="text-[#C7C7CC]" aria-hidden />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => notify(`${row.label} — opening soon`)}
                      className="flex flex-1 items-center text-left text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F]"
                    >
                      {row.label}
                    </button>
                  )}
                  {row.kind === "link" ? (
                    <ChevronRight size={15} className="shrink-0 text-[#C7C7CC]" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Sign out */}
      <section aria-label="Sign out">
        <div className="card-shadow hairline overflow-hidden rounded-[22px] bg-white">
          <button
            type="button"
            onClick={() => notify("Sign out — UI preview")}
            className={cn(
              "flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-[#FF375F]",
              "transition-colors active:bg-[#FF375F]/[0.06]"
            )}
          >
            <LogOut size={16} aria-hidden /> Sign Out
          </button>
        </div>
      </section>

      <p className="pt-1 text-center text-[11px] font-medium text-[#AAAAAA]">
        MemorableDay · Make Every Moment Memorable
      </p>
    </div>
  );
}
