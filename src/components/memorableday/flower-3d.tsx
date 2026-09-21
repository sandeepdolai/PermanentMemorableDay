"use client";

/**
 * flower-3d.tsx — the 3D flower stage (GLB models, selection-only block).
 *
 * Renders the user's rose-bouquet GLB (public/models/rose-bouquet.glb — a
 * 1.86M-triangle photogrammetry model, opaque, meshopt-compressed) locked at
 * its curated best angle. The bouquet is PERFECTLY STILL: no drag, no spin,
 * no zoom, no pan — touching it never moves it. One beautiful angle, always.
 *
 * Anti-fade pipeline (the bouquet must read rich, never washed out):
 *  · NeutralToneMapping — keeps the deep reds saturated where the previous
 *    ACES curve desaturated highlights.
 *  · Warm 3-point + rim light so the black wrapping separates from the dark
 *    stage, and a procedural room env for soft fill.
 *
 * Render budget: frameloop="demand" — frames render only while the 0.9s
 * entry animation plays; once the bouquet settles the canvas goes fully
 * static (a still flower re-rendering 1.86M tris 60×/s would cook phones).
 *
 * Model notes (from load-time forensics):
 *  · EXT_meshopt_compression + KHR_mesh_quantization — drei's useGLTF wires
 *    the MeshoptDecoder automatically.
 *  · The material is OPAQUE with a packed ORM texture — no alpha games needed.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Flower } from "@/lib/md-blocks";

/** Normalized model height in world units — the stage is built around it. */
const H = 1.7;

/** How much of H the bouquet itself fills — pulled back from 0.94 to 0.80 so
 * the ENTIRE bouquet (blooms → wrap → stem tip) is always inside the frame,
 * exactly like the reference photo: never cropped, never hidden. */
const MODEL_FILL = 0.8;

/* ------------------------------------------------------------------ */
/* The message card — a paper card tucked BEHIND the top roses,        */
/* peeking up above the blooms exactly like the reference photo.       */
/* It sits behind the bouquet, so it can never hide a single petal —   */
/* the whole bouquet always reads in front of it, fully visible.       */
/* ------------------------------------------------------------------ */

const CARD_W = 0.84;
const CARD_H = 0.52;
/** Card center height — the bottom edge (≈1.14) sits just behind the flower
 * tops (bouquet top ≈ 1.36) so the card reads as genuinely tucked INTO the
 * bouquet, nestled behind the blooms like the reference photo. */
const CARD_Y = 1.4;
const CARD_Z = -0.22;

/** Classic heart path centered on (x, y) at size s (px). */
function paintHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x - s / 2, y - s * 0.45);
  ctx.scale(s / 24, s / 24);
  ctx.beginPath();
  ctx.moveTo(12, 21);
  ctx.bezierCurveTo(4, 14, 0, 9.5, 0, 5.5);
  ctx.bezierCurveTo(0, 2.5, 2.2, 0.5, 4.8, 0.5);
  ctx.bezierCurveTo(7, 0.5, 10, 2, 12, 5);
  ctx.bezierCurveTo(14, 2, 17, 0.5, 19.2, 0.5);
  ctx.bezierCurveTo(21.8, 0.5, 24, 2.5, 24, 5.5);
  ctx.bezierCurveTo(24, 9.5, 20, 14, 12, 21);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Draws the card face — cream paper, heart accent, the sender's message in
 * italic serif (auto-fitted), and the three little hearts from the reference
 * photo (yellow · orange · red). */
function makeCardTexture(message: string): THREE.CanvasTexture {
  const W = 768;
  const Hpx = 480;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Hpx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Paper — cream vertical gradient, softly rounded, thin warm edge.
  const paper = ctx.createLinearGradient(0, 0, 0, Hpx);
  paper.addColorStop(0, "#FFFDF6");
  paper.addColorStop(1, "#FBF3E4");
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, Hpx - 12, 38);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(120, 78, 42, 0.16)";
  ctx.stroke();

  // Top thread accent (the brand's little red thread).
  const thread = ctx.createLinearGradient(0, 0, W, 0);
  thread.addColorStop(0, "rgba(255,55,95,0)");
  thread.addColorStop(0.5, "rgba(255,55,95,0.35)");
  thread.addColorStop(1, "rgba(255,55,95,0)");
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, 9, 4.5);
  ctx.fillStyle = thread;
  ctx.fill();

  // Heart accent at the top.
  paintHeart(ctx, W / 2, 78, 34, "#FF375F");

  // The message — italic serif, auto-fit: start large, shrink until the
  // whole text fits the writing area (e-commerce notes up to 220 chars).
  const text = (message || "").trim() || "A bouquet for you.";
  const maxW = W - 130;
  const topY = 132;
  const botY = 352;
  const font = (sz: number) => `italic 500 ${sz}px Georgia, "Times New Roman", serif`;
  const wrapAt = (sz: number) => {
    ctx.font = font(sz);
    const words = text.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out;
  };
  let size = 58;
  let lines = wrapAt(size);
  for (; size > 26; size -= 2) {
    lines = wrapAt(size);
    if (lines.length * size * 1.42 <= botY - topY) break;
  }
  ctx.font = font(size);
  ctx.fillStyle = "#3E2A1E";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineH = size * 1.42;
  let y = topY + (botY - topY - lines.length * lineH) / 2 + lineH / 2;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += lineH;
  }

  // The three little hearts from the reference card.
  paintHeart(ctx, W / 2 - 48, 412, 18, "#F5C518");
  paintHeart(ctx, W / 2, 418, 21, "#FF8A3D");
  paintHeart(ctx, W / 2 + 48, 412, 18, "#FF375F");

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function MessageCard({ message, reducedMotion }: { message: string; reducedMotion: boolean }) {
  const tex = useMemo(() => makeCardTexture(message), [message]);
  useEffect(() => () => tex.dispose(), [tex]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const grp = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  // Gentle entrance — the card rises from behind the flowers and fades in,
  // inside the same demand-frameloop window as the bouquet's entry.
  useFrame((state) => {
    if (doneRef.current) return;
    if (reducedMotion) {
      if (mat.current) mat.current.opacity = 1;
      if (grp.current) grp.current.position.y = CARD_Y;
      doneRef.current = true;
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = THREE.MathUtils.clamp((state.clock.elapsedTime - startRef.current - 0.18) / 0.6, 0, 1);
    const e = easeOutCubic(t);
    if (mat.current) mat.current.opacity = e;
    if (grp.current) grp.current.position.y = CARD_Y - 0.1 * (1 - e);
    if (t >= 1) {
      doneRef.current = true;
    } else {
      state.invalidate();
    }
  });

  return (
    <group ref={grp} position={[0, CARD_Y, CARD_Z]}>
      {/* tilted back a touch so the face turns up toward the elevated camera */}
      <mesh rotation={[-0.1, 0, -0.02]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {/* Unlit (basic) material — the card renders EXACTLY as painted on
         * the canvas: crisp cream paper, high-contrast text, never washed
         * out by the stage lights or tone mapping. */}
        <meshBasicMaterial
          ref={mat}
          map={tex}
          transparent
          opacity={reducedMotion ? 1 : 0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Studio lighting — procedural env (no network HDR) + 3-point + rim    */
/* ------------------------------------------------------------------ */

function StudioLighting() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    // eslint-disable-next-line react-hooks/immutability -- three.js scene objects are mutable by design; this is the standard env-map pattern
    scene.environment = env.texture;
    scene.environmentIntensity = 0.4;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={["#fff1f4", "#2b1512", 0.5]} />
      {/* key — warm, from upper front-right */}
      <directionalLight position={[2.6, 4.2, 3.2]} intensity={1.75} color="#fff6ee" />
      {/* fill — soft pink from the left */}
      <directionalLight position={[-3.4, 1.6, 1.8]} intensity={0.55} color="#ffe3ec" />
      {/* rim — warm edge from behind so the black wrapping reads on the dark stage */}
      <directionalLight position={[-2.2, 3.4, -3.4]} intensity={1.1} color="#ffd9a8" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The model — clone, soften metals, normalize, gentle entry,           */
/* then signal "settled" so the stage can freeze (demand frameloop).    */
/* ------------------------------------------------------------------ */

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function FlowerModel({
  flower,
  reducedMotion,
  onSettled,
}: {
  flower: Flower;
  reducedMotion: boolean;
  onSettled: () => void;
}) {
  const { scene } = useGLTF(flower.model);
  const entry = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  // Clone + harden + normalize. Keyed by the cached scene + flower — a
  // remount (parent keys by flower id) rebuilds everything.
  const model = useMemo(() => {
    const root = skeletonClone(scene);

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;

      // Photogrammetry bakes can carry hot metalness — tame it so the
      // wrapping reads as paper under stage light, not wet foil.
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        if (std.metalness > 0.55) std.metalness = 0.35;
        std.envMapIntensity = 0.5;
        std.needsUpdate = true;
      }
    });

    // Normalize: centered on origin, base at y=0, height H — at MODEL_FILL
    // so the whole bouquet always fits the frame with breathing room.
    const bbox = new THREE.Box3().setFromObject(root);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const s = (H * MODEL_FILL) / size.y;
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -bbox.min.y * s, -center.z * s);

    const wrap = new THREE.Group();
    wrap.add(root);
    return wrap;
  }, [scene, flower]);

  // Entry: a soft scale-up + rise (0.9s, eased). Snaps when reduced motion.
  // While it plays the frame is re-invalidated so the demand frameloop keeps
  // rendering; when it completes the loop is left to freeze.
  useFrame((state) => {
    const g = entry.current;
    if (!g || settledRef.current) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = reducedMotion
      ? 1
      : THREE.MathUtils.clamp((state.clock.elapsedTime - startRef.current) / 0.9, 0, 1);
    const e = easeOutCubic(t);
    g.scale.setScalar(0.86 + 0.14 * e);
    g.position.y = -0.07 * (1 - e);
    if (t >= 1) {
      settledRef.current = true;
      onSettled();
    } else {
      state.invalidate();
    }
  });

  return (
    <group ref={entry}>
      <primitive object={model} />
    </group>
  );
}

/** Grounding shadow — mounted only after the entry settles, rendered in a
 * single frame (the bouquet never moves again, so the shadow never needs
 * to move either). */
function SettledShadow({ visible }: { visible: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (visible) invalidate();
  }, [visible, invalidate]);
  if (!visible) return null;
  return (
    <ContactShadows
      position={[0, 0.001, 0]}
      scale={2.5}
      blur={2.4}
      far={1.4}
      opacity={0.32}
      color="#1d0a12"
      frames={1}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export function Flower3D({
  flower,
  message,
  className,
}: {
  flower: Flower;
  /** The sender's note — painted on the paper card tucked behind the roses. */
  message?: string;
  className?: string;
}) {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const [settled, setSettled] = useState(false);

  // Best-angle camera — computed once from the curated hero framing and
  // NEVER moved: no controls are attached at all.
  const ty = flower.ty * H;
  const camPos = useMemo(() => {
    const az = THREE.MathUtils.degToRad(flower.az);
    const el = THREE.MathUtils.degToRad(flower.el);
    const d = flower.dist * H;
    return [d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), d * Math.cos(el) * Math.cos(az)] as const;
  }, [flower, ty]);

  return (
    // touchAction "pan-y": touches pass through as normal page scroll —
    // the bouquet ignores them entirely.
    <div className={className} style={{ touchAction: "pan-y" }}>
      <Canvas
        frameloop="demand"
        camera={{ fov: 34, position: [...camPos], near: 0.05, far: 80 }}
        onCreated={({ gl, camera }) => {
          // Neutral tone mapping keeps the roses' deep red saturated
          // (ACES washed the highlights out — the "faded" look).
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.16;
          camera.lookAt(0, ty, 0);
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <StudioLighting />
        {/* The card is behind the bouquet — it can never cover a petal. */}
        <MessageCard message={message ?? ""} reducedMotion={reducedMotion} />
        <Suspense fallback={null}>
          <FlowerModel
            key={flower.id}
            flower={flower}
            reducedMotion={reducedMotion}
            onSettled={() => setSettled(true)}
          />
        </Suspense>
        <SettledShadow visible={settled} />
      </Canvas>
    </div>
  );
}

/* The bouquet is 17.7 MB — warm the cache as soon as a flower stage mounts
 * (the load veil covers the wait). */
useGLTF.preload("/models/rose-bouquet.glb");
