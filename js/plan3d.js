/* Сборка 3D-дома по обведённому контуру. Стены, проёмы, кровля и фундамент строятся здесь,
   окна и дверь с крыльцом — готовые детали из Blender (img/3d/kit.glb). */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const FL = 0.6, WALL = 0.28;
const TEX = {
  plank: ['planks', 1.6, 90, 0xE6B98A, .75, 0], imit: ['siding', 1.6, 0, 0xFFE9CF, .8, 0], panel: ['panel', 2.4, 0, 0xE8E2D6, .9, 0], char: ['planks', 1.6, 90, 0x1c1a19, .95, 0],
  tile: ['tile', 1.5, 0, 0x8C7C78, .55, .3], soft: ['soft', 1.4, 0, 0x6A5550, .9, 0], flat: ['flat', 3.0, 0, 0x8A8E88, .85, 0],
  concrete: ['concrete', 2.0, 0, 0xDAD5CB, .9, 0]
};
let R, scene, camera, controls, host, kit = null, house = null, texL, needs = true, fitTo = null, last = null;
const tcache = {}, M = {};

function tx(key) {
  if (tcache[key]) return tcache[key];
  const [f, tile, rot, color, rough, metal] = TEX[key];
  const mk = (suf, srgb) => { const t = texL.load('img/tex/' + f + '-' + suf + '.jpg', () => { needs = true; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.rotation = rot * Math.PI / 180; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return (tcache[key] = new THREE.MeshStandardMaterial({ map: mk('c', true), normalMap: mk('n', false), color, roughness: rough, metalness: metal, side: THREE.DoubleSide }));
}
const plain = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
function mats() {
  Object.assign(M, {
    ROOF_EDGE: plain(0x2a2d2a, .45, .5), TRIM: plain(0x1d201d, .5, .2), CASING: plain(0x1b1d1b, .4, .3), POST: plain(0x1f211f, .45, .5),
    GUTTER: plain(0x2c2f2c, .3, .7), SKIRT: plain(0x1a1918, .8, 0), METAL: plain(0x2e3230, .36, .75), INTERIOR: plain(0xd8d0c0, .9, 0),
    FRAME: plain(0x1c1e1c, .35, .4), SILL: plain(0x222422, .3, .6), DOOR: plain(0x3a2a1c, .5, 0), INSILL: plain(0x6b6964, .5, 0),
    TIMBER: plain(0x6b4a30, .65, 0), STEEL: plain(0x262626, .4, .8), SOFFIT: plain(0x6e4f34, .7, 0),
    GLASS: new THREE.MeshStandardMaterial({ color: 0x1b2427, roughness: .04, metalness: .95, envMapIntensity: 1.4 }),
    LAMP: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 2.2 })
  });
  M.INTERIOR.side = THREE.DoubleSide; M.ROOF = M.METAL;
}

export function mount(el) {
  host = el;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio)); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.AgXToneMapping; R.toneMappingExposure = 1.05; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(R.domElement);
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(R), .04).texture; scene.environmentIntensity = .55;
  camera = new THREE.PerspectiveCamera(30, 1, .5, 500);
  controls = new OrbitControls(camera, R.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, enablePan: false, minPolarAngle: .3, maxPolarAngle: 1.45, rotateSpeed: .7 });
  controls.addEventListener('change', () => { needs = true; });
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x7a7466, 1.0));
  const sun = new THREE.DirectionalLight(0xfff1df, 3.0); sun.position.set(-16, 24, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 }); scene.add(sun);
  const g = new THREE.Mesh(new THREE.CircleGeometry(50, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .22 }));
  g.receiveShadow = true; scene.add(g);
  texL = new THREE.TextureLoader(); mats();
  new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needs = true; }).observe(el);
  R.setAnimationLoop(() => {
    if (controls.update()) needs = true;
    if (fitTo) { camera.position.lerp(fitTo.pos, .12); controls.target.lerp(fitTo.look, .12); needs = true; if (camera.position.distanceTo(fitTo.pos) < .02) fitTo = null; }
    if (needs) { R.render(scene, camera); needs = false; }
  });
  return new Promise(res => new GLTFLoader().load('img/3d/kit.glb', gl => {
    kit = {};
    gl.scene.children.forEach(n => { kit[n.name] = n; n.traverse(o => { if (o.isMesh) { const mn = (o.material.name || '').replace(/\.\d+$/, ''); o.material = mn === 'DECK' ? deckMat() : mn === 'CONCRETE' ? tx('concrete') : (M[mn] || o.material); o.castShadow = o.receiveShadow = true; } }); });
    res(); if (last) update(last);
  }));
}
let _deck = null;
function deckMat() { if (_deck) return _deck; const t = texL.load('img/tex/deck-c.jpg', () => { needs = true; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.5, .5); t.colorSpace = THREE.SRGBColorSpace; return (_deck = new THREE.MeshStandardMaterial({ map: t, color: 0xD9C4A8, roughness: .85 })); }

/* ——— геометрия на плоскости ——— */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
function inside(p, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function offset(P, d, sign) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const e1 = sub(b, a), e2 = sub(c, b), l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
    const n1 = [sign * e1[1] / l1, -sign * e1[0] / l1], n2 = [sign * e2[1] / l2, -sign * e2[0] / l2];
    const k = 1 + n1[0] * n2[0] + n1[1] * n2[1], m = [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k];
    out.push([b[0] + m[0] * d, b[1] + m[1] * d]);
  }
  return out;
}
function clipHalf(P, axis, c, keepLess) {  /* Сазерленд — Ходжмен по прямой axis = c */
  const out = [], inS = p => keepLess ? p[axis] <= c + 1e-9 : p[axis] >= c - 1e-9;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = inS(a), ib = inS(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (c - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function intervals(P, axis, q) {   /* где прямая axis = q пересекает многоугольник (по другой оси) */
  const o = 1 - axis, xs = [];
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((a[axis] > q) !== (b[axis] > q)) xs.push(a[o] + (b[o] - a[o]) * (q - a[axis]) / (b[axis] - a[axis])); }
  xs.sort((x, y) => x - y); const r = []; for (let i = 0; i + 1 < xs.length; i += 2) r.push([xs[i], xs[i + 1]]); return r;
}

function meshFrom(pos, idx, uv, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function boxAt(grp, p, size, quatY, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...p); m.rotation.y = quatY || 0; m.castShadow = m.receiveShadow = true; grp.add(m); return m;
}
function tube(grp, a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; grp.add(m);
}

/* ——— сборка ——— */
export function update(md) {
  last = md; if (!kit || !scene) return null;
  if (house) { scene.remove(house); house.traverse(o => { if (o.geometry && !o.userData.kit) o.geometry.dispose(); }); }
  house = new THREE.Group(); scene.add(house);
  const P = md.pts, N = P.length, floors = md.floors, shape = md.roofShape;
  const eave = floors === '2' ? 6.1 : floors === '1.5' ? 4.0 : shape === 'flat' ? 3.3 : 3.0;
  const pitch = (shape === 'flat' ? 0 : shape === 'shed' ? 12 : floors === '1.5' ? 40 : floors === '2' ? 25 : 30) * Math.PI / 180, tp = Math.tan(pitch);
  const xs = P.map(p => p[0]), zs = P.map(p => p[1]);
  const bb = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const ridgeAxis = (bb.x1 - bb.x0) >= (bb.z1 - bb.z0) ? 0 : 1, perp = 1 - ridgeAxis;   /* конёк вдоль длинной стороны */
  const pc = perp === 1 ? (bb.z0 + bb.z1) / 2 : (bb.x0 + bb.x1) / 2, half = perp === 1 ? (bb.z1 - bb.z0) / 2 : (bb.x1 - bb.x0) / 2;
  const pmin = perp === 1 ? bb.z0 : bb.x0;
  const f0 = p => shape === 'flat' ? eave : shape === 'shed' ? eave + (p[perp] - pmin) * tp : eave + (half - Math.abs(p[perp] - pc)) * tp;
  /* наружная нормаль: проверяем по точке у середины первой стены */
  const e0 = sub(P[1], P[0]), l0 = Math.hypot(...e0), mid0 = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2];
  const sgn = inside([mid0[0] + e0[1] / l0 * .05, mid0[1] - e0[0] / l0 * .05], P) ? -1 : 1;
  /* Кровля по объёмам: контур режется на полосы вдоль конька, у каждого крыла свой двускатный объём */
  const ortho = P.every((p, k) => { const q = P[(k + 1) % N]; return Math.abs(p[0] - q[0]) < 1e-4 || Math.abs(p[1] - q[1]) < 1e-4; });
  let boxes = null;
  if (shape !== 'flat' && ortho) {
    const qs = [...new Set(P.map(p => +p[ridgeAxis].toFixed(4)))].sort((x, y) => x - y), strips = [];
    for (let k = 0; k + 1 < qs.length; k++) {
      const ints = intervals(P, ridgeAxis, (qs[k] + qs[k + 1]) / 2), lastS = strips[strips.length - 1];
      if (lastS && lastS.ints.length === ints.length && lastS.ints.every((v, j) => Math.abs(v[0] - ints[j][0]) < 1e-4 && Math.abs(v[1] - ints[j][1]) < 1e-4)) lastS.q1 = qs[k + 1];
      else strips.push({ q0: qs[k], q1: qs[k + 1], ints });
    }
    boxes = []; strips.forEach(st => st.ints.forEach(([a, b]) => boxes.push({ q0: st.q0, q1: st.q1, a, b, c: (a + b) / 2, hw: (b - a) / 2 })));
  }
  const prof = (bx, v) => shape === 'shed' ? eave + (bx.b - v) * tp : eave + (bx.hw - Math.abs(v - bx.c)) * tp;
  const findBox = q => boxes.find(bx => q[ridgeAxis] >= bx.q0 - 1e-6 && q[ridgeAxis] <= bx.q1 + 1e-6 && q[perp] >= bx.a - 1e-6 && q[perp] <= bx.b + 1e-6);
  const f = (p, inn) => { if (shape === 'flat') return eave; if (!boxes) return f0(p); const bx = (inn && findBox(inn)) || findBox(p); return bx ? prof(bx, p[perp]) : eave; };
  const facade = tx(md.facade), roofM = md.roofMat === 'falz' ? M.METAL : tx(shape === 'flat' ? 'flat' : md.roofMat);
  let nWin = 0, nDoor = 0, facadeArea = 0; const slats = [];

  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N], d = sub(b, a), L = Math.hypot(...d), u = [d[0] / L, d[1] / L], n = [sgn * u[1], -sgn * u[0]];
    const at = s => [a[0] + u[0] * s, a[1] + u[1] * s];
    /* верх стены: по концам и в точке пересечения конька */
    const inw = s_ => { const q = at(Math.min(L - .05, Math.max(.05, s_))); return [q[0] - n[0] * .05, q[1] - n[1] * .05]; };
    const hAt = s_ => f(at(s_), inw(s_));
    const top = [[L, hAt(L)], [0, hAt(0)]];
    if (shape === 'gable') {
      if (boxes) { const bx = findBox(inw(L / 2)); if (bx && Math.abs(u[perp]) > .9) { const sR = (bx.c - a[perp]) / (b[perp] - a[perp]) * L; if (sR > .05 && sR < L - .05) top.splice(1, 0, [sR, hAt(sR)]); } }
      else if ((a[perp] - pc) * (b[perp] - pc) < 0) { const sR = (pc - a[perp]) / (b[perp] - a[perp]) * L; top.splice(1, 0, [sR, hAt(sR)]); }
    }
    const sh = new THREE.Shape(); sh.moveTo(0, -.22); sh.lineTo(L, -.22); top.forEach(t => sh.lineTo(t[0], t[1])); sh.closePath();
    const hTop = s => { /* высота стены в точке s (кусочно-линейно) */ const ptsT = top.slice().reverse(); for (let k = 0; k + 1 < ptsT.length; k++) if (s >= ptsT[k][0] && s <= ptsT[k + 1][0]) return ptsT[k][1] + (ptsT[k + 1][1] - ptsT[k][1]) * (s - ptsT[k][0]) / (ptsT[k + 1][0] - ptsT[k][0]); return top[top.length - 1][1]; };
    const holes = [];
    const addHole = (s, y0, w, h, kind) => { if (y0 + h > hTop(s - w / 2) - .25 || y0 + h > hTop(s + w / 2) - .25) return false; const hp = new THREE.Path(); hp.moveTo(s - w / 2, y0); hp.lineTo(s - w / 2, y0 + h); hp.lineTo(s + w / 2, y0 + h); hp.lineTo(s + w / 2, y0); hp.closePath(); sh.holes.push(hp); holes.push({ s, y0, w, h, kind }); return true; };
    md.open.filter(o => o.e === i).forEach(o => {
      if (o.type === 'door') { if (addHole(o.s, 0, 1.0, 2.2, 'door')) nDoor++; }
      else { if (addHole(o.s, .9, 1.2, 1.5, 'win')) nWin++; if (floors === '2' && addHole(o.s, 3.95, 1.2, 1.5, 'win')) nWin++; }
    });
    /* окна во фронтоне мансарды: по два у конька */
    if (floors === '1.5' && top.length === 3) {
      const sR = top[1][0];
      [-.8, .8].forEach(dx => { if (sR + dx - .5 > .4 && sR + dx + .5 < L - .4 && addHole(sR + dx, 3.95, 1.0, 1.2, 'small')) nWin++; });
    }
    /* фасадная плоскость + внутренняя */
    const sg = new THREE.ShapeGeometry(sh), pa = sg.attributes.position, pos = [], posIn = [], uvs = [];
    for (let k = 0; k < pa.count; k++) {
      const s = pa.getX(k), y = pa.getY(k), p = at(s);
      pos.push(p[0], FL + y, p[1]); posIn.push(p[0] - n[0] * WALL, FL + y, p[1] - n[1] * WALL); uvs.push(s, y);
    }
    let idx = Array.from(sg.index.array);
    const test = meshFrom(pos, idx, uvs, facade); const nn = test.geometry.attributes.normal;
    if (nn.getX(0) * n[0] + nn.getZ(0) * n[1] < 0) { for (let k = 0; k < idx.length; k += 3) { const t = idx[k]; idx[k] = idx[k + 1]; idx[k + 1] = t; } test.geometry.setIndex(idx); test.geometry.computeVertexNormals(); }
    house.add(test); house.add(meshFrom(posIn, idx.slice(), null, M.INTERIOR)); sg.dispose();
    facadeArea += L * (top[0][1] + top[top.length - 1][1]) / 2 - holes.reduce((s, h) => s + h.w * h.h, 0);
    /* откосы проёмов, окна и двери из набора */
    const rot = Math.atan2(n[0], n[1]);
    holes.forEach(h => {
      const c = at(h.s), base = [c[0] - n[0] * WALL / 2, c[1] - n[1] * WALL / 2];
      [[-h.w / 2, h.y0 + h.h / 2, .02, h.h], [h.w / 2, h.y0 + h.h / 2, .02, h.h], [0, h.y0 + h.h, h.w, .02]].concat(h.kind === 'door' ? [] : [[0, h.y0, h.w, .02]]).forEach(r => {
        const m = boxAt(house, [base[0] + u[0] * r[0], FL + r[1], base[1] + u[1] * r[0]], [r[2], r[3], WALL], rot, facade);
      });
      const k = h.kind === 'door' ? kit.kit_door : h.kind === 'small' ? kit.kit_window_s : kit.kit_window;
      const o = k.clone(true); o.traverse(q => { q.userData.kit = true; });
      o.position.set(c[0], h.kind === 'door' ? 0 : FL + h.y0 + h.h / 2, c[1]); o.rotation.y = rot; house.add(o);
    });
    /* обвязка и угловая планка */
    boxAt(house, [(a[0] + b[0]) / 2 + n[0] * .02, FL + .11, (a[1] + b[1]) / 2 + n[1] * .02], [L + .04, .22, .04], rot, M.TRIM).rotation.y = Math.atan2(-u[1], u[0]);
    const pn = P[(i - 1 + N) % N], ep = sub(a, pn), lp = Math.hypot(...ep), np = [sgn * ep[1] / lp, -sgn * ep[0] / lp];
    const ha = Math.min(hAt(0), f(a, [a[0] - (n[0] + np[0]) * .05, a[1] - (n[1] + np[1]) * .05]));
    boxAt(house, [a[0] + (n[0] + np[0]) * .035, FL + ha / 2, a[1] + (n[1] + np[1]) * .035], [.1, ha, .1], Math.atan2(-u[1], u[0]), M.CASING);
    /* фундамент: цокольные рейки и сваи вдоль стены */
    if (md.found === 'piles') for (let s = .1; s < L; s += .15) { const p = at(s); slats.push([p[0] + n[0] * .03, p[1] + n[1] * .03, Math.atan2(-u[1], u[0])]); }
  }
  if (slats.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, FL - .1, .025), M.SKIRT, slats.length), o3 = new THREE.Object3D();
    slats.forEach((q, k) => { o3.position.set(q[0], (FL - .04) / 2, q[1]); o3.rotation.set(0, q[2], 0); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); });
    im.castShadow = true; house.add(im);
  }
  /* фундамент целиком */
  const shapeFrom = Q => { const s = new THREE.Shape(); Q.forEach((p, k) => k ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])); s.closePath(); return s; };
  const slab = (Q, y, h, mat) => { const g = new THREE.ExtrudeGeometry(shapeFrom(Q), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; house.add(m); return m; };
  if (md.found === 'strip') slab(P, 0, FL, tx('concrete'));
  if (md.found === 'slab') { slab(offset(P, .35, sgn), 0, .24, tx('concrete')); slab(P, .24, FL - .24, tx('concrete')); }
  if (md.found === 'piles') { const Q = offset(P, -.15, sgn); Q.forEach(p => tube(house, [p[0], 0, p[1]], [p[0], FL - .02, p[1]], .055, M.POST)); }
  slab(offset(P, -WALL, sgn), FL - .02, .03, M.INTERIOR);

  /* кровля */
  const ov = shape === 'flat' ? .15 : .5, O = offset(P, ov, sgn), t = .26, tc = shape === 'flat' ? 0 : t / Math.cos(pitch);
  let roofArea = 0;
  if (shape === 'flat') {
    slab(O, FL + eave, .45, M.ROOF_EDGE);
    const mem = slab(offset(P, -.05, sgn), FL + eave + .4, .06, roofM);
    const A = O.reduce((s, p, k) => s + p[0] * O[(k + 1) % O.length][1] - O[(k + 1) % O.length][0] * p[1], 0); roofArea = Math.abs(A) / 2 * 1.08;
  } else {
    if (boxes) roofArea = buildBoxes(); else {
    const pieces = shape === 'gable' ? [clipHalf(O, perp, pc, true), clipHalf(O, perp, pc, false)] : [O];
    const ribs = [];
    pieces.forEach(Q => {
      if (Q.length < 3) return;
      const tri = THREE.ShapeUtils.triangulateShape(Q.map(p => new THREE.Vector2(p[0], p[1])), []);
      const pos = [], uv = [], idxT = [], posB = [], idxS = [], posS = [];
      Q.forEach(p => { const y = FL + f(p); pos.push(p[0], y + tc, p[1]); posB.push(p[0], y, p[1]); uv.push(p[ridgeAxis], Math.abs(p[perp] - pc) / Math.cos(pitch)); });
      tri.forEach(tr => { idxT.push(tr[0], tr[1], tr[2]); });
      const top = meshFrom(pos, idxT, uv, roofM); const nt = top.geometry.attributes.normal; if (nt.getY(0) < 0) { for (let k = 0; k < idxT.length; k += 3) { const q = idxT[k]; idxT[k] = idxT[k + 1]; idxT[k + 1] = q; } top.geometry.setIndex(idxT); top.geometry.computeVertexNormals(); }
      house.add(top); house.add(meshFrom(posB, idxT.slice().reverse(), null, M.SOFFIT));
      /* торцы кровли (кромка) */
      for (let k = 0; k < Q.length; k++) {
        const a = Q[k], b = Q[(k + 1) % Q.length];
        if (shape === 'gable' && Math.abs(a[perp] - pc) < 1e-6 && Math.abs(b[perp] - pc) < 1e-6) continue;
        const ya = FL + f(a), yb = FL + f(b), base = posS.length / 3;
        posS.push(a[0], ya, a[1], b[0], yb, b[1], b[0], yb + tc, b[1], a[0], ya + tc, a[1]); idxS.push(base, base + 1, base + 2, base, base + 2, base + 3);
        /* водосток вдоль нижних кромок */
        const low = Math.abs(a[perp] - b[perp]) < 1e-6 && f(a) < eave + .01;
        if (low) {
          const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / L2 * sgn, nz = -(b[0] - a[0]) / L2 * sgn;
          tube(house, [a[0] + nx * .06, ya - .05, a[1] + nz * .06], [b[0] + nx * .06, yb - .05, b[1] + nz * .06], .075, M.GUTTER);
        }
      }
      const side = meshFrom(posS, idxS, null, M.ROOF_EDGE); side.material = M.ROOF_EDGE; side.material.side = THREE.DoubleSide; house.add(side);
      /* фальц: рёбра вдоль ската через каждые 0,5 м */
      const lo = Math.min(...Q.map(p => p[ridgeAxis])), hi = Math.max(...Q.map(p => p[ridgeAxis]));
      if (md.roofMat === 'falz') for (let q = lo + .25; q < hi; q += .5) intervals(Q, ridgeAxis, q).forEach(([p1, p2]) => ribs.push([q, p1, p2]));
      const A = Q.reduce((s, p, k) => s + p[0] * Q[(k + 1) % Q.length][1] - Q[(k + 1) % Q.length][0] * p[1], 0); roofArea += Math.abs(A) / 2 / Math.cos(pitch);
    });
    if (ribs.length) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.METAL, ribs.length), mx = new THREE.Matrix4(), dummy = new THREE.Vector3();
      ribs.forEach(([q, p1, p2], k) => {
        const A = [0, 0], B = [0, 0]; A[ridgeAxis] = q; B[ridgeAxis] = q; A[perp] = p1; B[perp] = p2;
        const va = new THREE.Vector3(A[0], FL + f(A) + tc + .017, A[1]), vb = new THREE.Vector3(B[0], FL + f(B) + tc + .017, B[1]);
        const dir = vb.clone().sub(va), len = dir.length(); dir.normalize();
        const along = new THREE.Vector3(ridgeAxis === 0 ? 1 : 0, 0, ridgeAxis === 1 ? 1 : 0), up = new THREE.Vector3().crossVectors(along, dir).normalize();
        if (up.y < 0) up.negate();
        const zA = new THREE.Vector3().crossVectors(dir, up);
        mx.makeBasis(dir.clone().multiplyScalar(len - .04), up.clone().multiplyScalar(.034), zA.multiplyScalar(.022)); mx.setPosition(dummy.copy(va).add(vb).multiplyScalar(.5));
        im.setMatrixAt(k, mx);
      });
      im.castShadow = true; house.add(im);
    }
    }
    if (shape === 'gable' && !boxes) intervals(O, perp, pc).forEach(([p1, p2]) => { const A = [0, 0], B = [0, 0]; A[perp] = B[perp] = pc; A[ridgeAxis] = p1; B[ridgeAxis] = p2; tube(house, [A[0], FL + eave + half * tp + tc + .05, A[1]], [B[0], FL + eave + half * tp + tc + .05, B[1]], .09, M.ROOF_EDGE); });
  }
  function buildBoxes() {
    const ovg = .45, V = (q, v, y) => { const r = [0, 0]; r[ridgeAxis] = q; r[perp] = v; return new THREE.Vector3(r[0], y, r[1]); };
    const ribs = []; let area = 0;
    const slabM = (q0, q1, v0, v1, y0, y1) => {   /* скат: от карниза v0 (низ, высота y0) к v1 (верх, y1) */
      const dv = v1 - v0, slope = Math.hypot(Math.abs(dv), y1 - y0), nrm = new THREE.Vector3(); nrm.copy(V(0, -(y1 - y0) * Math.sign(dv), 0)).setY(Math.abs(dv)).normalize();
      const off = nrm.clone().multiplyScalar(t), B = [V(q0, v0, y0), V(q1, v0, y0), V(q1, v1, y1), V(q0, v1, y1)], T = B.map(v => v.clone().add(off));
      const pos = [], idx = [], uv = [];
      T.forEach(v => pos.push(v.x, v.y, v.z)); [[0, 0], [q1 - q0, 0], [q1 - q0, slope], [0, slope]].forEach(w => uv.push(w[0], w[1]));
      idx.push(0, 1, 2, 0, 2, 3);
      let top = meshFrom(pos, idx, uv, roofM); if (top.geometry.attributes.normal.getY(0) < 0) { top.geometry.setIndex([0, 2, 1, 0, 3, 2]); top.geometry.computeVertexNormals(); } house.add(top);
      const sp = [], si = [];
      B.concat(T).forEach(v => sp.push(v.x, v.y, v.z));
      [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [0, 3, 2, 1]].forEach(f4 => si.push(f4[0], f4[1], f4[2], f4[0], f4[2], f4[3]));
      const sd = meshFrom(sp, si, null, M.ROOF_EDGE); M.ROOF_EDGE.side = THREE.DoubleSide; house.add(sd);
      area += (q1 - q0) * slope;
      if (md.roofMat === 'falz') for (let q = q0 + .25; q < q1; q += .5) ribs.push([V(q, v0, y0).add(off), V(q, v1, y1).add(off)]);
    };
    boxes.forEach(bx => {
      const q0 = bx.q0 - ovg, q1 = bx.q1 + ovg, ov = .5, yE = FL + eave - ov * tp;
      if (shape === 'gable') {
        const yR = FL + eave + bx.hw * tp;
        slabM(q0, q1, bx.a - ov, bx.c, yE, yR); slabM(q0, q1, bx.b + ov, bx.c, yE, yR);
        tube(house, V(q0, bx.c, yR + t / Math.cos(pitch) + .04).toArray(), V(q1, bx.c, yR + t / Math.cos(pitch) + .04).toArray(), .09, M.ROOF_EDGE);
        [bx.a - ov - .06, bx.b + ov + .06].forEach((v, k) => {
          tube(house, V(q0, v, yE - .06).toArray(), V(q1, v, yE - .06).toArray(), .075, M.GUTTER);
          const wv = k ? bx.b + .1 : bx.a - .1;
          [q0 + .35, q1 - .35].forEach(q => { const w2 = [0, 0]; w2[ridgeAxis] = q; w2[perp] = wv; if (inside(w2, P)) return;
            tube(house, V(q, v, yE - .06).toArray(), V(q, wv, yE - .5).toArray(), .045, M.GUTTER); tube(house, V(q, wv, yE - .5).toArray(), V(q, wv, .3).toArray(), .045, M.GUTTER); });
        });
      } else {
        slabM(q0, q1, bx.b + ov, bx.a - ov, yE, FL + eave + (bx.b - bx.a + ov) * tp);
        tube(house, V(q0, bx.b + ov + .06, yE - .06).toArray(), V(q1, bx.b + ov + .06, yE - .06).toArray(), .075, M.GUTTER);
      }
    });
    /* фронтоны на стыках крыльев разной высоты */
    boxes.forEach(A => boxes.forEach(Bx => {
      if (A === Bx || Math.abs(A.q1 - Bx.q0) > 1e-4 || A.b <= Bx.a || Bx.b <= A.a) return;
      const hi = A.hw >= Bx.hw ? A : Bx, lo = hi === A ? Bx : A, q = A.q1, dir = lo === Bx ? .02 : -.02;
      if (Math.abs(hi.hw - lo.hw) < 1e-4 && Math.abs(hi.a - lo.a) < 1e-4) return;
      const pk = shape === 'gable' ? [[hi.a, eave], [hi.c, eave + hi.hw * tp], [hi.b, eave]] : [[hi.a, eave], [hi.a, eave + (hi.b - hi.a) * tp], [hi.b, eave]];
      const pos = [], uv = []; pk.forEach(([v, y]) => { const w = V(q + dir, v, FL + y); pos.push(w.x, w.y, w.z); uv.push(v, y); });
      house.add(meshFrom(pos, [0, 1, 2], uv, facade));
    }));
    if (ribs.length) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.METAL, ribs.length), mx = new THREE.Matrix4();
      ribs.forEach(([va, vb], k) => {
        const dir = vb.clone().sub(va), len = dir.length(); dir.normalize();
        const along = new THREE.Vector3(ridgeAxis === 0 ? 1 : 0, 0, ridgeAxis === 1 ? 1 : 0), up = new THREE.Vector3().crossVectors(along, dir).normalize(); if (up.y < 0) up.negate();
        const z = new THREE.Vector3().crossVectors(dir, up);
        mx.makeBasis(dir.clone().multiplyScalar(len), up.clone().multiplyScalar(.034), z.multiplyScalar(.022)); mx.setPosition(va.clone().add(vb).multiplyScalar(.5).add(up.clone().multiplyScalar(.017)));
        im.setMatrixAt(k, mx);
      });
      im.castShadow = true; house.add(im);
    }
    return area;
  }
  /* камера */
  const box = new THREE.Box3().setFromObject(house), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const tf = Math.tan(camera.fov * Math.PI / 360);
  const dist = Math.max(size.y * .62 / tf, Math.max(size.x, size.z) * .62 / (tf * camera.aspect)) + Math.max(size.x, size.z) * .35;
  const dir = camera.position.lengthSq() > 1 ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(-.6, .2, .78).normalize();
  const look = new THREE.Vector3(mid.x, mid.y * .92, mid.z), pos = look.clone().add(dir.multiplyScalar(dist));
  if (camera.position.lengthSq() < 1) { camera.position.copy(pos); controls.target.copy(look); } else fitTo = { pos, look };
  controls.minDistance = dist * .5; controls.maxDistance = dist * 1.9; needs = true;
  return { win: nWin, door: nDoor, facade: facadeArea, roof: roofArea };
}

/* те же цифры, что строит 3D, без самого 3D (для телефона до нажатия кнопки) */
export { offset };
