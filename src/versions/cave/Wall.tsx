// One wall band: a pale wall, a pedestal, a heap, and the light the visitor holds.
// The scene renders through drei <View> into the page's one fixed canvas.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import { build, hash, rng, split, type Built } from './heap';
import { clamp, damp, isPhone } from '@/lib/utils';

type Mode = 'idle' | 'settle' | 'free';
type Ctl = {
  pos: THREE.Vector3; target: THREE.Vector3; raw: THREE.Vector3; sol: THREE.Vector3; home: THREE.Vector3;
  mode: Mode; speed: number; found: boolean; t0: number;
  cam: THREE.Camera | null; band: HTMLElement | null; marker: HTMLElement | null;
  range: { x: number; y0: number; y1: number };
  onFound: (f: boolean) => void;
};

const WALL = '#d9d2c4';
const ROOM = '#151412';
const plane = new THREE.Plane();
const ray = new THREE.Raycaster();
const v = new THREE.Vector3();
const ndc = new THREE.Vector2();

let fontReady: Promise<unknown> | null = null;
const loadFont = () => (fontReady ??= document.fonts.load('100px Anton').catch(() => null));

/** The magnet: near the answer, the light is pulled the rest of the way. */
function magnet(c: Ctl, p: THREE.Vector3) {
  const dx = p.x - c.sol.x, dy = p.y - c.sol.y;
  const d = Math.hypot(dx, dy), R = 0.7;
  if (d < R) { const k = Math.pow(d / R, 2.2); p.set(c.sol.x + dx * k, c.sol.y + dy * k, c.sol.z); }
  return p;
}

function Scene({ c, word, rows, maxW, cy, seed, recast }: { c: Ctl; word: string; rows: number; maxW: number; cy: number; seed: number; recast: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const camera = useThree((s) => s.camera);
  const [ready, setReady] = useState(false);
  const phone = isPhone();
  useEffect(() => { loadFont().then(() => setReady(true)); }, []);
  const lines = useMemo(() => split(word, phone ? 8 : 18), [word, phone]);
  const heap: Built | null = useMemo(
    () => (ready ? build(lines, rows, c.sol, cy + (lines.length > 1 ? 0.25 : 0), maxW, lines.length > 1 ? 2.3 : word.length <= 2 ? 2.1 : 1.5, seed ^ hash(word)) : null),
    [ready, lines, rows, c.sol, cy, maxW, seed, word],
  );
  // The pedestal sits under the heap and never reaches toward the light.
  const ped = useMemo(() => {
    if (!heap) return null;
    const b = heap.box;
    const top = b.min.y - 0.04;
    const w = b.max.x - b.min.x + 0.7, d = b.max.z - b.min.z + 0.5;
    return { pos: [(b.min.x + b.max.x) / 2, top / 2, b.max.z - d / 2 + 0.05] as const, size: [w, top, d] as const, top };
  }, [heap]);
  const drop = useRef<{ t: number; off: THREE.Vector3[] } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const m = mesh.current; if (!m || !heap) return;
    m.count = heap.mats.length;
    heap.mats.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    if (recast && !first.current) {
      const r = rng(hash(word) + 3);
      drop.current = { t: performance.now(), off: heap.mats.map(() => new THREE.Vector3((r() - 0.5) * 1.4, 1.6 + r() * 1.6, (r() - 0.5) * 0.8)) };
    }
    first.current = false;
  }, [heap, recast, word]);

  useEffect(() => {
    c.cam = camera;
    const s = spot.current; if (!s) return;
    s.target.position.set(0, cy + 0.2, 0);
    s.target.updateMatrixWorld();
  }, [camera, c, cy]);

  const tmp = useMemo(() => new THREE.Matrix4(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    dt = Math.min(dt, 0.25);
    if (c.mode === 'idle') {
      c.target.set(c.home.x + Math.sin(t * 0.37 + seed) * 0.5, c.home.y + Math.sin(t * 0.29 + seed * 2) * 0.22, c.sol.z);
    } else if (c.mode === 'settle' && t > c.t0) c.target.copy(c.sol);
    const lam = c.mode === 'free' ? 11 : c.mode === 'settle' ? c.speed : 2;
    if (c.mode !== 'settle' || t > c.t0) {
      c.pos.x = damp(c.pos.x, c.target.x, lam, dt);
      c.pos.y = damp(c.pos.y, c.target.y, lam, dt);
    }
    c.pos.z = c.sol.z;
    const f = Math.hypot(c.pos.x - c.sol.x, c.pos.y - c.sol.y) < 0.02;
    if (f !== c.found) { c.found = f; c.onFound(f); }
    const sp = spot.current;
    if (sp) {
      sp.position.copy(c.pos);
      sp.intensity = damp(sp.intensity, f ? 66 : 56, 4, dt);
    }
    // the marker: where the light is, seen from here
    if (c.marker && c.band) {
      v.copy(c.pos).project(state.camera);
      const w = c.band.clientWidth, h = c.band.clientHeight;
      c.marker.style.transform = `translate(${clamp(((v.x + 1) / 2) * w, 22, w - 22)}px, ${clamp(((1 - v.y) / 2) * h, 22, h - 22)}px)`;
    }
    const d = drop.current, m = mesh.current;
    if (d && m && heap) {
      const age = (performance.now() - d.t) / 1000;
      let busy = false;
      heap.mats.forEach((mt, i) => {
        const p = clamp((age - i * 0.004) / 0.9);
        if (p < 1) busy = true;
        const e = 1 - Math.pow(1 - p, 3);
        const o = d.off[i];
        tmp.copy(mt);
        tmp.elements[12] += o.x * (1 - e); tmp.elements[13] += o.y * (1 - e) * (1 - e); tmp.elements[14] += o.z * (1 - e);
        m.setMatrixAt(i, tmp);
      });
      m.instanceMatrix.needsUpdate = true;
      if (!busy) drop.current = null;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0.6, phone ? 6.4 : 4.6, 13]} fov={phone ? 34 : 27} near={0.5} far={80} onUpdate={(cam) => cam.lookAt(0, cy - 0.15, 1.2)} />
      <color attach="background" args={[ROOM]} />
      <ambientLight intensity={0.42} color="#e9dfcf" />
      <spotLight ref={spot} castShadow color="#fff3dc" intensity={56} decay={2} angle={0.78} penumbra={0.55} distance={0}
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02}
        shadow-camera-near={0.3} shadow-camera-far={16} />
      <mesh receiveShadow position={[0, 4, 0]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#2a2622" roughness={1} />
      </mesh>
      {ped && (
        <mesh castShadow receiveShadow position={ped.pos as unknown as THREE.Vector3Tuple}>
          <boxGeometry args={ped.size as unknown as [number, number, number]} />
          <meshStandardMaterial color="#3a352f" roughness={1} />
        </mesh>
      )}
      {ped && heap && (
        <group position={[heap.box.min.x - 0.12, ped.top, heap.box.max.z - 0.05]}>
          <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]} position={[0.05, 0.035, 0]}>
            <torusGeometry args={[0.16, 0.035, 16, 40]} />
            <meshStandardMaterial color="#e6dfd1" roughness={0.8} />
          </mesh>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]} position={[heap.box.max.x - heap.box.min.x + 0.1, 0.05, -0.1]}>
            <cylinderGeometry args={[0.05, 0.05, 0.42, 20]} />
            <meshStandardMaterial color="#e6dfd1" roughness={0.8} />
          </mesh>
        </group>
      )}
      <instancedMesh ref={mesh} args={[undefined, undefined, 900]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ddd5c6" roughness={0.82} />
      </instancedMesh>
    </>
  );
}

export type WallProps = {
  word: string; seed: number; label: string; gl: boolean;
  /** the opening: the light finds its own way once */
  auto?: boolean;
  /** pieces drop in again when the word changes */
  recast?: boolean;
  half?: boolean;
  className?: string;
  find?: string;
};

export function Wall({ word, seed, label, gl, auto, recast, half, className }: WallProps) {
  const phone = typeof window !== 'undefined' && isPhone();
  const maxW = phone ? 4.3 : half ? 4.6 : 7.4;
  const cy = 2.7;
  const c = useRef<Ctl>(null as unknown as Ctl);
  if (!c.current) {
    const r = rng(seed);
    const sol = new THREE.Vector3((r() - 0.5) * (half || phone ? 1.4 : 2.6), 1.05 + r() * 0.45, 5.4);
    const sx = r() > 0.5 ? 1 : -1;
    const home = new THREE.Vector3(sol.x + sx * (1.6 + r() * 0.8), clamp(sol.y + 1.1 + r() * 0.7, 0.8, 3.3), sol.z);
    c.current = {
      pos: home.clone(), target: home.clone(), raw: home.clone(), sol, home,
      mode: auto ? 'settle' : 'idle', speed: 1.5, found: false, t0: auto ? 1.2 : 0,
      cam: null, band: null, marker: null,
      range: { x: maxW / 2 + 1.2, y0: 0.7, y1: 3.6 },
      onFound: () => {},
    };
  }
  const ctl = c.current;
  const [found, setFound] = useState(false);
  ctl.onFound = setFound;
  const band = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => { ctl.band = band.current; ctl.marker = marker.current; }, [ctl]);

  const toPlane = (e: { clientX: number; clientY: number }) => {
    const el = band.current, cam = ctl.cam; if (!el || !cam) return null;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    plane.set(new THREE.Vector3(0, 0, 1), -ctl.sol.z);
    const p = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!p) return null;
    p.x = clamp(p.x, -ctl.range.x, ctl.range.x); p.y = clamp(p.y, ctl.range.y0, ctl.range.y1); p.z = ctl.sol.z;
    return p;
  };
  const aim = (p: THREE.Vector3) => { ctl.raw.copy(p); ctl.target.copy(magnet(ctl, p.clone())); ctl.mode = 'free'; };
  const dragging = useRef(false);

  const findIt = () => {
    if (ctl.found) { ctl.mode = 'idle'; ctl.raw.copy(ctl.home); return; }
    ctl.mode = 'settle'; ctl.speed = 3.2; ctl.t0 = 0; ctl.raw.copy(ctl.sol);
  };

  if (!gl) {
    return (
      <div className={`cv-wallwrap ${className ?? ''}`}>
        <div className="cv-band cv-flat" aria-hidden="true"><span>{word}</span></div>
      </div>
    );
  }

  return (
    <div className={`cv-wallwrap ${className ?? ''}`}>
      <div
        ref={band}
        className={`cv-band${found ? ' is-found' : ''}`}
        role="group"
        tabIndex={0}
        aria-label={`${label}. A light behind a heap of shapes: drag it, or use the arrow keys, until the shadow reads.`}
        onPointerDown={(e) => {
          const p = toPlane(e); if (!p) return;
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          aim(p);
        }}
        onPointerMove={(e) => { if (!dragging.current) return; const p = toPlane(e); if (p) aim(p); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={(e) => {
          const s = e.shiftKey ? 0.4 : 0.12;
          const mv: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] };
          if (mv[e.key]) {
            e.preventDefault();
            const base = ctl.mode === 'free' ? ctl.raw : ctl.pos;
            const p = base.clone();
            p.x = clamp(p.x + mv[e.key][0], -ctl.range.x, ctl.range.x);
            p.y = clamp(p.y + mv[e.key][1], ctl.range.y0, ctl.range.y1);
            aim(p);
          } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); findIt(); }
        }}
      >
        <View className="cv-view">
          <Scene c={ctl} word={word} rows={phone ? 13 : 19} maxW={maxW} cy={cy} seed={seed} recast={!!recast} />
        </View>
        <span ref={marker} className="cv-marker" aria-hidden="true"><i /></span>
      </div>
      <div className="cv-wallbar">
        <button type="button" className="cv-find" onClick={findIt}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6" /></svg>
          {found ? 'Scatter it' : 'Find it'}
        </button>
        <span className="sr-only-x" aria-live="polite">{found ? `The shadow reads ${word}.` : ''}</span>
      </div>
    </div>
  );
}
