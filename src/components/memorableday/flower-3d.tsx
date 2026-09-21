"use client";

/**
 * flower-3d.tsx — the 3D flower stage (GLB models, selection-only block).
 *
 * Renders the user's rose GLB (public/models/rose-3d.glb — a 374K-vertex
 * Tripo-generated single red rose, meshopt-compressed, optimized 17.5 MB →
 * 5.7 MB) locked at its curated best angle. The rose is PERFECTLY STILL:
 * no drag, no spin, no zoom, no pan — touching it never moves it. One
 * beautiful angle, always.
 *
 * Anti-fade pipeline (the rose must read rich, never washed out):
 *  · NeutralToneMapping — keeps the deep reds saturated where the previous
 *    ACES curve desaturated highlights.
 *  · Warm 3-point + rim light so the petals separate from the dark stage,
 *    and a procedural room env for soft fill.
 *
 * Render budget: frameloop="demand" — frames render only while the 0.9s
 * entry animation plays; once the rose settles the canvas goes fully
 * static (a still rose re-rendering 374K verts 60×/s would cook phones).
 *
 * Model notes (from load-time forensics):
 *  · EXT_meshopt_compression + KHR_mesh_quantization — drei's useGLTF wires
 *    the MeshoptDecoder automatically.
 *  · The material is OPAQUE with packed textures — no alpha games needed.
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

/** How much of H the model fills. Tuned on the offline rig: 0.78 keeps the
 * WHOLE rose — bloom top, stem end, leaves — inside the frame with
 * breathing room (A/B vs 0.72/0.84 on the final render). */
const MODEL_FILL = 0.78;

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
      {/* rim — warm edge from behind so the petals read on the dark stage */}
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
  const { scene } = useGLTF(flower.model ?? "");
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

      // Generated bakes can carry hot metalness — tame it so the petals
      // read as velvet under stage light, not wet foil.
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        if (std.metalness > 0.55) std.metalness = 0.35;
        std.envMapIntensity = 0.5;
        std.needsUpdate = true;
      }
    });

    // Normalize: centered on origin, base at y=0, height H (at MODEL_FILL —
    // the whole rose always fits the frame with breathing room).
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
 * single frame (the rose never moves again, so the shadow never needs
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
      scale={2.9}
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

export function Flower3D({ flower, className }: { flower: Flower; className?: string }) {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const [settled, setSettled] = useState(false);

  // Best-angle camera — computed once from the curated hero framing and
  // NEVER moved: no controls are attached at all.
  const ty = (flower.ty ?? 0.38) * H;
  const camPos = useMemo(() => {
    const az = THREE.MathUtils.degToRad(flower.az ?? 20);
    const el = THREE.MathUtils.degToRad(flower.el ?? 12);
    const d = (flower.dist ?? 1.9) * H;
    return [d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), d * Math.cos(el) * Math.cos(az)] as const;
  }, [flower, ty]);

  return (
    // touchAction "pan-y": touches pass through as normal page scroll —
    // the rose ignores them entirely.
    <div className={className} style={{ touchAction: "pan-y" }}>
      <Canvas
        frameloop="demand"
        camera={{ fov: 34, position: [...camPos], near: 0.05, far: 80 }}
        onCreated={({ gl, camera }) => {
          // Neutral tone mapping keeps the rose's deep red saturated
          // (ACES washed the highlights out — the "faded" look).
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.16;
          camera.lookAt(0, ty, 0);
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <StudioLighting />
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
