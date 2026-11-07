"use client";

// Hero 3D scene. One sculptural object: a glass intraocular lens (square-edged biconvex
// optic + two C-shaped haptic arms), with three glossy spheres resting around it.
// Each sphere lives near a fixed "home" (so the composition and the text bubbles never
// collide) and drifts on a slow Lissajous path. Spring physics pulls it home, the pointer
// pushes it away, spheres collide with each other, and a click sends a pulse.
// Lighting is generated in code (Lightformers), so nothing is fetched from the network.
import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Ball = { r: number; color: string; home: [number, number, number]; drift: number; speed: number; phase: number };

// Clear size hierarchy: one large, one medium, one small, one accent.
const BALLS: Ball[] = [
  { r: 0.62, color: "#2f7bff", home: [2.1, 1.05, -1.1], drift: 0.12, speed: 0.35, phase: 0 },
  { r: 0.34, color: "#ef3b2d", home: [-1.95, -0.5, 0.3], drift: 0.1, speed: 0.45, phase: 1.7 },
  { r: 0.2, color: "#f6b51e", home: [0.85, -1.45, 0.8], drift: 0.08, speed: 0.55, phase: 3.1 },
  { r: 0.11, color: "#e6ecf7", home: [0.75, 1.85, -0.6], drift: 0.06, speed: 0.6, phase: 4.4 },
];

/** Lathe profile of a modern square-edged biconvex optic. */
function opticProfile(radius = 1, center = 0.42, edge = 0.07, steps = 48): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const cap = (center - edge) / 2;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * radius;
    pts.push(new THREE.Vector2(x, edge / 2 + cap * (1 - (x / radius) ** 2)));
  }
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * radius;
    pts.push(new THREE.Vector2(x, -edge / 2 - cap * (1 - (x / radius) ** 2)));
  }
  return pts;
}

/** C-shaped haptic: leaves the optic edge tangentially and sweeps outward ~110 degrees. */
function hapticCurve(start: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const a = start + t * 1.45;
    const r = 0.99 + 0.55 * Math.pow(t, 0.85);
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function Lens({ pointer, still }: { pointer: React.MutableRefObject<THREE.Vector2>; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const optic = useMemo(() => new THREE.LatheGeometry(opticProfile(), 128), []);
  const curves = useMemo(() => [hapticCurve(0.2), hapticCurve(Math.PI + 0.2)], []);
  const tubes = useMemo(() => curves.map((c) => new THREE.TubeGeometry(c, 200, 0.042, 20, false)), [curves]);
  const tips = useMemo(() => curves.map((c) => c.getPoint(1)), [curves]);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = still ? 0 : state.clock.elapsedTime;
    const k = Math.min(1, dt * 2.5);
    // Three-quarter view so the glass thickness and the haptic arms read clearly.
    g.rotation.x += (1.02 + pointer.current.y * 0.12 + Math.sin(t * 0.45) * 0.04 - g.rotation.x) * k;
    g.rotation.y += (Math.sin(t * 0.22) * 0.35 + pointer.current.x * 0.2 - g.rotation.y) * k;
    g.position.y = Math.sin(t * 0.7) * 0.05;
  });
  return (
    <group rotation={[0, 0, -0.32]}>
      <group ref={group} rotation={[1.02, 0, 0]} scale={0.95}>
        <mesh geometry={optic} renderOrder={2}>
          <meshPhysicalMaterial color="#8db8ff" transparent opacity={0.38} roughness={0.03} metalness={0.05}
            clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={3.2} specularIntensity={1} ior={1.5}
            iridescence={0.4} iridescenceIOR={1.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Square optic edge, catching the light as a bright rim. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.035, 20, 160]} />
          <meshPhysicalMaterial color="#dce9ff" roughness={0.06} metalness={0.3} clearcoat={1} envMapIntensity={2.4} />
        </mesh>
        {/* Diffractive rings of a trifocal optic, etched on the front surface. */}
        {[0.28, 0.42, 0.54, 0.65, 0.75, 0.84].map((r, i) => (
          <mesh key={r} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.175 * (1 - r * r) + 0.036, 0]} renderOrder={3}>
            <torusGeometry args={[r, 0.006, 8, 128]} />
            <meshBasicMaterial color="#eaf2ff" transparent opacity={0.55 - i * 0.05} depthWrite={false} />
          </mesh>
        ))}
        {tubes.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshPhysicalMaterial color="#4f93ff" roughness={0.1} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.6} />
          </mesh>
        ))}
        {tips.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.045, 24, 24]} />
            <meshPhysicalMaterial color="#4f93ff" roughness={0.1} clearcoat={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Balls({ pointer, pulse, still }: { pointer: React.MutableRefObject<THREE.Vector2>; pulse: React.MutableRefObject<THREE.Vector3 | null>; still: boolean }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const { viewport } = useThree();
  const sim = useRef(BALLS.map((b) => ({ p: new THREE.Vector3(...b.home), v: new THREE.Vector3(), a: new THREE.Vector3(...b.home) })));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const rel = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), steps = 3, h = dt / steps;
    const t = still ? 0 : state.clock.elapsedTime;
    const ptr = new THREE.Vector3((pointer.current.x * viewport.width) / 2, (pointer.current.y * viewport.height) / 2, 0.5);
    const arr = sim.current;
    for (let s = 0; s < steps; s++) {
      arr.forEach((o, i) => {
        const b = BALLS[i];
        // Slow Lissajous drift around a fixed home keeps the composition stable.
        o.a.set(b.home[0] + Math.sin(t * b.speed + b.phase) * b.drift * 2, b.home[1] + Math.sin(t * b.speed * 1.3 + b.phase) * b.drift * 1.6, b.home[2]);
        tmp.copy(o.a).sub(o.p).multiplyScalar(7);
        o.v.addScaledVector(tmp, h).multiplyScalar(1 - 3.2 * h);
        tmp.copy(o.p).sub(ptr);
        const d = tmp.length(), R = 1.0 + b.r;
        if (d < R && d > 1e-4) o.v.addScaledVector(tmp.normalize(), (R - d) ** 2 * 22 * h);
        if (pulse.current) {
          tmp.copy(o.p).sub(pulse.current);
          o.v.addScaledVector(tmp.normalize(), 4.5 / Math.max(0.4, o.p.distanceTo(pulse.current)));
        }
      });
      pulse.current = null;
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const A = arr[i], C = arr[j], min = BALLS[i].r + BALLS[j].r;
        tmp.copy(C.p).sub(A.p);
        const dist = tmp.length();
        if (dist < min && dist > 1e-5) {
          const n = tmp.divideScalar(dist), ma = BALLS[i].r ** 3, mc = BALLS[j].r ** 3, ov = min - dist;
          A.p.addScaledVector(n, (-ov * mc) / (ma + mc));
          C.p.addScaledVector(n, (ov * ma) / (ma + mc));
          const vrel = rel.copy(C.v).sub(A.v).dot(n);
          if (vrel < 0) {
            const jimp = (-1.8 * vrel) / (1 / ma + 1 / mc);
            A.v.addScaledVector(n, -jimp / ma);
            C.v.addScaledVector(n, jimp / mc);
          }
        }
      }
      arr.forEach((o) => o.p.addScaledVector(o.v, h));
    }
    arr.forEach((o, i) => meshes.current[i]?.position.copy(o.p));
  });
  return (
    <>
      {BALLS.map((b, i) => (
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} position={b.home}>
          <sphereGeometry args={[b.r, 64, 64]} />
          <meshPhysicalMaterial color={b.color} roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.3} />
        </mesh>
      ))}
    </>
  );
}

function Rig({ pointer, pulse }: { pointer: React.MutableRefObject<THREE.Vector2>; pulse: React.MutableRefObject<THREE.Vector3 | null> }) {
  const { camera, viewport } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.current.x * 0.3 - camera.position.x) * 0.035;
    camera.position.y += (pointer.current.y * 0.2 - camera.position.y) * 0.035;
    camera.lookAt(0, 0, 0);
  });
  useEffect(() => {
    const onDown = () => {
      if (Math.abs(pointer.current.x) > 1 || Math.abs(pointer.current.y) > 1) return; // only clicks over the scene
      pulse.current = new THREE.Vector3((pointer.current.x * viewport.width) / 2, (pointer.current.y * viewport.height) / 2, 0);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pointer, pulse, viewport]);
  return null;
}

export default function LensScene({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef(new THREE.Vector2());
  const pulse = useRef<THREE.Vector3 | null>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = wrap.current!;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("pointermove", move); };
  }, []);
  return (
    <div ref={wrap} className={className} aria-hidden>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8.8], fov: 34 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible && !still ? "always" : "demand"}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[-3, 5, 4]} intensity={1.8} />
        <pointLight position={[3, -2, 3]} intensity={14} color="#2f7bff" distance={12} />
        <Environment resolution={512} frames={1}>
          {/* Tall strip lights give the glass long, clean specular streaks. */}
          <Lightformer form="rect" intensity={4} position={[-3, 2, 4]} rotation-y={0.5} scale={[1.2, 6, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[3.5, 1, 3]} rotation-y={-0.6} scale={[0.8, 5, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#7fb0ff" position={[0, 5, 1]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={1.5} color="#ffd8a8" position={[0, -3, 3]} scale={1.6} />
        </Environment>
        <Lens pointer={pointer} still={still} />
        <Balls pointer={pointer} pulse={pulse} still={still} />
        <Rig pointer={pointer} pulse={pulse} />
      </Canvas>
    </div>
  );
}
