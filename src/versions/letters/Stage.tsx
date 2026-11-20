// The stage: ARMAAN SETH. as heavy lacquered letters on a paper sweep, after
// the Skeptical draft 13 set. Everything standing is a Rapier body; a push
// knocks it flat and a damped spring stands it back up. The scroll walks the
// camera between ten measured positions, and the two live sections drop their
// own pieces onto the paper: the day of the latest note, and one small letter
// per recent commit.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { gsap, scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { DEPTH, hulls, letter, noiseTexture, solid, type Outline } from './geo';
import { BIT, NUM, STOPS, stopIndex, type Plan, type Shot } from './plan';
import { stage } from './stage';

const PAPER = '#e7e2d6';
const STEP = 1 / 60, GRAV = 16.5, DROP = 7.5, FALL = 34;
const SOLID = 0xffffffff, GHOST = 0x00020000;

type Ctx = ReturnType<typeof useRapier>;
type World = Ctx['world'];
type Body = ReturnType<World['createRigidBody']>;
type Collider = ReturnType<World['createCollider']>;
type Kind = 'name' | 'num' | 'bit';
type Mode = 'away' | 'drop' | 'home' | 'loose' | 'rise';
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
type Actor = {
  kind: Kind; ch: string; i: number; obj: THREE.Mesh; body: Body; kin: boolean; cols: Collider[];
  home: Pose; half: THREE.Vector3; mode: Mode;
  t: number; wait: number; landed: boolean; thud: number; rock: number;
  from: Pose; to: Pose; axis: THREE.Vector3; angle: number; u: number; du: number; lift: number;
  looseT: number; restT: number; pushedAt: number; swipedAt: number;
  pp: THREE.Vector3; pq: THREE.Quaternion; cp: THREE.Vector3; cq: THREE.Quaternion;
};

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = v3(1, 0, 0);

/* ───────── materials ───────── */

function makeMaterials() {
  // Orange peel: the slight waviness of sprayed lacquer.
  const peel = noiseTexture(256, (g, rnd, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * s, y = rnd() * s, r = 3 + rnd() * 9, c = rnd() < 0.5 ? 255 : 0;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(${c},${c},${c},0.09)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }, 2.2);
  const tooth = noiseTexture(256, (g, rnd, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 70; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, 1);
  const ink = new THREE.MeshPhysicalMaterial({ color: '#13110d', roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, bumpMap: peel, bumpScale: 0.5, envMapIntensity: 0.9 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#c8321e', roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.07, bumpMap: peel, bumpScale: 0.4, envMapIntensity: 0.85 });
  const night = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  night.mapping = THREE.EquirectangularReflectionMapping; night.needsUpdate = true;
  const paper = new THREE.MeshStandardMaterial({ color: '#efeadd', roughness: 1, bumpMap: tooth, bumpScale: 0.35, envMap: night, envMapIntensity: 0 });
  return { ink, red, paper, textures: [peel, tooth, night] };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ───────── the paper sweep ───────── */

function Sweep({ zf, material }: { zf: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const R = 7, prof: [number, number][] = [[400, 0], [zf, 0]];
    for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 300]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => {
      if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
      for (const x of [-700, 700]) { pos.push(x, y, z); uv.push(x / 3, s / 3); }
    });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [zf]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} receiveShadow layers={1} />;
}

/* ───────── the set ───────── */

function TheSet({ plan, M, low }: { plan: Plan; M: Mats; low: boolean }) {
  const { world, rapier: R } = useRapier();
  const { camera, gl, scene } = useThree();
  const envSet = useRef(false);
  const root = useMemo(() => new THREE.Group(), []);
  const geos = useRef(new Map<string, { g: THREE.BufferGeometry; o: Outline; hs: Float32Array[] }>());
  const actors = useRef<Actor[]>([]).current;
  const disposables = useRef<{ dispose: () => void }[]>([]).current;
  const sim = useRef({
    now: 0, acc: 0, started: false, opening: true, quiet: 0, numsMade: false, bitsMade: false,
    jobs: [] as { at: number; run: () => void }[],
    ptr: { x: -1, y: -1, t: 0, vx: 0, vy: 0, down: false, travel: 0, downAt: 0, moved: false, touch: false, run: 0 },
  }).current;
  const room = useRef<Body | null>(null);

  const shape = (ch: string, cap: number, depth: number, bevel: number) => {
    const key = `${ch}:${cap}`;
    let s = geos.current.get(key);
    if (!s) {
      const o = letter(ch, cap, low ? 4 : 7);
      const g = toCreasedNormals(solid(o, depth, bevel, low ? 2 : 4), 0.7);
      s = { g, o, hs: hulls(o, depth) };
      geos.current.set(key, s); disposables.push(g);
    }
    return s;
  };

  const make = (kind: Kind, ch: string, i: number, cap: number, depth: number, bevel: number, home: THREE.Vector3, mat: THREE.Material, density = 1): Actor => {
    const s = shape(ch, cap, depth, bevel);
    const mesh = new THREE.Mesh(s.g, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.visible = false; root.add(mesh);
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(home.x, home.y + DROP, home.z).setLinearDamping(0.06).setAngularDamping(0.3));
    const a: Actor = {
      kind, ch, i, obj: mesh, body, kin: true, cols: [], home: { p: home.clone(), q: new THREE.Quaternion() }, half: v3(s.o.w / 2, s.o.h / 2, depth / 2), mode: 'away',
      t: 0, wait: 0, landed: false, thud: 0.012, rock: 0.04, from: { p: v3(), q: new THREE.Quaternion() }, to: { p: v3(), q: new THREE.Quaternion() },
      axis: v3(1), angle: 0, u: 0, du: 0, lift: 0.4, looseT: 0, restT: 0, pushedAt: -9, swipedAt: -9,
      pp: home.clone(), pq: new THREE.Quaternion(), cp: home.clone(), cq: new THREE.Quaternion(),
    };
    const add = (d: ReturnType<typeof R.ColliderDesc.cuboid>) => a.cols.push(world.createCollider(d.setDensity(density).setFriction(0.72).setRestitution(0.06).setCollisionGroups(GHOST), body));
    for (const h of s.hs) { const d = R.ColliderDesc.convexHull(h); if (d) add(d); }
    // A flat sole so the round-bottomed and narrow letters stand.
    add(R.ColliderDesc.cuboid(s.o.w / 2, 0.03, depth / 2 - 0.004).setTranslation(0, -s.o.h / 2 + 0.03, 0));
    body.setEnabled(false);
    actors.push(a);
    return a;
  };

  // The name, built once.
  const word = useMemo(() => {
    const list = plan.letters.map((L, i) => make('name', L.ch, i, 2, DEPTH, 0.036, v3(L.x, L.y, L.z), L.ch === '.' ? M.red : M.ink));
    const rb = world.createRigidBody(R.RigidBodyDesc.fixed());
    const wall = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.78).setRestitution(0.04), rb);
    wall(120, 5, 120, 0, -5, 0); wall(1, 20, 40, plan.x0 - 9, 20, 0); wall(1, 20, 40, plan.x1 + 14, 20, 0); wall(60, 20, 1, 0, 20, 12); wall(60, 20, 1, 0, 20, -12);
    room.current = rb;
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, world, R, M]);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __letters: unknown }).__letters = { stage, sim, actors, cast, domino };
    stage.wake = Math.max(stage.wake, 60); stage.dirty = 4;
    world.timestep = STEP; world.gravity = { x: 0, y: -GRAV, z: 0 };
    return () => { disposables.forEach((d) => d.dispose()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const tmpQ = useMemo(() => new THREE.Quaternion(), []), tmpQ2 = useMemo(() => new THREE.Quaternion(), []);
  const tmpV = useMemo(() => v3(), []), tmpV2 = useMemo(() => v3(), []), tmpM = useMemo(() => new THREE.Matrix4(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);

  const api = useMemo(() => {
    const solidify = (a: Actor, yes: boolean) => { for (const c of a.cols) c.setCollisionGroups(yes ? SOLID : GHOST); };
    const setKin = (a: Actor) => { if (!a.kin) { a.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); a.kin = true; } solidify(a, false); };
    const setDyn = (a: Actor) => { if (a.kin) { a.body.setBodyType(R.RigidBodyType.Dynamic, true); a.kin = false; } solidify(a, true); };
    const read = (a: Actor, out: Pose) => { const t = a.body.translation(), r = a.body.rotation(); out.p.set(t.x, t.y, t.z); out.q.set(r.x, r.y, r.z, r.w); return out; };
    const clearance = (a: Actor, q: THREE.Quaternion) => { const e = tmpM.makeRotationFromQuaternion(q).elements; return Math.abs(e[1]) * a.half.x + Math.abs(e[5]) * a.half.y + Math.abs(e[9]) * a.half.z; };
    const tilt = (q: { x: number; y: number; z: number; w: number }) => Math.acos(clamp(1 - 2 * (q.x * q.x + q.z * q.z), -1, 1));
    const settle = (a: Actor) => {
      a.mode = 'home'; setDyn(a);
      a.body.setTranslation(a.home.p, false); a.body.setRotation(a.home.q, false);
      a.body.setLinvel({ x: 0, y: 0, z: 0 }, false); a.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
      a.body.sleep();
    };
    const startDrop = (a: Actor) => {
      a.mode = 'drop'; a.t = 0; a.landed = false;
      a.body.setEnabled(true); setKin(a);
      tmpV.copy(a.home.p).setY(a.home.p.y + DROP);
      a.body.setTranslation(tmpV, true); a.body.setRotation(a.home.q, true);
      a.cp.copy(tmpV); a.pp.copy(tmpV); a.cq.copy(a.home.q); a.pq.copy(a.home.q);
    };
    const startRise = (a: Actor) => {
      setKin(a); read(a, a.from); a.to.p.copy(a.home.p); a.to.q.copy(a.home.q);
      tmpQ.copy(a.to.q).invert(); tmpQ2.copy(a.from.q).multiply(tmpQ);
      if (tmpQ2.w < 0) tmpQ2.set(-tmpQ2.x, -tmpQ2.y, -tmpQ2.z, -tmpQ2.w);
      a.angle = 2 * Math.acos(clamp(tmpQ2.w, -1, 1));
      const s = Math.sqrt(Math.max(1e-9, 1 - tmpQ2.w * tmpQ2.w));
      a.axis.set(tmpQ2.x / s, tmpQ2.y / s, tmpQ2.z / s);
      if (a.angle < 1e-4) a.axis.set(1, 0, 0);
      a.u = 0; a.du = 0; a.t = 0; a.mode = 'rise';
      a.lift = 0.6 * Math.min(1, a.angle / 1.2) * (a.half.y / 1) + 0.07 * Math.min(4, a.from.p.distanceTo(a.to.p));
    };
    const shove = (a: Actor, point: THREE.Vector3, dir: THREE.Vector3, strength: number): boolean => {
      if (a.mode === 'away' || a.mode === 'drop') return false;
      setDyn(a);
      const m = a.body.mass() * strength;
      a.body.applyImpulseAtPoint({ x: dir.x * m, y: dir.y * m, z: dir.z * m }, point, true);
      a.mode = 'loose'; a.looseT = 0; a.restT = 0; a.pushedAt = sim.now;
      return true;
    };
    const topple = (a: Actor, dx: number, dz: number, strength = 2.1) => {
      if (a.mode !== 'home' && a.mode !== 'rise') return;
      read(a, a.from);
      tmpV.copy(a.from.p).add(tmpV2.set(0, a.half.y * 0.75, dz < 0 ? a.half.z : -a.half.z));
      shove(a, tmpV, tmpV2.set(dx, 0, dz).normalize(), strength);
    };
    return { setKin, setDyn, read, clearance, tilt, settle, startDrop, startRise, shove, topple };
  }, [R, sim, tmpM, tmpQ, tmpQ2, tmpV, tmpV2]);

  /* ── the pointer ── */
  const cast = (cx: number, cy: number): { a: Actor; point: THREE.Vector3 } | null => {
    const r = gl.domElement.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const hit = world.castRay(new R.Ray({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }), 400, true, undefined, undefined, undefined, room.current ?? undefined);
    if (!hit) return null;
    const body = hit.collider.parent();
    const a = body ? actors.find((x) => x.body.handle === body.handle) : undefined;
    if (!a) return null;
    const toi = (hit as unknown as { timeOfImpact?: number; toi?: number }).timeOfImpact ?? (hit as unknown as { toi: number }).toi;
    return { a, point: v3().copy(o).addScaledVector(d, toi) };
  };
  /** The first A, pushed: it falls into the R, and the push runs down the name. */
  const domino = (from: number) => {
    word.forEach((a, i) => { if (i >= from) sim.jobs.push({ at: sim.now + (i - from) * 0.12, run: () => api.topple(a, 1, -0.35, i === from ? 2.6 : 2.2) }); });
  };

  useEffect(() => {
    const p = sim.ptr;
    const blocked = (e: Event) => !!(e.target as Element | null)?.closest?.('a, button, input, summary, [data-nopush]');
    const move = (e: PointerEvent) => {
      const now = performance.now(), dt = Math.max(4, now - p.t);
      if (p.x >= 0 && now - p.t < 120) { p.vx = lerp(p.vx, ((e.clientX - p.x) / dt) * 1000, 0.5); p.vy = lerp(p.vy, ((e.clientY - p.y) / dt) * 1000, 0.5); } else { p.vx = p.vy = 0; }
      const step = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (p.down) p.travel += step;
      p.x = e.clientX; p.y = e.clientY; p.t = now; p.moved = true; p.touch = e.pointerType === 'touch';
      const speed = Math.hypot(p.vx, p.vy);
      p.run += step;
      if (speed < 650 || p.run < 14 || sim.opening || p.touch || blocked(e)) return;
      p.run = 0;
      const hit = cast(p.x, p.y);
      if (!hit || sim.now - hit.a.swipedAt < 0.3) return;
      hit.a.swipedAt = sim.now;
      const right = tmpV.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      const fwd = camera.getWorldDirection(tmpV2).setY(0).normalize();
      const dir = right.multiplyScalar((p.vx / speed) * 0.7).addScaledVector(fwd, 0.75 - (p.vy / speed) * 0.5).normalize();
      hit.point.y = Math.max(hit.point.y, hit.a.cp.y + hit.a.half.y * 0.45);
      api.shove(hit.a, hit.point, dir.clone(), clamp(speed / 900, 1, 1.6) * 1.7);
    };
    const down = (e: PointerEvent) => { if (e.button !== 0 || blocked(e)) return; p.down = true; p.travel = 0; p.downAt = e.timeStamp; p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); p.touch = e.pointerType === 'touch'; p.vx = p.vy = 0; };
    const up = (e: PointerEvent) => {
      if (!p.down) return; p.down = false;
      if (p.travel > 10 || e.timeStamp - p.downAt > 900 || blocked(e) || sim.opening) return;
      const hit = cast(e.clientX, e.clientY);
      if (!hit) return;
      if (hit.a.kind === 'name' && hit.a.i === 0 && hit.a.mode === 'home') { domino(0); return; }
      const dir = ray.ray.direction.clone(); dir.y *= 0.12;
      if (dir.lengthSq() < 0.05) return;
      api.shove(hit.a, hit.point, dir.normalize(), 2.3);
    };
    const cancel = () => { p.down = false; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', cancel, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  /* ── the two live sections drop their pieces when they arrive ── */
  const dropNums = () => {
    sim.numsMade = true;
    const day = stage.day; if (!day) return;
    let pen = plan.nums.x;
    day.split('').forEach((ch, i) => {
      const o = letter(ch, NUM.cap);
      const a = make('num', ch, i, NUM.cap, NUM.depth, 0.032, v3(pen + o.adv / 2, o.h / 2, plan.nums.z), M.ink, 1.1);
      pen += o.adv + 0.1;
      a.wait = i * 0.22; a.thud = 0.03; a.rock = i ? -0.05 : 0.05; api.startDrop(a);
    });
  };
  const dropBits = () => {
    sim.bitsMade = true;
    stage.bits.slice(0, 30).forEach((ch, i) => {
      const c = ch.toUpperCase();
      if (!/[A-Z0-9]/.test(c)) return;
      const col = i % BIT.per, rowN = Math.floor(i / BIT.per);
      const o = letter(c, BIT.cap, 4);
      const dz = plan.phone ? rowN * BIT.row : -rowN * BIT.row;
      const a = make('bit', c, i, BIT.cap, BIT.depth, 0.014, v3(plan.bits.x + col * BIT.pitch, o.h / 2, plan.bits.z + dz), M.ink, 1.2);
      a.wait = i * 0.07; a.thud = 0.004; a.rock = 0.05; api.startDrop(a);
    });
  };

  /* ── one fixed step of everything scripted ── */
  const control = (dt: number) => {
    for (const a of actors) {
      switch (a.mode) {
        case 'drop': {
          a.t += dt;
          const tau = a.t - a.wait;
          if (tau < 0) break;
          a.obj.visible = true;
          const fall = Math.sqrt((2 * DROP) / FALL);
          let y = 0, rx = 0;
          if (tau < fall) y = DROP - 0.5 * FALL * tau * tau;
          else {
            const s = tau - fall;
            if (!a.landed) { a.landed = true; stage.shake = Math.min(0.09, stage.shake + a.thud); stage.dirty = 3; }
            y = 0.1 * Math.exp(-7.5 * s) * Math.abs(Math.sin(11 * s)); rx = a.rock * Math.exp(-4.4 * s) * Math.sin(12.5 * s);
            if (s > 1.1) { api.settle(a); break; }
          }
          tmpQ.setFromAxisAngle(X, rx); tmpQ2.copy(a.home.q).multiply(tmpQ);
          tmpV.copy(a.home.p); tmpV.y = Math.max(a.home.p.y + y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          break;
        }
        case 'home': {
          if (a.body.isSleeping()) break;
          const t = a.body.translation();
          if (Math.hypot(t.x - a.home.p.x, t.y - a.home.p.y, t.z - a.home.p.z) > 0.03 || api.tilt(a.body.rotation()) > 0.03) { a.mode = 'loose'; a.looseT = 0; a.restT = 0; }
          break;
        }
        case 'loose': {
          a.looseT += dt;
          const lv = a.body.linvel(), av = a.body.angvel(), sp = Math.hypot(lv.x, lv.y, lv.z);
          if (sp < 0.35 && Math.hypot(av.x, av.y, av.z) < 0.7) a.restT += dt; else a.restT = 0;
          if (sp > 11) a.body.setLinvel({ x: (lv.x / sp) * 11, y: (lv.y / sp) * 11, z: (lv.z / sp) * 11 }, true);
          const t = a.body.translation();
          const lost = t.y < -2 || t.x < plan.x0 - 8 || t.x > plan.x1 + 13 || Math.abs(t.z) > 11;
          if (lost || (sim.now - a.pushedAt > 0.8 && ((a.restT > 0.45 && a.looseT > 1.2) || a.looseT > 4))) api.startRise(a);
          break;
        }
        case 'rise': {
          a.t += dt;
          const k = 62, c = 9.4;
          a.du += (k * (1 - a.u) - c * a.du) * dt; a.u += a.du * dt;
          const done = a.t > 0.35 && Math.abs(1 - a.u) < 0.003 && Math.abs(a.du) < 0.04;
          const e = clamp(a.u);
          tmpQ.setFromAxisAngle(a.axis, a.angle * (1 - a.u)); tmpQ2.copy(tmpQ).multiply(a.to.q);
          tmpV.lerpVectors(a.from.p, a.to.p, smooth(e));
          tmpV.y += a.lift * Math.sin(Math.PI * e);
          tmpV.y = Math.max(tmpV.y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          if (done) api.settle(a);
          break;
        }
        default: break;
      }
    }
  };

  /* ── the frame ── */
  useFrame((_, dtRaw) => {
    const dt = sim.quiet >= 4 ? STEP : Math.min(dtRaw, 1);
    if (!sim.started || sim.opening) stage.wake = Math.max(stage.wake, 10);
    if (!envSet.current) {
      const env = scene.environment;
      if (env) { envSet.current = true; for (const m of [M.ink, M.red]) { m.envMap = env; m.needsUpdate = true; } }
    }
    if (!sim.started && stage.go) {
      sim.started = true;
      word.forEach((a, i) => { a.body.setEnabled(true); a.wait = 0.15 + i * 0.12 + (a.ch === '.' ? 0.25 : 0); a.rock = (i % 2 ? 1 : -1) * (0.035 + (i % 3) * 0.012); a.thud = a.ch === '.' ? 0.02 : 0.016; api.startDrop(a); });
    }
    if (sim.opening && sim.started && word.every((a) => a.mode === 'home')) { sim.opening = false; stage.opened = true; stage.onOpened?.(); }

    const f = stage.f;
    if (!sim.opening) {
      if (!sim.numsMade && f > stopIndex('today') - 0.55) dropNums();
      if (!sim.bitsMade && f > stopIndex('github') - 0.55) dropBits();
    }

    while (stage.cmds.length) {
      const c = stage.cmds.shift()!;
      if (sim.opening) continue;
      let n = 0;
      for (const a of actors) if (a.ch === c.ch) sim.jobs.push({ at: sim.now + 0.09 * n++, run: () => api.topple(a, (a.i % 3) - 1 ? 0.25 : -0.25, -1, 2.2) });
    }

    const p = sim.ptr;
    if (p.moved && p.x >= 0 && !sim.opening) { p.moved = false; stage.over = !p.touch && !!cast(p.x, p.y); }

    let busy = sim.jobs.length > 0;
    if (!busy) for (const a of actors) { if (a.mode === 'drop' || a.mode === 'loose' || a.mode === 'rise' || (a.mode === 'home' && !a.body.isSleeping())) { busy = true; break; } }
    sim.quiet = busy ? 0 : sim.quiet + 1;
    if (sim.quiet < 6 || stage.shake > 0.0005) { stage.wake = Math.max(stage.wake, 6); stage.dirty = 3; }
    if (sim.started && sim.quiet < 4) {
      sim.acc += dt; let n = 0;
      while (sim.acc >= STEP && n < 60) {
        sim.now += STEP;
        for (let i = sim.jobs.length - 1; i >= 0; i--) if (sim.jobs[i].at <= sim.now) sim.jobs.splice(i, 1)[0].run();
        control(STEP);
        for (const a of actors) { a.pp.copy(a.cp); a.pq.copy(a.cq); }
        world.step();
        for (const a of actors) { if (a.mode === 'away') continue; const t = a.body.translation(), r = a.body.rotation(); a.cp.set(t.x, t.y, t.z); a.cq.set(r.x, r.y, r.z, r.w); }
        sim.acc -= STEP; n++;
      }
      if (n === 60) sim.acc = 0;
    } else sim.acc = 0;
    const alpha = clamp(sim.acc / STEP);
    for (const a of actors) {
      if (!a.obj.visible) continue;
      a.obj.position.lerpVectors(a.pp, a.cp, alpha); a.obj.quaternion.slerpQuaternions(a.pq, a.cq, alpha);
    }
    stage.shake = damp(stage.shake, 0, 9, dt);
  });

  return <primitive object={root} />;
}

/* ───────── the camera ───────── */

type CamPose = { p: THREE.Vector3; t: THREE.Vector3; up: THREE.Vector3; fov: number; sx: number; sy: number };
function poseOf(s: Shot, aspect: number, out: CamPose): CamPose {
  const az = (s.az * Math.PI) / 180, el = (s.el * Math.PI) / 180;
  const tanV = Math.tan((s.fov * Math.PI) / 360), tanH = tanV * aspect;
  const fw = s.frame.x1 - s.frame.x0, fh = s.frame.y1 - s.frame.y0;
  const d = Math.max(s.h / (2 * tanV * fh), s.w / (2 * tanH * fw));
  out.t.set(s.at[0], s.at[1], s.at[2]);
  out.p.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(out.t);
  out.p.y = Math.max(out.p.y, 0.09);
  if (s.up) out.up.set(s.up[0], s.up[1], s.up[2]); else out.up.set(0, 1, 0);
  out.fov = s.fov; out.sx = (s.frame.x0 + s.frame.x1) / 2 - 0.5; out.sy = (s.frame.y0 + s.frame.y1) / 2 - 0.5;
  return out;
}
const blank = (): CamPose => ({ p: v3(), t: v3(), up: v3(0, 1, 0), fov: 20, sx: 0, sy: 0 });

function Rig({ plan, still }: { plan: Plan; still: boolean }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const A = useMemo(blank, []), B = useMemo(blank, []), tmp = useMemo(() => v3(), []), tmp2 = useMemo(() => v3(), []);
  const sway = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const curves = useRef(new Map<string, { p: THREE.CatmullRomCurve3; t: THREE.CatmullRomCurve3 }>());
  useEffect(() => { cam.layers.enable(1); cam.near = 0.04; cam.far = 500; }, [cam]);
  useEffect(() => { curves.current.clear(); }, [size.width, size.height, plan]);
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; sway.current.tx = e.clientX / window.innerWidth - 0.5; sway.current.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const moving = useRef(false);
  useFrame((state, dtRaw) => {
    const dt = moving.current ? Math.min(dtRaw, 0.25) : 1 / 60;
    const stops = stage.stops; let raw = 0;
    if (stops.length) {
      const c = scroll.y + window.innerHeight / 2;
      raw = stops.length - 1;
      for (let i = 0; i < stops.length; i++) {
        if (c <= stops[i].b) { raw = c >= stops[i].a || i === 0 ? i : i - 1 + smooth(clamp((c - stops[i - 1].b) / Math.max(1, stops[i].a - stops[i - 1].b))); break; }
      }
    }
    stage.raw = raw;
    stage.f = still ? raw : Math.abs(raw - stage.f) < 0.0004 ? raw : damp(stage.f, raw, 6, dt);
    const f = clamp(stage.f, 0, STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(f)), t = f - i;
    const aspect = size.width / size.height;
    poseOf(plan.shots[STOPS[i]], aspect, A); poseOf(plan.shots[STOPS[i + 1]], aspect, B);
    const key = `${STOPS[i]}>${STOPS[i + 1]}`, via = plan.vias[key];
    if (via && t > 0 && t < 1) {
      let cv = curves.current.get(key);
      if (!cv) {
        cv = {
          p: new THREE.CatmullRomCurve3([A.p.clone(), ...via.map((v) => v3(...v.p)), B.p.clone()], false, 'centripetal'),
          t: new THREE.CatmullRomCurve3([A.t.clone(), ...via.map((v) => v3(...v.t)), B.t.clone()], false, 'centripetal'),
        };
        curves.current.set(key, cv);
      }
      cv.p.getPoint(t, cam.position); cv.t.getPoint(t, tmp);
    } else { cam.position.lerpVectors(A.p, B.p, t); tmp.lerpVectors(A.t, B.t, t); }
    cam.up.lerpVectors(A.up, B.up, t).normalize();
    const s = sway.current; s.x = damp(s.x, s.tx, 3, dt); s.y = damp(s.y, s.ty, 3, dt);
    moving.current = Math.abs(raw - stage.f) > 0.0004 || Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) > 0.002 || stage.shake > 0.0005;
    if (moving.current) stage.wake = Math.max(stage.wake, 6);
    const reach = cam.position.distanceTo(tmp);
    tmp2.setFromMatrixColumn(cam.matrixWorld, 0); cam.position.addScaledVector(tmp2, s.x * reach * 0.02);
    cam.position.y += -s.y * reach * 0.011 + (stage.shake > 0.0005 ? Math.sin(state.clock.elapsedTime * 71) * stage.shake * reach * 0.012 : 0);
    cam.position.y = Math.max(cam.position.y, 0.07);
    cam.lookAt(tmp);
    cam.fov = lerp(A.fov, B.fov, t);
    const sx = lerp(A.sx, B.sx, t), sy = lerp(A.sy, B.sy, t);
    cam.setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
  }, -1);
  return null;
}

/* ───────── light ───────── */

function Key({ cx, low }: { cx: number; low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fffaf2', 1.85);
    l.position.set(cx - 9, 13, -6.5); l.target.position.set(cx, 0, 0);
    l.castShadow = true; l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.035; l.shadow.radius = low ? 3 : 5;
    const c = l.shadow.camera; c.left = -17; c.right = 17; c.top = 12; c.bottom = -12; c.near = 2; c.far = 60; c.updateProjectionMatrix();
    return l;
  }, [cx, low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

/** Soft dark where things meet the paper (after drei's ContactShadows), redrawn only when something moved. */
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
    if (stage.dirty <= 0) return;
    stage.dirty--;
    gl.shadowMap.needsUpdate = true;
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

/** Frames are drawn only while something is happening. */
function Pump() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = -1;
    const poke = () => { stage.wake = Math.max(stage.wake, 45); };
    const tick = () => {
      if (scroll.y !== last) { last = scroll.y; stage.wake = Math.max(stage.wake, 30); }
      if (stage.cmds.length || !stage.opened) stage.wake = Math.max(stage.wake, 10);
      if (stage.wake > 0) { stage.wake--; invalidate(); }
    };
    stage.wake = Math.max(stage.wake, 180); stage.dirty = 4;
    gsap.ticker.add(tick);
    const evs = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'resize', 'focus'] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => { gsap.ticker.remove(tick); evs.forEach((e) => window.removeEventListener(e, poke)); };
  }, [invalidate]);
  return null;
}

export default function Stage({ plan }: { plan: Plan }) {
  const M = useMemo(makeMaterials, []);
  useEffect(() => () => { [M.ink, M.red, M.paper].forEach((m) => m.dispose()); M.textures.forEach((t) => t.dispose()); }, [M]);
  const low = plan.phone;
  const cx = (plan.x0 + plan.x1 + 8) / 2;
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]} camera={{ fov: 15, near: 0.04, far: 500, position: [0, 3, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.02; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
    >
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 70, 300]} />
      <hemisphereLight args={['#ffffff', '#e4e0d6', 0.9]} />
      <Key cx={cx} low={low} />
      <directionalLight position={[cx + 6, 7, 14]} intensity={2.2} color="#fbfaff" />
      {/* A cool rim from behind. */}
      <directionalLight position={[cx + 4, 6, -14]} intensity={1.1} color="#dfe8ff" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#3f3b34']} />
        <Lightformer form="rect" intensity={3.4} color="#fffaf0" position={[-6, 9, 3]} rotation-x={Math.PI / 2} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={2.0} color="#fffaf0" position={[4, 9, 7]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={4.2} color="#fff6ea" position={[-12, 4, 6]} rotation-y={Math.PI / 2.4} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#eef2ff" position={[12, 4, -2]} rotation-y={-Math.PI / 2} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#f6f2ea" position={[0, 4, 16]} rotation-y={Math.PI} scale={[22, 5, 1]} />
        <Lightformer form="rect" intensity={0.85} color="#efe9dc" position={[0, -2.5, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <Sweep zf={-15} material={M.paper} />
      <Suspense fallback={null}>
        <Physics paused gravity={[0, -GRAV, 0]}>
          <TheSet plan={plan} M={M} low={low} />
        </Physics>
      </Suspense>
      <Contact x={cx} z={0} w={low ? 24 : 34} h={18} res={low ? 512 : 1024} far={2.6} blur={low ? 1.5 : 2.1} opacity={0.62} color="#231b12" />
      <Rig plan={plan} still={false} />
      <Pump />
    </Canvas>
  );
}
