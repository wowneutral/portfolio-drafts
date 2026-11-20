// The scene: a cool grey sweep, the drafts, one key light and a rim. The page says which section is being read;
// this file tosses that section's ball onto the floor, opens it, and lets the visitor pull or crumple any sheet.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, smooth } from '@/lib/utils';
import { S, SWEEP, fieldOf, liveOf, shape, sheetGeometry, textureOf, type Field, type Sheet } from './floor';

type Drag = { id: string; x0: number; y0: number; t0: number; moved: boolean; scale: number } | null;
const drag = { cur: null as Drag, lastId: '', lastAt: 0 };

function release(s: Sheet, open: boolean) {
  const l = liveOf(s.id);
  l.target = open && !s.locked ? 1 : 0;
  if (open && s.locked) l.v = 2.6; // not yet: it gives a little and balls up again
  if (s.sec === 0 && s.main) S.heroOpen(l.target > 0.5);
  if (l.target > 0.5) s.tap?.();
}

/** Press, pull or press twice: the same rules for mouse, touch and the keyboard button. */
export function pressSheet(s: Sheet) {
  const l = liveOf(s.id); l.touched = true;
  if (s.pristine || s.fresh) return;
  if (l.t < 0.55) { l.gu = 0.9; l.gv = 0.9; release(s, true); }
}
export function crumpleSheet(s: Sheet) {
  const l = liveOf(s.id); l.touched = true;
  if (s.pristine || s.fresh) return;
  release(s, false);
}

function SheetMesh({ s, seg, texW, reg }: { s: Sheet; seg: number; texW: number; reg: (id: string, o: { g: THREE.Group; geo: THREE.BufferGeometry; f: Field; mat: THREE.MeshStandardMaterial } | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const small = s.w < 1.4;
  const f = useMemo(() => fieldOf(small ? Math.round(seg * 0.4) : seg, (s.id.length * 7 + s.sec) % 4), [seg, small, s.id, s.sec]);
  const geo = useMemo(() => sheetGeometry(f), [f]);
  const tex = useMemo(() => textureOf(s, small ? Math.round(texW * 0.5) : texW), [s, texW, small]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0, side: THREE.DoubleSide }), [tex]);
  useEffect(() => {
    liveOf(s.id).dirty = true;
    reg(s.id, { g: group.current!, geo, f, mat });
    return () => { reg(s.id, null); geo.dispose(); tex.dispose(); mat.dispose(); };
  }, [s.id, geo, tex, mat, reg, f]);

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const l = liveOf(s.id);
    if (s.pristine || s.fresh) return;
    if (e.uv) { l.gu = e.uv.x * 2 - 1; l.gv = (1 - e.uv.y) * 2 - 1; }
    const el = (e.nativeEvent.target as HTMLElement);
    const r = el.getBoundingClientRect();
    drag.cur = { id: s.id, x0: e.clientX, y0: e.clientY, t0: l.t, moved: false, scale: Math.max(140, Math.min(r.width, r.height) * 0.42) };
    l.touched = true;
  };
  return (
    <group ref={group} visible={false}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow onPointerDown={down}
        onPointerOver={() => { liveOf(s.id).hover = true; document.body.style.cursor = s.pristine || s.fresh ? '' : 'grab'; }}
        onPointerOut={() => { liveOf(s.id).hover = false; document.body.style.cursor = ''; }} />
    </group>
  );
}

function Director({ sheets, phone }: { sheets: Sheet[]; phone: boolean }) {
  const { camera } = useThree();
  const objs = useRef(new Map<string, { g: THREE.Group; geo: THREE.BufferGeometry; f: Field; mat: THREE.MeshStandardMaterial }>()).current;
  const reg = useMemo(() => (id: string, o: { g: THREE.Group; geo: THREE.BufferGeometry; f: Field; mat: THREE.MeshStandardMaterial } | null) => { if (o) objs.set(id, o); else objs.delete(id); }, [objs]);
  const key = useMemo(() => new THREE.DirectionalLight('#fffefb', 3.1), []);
  const st = useRef({ time: 0, secT: 0, secs: [] as number[], hs: [] as number[], cam: new THREE.Vector3(0, 9, 9), look: new THREE.Vector3(), shown: new Set<string>(), shapeT: new Map<string, number>() }).current;
  const seg = phone ? 40 : 64;
  const texW = phone ? 384 : 640;

  useEffect(() => {
    key.castShadow = true;
    const n = phone ? 1024 : 2048;
    key.shadow.mapSize.set(n, n); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
    return () => key.shadow.map?.dispose();
  }, [key, phone]);

  // Section frames: where the camera looks for each section, and how far back it stands.
  const frames = useMemo(() => {
    const n = Math.max(0, ...sheets.map((s) => s.sec)) + 1;
    const out: { x: number; z: number; d: number }[] = [];
    for (let k = 0; k < n; k++) {
      const mine = sheets.filter((s) => s.sec === k);
      if (!mine.length) { out.push(out[k - 1] ?? { x: 0, z: 0, d: 9 }); continue; }
      const xs = mine.map((s) => s.x), zs = mine.map((s) => s.z);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const ext = Math.max(...mine.map((s) => Math.max(Math.abs(s.x - cx), Math.abs(s.z - cz)) + Math.max(s.w, s.h) * 0.55));
      out.push({ x: cx, z: cz, d: k === 0 ? 6.4 : Math.max(7.2, ext * 4.2) });
    }
    // the ending: stand back and see the last stretch of the floor, every sheet opened
    const last = out.length - 1, from = out[Math.max(0, last - 4)];
    out[last] = { x: (from.x + out[last].x) / 2, z: (from.z + out[last].z) / 2 + 1, d: Math.abs(out[last].z - from.z) * 1.25 + 6 };
    return out;
  }, [sheets]);

  // keyboard: open or crumple the sheet of the section being read
  useEffect(() => {
    S.toggle = () => {
      const s = sheets.find((x) => x.sec === S.active && x.main) ?? sheets.find((x) => x.sec === S.active);
      if (!s) return;
      const l = liveOf(s.id);
      if (l.t > 0.5) crumpleSheet(s); else pressSheet(s);
    };
    return () => { S.toggle = null; };
  }, [sheets]);

  // pulling: the window owns the pointer once a sheet is grabbed
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.cur; if (!d) return;
      const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (dist > 6) d.moved = true;
      const s = sheets.find((x) => x.id === d.id); if (!s) return;
      const l = liveOf(d.id);
      const want = d.t0 < 0.5 ? d.t0 + dist / d.scale : d.t0 - dist / (d.scale * 1.6);
      l.target = clamp(want, 0, s.locked ? 0.24 : 1);
      document.body.style.cursor = 'grabbing';
    };
    const up = () => {
      const d = drag.cur; if (!d) return;
      drag.cur = null; document.body.style.cursor = '';
      const s = sheets.find((x) => x.id === d.id); if (!s) return;
      const l = liveOf(d.id);
      if (!d.moved) {
        const now = performance.now();
        const twice = drag.lastId === d.id && now - drag.lastAt < 600;
        drag.lastId = d.id; drag.lastAt = now;
        if (twice && l.t > 0.5) { release(s, false); drag.lastId = ''; }
        else if (l.t < 0.55) release(s, true);
        else s.tap?.();
        return;
      }
      if (s.locked) { release(s, false); return; }
      if (l.target > 0.55) release(s, true);
      else { l.target = d.t0 > 0.5 ? 0 : 0.2; if (s.sec === 0 && s.main) S.heroOpen(false); } // let go too early: it curls back
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [sheets]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 1 / 20);
    st.time += dt;
    st.secT -= dt;
    if (st.secT <= 0 || !st.secs.length) {
      const els = [...document.querySelectorAll<HTMLElement>('.v-crumple [data-sec]')];
      st.secs = els.map((el) => el.getBoundingClientRect().top + window.scrollY);
      st.hs = els.map((el) => Math.max(1, el.getBoundingClientRect().height));
      st.secT = 0.8;
    }
    const band = phone ? window.innerHeight * 0.4 : 0;
    const ref = scroll.y + band + (window.innerHeight - band) * (phone ? 0.3 : 0.5);
    let k = 0;
    for (let i = 0; i < st.secs.length; i++) if (st.secs[i] <= ref) k = i;
    k = Math.min(k, frames.length - 1);
    const frac = st.secs.length ? clamp((ref - st.secs[k]) / st.hs[k]) : 0;
    S.active = k; S.frac = frac;

    // the sheets
    const dragId = drag.cur?.id;
    for (const s of sheets) {
      const o = objs.get(s.id); if (!o) continue;
      const l = liveOf(s.id);
      if (!l.shown && (s.sec <= k || (s.sec === k + 1 && frac > 0.6))) {
        l.shown = true;
        if (s.pristine || s.fresh) { l.t = 1; l.target = 1; l.glide = 0; l.dirty = true; }
        else { l.y = 3.4 + ((s.x * 13) % 1 + 1) % 1; l.vy = -1; l.spin = (s.z * 3) % 6.28; }
      }
      o.g.visible = l.shown;
      if (!l.shown) continue;
      let px = s.x, py = 0, pz = s.z, rx = 0, rz = 0;
      if (s.pristine || s.fresh) {
        l.glide = Math.min(1, l.glide + dt / (s.pristine ? 2.2 : 1.6));
        const e = 1 - l.glide;
        py = 2.6 * e * e + s.layer;
        px += Math.sin(l.glide * 7) * 0.5 * e;
        rz = Math.sin(l.glide * 8 + 1) * 0.32 * e;
        rx = Math.cos(l.glide * 6) * 0.22 * e;
        if (l.glide >= 1 && l.landedAt < 0) l.landedAt = st.time;
      } else {
        if (l.y > 0 || l.vy !== 0) {
          l.vy -= 26 * dt; l.y += l.vy * dt;
          if (l.y <= 0) { l.y = 0; l.vy = l.vy < -1.6 ? -l.vy * 0.32 : 0; if (l.vy === 0 && l.landedAt < 0) l.landedAt = st.time; }
          l.spin += dt * 6 * (l.y > 0 ? 1 : 0.3);
        }
        py = l.y;
        const settle = l.landedAt < 0 ? 1 : Math.max(0, 1 - (st.time - l.landedAt) * 3);
        rx = Math.sin(l.spin) * 0.5 * settle; rz = Math.cos(l.spin * 0.7) * 0.4 * settle;
        // open by itself once its section is being read, unless the visitor got there first
        if (s.auto && !l.touched && l.landedAt > 0 && st.time - l.landedAt > 0.45 && s.sec <= k) { l.touched = true; l.gu = 0.9; l.gv = 0.9; l.target = 1; s.tap?.(); }
        // the first ball twitches now and then, as if it wants to open
        if (s.sec === 0 && s.main && !l.touched && l.landedAt > 0) l.target = (st.time % 3.4) < 0.42 ? 0.1 : 0;
        if (dragId === s.id) { const p = l.t; l.t = damp(l.t, l.target, 16, dt); l.v = (l.t - p) / dt; }
        else {
          // a ball under the pointer loosens a little, as if it wants to be opened
          const want = l.hover && l.target < 0.15 && !s.locked ? 0.12 : l.target;
          l.v += (60 * (want - l.t) - 8 * l.v) * dt; l.t += l.v * dt;
          if (l.t > 1) { l.t = 1; l.v *= -0.35; }
          if (l.t < 0) { l.t = 0; l.v *= -0.3; }
        }
      }
      const last = st.shapeT.get(s.id) ?? -1;
      if (l.dirty || Math.abs(last - l.t) > 0.0004 || Math.abs(l.v) > 0.02) {
        shape(o.geo, o.f, s, l);
        st.shapeT.set(s.id, l.t); l.dirty = false;
        // a ball reads as crumpled paper only with hard facets; a sheet reads as paper with soft creases
        const hard = l.t < 0.5;
        if (o.mat.flatShading !== hard) { o.mat.flatShading = hard; o.mat.needsUpdate = true; }
      }
      o.g.position.set(px, py, pz);
      o.g.rotation.set(rx, s.yaw, rz);
    }

    // the camera: a long lens, standing back and above, walking down the drift
    const a = frames[k], b = frames[Math.min(k + 1, frames.length - 1)];
    const e = smooth(clamp((frac - 0.55) / 0.45));
    const tx = a.x + (b.x - a.x) * e, tz = a.z + (b.z - a.z) * e, d = a.d + (b.d - a.d) * e;
    const dd = phone ? d * 0.9 : d;
    const cdt = Math.min(raw, 0.12);
    st.look.set(damp(st.look.x, tx, 2.8, cdt), 0, damp(st.look.z, tz, 2.8, cdt));
    if (st.time < 0.05) st.look.set(tx, 0, tz);
    const want = new THREE.Vector3(st.look.x + dd * 0.08, dd * 0.86, st.look.z + dd * 0.5);
    if (st.time < 0.05) st.cam.copy(want); else st.cam.lerp(want, 1 - Math.exp(-2.8 * cdt));
    camera.position.copy(st.cam);
    camera.lookAt(st.look.x, 0.3, st.look.z - 0.1);
    key.position.set(st.look.x - 9, 7, st.look.z - 4.5);
    key.target.position.set(st.look.x, 0, st.look.z);
    key.target.updateMatrixWorld();
    const sc = key.shadow.camera, half = Math.max(6, dd * 0.75);
    if (Math.abs(sc.right - half) > 0.05) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix(); }
  });

  return (
    <>
      <primitive object={key} />
      <primitive object={key.target} />
      {sheets.map((s) => <SheetMesh key={s.id} s={s} seg={seg} texW={texW} reg={reg} />)}
    </>
  );
}

export default function Floor({ sheets, phone }: { sheets: Sheet[]; phone: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} camera={{ fov: 30, near: 0.5, far: 200, position: [0, 9, 9] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[SWEEP]} />
      <fog attach="fog" args={[SWEEP, 26, 80]} />
      <hemisphereLight args={['#ffffff', '#aeb3b6', 0.5]} />
      <directionalLight position={[8, 5, 6]} intensity={0.55} color="#e9eef6" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#5a5e62']} />
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[-5, 8, 2]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#eef2f8" position={[8, 3, 4]} rotation-y={-Math.PI / 2} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 30]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={SWEEP} roughness={0.96} metalness={0} envMapIntensity={0.4} />
      </mesh>
      <Director sheets={sheets} phone={phone} />
    </Canvas>
  );
}
