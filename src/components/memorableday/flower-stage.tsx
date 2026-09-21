"use client";

/**
 * flower-stage.tsx — the flower stage.
 *
 * Two kinds of flowers live in the FLOWERS library:
 *
 *  · IMAGE flowers — the user's rose-bouquet artwork (cleaned, transparent
 *    PNGs) rendered as a perfectly still <img>: no canvas, no WebGL, no
 *    GLB download. The bouquet looks exactly like the reference photo,
 *    every time, on every device.
 *
 *  · MODEL flowers — the user's rose GLB (public/models/rose-3d.glb),
 *    rendered by the client-only WebGL stage at its curated best angle.
 *    three.js loads via next/dynamic (ssr: false) so image-only moments
 *    never download the 3D bundle; a soft progress veil covers the stream
 *    and a static SVG bloom is the graceful fallback if WebGL is missing.
 *
 * Both are PERFECTLY STILL: no drag, no spin, no zoom, no pan — pointer
 * events pass straight through so touching a flower never does anything.
 */
import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
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

/** Live download veil — appears while a GLB model streams in. */
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

/** Static SVG bloom — decorative fallback + list thumbnails. */
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

/**
 * The stage — one flower, floating frameless on the scene. Renders the
 * 3D canvas for MODEL flowers (WebGL, still at one best angle) or the
 * still image for IMAGE flowers. Both paths ignore pointer events, so a
 * touch always passes through as normal page scroll.
 */
export function FlowerStage({
  flowerId,
  className,
}: {
  flowerId?: string;
  className?: string;
}) {
  const f: Flower = resolveFlower(flowerId);
  const [loaded, setLoaded] = useState(false);

  // MODEL flower — WebGL stage at its curated angle.
  if (f.model) {
    return (
      <FlowerBoundary>
        <div className={cn("relative h-full w-full select-none", className)} style={{ touchAction: "pan-y" }}>
          <Flower3D key={f.id} flower={f} className="h-full w-full" />
          <LoadVeil name={f.name} />
        </div>
      </FlowerBoundary>
    );
  }

  // IMAGE flower — still artwork, ~90% of the stage height, centered: the
  // whole bouquet (bloom tops → ribbon tails) is always fully visible with
  // a little breathing room, and reads generously large.
  return (
    <div
      className={cn("relative h-full w-full select-none", className)}
      style={{ touchAction: "pan-y" }}
    >
      {/* soft bloom shimmer while the artwork streams in */}
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="relative">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-[#FF375F]/20"
              style={{ width: 74, height: 74 }}
            />
            <FlowerGlyph size={56} className="animate-pulse text-[#FF375F]/80" />
          </div>
        </div>
      ) : null}
      <img
        src={f.image}
        alt={f.caption}
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute left-1/2 top-1/2 h-[90%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-700",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
