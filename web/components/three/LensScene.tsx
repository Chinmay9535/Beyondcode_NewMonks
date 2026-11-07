"use client";

// Hero 3D scene: "through the glasses".
// A real Bengaluru street at dusk fills the hero, rendered as a cataract patient sees it
// today (blurred, yellowed, low contrast). Seen through the glasses' lenses the same street
// is sharp: the lens shader samples the sharp photo at the same screen position, with a
// touch of refraction from the lens curvature and a bright glassy rim. The glasses follow
// the pointer on a damped spring, so you scan the street and see clearly where you look.
//
// Assets (see /public/3d/CREDITS.md): glasses "SunglassesKhronos" © 2024 Darmstadt Graphics
// Group GmbH, CC BY 4.0; street photo by Subhashish Panigrahi, CC BY-SA 3.0 (adapted).
import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MODEL = "/3d/glasses.glb";
// Wide crop for landscape screens, the full square photo for portrait (less zoom on phones).
const IMAGES = {
  wide: { sharp: "/3d/street.jpg", blur: "/3d/street-cataract.jpg", aspect: 16 / 9 },
  square: { sharp: "/3d/street-square.jpg", blur: "/3d/street-square-cataract.jpg", aspect: 1 },
};
const BG_DIST = 6; // distance from the camera to the backdrop plane

/** UV repeat/offset that makes an image of aspect `img` cover a plane of the given aspect. */
function cover(aspect: number, img: number) {
  if (aspect > img) { const r = img / aspect; return { repeat: new THREE.Vector2(1, r), offset: new THREE.Vector2(0, (1 - r) / 2) }; }
  const r = aspect / img;
  return { repeat: new THREE.Vector2(r, 1), offset: new THREE.Vector2((1 - r) / 2, 0) };
}

/** The cataract street, locked to the camera so screen UV == image UV. */
function Backdrop({ tex, img }: { tex: THREE.Texture; img: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const h = 2 * BG_DIST * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), w = h * (size.width / size.height);
  const c = cover(w / h, img);
  tex.repeat.copy(c.repeat); tex.offset.copy(c.offset); tex.colorSpace = THREE.SRGBColorSpace;
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.position.copy(camera.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(BG_DIST));
    m.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={mesh} renderOrder={-1}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

function Glasses({ sharp, img, pointer, spin, still }: { sharp: THREE.Texture; img: number; pointer: React.MutableRefObject<THREE.Vector2>; spin: React.MutableRefObject<number>; still: boolean }) {
  const { scene } = useGLTF(MODEL);
  const { size, camera, viewport } = useThree();
  const portrait = size.width < size.height * 0.9;
  // The lens shows the sharp photo: each frame, every lens vertex gets the screen position it
  // projects to as its texture coordinate, so the lens acts as a window onto the clear street.
  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sharp, toneMapped: false, side: THREE.DoubleSide }), [sharp]);
  const lensMeshes = useRef<THREE.Mesh[]>([]);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const chrome = new THREE.MeshPhysicalMaterial({ color: "#eef2f9", metalness: 1, roughness: 0.07, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0.03 });
    const hooks = new THREE.MeshPhysicalMaterial({ color: "#2f7bff", roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    const pads = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 0.05, envMapIntensity: 1.5 });
    const coat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, roughness: 0, metalness: 0.2, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.45, envMapIntensity: 3, depthWrite: false });
    const extra: THREE.Mesh[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.name || m.parent?.name || "").toLowerCase();
      if (m.userData.coat) return;
      if (n.includes("lensesexterior")) {
        m.geometry = m.geometry.clone();
        const count = m.geometry.attributes.position.count;
        m.geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        m.material = lensMat;
        lensMeshes.current.push(m);
        const c = new THREE.Mesh(m.geometry, coat); // reflective coat on top of the window
        c.userData.coat = true;
        c.renderOrder = 3;
        extra.push(c);
        m.add(c);
      } else if (n.includes("lensesinterior")) m.visible = false;
      else if (n.includes("earhook")) m.material = hooks;
      else if (n.includes("nose")) m.material = pads;
      else m.material = chrome;
    });
    const box = new THREE.Box3().setFromObject(root);
    const sz = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(2.7 / Math.max(sz.x, sz.y, sz.z));
    return wrap;
  }, [scene, lensMat]);

  const ref = useRef<THREE.Group>(null);
  const tmpV = useRef(new THREE.Vector3()), tmpN = useRef(new THREE.Vector3()), tmpM = useRef(new THREE.Matrix3());
  const vel = useRef({ rx: 0, ry: 0, x: 0, y: 0 });
  const extraSpin = useRef(0);
  const vp = viewport.getCurrentViewport(camera, [0, 0, 0]);
  const base = portrait ? new THREE.Vector3(0, -vp.height * 0.24, 0) : new THREE.Vector3(vp.width * 0.2, -0.05, 0);
  const fit = portrait ? Math.min(0.95, vp.width / 3.9) : Math.min(1.28, vp.width / 7.8);

  useFrame((state, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    const t = still ? 0 : state.clock.elapsedTime;
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1), py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    // Project each lens vertex to the screen and use that as its UV into the sharp photo.
    const bh = 2 * BG_DIST * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2));
    const c = cover((bh * (size.width / size.height)) / bh, img);
    const vtx = tmpV.current, nrm = tmpN.current, nm = tmpM.current;
    for (const m of lensMeshes.current) {
      m.updateWorldMatrix(true, false);
      nm.getNormalMatrix(m.matrixWorld);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute, nor = m.geometry.attributes.normal as THREE.BufferAttribute;
      const uv = m.geometry.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        vtx.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).project(camera);
        nrm.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        const sx = (vtx.x + 1) / 2 + nrm.x * 0.012, sy = (vtx.y + 1) / 2 + nrm.y * 0.012; // slight refraction
        uv.setXY(i, sx * c.repeat.x + c.offset.x, sy * c.repeat.y + c.offset.y);
      }
      uv.needsUpdate = true;
    }
    // Damped springs: the glasses glide toward the pointer and turn to face it.
    const v = vel.current, k = 34, d = 10.5;
    // Follow the pointer, but keep the whole frame inside the view.
    const halfW = 1.4 * fit, margin = 0.15;
    const maxX = vp.width / 2 - halfW - margin;
    const tx = THREE.MathUtils.clamp(base.x + (portrait ? px * 0.25 : px * 0.55), -maxX, maxX);
    const ty = base.y + (portrait ? py * 0.12 : py * 0.28) + Math.sin(t * 0.9) * 0.05;
    v.x += ((tx - g.position.x) * k - v.x * d) * dt; g.position.x += v.x * dt;
    v.y += ((ty - g.position.y) * k - v.y * d) * dt; g.position.y += v.y * dt;
    const trx = 0.1 - py * 0.16, try_ = -0.3 + px * 0.35 + Math.sin(t * 0.35) * 0.06;
    v.rx += ((trx - g.rotation.x) * 40 - v.rx * 11) * dt; g.rotation.x += v.rx * dt;
    v.ry += ((try_ - g.rotation.y) * 40 - v.ry * 11) * dt; g.rotation.y += v.ry * dt;
    g.rotation.z = -v.x * 0.03 + Math.sin(t * 0.5) * 0.02; // lean into the motion
    extraSpin.current += (spin.current - extraSpin.current) * Math.min(1, dt * 3.5);
    model.rotation.y = extraSpin.current;
  });
  return (
    <group ref={ref} position={base} scale={fit}>
      <primitive object={model} />
    </group>
  );
}

function Scene({ pointer, spin, still }: { pointer: React.MutableRefObject<THREE.Vector2>; spin: React.MutableRefObject<number>; still: boolean }) {
  const { size } = useThree();
  const set = size.width < size.height * 0.9 ? IMAGES.square : IMAGES.wide;
  const [sharp, blur] = useTexture([set.sharp, set.blur]);
  sharp.colorSpace = THREE.SRGBColorSpace;
  return (
    <>
      <Backdrop tex={blur} img={set.aspect} />
      <Glasses sharp={sharp} img={set.aspect} pointer={pointer} spin={spin} still={still} />
    </>
  );
}

function Rig({ pointer, spin }: { pointer: React.MutableRefObject<THREE.Vector2>; spin: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1), py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    camera.position.x += (px * 0.12 - camera.position.x) * 0.03;
    camera.position.y += (py * 0.08 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  });
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.("a,button,input,label,form")) return; // not when using the page
      if (Math.abs(pointer.current.x) > 1 || Math.abs(pointer.current.y) > 1) return;
      spin.current += Math.PI * 2;
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pointer, spin]);
  return null;
}

export default function LensScene({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef(new THREE.Vector2(0.35, 0));
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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 7.5], fov: 32 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        frameloop={visible && !still ? "always" : "demand"}>
        <color attach="background" args={["#06080c"]} />
        <directionalLight position={[-3, 5, 4]} intensity={1.4} />
        <Environment resolution={512} frames={1}>
          <Lightformer form="rect" intensity={5} position={[-4, 2, 3]} rotation-y={0.7} scale={[1.2, 7, 1]} />
          <Lightformer form="rect" intensity={3} position={[4, 1.5, 3]} rotation-y={-0.7} scale={[0.9, 6, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#ffcf9a" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 0.5, 6]} scale={2.5} />
        </Environment>
        <Suspense fallback={null}>
          <Scene pointer={pointer} spin={spin} still={still} />
        </Suspense>
        <Rig pointer={pointer} spin={spin} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
