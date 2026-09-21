"use client";

/**
 * flower-3d.tsx — the 3D flower stage (GLB models, selection-only block).
 *
 * Renders the user's rose-bouquet GLB (public/models/rose-bouquet.glb — a
 * 1.86M-triangle photogrammetry model, opaque, meshopt-compressed) at its
 * curated hero angle. Recipients can drag to look around — no zoom, no pan,
 * no spin, no extras: the flower is the whole block.
 *
 * Model notes (from load-time forensics):
 *  · EXT_meshopt_compression + KHR_mesh_quantization — drei's useGLTF wires
 *    the MeshoptDecoder automatically.
 *  · The material is OPAQUE with a packed ORM texture — no alpha games needed.
 *  · The black wrapping needs a warm rim light to separate from the dark
 *    stage backdrop (the gold trim + rim do the work).
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Flower } from "@/lib/md-blocks";

/** Normalized model height in world units — the stage is built around it. */
const H = 1.7;

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
    scene.environmentIntensity = 0.42;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={["#fff1f4", "#2b1512", 0.55]} />
      {/* key — warm, from upper front-right */}
      <directionalLight position={[2.6, 4.2, 3.2]} intensity={1.7} color="#fff6ee" />
      {/* fill — soft pink from the left */}
      <directionalLight position={[-3.4, 1.6, 1.8]} intensity={0.5} color="#ffe3ec" />
      {/* rim — warm edge from behind so the black wrapping reads on the dark stage */}
      <directionalLight position={[-2.2, 3.4, -3.4]} intensity={1.05} color="#ffd9a8" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The model — clone, soften metals, normalize, gentle entry            */
/* ------------------------------------------------------------------ */

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function FlowerModel({ flower, reducedMotion }: { flower: Flower; reducedMotion: boolean }) {
  const { scene } = useGLTF(flower.model);
  const entry = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);

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
        std.envMapIntensity = 0.45;
        std.needsUpdate = true;
      }
    });

    // Normalize: centered on origin, base at y=0, height H.
    const bbox = new THREE.Box3().setFromObject(root);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const s = (H * 0.94) / size.y;
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -bbox.min.y * s, -center.z * s);

    const wrap = new THREE.Group();
    wrap.add(root);
    return wrap;
  }, [scene, flower]);

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
/* Camera rig — the curated hero angle. Drag-to-look only.              */
/* ------------------------------------------------------------------ */

function Rig({ flower }: { flower: Flower }) {
  const ty = flower.ty * H;
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
      makeDefault
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

  // Hero camera position from the curated best angle.
  const camPos = useMemo(() => {
    const az = THREE.MathUtils.degToRad(flower.az);
    const el = THREE.MathUtils.degToRad(flower.el);
    const d = flower.dist * H;
    const ty = flower.ty * H;
    return [d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), d * Math.cos(el) * Math.cos(az)] as const;
  }, [flower]);

  return (
    <div className={className} style={{ touchAction: "none" }}>
      <Canvas
        camera={{ fov: 34, position: [...camPos], near: 0.05, far: 80 }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.12;
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <StudioLighting />
        <Suspense fallback={null}>
          <FlowerModel key={flower.id} flower={flower} reducedMotion={reducedMotion} />
        </Suspense>
        {/* grounds the bouquet so its base doesn't float on the dark stage */}
        <ContactShadows position={[0, 0.001, 0]} scale={2.9} blur={2.4} far={1.4} opacity={0.32} color="#1d0a12" frames={60} />
        <Rig flower={flower} />
      </Canvas>
    </div>
  );
}

/* The bouquet is 17.7 MB — warm the cache as soon as a flower stage mounts
 * (the load veil covers the wait). */
useGLTF.preload("/models/rose-bouquet.glb");
