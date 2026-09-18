"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  ChartPie,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  User,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { USER } from "@/lib/mock-data";
import { CountUp, LargeTitle } from "../bits";
import { useMD, type ThemeMode } from "../md-context";
import { cn } from "@/lib/utils";

interface RowBase {
  kind: "link" | "toggle" | "value";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tint: string;
  label: string;
}

interface LinkRow extends RowBase {
  kind: "link";
  action: () => void;
}
interface ToggleRow extends RowBase {
  kind: "toggle";
  initial: boolean;
}
interface ValueRow extends RowBase {
  kind: "value";
  value: string;
  action: () => void;
}
type Row = LinkRow | ToggleRow | ValueRow;

const STATS = [
  { label: "Created", value: String(USER.stats.created) },
  { label: "Sent", value: String(USER.stats.sent) },
  { label: "Open rate", value: USER.stats.openRate },
  { label: "Loves", value: String(USER.stats.loves) },
];

/* ------------------------------------------------------------------ */
/* AI credits ring                                                     */
/* ------------------------------------------------------------------ */

function CreditRing({ used, total }: { used: number; total: number }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, (total - used) / total));
  return (
    <div className="relative h-[92px] w-[92px] shrink-0" role="img" aria-label={`${total - used} of ${total} AI credits remaining`}>
      <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
        <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(0,122,255,0.12)" strokeWidth="9" />
        <motion.circle
          cx="46"
          cy="46"
          r={R}
          fill="none"
          stroke="url(#md-credit-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="md-credit-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#007AFF" />
            <stop offset="100%" stopColor="#64D2FF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={String(total - used)} className="text-[24px] font-bold tabular-nums tracking-[-0.03em] text-[#1D1D1F]" />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#AAAAAA]">left</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Appearance (theme mode) picker                                       */
/* ------------------------------------------------------------------ */

const THEME_MODES: Array<{
  value: ThemeMode;
  label: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  { value: "light", label: "Light", caption: "Bright canvas", icon: Sun },
  { value: "dark", label: "Dark", caption: "Low light", icon: Moon },
  { value: "system", label: "Auto", caption: "Match device", icon: MonitorSmartphone },
];

function AppearanceSection() {
  const { theme, setTheme } = useMD();
  return (
    <section aria-label="Appearance">
      <div className="card-shadow hairline rounded-[26px] bg-white p-4">
        <h2 className="mb-3 px-1 text-[13px] font-bold uppercase tracking-[0.07em] text-[#AAAAAA]">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {THEME_MODES.map((m) => {
            const active = theme === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(m.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-[20px] border-2 px-2 pb-3 pt-3.5 transition-all active:scale-[0.96]",
                  active ? "border-[#007AFF] bg-[#007AFF]/[0.05]" : "border-[#1D1D1F]/[0.06] bg-[#F5F5F7]"
                )}
              >
                {active ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute right-2 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#007AFF] text-white"
                  >
                    <Check size={12} strokeWidth={3.2} aria-hidden />
                  </motion.span>
                ) : null}
                {/* Mini preview swatch — mirrors the mode's canvas/card pairing */}
                <span
                  aria-hidden
                  className={cn(
                    "h-[34px] w-[34px] rounded-[11px] border border-[#1D1D1F]/[0.08]",
                    m.value === "light"
                      ? "bg-gradient-to-br from-[#FFFFFF] to-[#E9E9EE]"
                      : m.value === "dark"
                        ? "bg-gradient-to-br from-[#2C2C2E] to-[#0A0A0C]"
                        : "bg-[linear-gradient(135deg,#F5F5F7_0%,#F5F5F7_49%,#1C1C1E_51%,#0A0A0C_100%)]"
                  )}
                />
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFFFFF] text-[#007AFF] shadow-[0_4px_10px_-4px_rgba(29,29,31,0.25)] dark:bg-[#3A3A3C]">
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <span className="text-center">
                  <span className="block text-[12.5px] font-bold tracking-[-0.01em] text-[#1D1D1F]">{m.label}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-[#AAAAAA]">{m.caption}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[11px] font-medium leading-relaxed text-[#AAAAAA]">
          Auto follows your device's light & dark schedule.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Profile view                                                        */
/* ------------------------------------------------------------------ */

export function ProfileView() {
  const { notify, openSheet, openSettings, openInsights, openAuth, openTour } = useMD();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const sections: Array<{ title: string; rows: Row[] }> = [
    {
      title: "Insights",
      rows: [
        { kind: "link", icon: ChartPie, tint: "#007AFF", label: "Insights & analytics", action: () => openInsights("7d") },
      ],
    },
    {
      title: "Notifications",
      rows: [
        { kind: "toggle", icon: Bell, tint: "#FF375F", label: "Push notifications", initial: true },
        { kind: "toggle", icon: Mail, tint: "#007AFF", label: "Email updates", initial: false },
        { kind: "link", icon: SlidersHorizontal, tint: "#5E5CE6", label: "Notification preferences", action: () => openSettings("notifications") },
      ],
    },
    {
      title: "Billing",
      rows: [
        { kind: "value", icon: CreditCard, tint: "#30D158", label: "AI credits", value: `${USER.credits - 64} left`, action: () => openSheet("pricing") },
        { kind: "link", icon: FileText, tint: "#FF9F0A", label: "Invoices", action: () => notify("Invoices — UI preview") },
        { kind: "link", icon: ShieldCheck, tint: "#007AFF", label: "Payment method", action: () => notify("Payment method — UI preview") },
      ],
    },
    {
      title: "Preferences",
      rows: [
        { kind: "value", icon: Globe, tint: "#007AFF", label: "Language", value: "English", action: () => notify("Language — UI preview") },
        { kind: "toggle", icon: Lock, tint: "#8E8E93", label: "Password protect moments", initial: false },
        { kind: "link", icon: ShieldCheck, tint: "#30D158", label: "Privacy & security", action: () => openSettings("privacy") },
      ],
    },
    {
      title: "Support",
      rows: [
        { kind: "link", icon: LifeBuoy, tint: "#FF9F0A", label: "Help center", action: () => openSettings("help") },
        { kind: "link", icon: Mail, tint: "#007AFF", label: "Contact support", action: () => openSettings("help") },
        { kind: "link", icon: BookOpen, tint: "#5E5CE6", label: "Replay welcome tour", action: openTour },
      ],
    },
  ];

  return (
    <div className="px-5 pb-36 pt-[88px] md:px-8 md:pb-16 lg:px-10">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <header>
        <LargeTitle>Profile</LargeTitle>
      </header>

      {/* Identity card — opens Account settings */}
      <section aria-label="Account">
        <button
          type="button"
          onClick={() => openSettings("account")}
          aria-label="Open account settings"
          className="card-shadow hairline lift active:scale-[0.98] w-full rounded-[26px] bg-white p-5 text-left transition-transform"
        >
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
            <span className="flex shrink-0 flex-col items-center gap-1 text-[#C7C7CC]">
              <User size={17} aria-hidden />
            </span>
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
        </button>
      </section>

      {/* AI credits + appearance — side by side from `lg` */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
      {/* AI credits */}
      <section aria-label="AI credits" className="lg:flex lg:flex-col">
        <div className="card-shadow hairline flex items-center gap-4 rounded-[26px] bg-white p-4">
          <CreditRing used={64} total={USER.credits} />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 text-[16px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
              <Sparkles size={15} className="text-[#5E5CE6]" aria-hidden /> AI Credits
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#AAAAAA]">
              Powers the AI Creator, tone adjuster and scene suggester.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openSheet("pricing")}
                className="rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white pill-shadow transition-transform active:scale-95"
              >
                Get more
              </button>
              <span className="text-[11px] font-medium text-[#AAAAAA]">Resets Nov 1</span>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance (light / dark / auto) */}
      <div className="lg:flex lg:flex-col"><AppearanceSection /></div>
      </div>

      {/* Upgrade banner */}
      <button
        type="button"
        onClick={() => openSheet("pricing")}
        className="relative w-full overflow-hidden rounded-[26px] bg-[#1D1D1F] p-5 text-left transition-transform active:scale-[0.98]"
      >
        <div
          aria-hidden
          className="md-float absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-70 blur-2xl"
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

      {/* Grouped settings — two columns from `lg` */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-6">
      {sections.map((section) => (
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
                  ) : (
                    <button
                      type="button"
                      onClick={row.action}
                      className="flex flex-1 items-center justify-between text-left"
                    >
                      <span className="text-[15px] font-medium tracking-[-0.01em] text-[#1D1D1F]">
                        {row.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {row.kind === "value" ? (
                          <span className="text-[14px] text-[#AAAAAA]">{row.value}</span>
                        ) : null}
                        <ChevronRight size={15} className="text-[#C7C7CC]" aria-hidden />
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      </div>

      {/* Sign out */}
      <section aria-label="Sign out">
        <div className="card-shadow hairline overflow-hidden rounded-[22px] bg-white">
          <button
            type="button"
            onClick={() => {
              notify("You signed out — UI preview");
              openAuth("signin");
            }}
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
    </div>
  );
}
