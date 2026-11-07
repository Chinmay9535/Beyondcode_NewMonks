"use client";

// Landing background: an isometric field of blue pillars whose surface follows the pinned
// scroll story (lib/story.ts), one full shape per stage:
//   0 a convex lens · 1 focus rings (every distance in your day) · 2 two lenses (both eyes)
//   3 an eye with a heartbeat pulse (recovery). After the story it settles into slow waves.
// On load the pillars rise outward from the centre. They also rise under the pointer. Shading is baked into vertex colours
// (no lights), so the look is exact and identical on every GPU.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { storyProgress } from "@/lib/story";

const N = 34;                 // pillars per side
const GAP = 1;                // centre spacing (world units)
const BASE = 3.2;             // pillars extend this far below y = 0 and fade into the page
const HALF = ((N - 1) * GAP) / 2;
const CAM = new THREE.Vector3(30, 25, 30);               // a little below true isometric, so heights read

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

type Shared = { p: number; q: number; px: number; py: number; moved: number; reduce: boolean; dark: boolean };

function pillarGeometry(dark: boolean) {
  const g = new THREE.BoxGeometry(0.64 * GAP, 1, 0.64 * GAP);
  g.translate(0, 0.5, 0);
  const pos = g.getAttribute("position"), nor = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  const top = new THREE.Color("#4652ff"), sideA = new THREE.Color("#1424ff"), sideB = new THREE.Color("#0612c4");
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
  const st = useRef({ p: 0, q: 0, t: 0, intro: 0, bx: 0, bz: 0, bump: 0, zoom: 0, off: 0 });
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color(), v: new THREE.Vector3(), ray: new THREE.Ray(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6), hit: new THREE.Vector3() }), []);

  const axes = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3() }), []);
  useEffect(() => {
    camera.position.copy(CAM); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    axes.right.setFromMatrixColumn(camera.matrixWorld, 0);
    axes.up.setFromMatrixColumn(camera.matrixWorld, 1);
  }, [camera, axes]);

  useFrame((_, dt) => {
    const m = mesh.current, g = group.current, sh = shared.current;
    if (!m || !g) return;
    const k = st.current, d = Math.min(dt, 0.05);
    if (!sh.reduce) k.t += d;
    k.intro = sh.reduce ? 3 : k.intro + d;
    k.p = THREE.MathUtils.damp(k.p, sh.p, 3.2, d);
    k.q = THREE.MathUtils.damp(k.q, sh.q, 3.2, d);
    const p = k.p, q = k.q, t = k.t;

    // One plateau per stage, so every shape is reached in full and held before the next.
    const plateau = (n: number) => 1 - smooth(0.22, 0.78, Math.abs(p - n));
    const raw = [plateau(0), plateau(1), plateau(2), plateau(3)];
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    const [wLens, wRing, wTwin, wEye] = raw.map((w) => (w / sum) * (1 - q));
    const wWave = q;

    // Framing: right of the headline on wide screens, below it on phones; centred after the story.
    const wide = size.width >= 1024;
    const diag = N * GAP * Math.SQRT2;
    const fit = wide ? Math.min(size.width * 0.5, size.height * 1.45) : Math.min(size.width * 1.3, size.height * 0.9);
    const zoom = (fit / diag) * (1 + 0.12 * wEye + 0.06 * wTwin + 0.35 * q);
    k.zoom = k.zoom ? THREE.MathUtils.damp(k.zoom, zoom, 6, d) : zoom;
    ortho.zoom = k.zoom; ortho.updateProjectionMatrix();
    const ox = wide ? (size.width * 0.22 * (1 - q)) / k.zoom : 0;
    const oy = wide ? (-size.height * 0.02) / k.zoom : (-size.height * 0.3 * (1 - q)) / k.zoom;
    g.position.copy(axes.right).multiplyScalar(ox).addScaledVector(axes.up, oy);
    g.rotation.y = 0.4 * wRing + 0.55 * q + (sh.reduce ? 0 : Math.sin(t * 0.12) * 0.04 * (1 - wTwin));

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

    // Moving glint; on the eye it parks as a catchlight beside the pupil.
    const lx = THREE.MathUtils.lerp(Math.cos(t * 0.35) * HALF * 0.45, -HALF * 0.38, wEye);
    const lz = THREE.MathUtils.lerp(Math.sin(t * 0.27) * HALF * 0.45, -HALF * 0.12, wEye);
    const pulseR = (t * 0.42) % 1.5;                       // recovery heartbeat ring
    const twinC = 0.44;                                     // the two lenses sit side by side on screen

    let i = 0;
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++, i++) {
        const x = a * GAP - HALF, z = b * GAP - HALF;
        const u = x / HALF, v = z / HALF, r = Math.hypot(u, v);
        const breathe = 1 + 0.05 * Math.sin(t * 0.9);
        let h = 0.35;
        if (wLens > 0.001) h += wLens * (Math.max(0, 1 - r * r * 0.92) * 6.2 * breathe + 0.06 * Math.sin(u * 7 + t * 1.3) * Math.cos(v * 6 - t));
        if (wRing > 0.001) h += wRing * (1.6 * Math.sin(r * 11 - t * 2.6) * Math.exp(-r * 0.8) + 1.2 * (1 - r) + 0.6);
        if (wTwin > 0.001) {
          const d1 = Math.hypot(u - twinC, v + twinC), d2 = Math.hypot(u + twinC, v - twinC);
          h += wTwin * (5.4 * breathe * (Math.max(0, 1 - (d1 / 0.5) ** 2) + Math.max(0, 1 - (d2 / 0.5) ** 2)) + 0.25);
        }
        if (wEye > 0.001) {
          // Pupil (a deep well), iris with radial fibres, a raised limbus, flat sclera, and a heartbeat ring.
          const iris = smooth(0.22, 0.29, r) * (1 - smooth(0.68, 0.76, r));
          const fibres = 1.1 * Math.sin(Math.atan2(v, u) * 14 + t * 0.4) * smooth(0.3, 0.42, r) * (1 - smooth(0.58, 0.7, r));
          const limbus = 1.6 * Math.exp(-(((r - 0.72) / 0.045) ** 2));
          const pulse = 1.3 * Math.exp(-(((r - pulseR) / 0.06) ** 2)) * (1 - pulseR / 1.5) * smooth(0.78, 0.86, r);
          h += wEye * (iris * (3.4 + fibres) + limbus + pulse - 0.25 * (1 - smooth(0.2, 0.28, r)));
        }
        if (wWave > 0.001) h += wWave * (0.7 * Math.sin(u * 3.1 + t * 0.7) + 0.55 * Math.cos(v * 3.7 - t * 0.55) + 0.3 * Math.sin((u + v) * 5.2 + t * 1.1) + 0.9);
        const dx = x - k.bx, dz = z - k.bz;
        const bump = 2.2 * k.bump * Math.exp(-(dx * dx + dz * dz) / 9);
        // Intro: pillars rise outward from the centre with a slight overshoot.
        const e = Math.min(1, Math.max(0, (k.intro - 0.2 - r * 0.55) / 0.9));
        const rise = e === 1 ? 1 : 1 + 2.7 * (e - 1) ** 3 + 1.7 * (e - 1) ** 2;
        h = Math.max(0.12, (h + bump) * rise);

        tmp.m.makeScale(1, h + BASE, 1);
        tmp.m.setPosition(x, -BASE, z);
        m.setMatrixAt(i, tmp.m);

        const gl = Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / 40);
        const lift = Math.min(1, h / 6);
        const pupil = wEye * (1 - smooth(0.2, 0.28, r));
        tmp.c.setScalar((0.62 + 0.9 * lift + 3.2 * gl + 1.2 * bump / 2.2) * (1 - 0.7 * pupil));
        m.setColorAt(i, tmp.c);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, material, N * N]} frustumCulled={false} />
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
