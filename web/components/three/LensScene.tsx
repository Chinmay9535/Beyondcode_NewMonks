"use client";

// Hero 3D scene: a high-detail pair of glasses (Khronos glTF sample "SunglassesKhronos",
// © 2024 Darmstadt Graphics Group GmbH, CC BY 4.0, see /public/3d/CREDITS.md).
// Materials are re-tuned at runtime: clear tinted glass lenses that keep the model's
// iridescent coating, a polished chrome frame and glossy blue ear hooks. The ear-hook
// texture (which carries third-party logos) is never rendered.
// The glasses float and tilt toward the pointer on a damped spring; a click gives them a
// little spin. Two small accent spheres drift behind. Lighting is generated in code.
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MODEL = "/3d/glasses.glb";

function useTunedGlasses() {
  const { scene } = useGLTF(MODEL);
  return useMemo(() => {
    const root = scene.clone(true);
    // Reflective tinted glass. (Transmission only refracts what is inside the WebGL scene,
    // and the page background is not, so it would render flat grey on a transparent canvas.)
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#a9c8ff", transparent: true, opacity: 0.22, roughness: 0, metalness: 0.2,
      clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.7, iridescenceIOR: 1.5, iridescenceThicknessRange: [220, 480],
      envMapIntensity: 3.2, specularIntensity: 1, side: THREE.DoubleSide, depthWrite: false,
    });
    const chrome = new THREE.MeshPhysicalMaterial({ color: "#e9eef7", metalness: 1, roughness: 0.08, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.03 });
    const hooks = new THREE.MeshPhysicalMaterial({ color: "#2f7bff", roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    const pads = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transmission: 1, thickness: 0.2, roughness: 0.05, envMapIntensity: 1.5 });
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.name || m.parent?.name || "").toLowerCase();
      if (n.includes("lens")) { m.material = glass; m.renderOrder = 2; }
      else if (n.includes("earhook")) m.material = hooks;
      else if (n.includes("nose")) m.material = pads;
      else m.material = chrome;
    });
    // Normalise: centre the model and scale it to a fixed width.
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(2.95 / Math.max(size.x, size.y, size.z));
    return wrap;
  }, [scene]);
}

function Glasses({ pointer, spin, still }: { pointer: React.MutableRefObject<THREE.Vector2>; spin: React.MutableRefObject<number>; still: boolean }) {
  const model = useTunedGlasses();
  const ref = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  // Fit narrow (phone) viewports: the glasses need about 4.4 world units of width.
  const fit = Math.min(1, viewport.width / 4.4);
  const vel = useRef(new THREE.Vector2());
  const extra = useRef(0);
  useFrame((state, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    const t = still ? 0 : state.clock.elapsedTime;
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1), py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    // Damped spring toward a pointer-driven target: a three-quarter view that turns toward the cursor.
    const tx = 0.12 + py * -0.18 + Math.sin(t * 0.6) * 0.03;
    const ty = -0.42 + px * 0.4 + Math.sin(t * 0.35) * 0.1;
    vel.current.x += ((tx - g.rotation.x) * 40 - vel.current.x * 11) * dt;
    vel.current.y += ((ty - g.rotation.y) * 40 - vel.current.y * 11) * dt;
    g.rotation.x += vel.current.x * dt;
    // Click spin: a decaying extra turn.
    extra.current += (spin.current - extra.current) * Math.min(1, dt * 3.5);
    g.rotation.y += vel.current.y * dt;
    g.rotation.z = Math.sin(t * 0.5) * 0.04 - px * 0.04;
    g.position.y = 0.15 + Math.sin(t * 0.9) * 0.08;
    model.rotation.y = extra.current;
  });
  return (
    <group ref={ref} rotation={[0.12, -0.42, 0]} scale={fit}>
      <primitive object={model} />
    </group>
  );
}

function Accents({ pointer, still }: { pointer: React.MutableRefObject<THREE.Vector2>; still: boolean }) {
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1);
    if (a.current) a.current.position.set(1.75 + Math.sin(t * 0.5) * 0.08 - px * 0.12, 1.45 + Math.sin(t * 0.7) * 0.1, -1.8);
    if (b.current) b.current.position.set(-1.5 + Math.sin(t * 0.6 + 2) * 0.08 - px * 0.08, -0.98 + Math.sin(t * 0.8 + 1) * 0.08, -0.4);
  });
  return (
    <>
      <mesh ref={a}>
        <sphereGeometry args={[0.36, 64, 64]} />
        <meshPhysicalMaterial color="#ef3b2d" roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      <mesh ref={b}>
        <sphereGeometry args={[0.2, 48, 48]} />
        <meshPhysicalMaterial color="#f6b51e" roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
    </>
  );
}

function Rig({ pointer, spin }: { pointer: React.MutableRefObject<THREE.Vector2>; spin: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1), py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    camera.position.x += (px * 0.25 - camera.position.x) * 0.04;
    camera.position.y += (0.25 + py * 0.15 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  useEffect(() => {
    const onDown = () => {
      if (Math.abs(pointer.current.x) > 1 || Math.abs(pointer.current.y) > 1) return; // only clicks over the scene
      spin.current += Math.PI * 2;
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pointer, spin]);
  return null;
}

export default function LensScene({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef(new THREE.Vector2());
  const spin = useRef(0);
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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.25, 7.5], fov: 32 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        frameloop={visible && !still ? "always" : "demand"}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[-3, 5, 4]} intensity={1.6} />
        <pointLight position={[3, -1, 3]} intensity={10} color="#2f7bff" distance={12} />
        <Environment resolution={512} frames={1}>
          {/* Studio strips: long, clean reflections on chrome and glass. */}
          <Lightformer form="rect" intensity={5} position={[-4, 2, 3]} rotation-y={0.7} scale={[1.2, 7, 1]} />
          <Lightformer form="rect" intensity={3} position={[4, 1.5, 3]} rotation-y={-0.7} scale={[0.9, 6, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#86b4ff" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
          <Lightformer form="rect" intensity={1} color="#ff8a6b" position={[0, -4, 2]} rotation-x={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 0.5, 6]} scale={2.5} />
        </Environment>
        <Suspense fallback={null}>
          <Glasses pointer={pointer} spin={spin} still={still} />
        </Suspense>
        <Accents pointer={pointer} still={still} />
        <ContactShadows position={[0, -1.05, 0]} opacity={0.55} scale={9} blur={2.6} far={3} color="#000c2a" />
        <Rig pointer={pointer} spin={spin} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
