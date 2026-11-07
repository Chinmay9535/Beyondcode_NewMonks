"use client";

// Landing background: an isometric field of blue pillars that follows the pinned scroll story
// (lib/story.ts). Every scroll step moves something: the shapes morph continuously, the camera
// keeps easing in and turning, and the last chapter dives into the field until stepped blocks
// fill the screen.
//   0 a convex lens · 1 focus rings · 2 two lenses (both eyes) · 3 an eye with a heartbeat ring
//   4 the dive: a dense block field (every patient, one dashboard)
// After the story it pulls back into slow waves behind the rest of the page.
// On load the pillars rise outward from the centre; they also rise under the pointer.
// Shading is baked into colours (no lights), so it looks the same on every GPU. Pillar bodies and
// their top caps are separate instanced meshes, so tops can glow near-white while sides stay deep blue.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STAGES, storyProgress } from "@/lib/story";

const N = 56;                 // pillars per side
const GAP = 1;                // centre spacing (world units)
const BASE = 4;               // pillars extend this far below y = 0 and fade into the page
const HALF = ((N - 1) * GAP) / 2;
const CAM = new THREE.Vector3(30, 25, 30);   // a little below true isometric, so heights read
const DIVE = 2.4;             // extra zoom at the bottom of the story

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

type Shared = { p: number; q: number; px: number; py: number; moved: number; reduce: boolean; dark: boolean };

/** Per-pillar constants, computed once. */
function layout() {
  const n = N * N;
  const x = new Float32Array(n), z = new Float32Array(n), u = new Float32Array(n), v = new Float32Array(n);
  const r = new Float32Array(n), th = new Float32Array(n), city = new Float32Array(n), lit = new Float32Array(n);
  let i = 0;
  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++, i++) {
      x[i] = a * GAP - HALF; z[i] = b * GAP - HALF;
      u[i] = x[i] / HALF; v[i] = z[i] / HALF; r[i] = Math.hypot(u[i], v[i]); th[i] = Math.atan2(v[i], u[i]);
      // City blocks: 6x6 lots split by one-pillar streets, low / mid / tower heights, some stepped.
      const ca = Math.floor(a / 6), cb = Math.floor(b / 6), la = a % 6, lb = b % 6;
      const k = hash(ca, cb), k2 = hash(ca + 17, cb - 9), k3 = hash(ca - 5, cb + 23);
      let h = k < 0.3 ? 0.4 + k2 * 1 : k < 0.72 ? 2.4 + k2 * 3 : 6 + k2 * 5;
      if (k3 > 0.55 && (la < 3) !== (k3 > 0.78)) h *= 0.55;   // stepped lot
      if (k3 < 0.18 && lb < 2) h *= 0.35;
      if (la === 5 || lb === 5) h = 0.25;                       // street
      city[i] = h;
      lit[i] = la === 5 || lb === 5 ? 0 : hash(ca + 3, cb + 7) > 0.74 ? 1 : 0;  // a few lots glow
    }
  }
  return { x, z, u, v, r, th, city, lit };
}

function pillarGeometry(dark: boolean) {
  const g = new THREE.BoxGeometry(0.64 * GAP, 1, 0.64 * GAP);
  g.translate(0, 0.5, 0);
  const pos = g.getAttribute("position"), nor = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  const top = new THREE.Color("#4652ff"), sideA = new THREE.Color("#0f1fff"), sideB = new THREE.Color("#0510c0");
  // Instance tints scale every vertex (0.62 at the dimmest); pre-divide so the bases meet the page colour.
  const floor = dark ? new THREE.Color("#06080c") : new THREE.Color("#f2f4f8").multiplyScalar(1 / 0.62);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = nor.getY(i), nx = nor.getX(i), y = pos.getY(i);
    if (ny > 0.5) c.copy(top);
    else if (ny < -0.5) c.copy(floor);
    else {
      c.copy(nx > 0.5 ? sideA : sideB);
      if (y < 0.5) c.copy(floor);  // bottom edge of the side faces: fade into the page
    }
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function Field({ shared }: { shared: React.RefObject<Shared> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const ortho = camera as THREE.OrthographicCamera;
  const dark = shared.current.dark;
  const geometry = useMemo(() => pillarGeometry(dark), [dark]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true }), []);
  const capGeometry = useMemo(() => new THREE.PlaneGeometry(0.64 * GAP, 0.64 * GAP).rotateX(-Math.PI / 2), []);
  const capMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#4652ff" }), []);
  const caps = useRef<THREE.InstancedMesh>(null);
  const L = useMemo(layout, []);
  const st = useRef({ p: 0, q: 0, t: 0, intro: 0, bx: 0, bz: 0, bump: 0, zoom: 0 });
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color(), v: new THREE.Vector3(), ray: new THREE.Ray(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6), hit: new THREE.Vector3() }), []);
  const axes = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  useEffect(() => {
    camera.position.copy(CAM); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    axes.right.setFromMatrixColumn(camera.matrixWorld, 0);
    axes.up.setFromMatrixColumn(camera.matrixWorld, 1);
  }, [camera, axes]);

  useFrame((_, dt) => {
    const m = mesh.current, cm = caps.current, g = group.current, sh = shared.current;
    if (!m || !cm || !g) return;
    const k = st.current, d = Math.min(dt, 0.05);
    if (!sh.reduce) k.t += d;
    k.intro = sh.reduce ? 3 : k.intro + d;
    k.p = THREE.MathUtils.damp(k.p, sh.p, 4, d);
    k.q = THREE.MathUtils.damp(k.q, sh.q, 4, d);
    const p = k.p, q = k.q, t = k.t;

    // Short holds, long morphs: the surface is almost always on its way somewhere.
    const plateau = (n: number) => 1 - smooth(0.08, 0.92, Math.abs(p - n));
    const raw = Array.from({ length: STAGES }, (_, n) => plateau(n));
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    const [wLens, wRing, wTwin, wEye, wCity] = raw.map((w) => (w / sum) * (1 - q));
    const wWave = q;
    const dive = smooth(STAGES - 2, STAGES - 1, p) * (1 - q);    // the last chapter's camera dive

    // Framing: right of the headline on wide screens, below it on phones. The camera eases in
    // a little with every chapter, then dives on the last one; after the story it pulls back.
    const wide = size.width >= 1024;
    const diag = N * GAP * Math.SQRT2;
    const fit = wide ? Math.min(size.width * 0.52, size.height * 1.45) : Math.min(size.width * 1.3, size.height * 0.9);
    const zoom = (fit / diag) * (1 + 0.07 * Math.min(p, STAGES - 2) * (1 - q) + DIVE * dive + 0.3 * q);
    k.zoom = k.zoom ? THREE.MathUtils.damp(k.zoom, zoom, 7, d) : zoom;
    ortho.zoom = k.zoom; ortho.updateProjectionMatrix();
    const away = (1 - dive) * (1 - q);
    const ox = wide ? (size.width * 0.22 * away) / k.zoom : 0;
    const oy = wide ? (-size.height * 0.02 * away) / k.zoom : (-size.height * 0.3 * away) / k.zoom;
    g.position.copy(axes.right).multiplyScalar(ox).addScaledVector(axes.up, oy);
    g.rotation.y = 0.09 * p * (1 - wTwin) * (1 - dive) + 0.55 * q + (sh.reduce ? 0 : Math.sin(t * 0.12) * 0.04);

    // Pointer: cast through the iso camera onto the field, follow with a damped spring.
    tmp.v.set(sh.px, sh.py, -1).unproject(camera);
    camera.getWorldDirection(tmp.ray.direction);
    tmp.ray.origin.copy(tmp.v);
    if (tmp.ray.intersectPlane(tmp.plane, tmp.hit)) {
      g.worldToLocal(tmp.hit);
      k.bx = THREE.MathUtils.damp(k.bx, tmp.hit.x, 7, d);
      k.bz = THREE.MathUtils.damp(k.bz, tmp.hit.z, 7, d);
    }
    sh.moved = Math.max(0, sh.moved - d * 0.6);
    k.bump = THREE.MathUtils.damp(k.bump, sh.reduce ? 0 : Math.min(1, sh.moved), 5, d);

    // Moving glint; on the eye it parks as a catchlight beside the pupil; on the city it sweeps wide.
    const lx = THREE.MathUtils.lerp(Math.cos(t * 0.35) * HALF * 0.45, -HALF * 0.38, wEye);
    const lz = THREE.MathUtils.lerp(Math.sin(t * 0.27) * HALF * 0.45, -HALF * 0.12, wEye);
    const glW = 40 + 140 * wCity;
    const pulseR = (t * 0.42) % 1.5;                       // recovery heartbeat ring
    const twinC = 0.44;                                     // the two lenses sit side by side on screen
    const breathe = 1 + 0.05 * Math.sin(t * 0.9);
    const cityGrow = 0.25 + 0.75 * smooth(STAGES - 1.6, STAGES - 1, p);  // towers keep rising as you scroll in

    for (let i = 0; i < N * N; i++) {
      const x = L.x[i], z = L.z[i], u = L.u[i], v = L.v[i], r = L.r[i];
      let h = 0.35;
      if (wLens > 0.001) h += wLens * (Math.max(0, 1 - r * r * 0.92) * 7 * breathe + 0.08 * Math.sin(u * 7 + t * 1.3) * Math.cos(v * 6 - t));
      if (wRing > 0.001) h += wRing * (2 * Math.sin(r * 11 - t * 2.6) * Math.exp(-r * 0.8) + 1.5 * (1 - r) + 0.8);
      if (wTwin > 0.001) {
        const d1 = Math.hypot(u - twinC, v + twinC), d2 = Math.hypot(u + twinC, v - twinC);
        h += wTwin * (6.2 * breathe * (Math.max(0, 1 - (d1 / 0.5) ** 2) + Math.max(0, 1 - (d2 / 0.5) ** 2)) + 0.25);
      }
      if (wEye > 0.001) {
        // Pupil (a deep well), iris with radial fibres, a raised limbus, flat sclera, and a heartbeat ring.
        const iris = smooth(0.22, 0.29, r) * (1 - smooth(0.68, 0.76, r));
        const fibres = 1.2 * Math.sin(L.th[i] * 14 + t * 0.4) * smooth(0.3, 0.42, r) * (1 - smooth(0.58, 0.7, r));
        const limbus = 1.8 * Math.exp(-(((r - 0.72) / 0.045) ** 2));
        const pulse = 1.5 * Math.exp(-(((r - pulseR) / 0.06) ** 2)) * (1 - pulseR / 1.5) * smooth(0.78, 0.86, r);
        h += wEye * (iris * (3.8 + fibres) + limbus + pulse - 0.25 * (1 - smooth(0.2, 0.28, r)));
      }
      if (wCity > 0.001) h += wCity * (L.city[i] * cityGrow * (1 + 0.04 * Math.sin(t * 0.8 + x * 0.3)));
      if (wWave > 0.001) h += wWave * (0.7 * Math.sin(u * 3.1 + t * 0.7) + 0.55 * Math.cos(v * 3.7 - t * 0.55) + 0.3 * Math.sin((u + v) * 5.2 + t * 1.1) + 0.9);
      const dx = x - k.bx, dz = z - k.bz;
      const bump = 2.4 * k.bump * Math.exp(-(dx * dx + dz * dz) / 9);
      // Intro: pillars rise outward from the centre with a slight overshoot.
      const e = Math.min(1, Math.max(0, (k.intro - 0.2 - r * 0.55) / 0.9));
      const rise = e === 1 ? 1 : 1 + 2.7 * (e - 1) ** 3 + 1.7 * (e - 1) ** 2;
      h = Math.max(0.12, (h + bump) * rise);

      tmp.m.makeScale(1, h + BASE, 1);
      tmp.m.setPosition(x, -BASE, z);
      m.setMatrixAt(i, tmp.m);
      tmp.m.makeTranslation(x, h + 0.005, z);
      cm.setMatrixAt(i, tmp.m);

      const gl = Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / glW);
      const lift = Math.min(1, h / 7);
      const pupil = wEye * (1 - smooth(0.2, 0.28, r));
      const dim = 1 - 0.7 * pupil;
      // Sides: stay saturated blue, only a little brighter with height and the glint.
      tmp.c.setScalar((0.7 + 0.45 * lift + 0.8 * gl + 0.5 * bump / 2.4) * dim);
      m.setColorAt(i, tmp.c);
      // Tops: carry the light. Lit city lots burn near-white.
      const city = wCity * (L.lit[i] * 8 * cityGrow + gl * 3);
      tmp.c.setScalar((0.7 + 1.1 * lift + 4 * gl * (1 - wCity) + city + 1.6 * bump / 2.4) * dim);
      cm.setColorAt(i, tmp.c);
    }
    for (const im of [m, cm]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, material, N * N]} frustumCulled={false} />
      <instancedMesh ref={caps} args={[capGeometry, capMaterial, N * N]} frustumCulled={false} />
    </group>
  );
}

export default function PillarField({ className }: { className?: string }) {
  const shared = useRef<Shared>({ p: 0, q: 0, px: 0, py: 0, moved: 0, reduce: false, dark: true });
  const [darkNow, setDark] = useState(true);
  shared.current.dark = darkNow;

  useEffect(() => {
    const el = document.documentElement, read = () => setDark(el.dataset.theme !== "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const sh = shared.current;
    sh.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => { const s = storyProgress(); sh.p = s.p; sh.q = s.q; };
    const onMove = (e: PointerEvent) => {
      sh.px = (e.clientX / window.innerWidth) * 2 - 1;
      sh.py = -(e.clientY / window.innerHeight) * 2 + 1;
      sh.moved = 1.6;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); window.removeEventListener("pointermove", onMove); };
  }, []);

  return (
    <div className={className} aria-hidden>
      <Canvas key={darkNow ? "d" : "l"} orthographic dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
        camera={{ position: [CAM.x, CAM.y, CAM.z], zoom: 20, near: -200, far: 400 }}>
        <Field shared={shared} />
      </Canvas>
    </div>
  );
}
