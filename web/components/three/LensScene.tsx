"use client";

// Hero 3D scene: a glossy intraocular lens (optic + two haptic arms) with glossy spheres
// orbiting it. The spheres are driven by a small spring-physics simulation: each one is
// pulled toward a moving orbit anchor, damped, pushed away by the pointer, and collides
// with the others. Clicking sends a radial impulse. Lighting is generated in code
// (Lightformers), so nothing is fetched from the network.
import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Ball = { r: number; color: string; orbit: number; speed: number; phase: number; tilt: number; y: number };

const BALLS: Ball[] = [
  { r: 0.4, color: "#2f7bff", orbit: 1.95, speed: 0.22, phase: 0.2, tilt: 0.35, y: 0.1 },
  { r: 0.3, color: "#ef3b2d", orbit: 2.15, speed: -0.17, phase: 2.1, tilt: -0.25, y: -0.3 },
  { r: 0.19, color: "#f6b51e", orbit: 1.7, speed: 0.3, phase: 4.0, tilt: 0.5, y: 0.45 },
  { r: 0.15, color: "#2f7bff", orbit: 2.3, speed: 0.15, phase: 5.2, tilt: -0.45, y: 0.2 },
  { r: 0.24, color: "#dfe7f5", orbit: 2.05, speed: -0.24, phase: 3.3, tilt: 0.15, y: -0.55 },
  { r: 0.12, color: "#ef3b2d", orbit: 1.6, speed: 0.36, phase: 1.1, tilt: -0.1, y: 0.6 },
];

function biconvexProfile(radius = 1, thickness = 0.36, steps = 40): THREE.Vector2[] {
  // Lathe profile of a biconvex optic: two spherical caps meeting at the rim.
  const pts: THREE.Vector2[] = [];
  const h = thickness / 2;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * radius;
    pts.push(new THREE.Vector2(x, h * Math.sqrt(Math.max(0, 1 - (x / radius) ** 2)) + 0.012));
  }
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * radius;
    pts.push(new THREE.Vector2(x, -h * Math.sqrt(Math.max(0, 1 - (x / radius) ** 2)) - 0.012));
  }
  return pts;
}

function hapticCurve(start: number, dir: 1 | -1): THREE.CatmullRomCurve3 {
  // A C-shaped spring arm leaving the optic rim and sweeping outward.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = start + dir * t * 2.55;
    const r = 0.96 + Math.sin(t * Math.PI * 0.92) * 0.62 + t * 0.32;
    pts.push(new THREE.Vector3(Math.cos(a) * r, (t - 0.5) * 0.06, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function Lens({ pointer }: { pointer: React.MutableRefObject<THREE.Vector2> }) {
  const group = useRef<THREE.Group>(null);
  const optic = useMemo(() => new THREE.LatheGeometry(biconvexProfile(), 96), []);
  const h1 = useMemo(() => new THREE.TubeGeometry(hapticCurve(0.15, 1), 160, 0.038, 20, false), []);
  const h2 = useMemo(() => new THREE.TubeGeometry(hapticCurve(Math.PI + 0.15, 1), 160, 0.038, 20, false), []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // Damped follow of the pointer + slow idle sway.
    const tx = 1.12 + pointer.current.y * 0.18 + Math.sin(t * 0.5) * 0.05;
    const ty = t * 0.18 + pointer.current.x * 0.35;
    g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 3);
    g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 3);
    g.position.y = Math.sin(t * 0.8) * 0.07;
  });
  return (
    <group ref={group} rotation={[1.12, 0, 0.18]} scale={0.82}>
      <mesh geometry={optic} castShadow>
        <meshPhysicalMaterial color="#dbe8ff" transmission={1} thickness={1.2} roughness={0.03} ior={1.5} clearcoat={1} clearcoatRoughness={0.04}
          attenuationColor="#6fa6ff" attenuationDistance={1.4} specularIntensity={1} envMapIntensity={1.8} iridescence={0.35} iridescenceIOR={1.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.018, 16, 128]} />
        <meshPhysicalMaterial color="#cfe0ff" roughness={0.1} metalness={0.2} clearcoat={1} />
      </mesh>
      {[h1, h2].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial color="#a9d1ff" roughness={0.12} metalness={0.05} clearcoat={1} clearcoatRoughness={0.05} transmission={0.35} thickness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Rings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.2) * 0.12; });
  const arc = (r: number, a: number, c: string, rot: number, tube = 0.06) => (
    <mesh rotation={[0, 0, rot]}>
      <torusGeometry args={[r, tube, 24, 160, a]} />
      <meshPhysicalMaterial color={c} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
  return (
    <group ref={ref} position={[0, 0, -1.8]} scale={0.9}>
      {arc(2.2, Math.PI * 0.55, "#ef3b2d", 0.35, 0.05)}
      {arc(2.2, Math.PI * 0.32, "#f6b51e", 0.35 + Math.PI * 0.6, 0.05)}
      {arc(2.2, Math.PI * 0.7, "#173a8f", 0.35 + Math.PI * 1.0, 0.05)}
      {arc(2.62, Math.PI * 0.5, "#8fa3c7", 2.4, 0.01)}
      {arc(1.78, Math.PI * 0.35, "#8fa3c7", 4.1, 0.008)}
    </group>
  );
}

function Balls({ pointer, pulse, still }: { pointer: React.MutableRefObject<THREE.Vector2>; pulse: React.MutableRefObject<THREE.Vector3 | null>; still: boolean }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const { viewport } = useThree();
  const sim = useRef(
    BALLS.map((b) => {
      const a = b.phase;
      const p = new THREE.Vector3(Math.cos(a) * b.orbit, b.y + Math.sin(a) * b.tilt * b.orbit * 0.4, Math.sin(a) * b.orbit * 0.5);
      return { p, v: new THREE.Vector3(), anchor: p.clone(), angle: a };
    }),
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const steps = 3, h = dt / steps;
    const ptr = new THREE.Vector3((pointer.current.x * viewport.width) / 2, (pointer.current.y * viewport.height) / 2, 0.4);
    for (let s = 0; s < steps; s++) {
      sim.current.forEach((o, i) => {
        const b = BALLS[i];
        if (!still) o.angle += b.speed * h;
        o.anchor.set(Math.cos(o.angle) * b.orbit, b.y + Math.sin(o.angle) * b.tilt * b.orbit * 0.4, Math.sin(o.angle) * b.orbit * 0.5);
        // Spring toward the anchor, with damping.
        tmp.copy(o.anchor).sub(o.p).multiplyScalar(9);
        o.v.addScaledVector(tmp, h).multiplyScalar(1 - 2.6 * h);
        // Pointer repulsion (soft, quadratic falloff).
        tmp.copy(o.p).sub(ptr);
        const d = tmp.length(), R = 1.25 + b.r;
        if (d < R && d > 1e-4) o.v.addScaledVector(tmp.normalize(), ((R - d) ** 2) * 26 * h);
        // Click pulse.
        if (pulse.current) {
          tmp.copy(o.p).sub(pulse.current);
          const dd = Math.max(0.3, tmp.length());
          o.v.addScaledVector(tmp.normalize(), 6 / dd);
        }
      });
      pulse.current = null;
      // Sphere-sphere collisions (elastic-ish, restitution 0.8).
      const arr = sim.current;
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], c = arr[j], ra = BALLS[i].r, rc = BALLS[j].r;
        tmp.copy(c.p).sub(a.p);
        const dist = tmp.length(), min = ra + rc;
        if (dist < min && dist > 1e-5) {
          const n = tmp.divideScalar(dist);
          const ma = ra ** 3, mc = rc ** 3, overlap = min - dist;
          a.p.addScaledVector(n, (-overlap * mc) / (ma + mc));
          c.p.addScaledVector(n, (overlap * ma) / (ma + mc));
          const rel = c.v.clone().sub(a.v).dot(n);
          if (rel < 0) {
            const jimp = (-(1 + 0.8) * rel) / (1 / ma + 1 / mc);
            a.v.addScaledVector(n, -jimp / ma);
            c.v.addScaledVector(n, jimp / mc);
          }
        }
      }
      arr.forEach((o) => o.p.addScaledVector(o.v, h));
    }
    sim.current.forEach((o, i) => meshes.current[i]?.position.copy(o.p));
  });
  return (
    <>
      {BALLS.map((b, i) => (
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} castShadow>
          <sphereGeometry args={[b.r, 48, 48]} />
          <meshPhysicalMaterial color={b.color} roughness={0.14} metalness={0.05} clearcoat={1} clearcoatRoughness={0.06} sheen={0.2} />
        </mesh>
      ))}
    </>
  );
}

function Rig({ pointer, pulse }: { pointer: React.MutableRefObject<THREE.Vector2>; pulse: React.MutableRefObject<THREE.Vector3 | null> }) {
  const { camera, viewport } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.current.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (pointer.current.y * 0.25 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  useEffect(() => {
    const onClick = () => {
      if (Math.abs(pointer.current.x) > 1 || Math.abs(pointer.current.y) > 1) return; // only clicks over the scene
      pulse.current = new THREE.Vector3((pointer.current.x * viewport.width) / 2, (pointer.current.y * viewport.height) / 2, 0);
    };
    window.addEventListener("pointerdown", onClick);
    return () => window.removeEventListener("pointerdown", onClick);
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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 9.4], fov: 34 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible && !still ? "always" : "demand"} shadows={false}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} color="#ffffff" />
        <pointLight position={[-4, -2, 3]} intensity={18} color="#2f7bff" distance={14} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#7fb0ff" position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffd59a" position={[4, -1, 3]} scale={2.2} />
          <Lightformer form="rect" intensity={0.8} color="#ff6a5a" position={[0, -4, 2]} scale={[6, 1, 1]} />
        </Environment>
        <Rings />
        <Lens pointer={pointer} />
        <Balls pointer={pointer} pulse={pulse} still={still} />
        <Rig pointer={pointer} pulse={pulse} />
      </Canvas>
    </div>
  );
}
