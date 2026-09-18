import { AppShell } from "@/components/memorableday/app-shell";

/**
 * MemorableDay — app UI/UX (iOS design language).
 * Single-route app shell with floating pill navigation.
 */
export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Ambient background — visible on wide screens outside the app column */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[480px] w-[480px] rounded-full bg-[#007AFF]/[0.14] blur-[130px]" />
        <div className="absolute -right-44 top-1/3 h-[440px] w-[440px] rounded-full bg-[#FF6482]/[0.10] blur-[130px]" />
        <div className="absolute -bottom-44 left-1/4 h-[440px] w-[440px] rounded-full bg-[#64D2FF]/[0.12] blur-[130px]" />
      </div>

      <AppShell />
    </div>
  );
}
