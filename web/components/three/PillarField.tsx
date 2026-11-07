"use client";

// Landing background: an isometric field of blue pillars whose surface is driven by scroll.
// Top of the page: a convex lens (a dome). Scrolling: the dome releases into rings, like light
// coming to a focus, then settles into a slow wave sheet behind the later sections.
// The pillars rise under the pointer on a damped spring. Shading is baked into vertex colours
// (no lights), so the look is exact and identical on every GPU.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const N = 34;                 // pillars per side
const GAP = 1;                // centre spacing (world units)
const BASE = 3.2;             // pillars extend this far below y = 0 and fade into the page
const HALF = ((N - 1) * GAP) / 2;
const CAM = new THREE.Vector3(30, 25, 30);               // a little below true isometric, so heights read

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

type Shared = { scroll: number; px: number; py: number; moved: number; reduce: boolean; dark: boolean };

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
  const st = useRef({ s: 0, t: 0, bx: 0, bz: 0, bump: 0, zoom: 0, off: 0 });
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
    k.s = THREE.MathUtils.damp(k.s, sh.scroll, 4, d);
    const s = k.s, t = k.t;

    // Framing: right of the headline on wide screens, below it on phones; centred as you scroll.
    const wide = size.width >= 1024;
    const diag = N * GAP * Math.SQRT2;
    const fit = wide ? Math.min(size.width * 0.5, size.height * 1.45) : Math.min(size.width * 1.3, size.height * 0.9);
    const zoom = (fit / diag) * (1 + 0.35 * smooth(0.4, 2, s));
    k.zoom = k.zoom ? THREE.MathUtils.damp(k.zoom, zoom, 6, d) : zoom;
    ortho.zoom = k.zoom; ortho.updateProjectionMatrix();
    const away = 1 - smooth(0.15, 1.3, s);
    const ox = wide ? (size.width * 0.22 * away) / k.zoom : 0;
    const oy = wide ? (-size.height * 0.02) / k.zoom : (-size.height * 0.3 * away) / k.zoom;
    g.position.copy(axes.right).multiplyScalar(ox).addScaledVector(axes.up, oy);
    g.rotation.y = 0.55 * smooth(0.2, 2.2, s) + (sh.reduce ? 0 : Math.sin(t * 0.12) * 0.04);

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

    // Shape weights over the scroll: lens -> rings -> waves.
    const wLens = 1 - smooth(0.05, 0.95, s);
    const wRing = smooth(0.2, 0.75, s) * (1 - smooth(1.15, 1.9, s));
    const wWave = smooth(1.0, 2.0, s);
    const lx = Math.cos(t * 0.35) * HALF * 0.45, lz = Math.sin(t * 0.27) * HALF * 0.45;  // moving glint

    let i = 0;
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++, i++) {
        const x = a * GAP - HALF, z = b * GAP - HALF;
        const u = x / HALF, v = z / HALF, r = Math.hypot(u, v);
        const breathe = 1 + 0.05 * Math.sin(t * 0.9);
        const lens = Math.max(0, 1 - r * r * 0.92) * 6.2 * breathe + 0.06 * Math.sin(u * 7 + t * 1.3) * Math.cos(v * 6 - t);
        const ring = 1.5 * Math.sin(r * 12 - t * 2.4) * Math.exp(-r * 0.9) + 0.8 * (1 - r);
        const wave = 0.7 * Math.sin(u * 3.1 + t * 0.7) + 0.55 * Math.cos(v * 3.7 - t * 0.55) + 0.3 * Math.sin((u + v) * 5.2 + t * 1.1);
        const dx = x - k.bx, dz = z - k.bz;
        const bump = 2.2 * k.bump * Math.exp(-(dx * dx + dz * dz) / 9);
        const h = Math.max(0.12, 0.35 + wLens * lens + wRing * ring + wWave * (wave + 0.9) + bump);

        tmp.m.makeScale(1, h + BASE, 1);
        tmp.m.setPosition(x, -BASE, z);
        m.setMatrixAt(i, tmp.m);

        const gl = Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / 40);
        const lift = Math.min(1, h / 6);
        tmp.c.setScalar(0.62 + 0.9 * lift + 3.2 * gl + 1.2 * bump / 2.2);
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
  const shared = useRef<Shared>({ scroll: 0, px: 0, py: 0, moved: 0, reduce: false, dark: true });
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
    const onScroll = () => { sh.scroll = Math.min(3, window.scrollY / Math.max(1, window.innerHeight)); };
    const onMove = (e: PointerEvent) => {
      sh.px = (e.clientX / window.innerWidth) * 2 - 1;
      sh.py = -(e.clientY / window.innerHeight) * 2 + 1;
      sh.moved = 1.6;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("pointermove", onMove); };
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
