"use client";

/**
 * rose-3d.tsx — a fully procedural, real-time 3D miniature rose.
 *
 * Modeled on the reference photogrammetry scan ("Anatomy of a miniature
 * rose"): a whole plant — deep magenta-pink spiral bloom with a dense
 * furled center, five sepals, a gently curved stem with prickles, and
 * compound leaves with pointed leaflets.
 *
 * Every petal is a parametric surface (cupped cross-section, recurved tip,
 * ruffled edge, pointed outline) placed on a golden-angle phyllotactic
 * spiral across 8 whorls — inner petals small and upright, outer petals
 * broad and open. Vertex colors bake the deep-base → pale-edge gradient
 * real rose petals have; a sheen material gives their velvet softness.
 *
 * The scene animates: the bloom unfurls petal-whorl by petal-whorl on
 * entry, the plant sways in a slow breeze, and the camera auto-orbits.
 * Drag / pinch to rotate and zoom (OrbitControls, damped).
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { RosePalette } from "@/lib/md-blocks";

/* ------------------------------------------------------------------ */
/* Deterministic randomness — the rose is identical on every visit      */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Parametric surfaces                                                 */
/* ------------------------------------------------------------------ */

/** A rose petal: base at origin, growing along +Y, face toward +Z.
 *  w segments across, l segments along. Returns positions + colors. */
function buildPetalGeometry(opts: {
  length: number;
  width: number;
  cup: number; // cross-section curvature (edges rise toward +Z)
  curl: number; // backward bend of the tip (+Z)
  ruffle: number; // edge wave amplitude
  twist: number; // slight shear so no petal is a perfect clone
  base: THREE.Color;
  mid: THREE.Color;
  edge: THREE.Color;
  wSeg?: number;
  lSeg?: number;
  seed: number;
}): THREE.BufferGeometry {
  const { length: L, width: W, cup, curl, ruffle, twist, base, mid, edge } = opts;
  const wSeg = opts.wSeg ?? 28;
  const lSeg = opts.lSeg ?? 40;
  const rnd = mulberry32(opts.seed);
  const jitterA = 0.88 + rnd() * 0.24; // per-petal asymmetry
  const jitterB = 0.85 + rnd() * 0.3;

  const positions = new Float32Array((wSeg + 1) * (lSeg + 1) * 3);
  const colors = new Float32Array((wSeg + 1) * (lSeg + 1) * 3);
  const indices: number[] = [];
  const c = new THREE.Color();

  for (let iv = 0; iv <= lSeg; iv++) {
    const v = iv / lSeg; // 0 base → 1 tip
    // obovate outline: narrow claw base, broad blade, rounded notched apex
    // (no overshoot past π — sin(π·x) goes negative there and pow() -> NaN)
    const shape = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.9);
    const halfW = W * (0.34 + 0.66 * shape) * 0.5 * jitterA;

    for (let iu = 0; iu <= wSeg; iu++) {
      const u = iu / wSeg; // 0 left edge → 1 right edge
      const k = u - 0.5; // −0.5…0.5
      const edgeT = Math.min(1, Math.abs(k) * 2); // 0 center → 1 edges

      let x = k * 2 * halfW;
      const y = v * L;
      // cup: parabolic cross-section, stronger toward the tip
      let z = cup * edgeT * edgeT * W * (0.4 + 0.6 * v);
      // midrib fold — the petal's center ridge rises toward the tip,
      // splitting the face into two light-catching halves
      z += 0.028 * W * (1 - edgeT) * Math.pow(v, 1.4);
      // backward curl of the tip (cubic ease — smooth, not angular)
      z += curl * Math.pow(v, 2.1) * L * 0.6;
      // ruffle: a soft travelling wave, only near the outer edge
      const edgeWave = Math.pow(Math.max(0, edgeT - 0.3) / 0.7, 1.8);
      z += ruffle * Math.sin(k * 4.5 + v * 2.6 + opts.seed * 0.13) * Math.pow(v, 1.7) * W * 0.3 * edgeWave * jitterB;
      // shear so petals never mirror perfectly
      x += twist * v * W * 0.35;

      const i = (iv * (wSeg + 1) + iu) * 3;
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;

      // Color story: deep saturated base → mid tone → pale edge/tip,
      // with baked ambient occlusion — petal bases sit in the crevice
      // shadow of the whorls above them, edges catch the light.
      const tipT = Math.pow(v, 1.5);
      const mix = Math.min(1, edgeT * (0.45 + 0.55 * tipT) + tipT * 0.5);
      if (mix < 0.5) c.copy(base).lerp(mid, mix * 2);
      else c.copy(mid).lerp(edge, (mix - 0.5) * 2);
      // AO: dark toward the base, lifting through the blade to the rim
      const ao = 0.42 + 0.58 * Math.min(1, Math.pow(v, 0.65));
      // cupped edges tilt toward the light — a soft rim brightening
      const rim = 0.94 + 0.06 * edgeT;
      // faint radial vein streaks
      const vein = 1 - 0.05 * Math.max(0, Math.sin(u * Math.PI * 9)) * (1 - v) * edgeT;
      const k2 = ao * rim * vein;
      colors[i] = c.r * k2;
      colors[i + 1] = c.g * k2;
      colors[i + 2] = c.b * k2;
    }
  }
  for (let iv = 0; iv < lSeg; iv++) {
    for (let iu = 0; iu < wSeg; iu++) {
      const a = iv * (wSeg + 1) + iu;
      const b = a + 1;
      const d = a + (wSeg + 1);
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** A leaflet: pointed oval with serrated edges and a midrib crease. */
function buildLeafletGeometry(length: number, width: number, base: THREE.Color, edgeColor: THREE.Color): THREE.BufferGeometry {
  const lSeg = 22;
  const wSeg = 12;
  const positions = new Float32Array((wSeg + 1) * (lSeg + 1) * 3);
  const colors = new Float32Array((wSeg + 1) * (lSeg + 1) * 3);
  const indices: number[] = [];
  const c = new THREE.Color();

  for (let iv = 0; iv <= lSeg; iv++) {
    const v = iv / lSeg;
    const shape = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.7)), 0.85);
    // serration: tiny triangular teeth, only near the edge of the blade
    const teeth = 1 - 0.06 * Math.abs(Math.sin(v * 26));
    const halfW = (width / 2) * shape * teeth;

    for (let iu = 0; iu <= wSeg; iu++) {
      const u = iu / wSeg;
      const k = u - 0.5;
      const x = k * 2 * halfW;
      const y = v * length;
      // midrib crease (blade folds up along the center) + gentle tip droop
      const crease = -Math.abs(k) * 2 * width * 0.28 * (1 - v * 0.4);
      const droop = -Math.pow(v, 2.2) * length * 0.22;
      const i = (iv * (wSeg + 1) + iu) * 3;
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = crease + droop;

      const mix = Math.min(1, Math.abs(k) * 2.2 + v * 0.25);
      c.copy(base).lerp(edgeColor, mix);
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
  }
  for (let iv = 0; iv < lSeg; iv++) {
    for (let iu = 0; iu < wSeg; iu++) {
      const a = iv * (wSeg + 1) + iu;
      const b = a + 1;
      const d = a + (wSeg + 1);
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/* The whole plant                                                     */
/* ------------------------------------------------------------------ */

interface PetalAnim {
  mesh: THREE.Mesh;
  baseTilt: number;
  whorl: number;
  phase: number;
  baseScale: number;
}

interface RoseBuild {
  group: THREE.Group;
  bloomGroup: THREE.Group;
  petals: PetalAnim[];
  disposables: Array<{ dispose: () => void }>;
  paletteId: string;
}

/** Whorls from the furled center outward: count, petal length, tilt from
 *  vertical (rad), recurve, cup (edge rise as a fraction of width), ruffle.
 *  Tuned for a compact high-centered cup: tilt maxes ~79° (not lily-flat),
 *  outer petals stay shorter, and cup INCREASES outward so the outer whorls
 *  bowl upward like a real rose. */
const WHORLS = [
  { count: 4, len: 0.55, tilt: 0.12, curl: 0.03, cup: 0.5, ruffle: 0.02 },
  { count: 5, len: 0.72, tilt: 0.26, curl: 0.06, cup: 0.48, ruffle: 0.03 },
  { count: 6, len: 0.9, tilt: 0.44, curl: 0.1, cup: 0.46, ruffle: 0.04 },
  { count: 7, len: 1.02, tilt: 0.64, curl: 0.16, cup: 0.44, ruffle: 0.05 },
  { count: 8, len: 1.1, tilt: 0.85, curl: 0.24, cup: 0.42, ruffle: 0.06 },
  { count: 9, len: 1.16, tilt: 1.05, curl: 0.32, cup: 0.4, ruffle: 0.07 },
  { count: 9, len: 1.2, tilt: 1.22, curl: 0.42, cup: 0.38, ruffle: 0.08 },
  { count: 8, len: 1.18, tilt: 1.35, curl: 0.55, cup: 0.36, ruffle: 0.09 },
] as const;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈137.5°

function buildRose(p: RosePalette): RoseBuild {
  const rnd = mulberry32(20260920);
  const group = new THREE.Group();
  const bloomGroup = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const petals: PetalAnim[] = [];

  const petalMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.0,
    sheen: 1,
    sheenColor: new THREE.Color("#ff9db8"),
    sheenRoughness: 0.4,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    emissive: new THREE.Color("#c2185b"),
    emissiveIntensity: 0.055,
    side: THREE.DoubleSide,
  });
  const greenMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  disposables.push(petalMat, greenMat);

  const base = new THREE.Color(p.base);
  const mid = new THREE.Color(p.mid);
  const edge = new THREE.Color(p.edge);
  const leafC = new THREE.Color("#3A7A34");
  const leafE = new THREE.Color("#6DAE5B");
  const stemC = new THREE.Color(p.stem);

  /* ---- Stem: a gentle S-curve tube ---- */
  const stemTop = new THREE.Vector3(0.045, 2.3, -0.02);
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, 0.75, 0.035),
    new THREE.Vector3(-0.035, 1.5, -0.02),
    stemTop,
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 32, 0.075, 12, false);
  // vertex colors: warm green stem
  paintSolid(stemGeo, stemC);
  const stem = new THREE.Mesh(stemGeo, greenMat);
  disposables.push(stemGeo);
  group.add(stem);

  /* ---- Prickles: a few thin curved thorns on the lower stem ---- */
  const thornGeo = new THREE.ConeGeometry(0.028, 0.1, 6);
  disposables.push(thornGeo);
  for (let i = 0; i < 7; i++) {
    const t = 0.08 + rnd() * 0.5;
    const pos = stemCurve.getPointAt(t);
    const thorn = new THREE.Mesh(thornGeo, greenMat);
    thorn.position.copy(pos);
    const az = rnd() * Math.PI * 2;
    thorn.rotation.set(0.9 + rnd() * 0.3, az, 0, "YXZ");
    thorn.translateY(0.02);
    thorn.scale.setScalar(0.7 + rnd() * 0.6);
    group.add(thorn);
  }

  /* ---- Compound leaves: rachis + 5 leaflets, three leaves ---- */
  const leafDefs = [
    { t: 0.27, az: 0.85, tilt: 1.22 },
    { t: 0.47, az: 0.85 + Math.PI, tilt: 1.26 },
    { t: 0.66, az: 2.5, tilt: 1.3 },
    { t: 0.82, az: 5.6, tilt: 1.34 },
  ];
  for (const def of leafDefs) {
    const leaf = new THREE.Group();
    const anchor = stemCurve.getPointAt(def.t);
    leaf.position.copy(anchor);
    leaf.rotation.set(0, def.az, 0, "YXZ");

    // rachis (leaf spine) — arcs outward and slightly up, away from the stem
    const rachisLen = 1.12;
    const rachisCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.16, rachisLen * 0.55),
      new THREE.Vector3(0, 0.08, rachisLen),
    ]);
    const rachisGeo = new THREE.TubeGeometry(rachisCurve, 14, 0.022, 7, false);
    paintSolid(rachisGeo, stemC);
    const rachis = new THREE.Mesh(rachisGeo, greenMat);
    disposables.push(rachisGeo);
    leaf.add(rachis);

    // leaflets: 2 pairs + a terminal one, sizes peak in the middle
    const sizes = [0.2, 0.3, 0.36, 0.31, 0.22];
    for (let i = 0; i < 5; i++) {
      const side = i < 4 ? (i % 2 === 0 ? 1 : -1) : 0; // terminal points up
      const along = (i + 1) / 6;
      const len = sizes[i] * 2.35;
      const wid = len * 0.66;
      const geo = buildLeafletGeometry(len, wid, leafC, leafE);
      disposables.push(geo);
      const m = new THREE.Mesh(geo, greenMat);
      const pos = rachisCurve.getPointAt(Math.min(0.98, along * 0.85 + 0.08));
      m.position.copy(pos);
      // pairs splay sideways around the rachis; the terminal leaflet
      // continues outward along the spine, cupping slightly upward
      if (side === 0) {
        m.rotation.x = 1.25 + rnd() * 0.1;
      } else {
        m.rotation.z = side * (1.05 + rnd() * 0.18);
        m.rotation.x = 0.12;
      }
      m.scale.setScalar(1 + rnd() * 0.12);
      leaf.add(m);
    }
    leaf.rotation.z = -(def.tilt - 1.28) * 0.95;
    group.add(leaf);
  }

  /* ---- Receptacle + sepals + bloom ---- */
  bloomGroup.position.copy(stemTop);
  group.add(bloomGroup);

  const recepGeo = new THREE.SphereGeometry(0.17, 12, 10);
  paintSolid(recepGeo, new THREE.Color(p.stem));
  const recep = new THREE.Mesh(recepGeo, greenMat);
  recep.scale.set(1, 0.8, 1);
  recep.position.y = -0.04;
  disposables.push(recepGeo);
  bloomGroup.add(recep);

  // five sepals splayed outward-down
  for (let i = 0; i < 5; i++) {
    const az = (i / 5) * Math.PI * 2 + 0.4;
    const geo = buildPetalGeometry({
      length: 0.72,
      width: 0.24,
      cup: 0.5,
      curl: 0.9,
      ruffle: 0.22,
      twist: 0,
      base: leafC,
      mid: new THREE.Color(p.leaf),
      edge: new THREE.Color(p.stem),
      wSeg: 14,
      lSeg: 22,
      seed: 500 + i,
    });
    disposables.push(geo);
    const m = new THREE.Mesh(geo, greenMat);
    const pivot = new THREE.Object3D();
    pivot.rotation.y = az;
    m.position.set(0, 0.05, 0.1);
    m.rotation.x = 1.95 + rnd() * 0.15; // down-splayed
    pivot.add(m);
    bloomGroup.add(pivot);
  }

  // the petal spiral — golden-angle phyllotaxis across the whorls
  let petalIdx = 0;
  for (let w = 0; w < WHORLS.length; w++) {
    const whorl = WHORLS[w];
    for (let i = 0; i < whorl.count; i++) {
      const az = petalIdx * GOLDEN_ANGLE + rnd() * 0.14;
      petalIdx++;
      // the heart darkens whorl-by-whorl — deep shadow at the core
      const whorlShade = 0.55 + 0.5 * Math.pow(w / (WHORLS.length - 1), 0.7);
      const geo = buildPetalGeometry({
        length: whorl.len,
        width: whorl.len * (1.16 + 0.08 * rnd()),
        cup: whorl.cup,
        curl: whorl.curl,
        ruffle: whorl.ruffle,
        twist: (rnd() - 0.5) * 0.16,
        base: base.clone().multiplyScalar(whorlShade),
        mid: mid.clone().multiplyScalar(whorlShade),
        edge: edge.clone().multiplyScalar(0.85 + 0.15 * whorlShade),
        seed: petalIdx * 7 + 1,
      });
      disposables.push(geo);
      const m = new THREE.Mesh(geo, petalMat);
      const pivot = new THREE.Object3D();
      pivot.rotation.y = az;
      // base sits just outside the receptacle; deeper whorls sit higher
      m.position.set(0, 0.05 + (WHORLS.length - 1 - w) * 0.021, 0.085 + w * 0.008);
      m.rotation.order = "YXZ";
      pivot.add(m);
      bloomGroup.add(pivot);
      petals.push({
        mesh: m,
        baseTilt: whorl.tilt + (rnd() - 0.5) * 0.08,
        whorl: w,
        phase: rnd() * Math.PI * 2,
        baseScale: 0.94 + rnd() * 0.12,
      });
    }
  }

  // the furled heart: a tight magenta bud the inner whorls wrap
  const budGeo = new THREE.SphereGeometry(0.145, 16, 14);
  paintSolid(budGeo, mid);
  const bud = new THREE.Mesh(budGeo, petalMat);
  bud.scale.set(1, 1.6, 1);
  bud.position.y = 0.2;
  disposables.push(budGeo);
  bloomGroup.add(bud);

  return { group, bloomGroup, petals, disposables, paletteId: p.id };
}

/** Uniform vertex tint for single-color geometries (tubes, spheres, cones). */
function paintSolid(geo: THREE.BufferGeometry, color: THREE.Color) {
  const count = geo.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/* ------------------------------------------------------------------ */
/* Animated scene                                                      */
/* ------------------------------------------------------------------ */

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function RosePlant({
  palette,
  reducedMotion,
}: {
  palette: RosePalette;
  reducedMotion: boolean;
}) {
  // Three.js objects are mutable by design — hold them in a ref (not useMemo)
  // so the animation loop can drive petal rotations without lint complaints.
  // The parent keys this component by palette id, so a variety change = remount.
  const builtRef = useRef<RoseBuild | null>(null);
  if (!builtRef.current) builtRef.current = buildRose(palette);
  const built = builtRef.current;
  const startRef = useRef<number | null>(null);

  // manual disposal — geometries/materials are ours, not R3F's
  useEffect(() => {
    const toDispose = built.disposables;
    return () => toDispose.forEach((d) => d.dispose());
  }, [built]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { group, bloomGroup, petals } = built;

    if (startRef.current === null) startRef.current = t;
    const since = t - startRef.current;
    // unfurl: whorl w starts at w*0.13s, each opens over 1.4s
    for (const pa of petals) {
      const local = since - pa.whorl * 0.13;
      const e = reducedMotion ? 1 : easeOutCubic(THREE.MathUtils.clamp(local / 1.4, 0, 1));
      const flutter = reducedMotion ? 0 : Math.sin(t * 1.1 + pa.phase) * 0.012;
      const open = 0.16 + 0.84 * e; // start furled (16% of final tilt)
      // eslint-disable-next-line react-hooks/immutability -- three.js objects are mutable by design; built is ref-held
      pa.mesh.rotation.x = pa.baseTilt * open + flutter;
      const s = pa.baseScale * (0.82 + 0.18 * e);
      pa.mesh.scale.setScalar(s);
    }

    if (!reducedMotion) {
      // breeze sway — whole plant + a little extra at the bloom
      group.rotation.z = Math.sin(t * 0.55) * 0.018 + Math.sin(t * 0.9 + 1.7) * 0.008;
      group.rotation.x = Math.sin(t * 0.42 + 0.6) * 0.012;
      bloomGroup.rotation.z = Math.sin(t * 0.7 + 0.4) * 0.02;
    }
  });

  return <primitive object={built.group} />;
}

function Rig({ spin }: { spin: boolean }) {
  return (
    <OrbitControls
      target={[0, 1.7, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.75}
      minDistance={3.2}
      maxDistance={10}
      minPolarAngle={0.35}
      maxPolarAngle={1.5}
      autoRotate={spin}
      autoRotateSpeed={0.7}
      makeDefault
    />
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export function Rose3D({
  palette,
  className,
  autoRotate = true,
}: {
  palette: RosePalette;
  className?: string;
  autoRotate?: boolean;
}) {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div className={className} style={{ touchAction: "none" }}>
      <Canvas
        camera={{ fov: 30, position: [1.55, 2.85, 5.7] }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.12;
        }}
        dpr={[1.5, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        {/* soft studio light — warm key, cool pink rim, sky/ground fill */}
        <hemisphereLight args={["#ffe9f1", "#2e4a30", 0.52]} />
        <ambientLight intensity={0.07} />
        <directionalLight position={[4.5, 3.2, 2.8]} intensity={1.8} color="#fff2e8" />
        <directionalLight position={[-4, 3.8, -4]} intensity={0.9} color="#ffc2d8" />
        <directionalLight position={[0.5, -2, 3.5]} intensity={0.3} color="#e8fff2" />
        <RosePlant key={palette.id} palette={palette} reducedMotion={reducedMotion} />
        <Rig spin={autoRotate && !reducedMotion} />
      </Canvas>
    </div>
  );
}
