"use client";

/**
 * CouponMachine SFX — tiny synthesized arcade sounds (WebAudio, no assets).
 * All sounds fire from user gestures (PLAY / COPY), so the AudioContext is
 * created lazily on first use and never trips autoplay policies. Volume is
 * deliberately low; a visible mute toggle on the machine persists the choice.
 */
import { useCallback, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "md-coupon-sfx";

export type MachineSfxName = "press" | "whirr" | "grab" | "win" | "copy";

interface SfxController {
  /** Fire a named sound (no-op while muted or before the first gesture). */
  play: (name: MachineSfxName) => void;
  muted: boolean;
  toggle: () => void;
}

/* ---- tiny external store for the persisted mute preference ---- */

let currentMuted: boolean | null = null;
const listeners = new Set<() => void>();

function isMuted(): boolean {
  if (currentMuted === null) {
    try {
      currentMuted = window.localStorage.getItem(STORAGE_KEY) === "off";
    } catch {
      currentMuted = false;
    }
  }
  return currentMuted;
}

function writeMuted(next: boolean): void {
  currentMuted = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "off" : "on");
  } catch {
    /* private mode — session-only preference */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function serverMuted(): boolean {
  return false;
}

/** Enveloped oscillator blip — the one primitive every sound is built from. */
function blip(
  ctx: AudioContext,
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  at: number,
  dur: number,
  gain: number
) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, t0);
  if (toHz !== fromHz) osc.frequency.exponentialRampToValueAtTime(Math.max(30, toHz), t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.3));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** The stable per-mount sound controller used by the machine + the flow hook. */
export function useMachineSfx(): SfxController {
  const ctxRef = useRef<AudioContext | null>(null);
  const muted = useSyncExternalStore(subscribe, isMuted, serverMuted);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (name: MachineSfxName) => {
      if (isMuted()) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      switch (name) {
        case "press": // chunky button thunk
          blip(ctx, "triangle", 170, 110, 0, 0.09, 0.07);
          break;
        case "whirr": // descending motor sweep while the claw searches
          blip(ctx, "sawtooth", 330, 150, 0, 0.5, 0.025);
          blip(ctx, "sawtooth", 250, 120, 0.12, 0.42, 0.02);
          break;
        case "grab": // metallic clack as the pincers snap shut
          blip(ctx, "square", 120, 70, 0, 0.045, 0.06);
          blip(ctx, "square", 95, 55, 0.045, 0.05, 0.045);
          break;
        case "win": // bright little arpeggio at the reveal
          blip(ctx, "sine", 523, 523, 0, 0.1, 0.05);
          blip(ctx, "sine", 659, 659, 0.09, 0.1, 0.05);
          blip(ctx, "sine", 784, 784, 0.18, 0.1, 0.05);
          blip(ctx, "sine", 1047, 1047, 0.27, 0.22, 0.055);
          break;
        case "copy": // pop on copy
          blip(ctx, "sine", 620, 940, 0, 0.07, 0.045);
          break;
      }
    },
    [ensureCtx]
  );

  const toggle = useCallback(() => {
    writeMuted(!isMuted());
  }, []);

  return { play, muted, toggle };
}
