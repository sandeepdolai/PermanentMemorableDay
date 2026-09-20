"use client";

/**
 * flower-3d.tsx — the real 3D flower stage (GLB models).
 *
 * Renders the user-authored flower models (public/models/*.glb) with a
 * curated hero camera per variety ("best angle"), a slow optional turntable,
 * and the model's own baked animation (the azalea ships a looping bee).
 *
 * Model hardening done at load (never touching the files on disk):
 *  · rose.glb exports TEXCOORD_0 as all zeros — the real UVs live in
 *    TEXCOORD_1, so the rebind below restores textured rendering.
 *  · the azalea's PBR metalness makes it look wet-plastic under stage
 *    light — metalness is zeroed for an organic read.
 *  · every model is auto-normalized (centered, base on the ground, unit
 *    height) so both varieties compose identically in the stage.
 *
 * Recipients can drag to look around the flower — zoom is intentionally
 * disabled so the curated framing is always preserved.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FlowerMotion, FlowerVariety } from "@/lib/md-blocks";

/** Normalized model height in world units — the stage is built around it. */
const H = 1.7;

/** Per-variety light rig tuning (soft env for the matte azalea). */
const LIGHT_RIG: Record<string, { env: number; key: number }> = {
  rose: { env: 0.42, key: 1.7 },
  azalea: { env: 0.2, key: 1.3 },
};

/* ------------------------------------------------------------------ */
/* Studio lighting — procedural environment (no network HDR) + 3-point  */
/* ------------------------------------------------------------------ */

function StudioLighting({ variety }: { variety: FlowerVariety }) {
  const { gl, scene } = useThree();
  const rig = LIGHT_RIG[variety.id] ?? LIGHT_RIG.rose;

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    // eslint-disable-next-line react-hooks/immutability -- three.js scene objects are mutable by design; this is the standard env-map pattern
    scene.environment = env.texture;
    scene.environmentIntensity = rig.env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, rig.env]);

  return (
    <>
      <hemisphereLight args={["#fff1f4", "#30201c", 0.5]} />
      <directionalLight position={[2.6, 4.2, 3.2]} intensity={rig.key} color="#fff6ee" />
      <directionalLight position={[-3.4, 1.6, 1.8]} intensity={0.5} color="#ffe3ec" />
      <directionalLight position={[-1.2, 3.0, -3.6]} intensity={0.8} color="#ffc9d9" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The model — clone, harden, normalize, animate                        */
/* ------------------------------------------------------------------ */

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function FlowerModel({ variety, reducedMotion }: { variety: FlowerVariety; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(variety.model);
  const entry = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);

  // Clone (skeleton-safe) + harden + normalize. Keyed by the cached scene +
  // variety — a remount (parent keys by variety id) rebuilds everything.
  const model = useMemo(() => {
    const root = skeletonClone(scene);

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;

      // ① exporter-broken UVs: TEXCOORD_0 all zeros, real atlas UVs in uv1
      const uv = mesh.geometry.getAttribute("uv");
      const uv1 = mesh.geometry.getAttribute("uv1");
      if (uv && uv1) {
        let dead = true;
        for (let i = 0; i < Math.min(uv.count, 64) && dead; i++) {
          if (uv.getX(i) !== 0 || uv.getY(i) !== 0) dead = false;
        }
        if (dead) {
          let alive = false;
          for (let i = 0; i < Math.min(uv1.count, 64) && !alive; i++) {
            if (uv1.getX(i) !== 0 || uv1.getY(i) !== 0) alive = true;
          }
          if (alive) mesh.geometry.setAttribute("uv", uv1);
        }
      }

      // ② organic read — kill baked metalness, tame the env reflections
      if (variety.matte) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          const std = m as THREE.MeshStandardMaterial;
          std.metalness = 0;
          std.metalnessMap = null;
          std.envMapIntensity = 0.3;
          std.roughness = Math.max(std.roughness, 0.45);
        }
      }

      // ③ full opacity — the rose's BLEND atlas is effectively binary alpha;
      //    blended rendering leaves petals washed-out and mis-sorted. An
      //    opaque alphaTest cutout keeps them solid and correctly depth-sorted.
      if (variety.cutout) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          const std = m as THREE.MeshStandardMaterial;
          std.transparent = false;
          std.alphaTest = 0.5;
          std.depthWrite = true;
          std.needsUpdate = true;
        }
      }
    });

    // ④ normalize: centered on origin, base at y=0, height H
    const bbox = new THREE.Box3().setFromObject(root);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const s = (H * 0.94) / size.y;
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -bbox.min.y * s, -center.z * s);

    const wrap = new THREE.Group();
    wrap.add(root);
    return wrap;
  }, [scene, variety]);

  // The model's own clip (azalea: the bee) — loop it, unless reduced motion.
  const { actions } = useAnimations(animations, model);
  useEffect(() => {
    if (!variety.playAnim || reducedMotion) return;
    const action = Object.values(actions)[0];
    if (!action) return;
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      action.stop();
    };
  }, [actions, variety, reducedMotion]);

  // Entry: a soft scale-up + rise (0.9s, eased). Snaps when reduced motion.
  useFrame((state) => {
    const g = entry.current;
    if (!g) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = reducedMotion
      ? 1
      : THREE.MathUtils.clamp((state.clock.elapsedTime - startRef.current) / 0.9, 0, 1);
    const e = easeOutCubic(t);
    g.scale.setScalar(0.86 + 0.14 * e);
    g.position.y = -0.07 * (1 - e);
  });

  return (
    <group ref={entry}>
      <primitive object={model} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig — curated best angle + optional turntable                 */
/* ------------------------------------------------------------------ */

function Rig({ variety, motion, reducedMotion }: { variety: FlowerVariety; motion: FlowerMotion; reducedMotion: boolean }) {
  const az = THREE.MathUtils.degToRad(variety.az);
  const el = THREE.MathUtils.degToRad(variety.el);
  const d = variety.dist * H;
  const ty = variety.ty * H;

  return (
    <OrbitControls
      target={[0, ty, 0]}
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.75}
      minPolarAngle={0.3}
      maxPolarAngle={1.52}
      autoRotate={motion === "spin" && !reducedMotion}
      autoRotateSpeed={1.3}
      makeDefault
    />
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export function Flower3D({
  variety,
  motion = "still",
  className,
}: {
  variety: FlowerVariety;
  motion?: FlowerMotion;
  className?: string;
}) {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Hero camera position from the curated best angle.
  const camPos = useMemo(() => {
    const az = THREE.MathUtils.degToRad(variety.az);
    const el = THREE.MathUtils.degToRad(variety.el);
    const d = variety.dist * H;
    const ty = variety.ty * H;
    return [d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), d * Math.cos(el) * Math.cos(az)] as const;
  }, [variety]);

  return (
    <div className={className} style={{ touchAction: "none" }}>
      <Canvas
        camera={{ fov: 34, position: [...camPos], near: 0.05, far: 80 }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.12;
        }}
        dpr={[1.5, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <StudioLighting variety={variety} />
        <Suspense fallback={null}>
          <FlowerModel key={variety.id} variety={variety} reducedMotion={reducedMotion} />
        </Suspense>
        <ContactShadows
          position={[0, 0.001, 0]}
          scale={2.9}
          blur={2.4}
          far={1.4}
          opacity={0.28}
          color="#2b0f1d"
          frames={variety.playAnim ? Infinity : 60}
        />
        <Rig variety={variety} motion={motion} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

/* The default variety is small (728 KB) — warm the cache for instant first
 * paint. The azalea (13 MB) is only fetched when it's actually selected. */
useGLTF.preload("/models/rose.glb");
