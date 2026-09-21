"use client";

/**
 * flower-stage.tsx — the client-only wrapper for the 3D flower stage.
 *
 * The R3F canvas loads via next/dynamic (ssr: false) so three.js never runs
 * on the server. While the bouquet (~18 MB) downloads, a soft progress veil
 * shows the live percentage; a static SVG bloom is the graceful fallback if
 * WebGL is unavailable.
 */
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { useProgress } from "@react-three/drei";
import { cn } from "@/lib/utils";
import { flower as resolveFlower, type Flower } from "@/lib/md-blocks";

const Flower3D = dynamic(() => import("./flower-3d").then((m) => m.Flower3D), {
  ssr: false,
  loading: () => <FlowerLoading />,
});

function FlowerLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#FF375F]/20" style={{ width: 74, height: 74 }} />
        <svg width="56" height="56" viewBox="0 0 24 24" className="animate-pulse text-[#FF375F]/80" fill="currentColor">
          <path d="M12 2c1.9 2.2 2.9 4.4 2.9 6.6 0 1.2-.3 2.3-.9 3.3 1.5-.4 2.7-1.3 3.6-2.8.3 1 .4 1.9.4 2.8 0 4-2.7 7.3-6.5 8.1V22h-1v-2c-3.8-.8-6.5-4.1-6.5-8.1 0-.9.1-1.8.4-2.8.9 1.5 2.1 2.4 3.6 2.8-.6-1-.9-2.1-.9-3.3C6.6 6.4 7.6 4.2 9.5 2c.8.9 1.5 2 2 3.2.5-1.2 1.2-2.3 2-3.2h-1.5Z" />
        </svg>
      </div>
    </div>
  );
}

/** Live download veil — appears while the GLB streams in. */
function LoadVeil({ name }: { name: string }) {
  const { active, progress } = useProgress();
  if (!active || progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5">
      <FlowerLoading />
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
        Blooming the {name.toLowerCase()} · {Math.round(progress)}%
      </p>
    </div>
  );
}

/** Static SVG bloom — WebGL fallback + list thumbnails. */
export function FlowerGlyph({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      fill="none"
    >
      {/* spiral bloom */}
      <path
        d="M32 12c7 4 11 9.5 11 15.5 0 3-1.2 5.6-3.2 7.6 3.6-1 6.4-3.3 8.2-7 .6 2.3.8 4.4.8 6.4 0 9.3-7.5 16.9-16.8 16.9S15 43.8 15 34.5c0-2 .2-4.1.8-6.4 1.8 3.7 4.6 6 8.2 7-2-2-3.2-4.6-3.2-7.6C20.8 21.5 25 16 32 12Z"
        fill="url(#flowerG1)"
      />
      <path
        d="M32 20c3.6 2.6 5.6 5.7 5.6 9.2 0 2.6-1.2 4.8-3.2 6.4 2.6-.6 4.6-2.2 5.8-4.6.3 1.3.4 2.5.4 3.6 0 5.4-4 9.8-9.3 10.6v1.6h-1.3v-1.6c-5.3-.8-9.3-5.2-9.3-10.6 0-1.1.1-2.3.4-3.6 1.2 2.4 3.2 4 5.8 4.6-2-1.6-3.2-3.8-3.2-6.4 0-3.5 2-6.6 5.6-9.2l1.7 2.4L32 20Z"
        fill="#C2185B"
        fillOpacity="0.5"
      />
      {/* stem */}
      <path d="M32.5 48c.3 4-.5 8-2.5 12h1.6c2-4 2.7-8 2.4-12h-1.5Z" fill="#4A8746" />
      {/* leaf */}
      <path d="M33 55c4.5-1.5 8-4.5 10-9-5-.5-9 1-11.5 4.5l1.5 4.5Z" fill="#3E7C3A" />
      <path d="M31 59c-4.5-1-7.5-3.5-9.5-7.5 4.5-.5 8 .5 10.5 3.5l-1 4Z" fill="#4C8A47" />
      <defs>
        <linearGradient id="flowerG1" x1="32" y1="12" x2="32" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F06292" />
          <stop offset="1" stopColor="#AD1457" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** WebGL error boundary → static bloom fallback. */
class FlowerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* WebGL unavailable — the static glyph is enough */
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <FlowerGlyph size={120} />
        </div>
      );
    }
    return this.props.children;
  }
}

export function FlowerStage({
  flowerId,
  message,
  className,
}: {
  flowerId?: string;
  /** The sender's note — painted on the 3D card tucked behind the roses. */
  message?: string;
  className?: string;
}) {
  const f: Flower = resolveFlower(flowerId);
  return (
    <FlowerBoundary>
      <div className="relative h-full w-full">
        <Flower3D key={f.id} flower={f} message={message} className={cn("h-full w-full", className)} />
        <LoadVeil name={f.name} />
      </div>
    </FlowerBoundary>
  );
}
