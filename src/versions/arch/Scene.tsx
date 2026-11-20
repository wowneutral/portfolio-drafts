// The scene: a white plaster arch of thirteen voussoirs on a pale sweep, lit
// like a museum object. Pull the keystone and the rest fall (Rapier); put it
// back and every stone springs home on a fixed, deterministic path. The scroll
// walks the camera from stone to stone, and under the arch.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, smooth } from '@/lib/utils';
import { D, KEY, N, R1, R2, RM, STONES, faceTexture, grain, home, hullPoints, outline, runOf, stoneGeometry } from './geo';
import { store } from './store';

const SWEEP = '#d3d1cc';
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ───────── camera stops ───────── */

type Pose = { p: THREE.Vector3; t: THREE.Vector3; fov: number };
const at = (s: number, r = RM) => { const h = home(STONES[s], r); return v3(h.x, h.y, 0); };
const front = (s: number, dist = 9, fov = 24): Pose => {
  const t = at(s); const a = STONES[s].am;
  return { t, p: v3(t.x + Math.cos(a) * 2.2, t.y * 0.75 + 1.2, dist), fov };
};
const under = (s: number, fov = 52): Pose => {
  const t = at(s, R1); const a = STONES[s].am;
  return { t: v3(t.x, t.y, -0.15), p: v3(Math.cos(a) * 0.9, 0.75, 2.5), fov };
};
// Project names are cut under these stones, one each, in WORK order.
export const UNDER = [1, 2, 3, 4, 8, 9, 10, 11];
export const GH = { x: 11.6, z: -1.6, r1: 1.15, r2: 1.75, d: 0.9, n: 9 };
const LOOSE = [{ x: -7.9, z: 1.4, ry: 0.35 }, { x: -6.0, z: 3.0, ry: -0.5 }];

function stops(): Record<string, Pose> {
  const s: Record<string, Pose> = {
    open: { p: v3(-1.6, 1.6, 29), t: v3(0, 2.45, 0), fov: 22 },
    today: { p: v3(0, 1.45, 1.5), t: v3(0, R1, -0.1), fov: 42 },
    about: front(1),
    win0: { p: v3(-2.4, 0.55, 8.2), t: v3(-3.9, 0.85, 0), fov: 26 },
    win1: { p: v3(2.4, 0.55, 8.2), t: v3(3.9, 0.85, 0), fov: 26 },
    team: front(2),
    next: { p: v3(-7.9, 5.4, 10.5), t: v3(-6.7, 0.5, 2.1), fov: 30 },
    research: front(3),
    github: { p: v3(GH.x - 1.2, 1.9, GH.z + 9.5), t: v3(GH.x, 1.0, GH.z), fov: 24 },
    now: front(5),
    record: front(9),
    off: front(10),
    contact: front(11),
    end: { p: v3(0, 3.2, 46), t: v3(0, 2.4, 0), fov: 20 },
  };
  UNDER.forEach((st, k) => { s['work' + k] = under(st); });
  return s;
}

function Rig({ phone }: { phone: boolean }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const S = useMemo(stops, []);
  const f = useRef(0);
  const P = useMemo(() => ({ p: v3(), t: v3(), tp: v3(), tt: v3(), fov: 22, tfov: 22, first: true }), []);
  const sway = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; sway.current.tx = e.clientX / window.innerWidth - 0.5; sway.current.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const A = useMemo(() => ({ p: v3(), t: v3() }), []);
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const an = store.anchors, vh = window.innerHeight;
    const line = scroll.y + vh * (phone ? 0.3 : 0.5);
    // Which anchor the reading line is in, and how far it has crossed into the next.
    let i = 0, u = 0;
    for (let k = 0; k < an.length; k++) {
      const hold0 = an[k].a + Math.min(vh * 0.25, (an[k].b - an[k].a) / 2), hold1 = an[k].b - Math.min(vh * 0.25, (an[k].b - an[k].a) / 2);
      if (line < hold0 && k > 0) {
        const prevEnd = an[k - 1].b - Math.min(vh * 0.25, (an[k - 1].b - an[k - 1].a) / 2);
        i = k - 1; u = smooth(clamp((line - prevEnd) / Math.max(1, hold0 - prevEnd))); break;
      }
      i = k; u = 0;
      if (line <= hold1) break;
    }
    const a = S[an[i]?.stop] ?? S.open, b = S[an[i + 1]?.stop] ?? a;
    store.current = (u < 0.5 ? an[i]?.stop : an[i + 1]?.stop) ?? 'open';
    const k = phone ? 1.5 : 1;
    const far = (x: Pose, out: { p: THREE.Vector3; t: THREE.Vector3 }) => {
      out.t.copy(x.t); out.p.copy(x.p).sub(x.t).multiplyScalar(x === S.open || x === S.end ? (phone ? 2.05 : 1) : k).add(x.t);
    };
    far(a, A); P.tp.copy(A.p); P.tt.copy(A.t);
    far(b, A); P.tp.lerp(A.p, u); P.tt.lerp(A.t, u);
    P.tfov = a.fov + (b.fov - a.fov) * u;
    if (P.first) { P.p.copy(P.tp); P.t.copy(P.tt); P.fov = P.tfov; P.first = false; }
    const l = 4.2;
    P.p.x = damp(P.p.x, P.tp.x, l, dt); P.p.y = damp(P.p.y, P.tp.y, l, dt); P.p.z = damp(P.p.z, P.tp.z, l, dt);
    P.t.x = damp(P.t.x, P.tt.x, l, dt); P.t.y = damp(P.t.y, P.tt.y, l, dt); P.t.z = damp(P.t.z, P.tt.z, l, dt);
    P.fov = damp(P.fov, P.tfov, l, dt);
    // Keep the lens out of the stones while it travels.
    const r = Math.hypot(P.p.x, P.p.y);
    if (r > R1 - 0.3 && r < R2 + 0.4 && Math.abs(P.p.z) < D / 2 + 0.6) P.p.z = D / 2 + 0.6;
    const s = sway.current; s.x = damp(s.x, s.tx, 3, dt); s.y = damp(s.y, s.ty, 3, dt);
    cam.position.copy(P.p);
    cam.position.x += s.x * 0.35; cam.position.y += -s.y * 0.2;
    if (store.shake > 0.001) cam.position.y += Math.sin(state.clock.elapsedTime * 80) * store.shake * 0.03;
    cam.position.y = Math.max(cam.position.y, 0.12);
    cam.lookAt(P.t);
    cam.fov = P.fov;
    const sx = phone ? 0 : 0.24, sy = phone ? -0.2 : 0;
    cam.setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
    f.current += dt;
  }, -1);
  return null;
}

/* ───────── materials ───────── */

function useMats() {
  const M = useMemo(() => {
    const tooth = grain();
    const side = new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.78, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'), bumpMap: tooth, bumpScale: 0.25 });
    const centring = new THREE.MeshStandardMaterial({ color: '#fbfbf9', roughness: 0.92 });
    const sweep = new THREE.MeshStandardMaterial({ color: SWEEP, roughness: 1, bumpMap: tooth, bumpScale: 0.15 });
    return { tooth, side, centring, sweep };
  }, []);
  useEffect(() => () => { M.tooth.dispose(); M.side.dispose(); M.centring.dispose(); M.sweep.dispose(); }, [M]);
  return M;
}
type Mats = ReturnType<typeof useMats>;

function faceMat(tex: THREE.Texture, tint = '#f4f2ee') {
  return new THREE.MeshPhysicalMaterial({ color: tint, map: tex, bumpMap: tex, bumpScale: 1.6, roughness: 0.8, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') });
}

/* ───────── the sweep ───────── */

function Sweep({ material }: { material: THREE.Material }) {
  const geometry = useMemo(() => {
    const zf = -9, R = 7, prof: [number, number][] = [[200, 0], [zf, 0]];
    for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 200]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => {
      if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
      for (const x of [-300, 300]) { pos.push(x, y, z); uv.push(x / 3, s / 3); }
    });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

/* ───────── cut decals (under the stones) ───────── */

function decal(text: string, w: number, h: number, deep = '#5f584e', lip = 'rgba(255,255,255,0.75)') {
  const tex = faceTexture(text, 'x', { w, h }, { S: Math.max(w, h) / 2, alpha: true, deep, lip, weight: 720 });
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const S = Math.max(w, h);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat);
  mesh.rotation.x = Math.PI / 2;
  return { mesh, dispose: () => { tex.dispose(); mat.dispose(); mesh.geometry.dispose(); } };
}

/* ───────── the arch ───────── */

type Stone = {
  i: number; mesh: THREE.Mesh; body: ReturnType<ReturnType<typeof useRapier>['world']['createRigidBody']>;
  home: { p: THREE.Vector3; q: THREE.Quaternion };
  from: { p: THREE.Vector3; q: THREE.Quaternion };
  delay: number; dur: number; kin: boolean;
};

function Arch({ M, low, works }: { M: Mats; low: boolean; works: string[] }) {
  const { world, rapier: R } = useRapier();
  const { camera, gl } = useThree();
  const root = useMemo(() => new THREE.Group(), []);
  const trash = useRef<(() => void)[]>([]).current;
  const dateDecal = useRef<{ mesh: THREE.Mesh; dispose: () => void } | null>(null);

  const stones = useMemo(() => {
    const ground = world.createRigidBody(R.RigidBodyDesc.fixed());
    world.createCollider(R.ColliderDesc.cuboid(60, 1, 60).setTranslation(0, -1, 0).setFriction(0.9), ground);
    return STONES.map((s) => {
      const pts = outline(s.h, R1, R2, s.i === 0, s.i === N - 1);
      const geo = stoneGeometry(pts, D);
      const box = { w: 2 * RM * Math.sin(s.h) * 0.9, h: (R2 - R1) * 0.92 };
      const tex = faceTexture(s.word, runOf(s), box, s.i === KEY ? { deep: '#7d3346', lip: '#e9c3cc', weight: 820 } : {});
      const face = faceMat(tex, s.i === KEY ? '#d8a3ae' : '#f4f2ee');
      const sideMat = s.i === KEY ? new THREE.MeshPhysicalMaterial({ color: '#d8a3ae', roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color('#fff'), bumpMap: M.tooth, bumpScale: 0.25 }) : M.side;
      const mesh = new THREE.Mesh(geo, [face, sideMat]);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.i = s.i;
      const h = home(s);
      const hp = v3(h.x, h.y, 0), hq = new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), h.rz);
      mesh.position.copy(hp); mesh.quaternion.copy(hq);
      root.add(mesh);
      const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(hp.x, hp.y, 0).setRotation(hq).setLinearDamping(0.05).setAngularDamping(0.25).setCcdEnabled(true));
      const hull = R.ColliderDesc.convexHull(hullPoints(pts, D));
      if (hull) world.createCollider(hull.setDensity(1.9).setFriction(0.8).setRestitution(0.05), body);
      trash.push(() => { geo.dispose(); tex.dispose(); face.dispose(); if (sideMat !== M.side) sideMat.dispose(); });
      const st: Stone = { i: s.i, mesh, body, home: { p: hp, q: hq }, from: { p: hp.clone(), q: hq.clone() }, delay: 0, dur: 1, kin: true };
      return st;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, R]);

  // Project names cut into the underside of their stones.
  useEffect(() => {
    const made = UNDER.map((st, k) => {
      const s = STONES[st];
      const d = decal(works[k] ?? '', 2 * R1 * Math.sin(s.h) * 0.74, D * 0.8);
      d.mesh.position.set(0, R1 * Math.cos(s.h * 0.3) - RM - 0.006, 0);
      stones[st].mesh.add(d.mesh);
      return d;
    });
    return () => made.forEach((d) => { d.mesh.removeFromParent(); d.dispose(); });
  }, [stones, works]);

  // The latest note's date, cut under the keystone.
  useEffect(() => {
    let last = '';
    const id = window.setInterval(() => {
      if (store.date === last) return;
      last = store.date;
      dateDecal.current?.mesh.removeFromParent(); dateDecal.current?.dispose();
      if (!last) return;
      const s = STONES[KEY];
      const d = decal(last, 2 * R1 * Math.sin(s.h) * 0.66, D * 0.86, '#3d1822', 'rgba(255,226,233,0.9)');
      d.mesh.position.set(0, R1 * Math.cos(s.h * 0.3) - RM - 0.006, 0);
      stones[KEY].mesh.add(d.mesh);
      dateDecal.current = d; store.dirty = 4;
    }, 400);
    return () => { clearInterval(id); dateDecal.current?.mesh.removeFromParent(); dateDecal.current?.dispose(); };
  }, [stones]);

  useEffect(() => () => { trash.forEach((f) => f()); }, [trash]);

  const sim = useRef({ t: 0, phase: 'standing' as 'standing' | 'out' | 'return', since: 0, drag: null as null | { off: THREE.Vector3; x: number; y: number; moved: number; touch: boolean }, pulling: -1, clicked: false, slept: false }).current;
  const key = stones[KEY];
  const tq = useMemo(() => new THREE.Quaternion(), []), tv = useMemo(() => v3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(v3(0, 0, 1), 0), []);

  const kin = (s: Stone) => { if (!s.kin) { s.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); s.kin = true; } };
  const dyn = (s: Stone) => { if (s.kin) { s.body.setBodyType(R.RigidBodyType.Dynamic, true); s.kin = false; } s.body.wakeUp(); };
  const read = (s: Stone) => { const t = s.body.translation(), r = s.body.rotation(); s.from.p.set(t.x, t.y, t.z); s.from.q.set(r.x, r.y, r.z, r.w); };

  const collapse = () => {
    if (sim.phase === 'out') return;
    sim.phase = 'out'; sim.since = sim.t; sim.slept = false;
    store.set('out');
    let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    for (const s of stones) {
      if (s.i === KEY) continue;
      dyn(s); s.body.setLinearDamping(0.05); s.body.setAngularDamping(0.25);
      const side = s.i < KEY ? 1 : -1;
      s.body.applyImpulse({ x: side * 0.6 + rnd() * 0.4, y: -0.2, z: rnd() * 1.2 }, true);
      s.body.applyTorqueImpulse({ x: rnd() * 0.6, y: rnd() * 0.6, z: -side * 0.4 }, true);
    }
  };

  /** Every stone back home: springers first, the keystone last, from wherever each one lies. */
  const rebuild = (scatter = false) => {
    sim.phase = 'return'; sim.since = sim.t; sim.drag = null; sim.pulling = -1; sim.clicked = false;
    store.set('return');
    const order = [...stones].sort((a, b) => Math.abs(b.i - KEY) - Math.abs(a.i - KEY));
    order.forEach((s, k) => {
      kin(s);
      if (scatter) {
        s.from.p.copy(s.home.p).add(v3(0, 3.4 + (s.i % 3) * 0.4, 0.8));
        s.from.q.setFromEuler(new THREE.Euler(0.4, 0.2 * (s.i % 2 ? 1 : -1), s.home.q.z));
      } else read(s);
      s.delay = s.i === KEY ? (order.length - 1) * 0.075 + 0.55 : Math.floor(k / 2) * 0.075 + (k % 2) * 0.03;
      s.dur = s.i === KEY ? 1.05 : 0.9;
    });
  };

  const pull = () => { if (sim.phase !== 'standing') return; kin(key); read(key); sim.pulling = sim.t; };

  // Opening: the arch builds itself once, stone by stone.
  useEffect(() => { rebuild(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stones]);

  // Pointer: drag the keystone (mouse and pen), tap it (touch or a short click).
  useEffect(() => {
    const el = gl.domElement;
    const ndc = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    const hit = (e: PointerEvent) => { ray.setFromCamera(ndc(e), camera); return ray.intersectObject(key.mesh, false)[0]; };
    const blocked = (e: Event) => !!(e.target as Element | null)?.closest?.('a,button,summary,input,.field,.switcher,nav');
    const down = (e: PointerEvent) => {
      if (blocked(e) || e.button > 0) return;
      const h = hit(e);
      if (!h || sim.phase === 'return') return;
      const touch = e.pointerType === 'touch';
      if (!touch) e.preventDefault();
      const p = ray.ray.intersectPlane(plane, v3()) ?? h.point;
      const t = key.body.translation();
      sim.drag = { off: v3(t.x - p.x, t.y - p.y, 0), x: e.clientX, y: e.clientY, moved: 0, touch };
      document.documentElement.classList.add('arch-grabbing');
    };
    const move = (e: PointerEvent) => {
      if (!sim.drag) {
        if (e.pointerType !== 'touch') document.documentElement.classList.toggle('arch-grab', !blocked(e) && !!hit(e));
        return;
      }
      sim.drag.moved = Math.max(sim.drag.moved, Math.hypot(e.clientX - sim.drag.x, e.clientY - sim.drag.y));
      if (sim.drag.touch || sim.drag.moved < 6) return;
      ray.setFromCamera(ndc(e), camera);
      const p = ray.ray.intersectPlane(plane, v3());
      if (!p) return;
      kin(key); sim.pulling = -1;
      p.add(sim.drag.off); p.y = Math.max(p.y, 0.6); p.z = 0;
      key.body.setNextKinematicTranslation(p);
      key.body.setNextKinematicRotation(key.home.q);
      if (sim.phase === 'standing' && p.distanceTo(key.home.p) > 0.3) collapse();
      store.dirty = 4;
    };
    const up = () => {
      const d = sim.drag; sim.drag = null;
      document.documentElement.classList.remove('arch-grabbing');
      if (!d) return;
      if (d.touch || d.moved < 6) { if (sim.phase === 'standing') pull(); else if (sim.phase === 'out') rebuild(); return; }
      const t = key.body.translation();
      if (sim.phase === 'out' && Math.hypot(t.x - key.home.p.x, t.y - key.home.p.y) < 1.1) rebuild();
      else if (sim.phase === 'out') dyn(key);
      else if (sim.phase === 'standing') { key.body.setNextKinematicTranslation(key.home.p); }
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    const cancel = () => { sim.drag = null; document.documentElement.classList.remove('arch-grabbing'); };
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      document.documentElement.classList.remove('arch-grab', 'arch-grabbing');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl, key]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1);
    sim.t += dt;
    // Commands from the page.
    while (store.cmds.length) {
      const c = store.cmds.shift();
      if (c === 'pull') pull();
      if (c === 'back' && sim.phase === 'out') rebuild();
    }
    // Pulled by button or tap: up out of the gap, then laid on the floor to the right.
    if (sim.pulling >= 0) {
      const u = clamp((sim.t - sim.pulling) / 1.5);
      const hp = key.home.p;
      const rest = v3(6.4, D / 2 + 0.01, 2.6);
      const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.3));
      if (u < 0.3) { const e = smooth(u / 0.3); tv.copy(hp).add(v3(0, 1.5 * e, 0.5 * e)); tq.copy(key.home.q); }
      else { const e = smooth((u - 0.3) / 0.7); const lift = hp.clone().add(v3(0, 1.5, 0.5)); tv.lerpVectors(lift, rest, e); tv.y += Math.sin(e * Math.PI) * 1.6; tq.slerpQuaternions(key.home.q, restQ, e); }
      key.body.setNextKinematicTranslation(tv); key.body.setNextKinematicRotation(tq);
      if (u > 0.08) collapse();
      if (u >= 1) sim.pulling = -1;
      store.dirty = 4;
    }
    if (sim.phase === 'out') {
      const e = sim.t - sim.since;
      // Heavy damping once the stones have had their fall, then sleep: the heap is still inside two seconds.
      if (e > 1.4 && e < 1.5) for (const s of stones) if (!s.kin) { s.body.setLinearDamping(2.5); s.body.setAngularDamping(4); }
      if (e > 2.3 && !sim.slept) { sim.slept = true; for (const s of stones) if (!s.kin) s.body.sleep(); }
      if (e < 2.6) store.dirty = 4;
    }
    if (sim.phase === 'return') {
      let done = true;
      for (const s of stones) {
        const u = (sim.t - sim.since - s.delay) / s.dur;
        if (u < 1) done = false;
        if (u <= 0) { s.body.setNextKinematicTranslation(s.from.p); s.body.setNextKinematicRotation(s.from.q); continue; }
        const c = Math.min(1, u);
        if (s.i === KEY) {
          // Up over the crown, then straight down into the gap: the last stone in.
          const above = s.home.p.clone().add(v3(0, 1.6, 0));
          if (c < 0.6) { const e = smooth(c / 0.6); tv.lerpVectors(s.from.p, above, e); tv.y += Math.sin(e * Math.PI) * 0.8; tq.slerpQuaternions(s.from.q, s.home.q, e); }
          else { const e = (c - 0.6) / 0.4; tv.copy(above).lerp(s.home.p, e * e); tq.copy(s.home.q); }
          if (c >= 1 && !sim.clicked) { sim.clicked = true; store.shake = 1; }
        } else {
          // A damped spring on the way home, with a lift so nothing drags through the heap.
          const e = c >= 1 ? 1 : 1 - Math.exp(-6 * c) * Math.cos(7.5 * c) * (1 - c);
          tv.lerpVectors(s.from.p, s.home.p, e); tv.y += Math.sin(Math.min(1, c * 1.15) * Math.PI) * 1.3;
          tq.slerpQuaternions(s.from.q, s.home.q, clamp(e, 0, 1));
        }
        s.body.setNextKinematicTranslation(tv); s.body.setNextKinematicRotation(tq);
      }
      store.dirty = 4;
      if (done) { sim.phase = 'standing'; store.set('standing'); }
    }
    for (const s of stones) {
      const t = s.body.translation(), r = s.body.rotation();
      s.mesh.position.set(t.x, t.y, t.z); s.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    store.shake = damp(store.shake, 0, 8, dt);
  });

  return <primitive object={root} />;
}

/* ───────── the small arch: one stone per recent commit ───────── */

function Small({ M }: { M: Mats }) {
  const made = useMemo(() => {
    const list: { mesh: THREE.Mesh; p: THREE.Vector3; q: THREE.Quaternion }[] = [];
    const span = Math.PI / GH.n, trash: (() => void)[] = [];
    const rm = (GH.r1 + GH.r2) / 2;
    const g = new THREE.Group();
    for (let i = 0; i < GH.n; i++) {
      const am = Math.PI - span * (i + 0.5);
      const pts = outline(span / 2, GH.r1, GH.r2, i === 0, i === GH.n - 1, 6);
      const geo = stoneGeometry(pts, GH.d, 0.03);
      const mesh = new THREE.Mesh(geo, M.side); mesh.castShadow = mesh.receiveShadow = true;
      const p = v3(GH.x + rm * Math.cos(am), rm * Math.sin(am), GH.z), q = new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), am - Math.PI / 2);
      mesh.position.copy(p); mesh.quaternion.copy(q); mesh.visible = false; g.add(mesh);
      list.push({ mesh, p, q }); trash.push(() => geo.dispose());
    }
    // The centring: a plain white form the arch is built on.
    const sh = new THREE.Shape(); sh.moveTo(-GH.r1 + 0.02, 0); sh.absarc(0, 0, GH.r1 - 0.02, Math.PI, 0, true); sh.lineTo(-GH.r1 + 0.02, 0);
    const cg = new THREE.ExtrudeGeometry(sh, { depth: GH.d * 0.7, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 32 });
    cg.translate(GH.x, 0, GH.z - GH.d * 0.35);
    const cm = new THREE.Mesh(cg, M.centring); cm.castShadow = cm.receiveShadow = true; g.add(cm);
    trash.push(() => cg.dispose());
    return { g, list, trash };
  }, [M]);
  useEffect(() => () => made.trash.forEach((f) => f()), [made]);
  const built = useRef({ at: -1, n: 0 });
  // Built from both springers towards the crown, the way a real arch goes up.
  const order = useMemo(() => { const o: number[] = []; for (let a = 0, b = GH.n - 1; a <= b; a++, b--) { o.push(a); if (b !== a) o.push(b); } return o; }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime, B = built.current;
    if (B.at < 0 && (store.current === 'github' || store.current === 'now')) { B.at = t; }
    const n = Math.min(GH.n, store.commits);
    order.forEach((idx, k) => {
      const s = made.list[idx];
      const show = k < n && B.at >= 0;
      if (!show) { s.mesh.visible = false; return; }
      const u = clamp((t - B.at - k * 0.22) / 0.6);
      s.mesh.visible = u > 0;
      const e = u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(8 * u) * (1 - u);
      s.mesh.position.copy(s.p); s.mesh.position.y += (1 - e) * 2.2;
      if (u < 1) store.dirty = 2;
    });
  });
  return <primitive object={made.g} />;
}

/* ───────── up next: two loose stones waiting ───────── */

function Loose({ labels }: { labels: string[] }) {
  const made = useMemo(() => {
    const s = STONES[3];
    const pts = outline(s.h, R1, R2);
    const geo = stoneGeometry(pts, D);
    const g = new THREE.Group(), trash: (() => void)[] = [() => geo.dispose()];
    LOOSE.forEach((L, k) => {
      const tex = faceTexture(labels[k], '+y', { w: 2 * RM * Math.sin(s.h) * 0.9, h: (R2 - R1) * 0.92 });
      const m = faceMat(tex);
      const side = new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, [m, side]); mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(L.x, D / 2 + 0.005, L.z);
      mesh.rotation.set(-Math.PI / 2, 0, L.ry, 'XYZ');
      g.add(mesh); trash.push(() => { tex.dispose(); m.dispose(); side.dispose(); });
    });
    return { g, trash };
  }, [labels]);
  useEffect(() => () => made.trash.forEach((f) => f()), [made]);
  return <primitive object={made.g} />;
}

/* ───────── light ───────── */

function Key({ low }: { low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fff6ea', 3.1);
    l.position.set(-10, 12, 8); l.target.position.set(1, 0, -1);
    l.castShadow = true; l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.03; l.shadow.radius = 5;
    const c = l.shadow.camera; c.left = -16; c.right = 18; c.top = 14; c.bottom = -10; c.near = 2; c.far = 50; c.updateProjectionMatrix();
    return l;
  }, [low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

/** Soft dark where stone meets floor (after drei's ContactShadows), redrawn only while something moves. */
function Contact({ x, z, w, h, res, far, blur, opacity, color }: { x: number; z: number; w: number; h: number; res: number; far: number; blur: number; opacity: number; color: string }) {
  const { gl, scene } = useThree();
  const K = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(res, res), targetBlur = new THREE.WebGLRenderTarget(res, res);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;
    const plane = new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(plane); blurPlane.visible = false;
    const depth = new THREE.MeshDepthMaterial(); depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: new THREE.Color(color) };
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
    };
    const hb = new THREE.ShaderMaterial(HorizontalBlurShader), vb = new THREE.ShaderMaterial(VerticalBlurShader);
    hb.depthTest = vb.depthTest = false;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, far);
    const show = new THREE.MeshBasicMaterial({ transparent: true, map: target.texture, opacity, depthWrite: false });
    const mesh = new THREE.Mesh(plane, show); mesh.scale.set(1, -1, 1); mesh.rotation.x = -Math.PI / 2;
    const group = new THREE.Group(); group.rotation.x = Math.PI / 2; group.position.set(x, 0.006, z); group.add(mesh, cam, blurPlane);
    return { target, targetBlur, plane, blurPlane, depth, hb, vb, cam, show, group };
  }, [x, z, w, h, res, far, opacity, color]);
  useEffect(() => () => { K.target.dispose(); K.targetBlur.dispose(); K.plane.dispose(); K.depth.dispose(); K.hb.dispose(); K.vb.dispose(); K.show.dispose(); }, [K]);
  useFrame(() => {
    if (store.dirty <= 0) return;
    store.dirty--;
    const bg = scene.background, om = scene.overrideMaterial;
    K.group.visible = false; scene.background = null; scene.overrideMaterial = K.depth;
    gl.setRenderTarget(K.target); gl.render(scene, K.cam);
    scene.overrideMaterial = om;
    const pass = (b: number) => {
      K.blurPlane.visible = true;
      K.blurPlane.material = K.hb; K.hb.uniforms.tDiffuse.value = K.target.texture; K.hb.uniforms.h.value = b / 256;
      gl.setRenderTarget(K.targetBlur); gl.render(K.blurPlane, K.cam);
      K.blurPlane.material = K.vb; K.vb.uniforms.tDiffuse.value = K.targetBlur.texture; K.vb.uniforms.v.value = b / 256;
      gl.setRenderTarget(K.target); gl.render(K.blurPlane, K.cam);
      K.blurPlane.visible = false;
    };
    K.group.visible = true; pass(blur); pass(blur * 0.4);
    gl.setRenderTarget(null); scene.background = bg;
  });
  return <primitive object={K.group} />;
}

export default function Scene({ phone, works, next }: { phone: boolean; works: string[]; next: string[] }) {
  const M = useMats();
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load('760 80px "Archivo Variable"'), document.fonts.load('700 80px "Archivo Variable"')]).catch(() => null).finally(() => { if (live) setFonts(true); });
    return () => { live = false; };
  }, []);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]} camera={{ fov: 22, near: 0.05, far: 400, position: [0, 2.2, 30] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 0.98; }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[SWEEP]} />
      <fog attach="fog" args={[SWEEP, 60, 220]} />
      <hemisphereLight args={['#ffffff', '#cbc7bf', 0.32]} />
      <Key low={phone} />
      <directionalLight position={[6, 7, 14]} intensity={0.45} color="#fbfaff" />
      <directionalLight position={[9, 7, -12]} intensity={2.2} color="#cfdcff" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#45413b']} />
        <Lightformer form="rect" intensity={1.6} color="#fff5e6" position={[-6, 9, 5]} rotation-x={Math.PI / 2} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#fff3e2" position={[-12, 4, 6]} rotation-y={Math.PI / 2.4} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#e6edff" position={[12, 4, -4]} rotation-y={-Math.PI / 2} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#f6f2ea" position={[0, 4, 16]} rotation-y={Math.PI} scale={[22, 5, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#efe9dc" position={[0, -2.5, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <Sweep material={M.sweep} />
      {fonts && (
        <Suspense fallback={null}>
          <Physics gravity={[0, -14, 0]} timeStep={1 / 60}>
            <Arch M={M} low={phone} works={works} />
          </Physics>
          <Small M={M} />
          <Loose labels={next} />
        </Suspense>
      )}
      <Contact x={2} z={0} w={34} h={18} res={phone ? 512 : 1024} far={3} blur={2} opacity={0.55} color="#2a241c" />
      <Rig phone={phone} />
    </Canvas>
  );
}
