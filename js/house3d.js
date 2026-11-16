/* 3D-модель дома в конфигураторе. Геометрия — из Blender (tools/house.py → img/3d/*.glb),
   материалы и размеры подставляются здесь по параметрам конфигуратора. */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const BASE = { g1: [12.4, 9.6], f1: [12.4, 9.6], g15: [10.0, 7.8], g2: [8.8, 6.8] };
/* текстура: файл, метров на плитку, поворот, оттенок, шероховатость, металл */
const TEX = {
  plank:    ['planks', 1.6, 90, 0xE6B98A, .75, 0],
  imit:     ['siding', 1.6, 0, 0xFFE9CF, .8, 0],
  panel:    ['panel', 2.4, 0, 0xE8E2D6, .9, 0],
  char:     ['planks', 1.6, 90, 0x1c1a19, .95, 0],
  falz:     ['falz', 1.4, 0, 0x6F7672, .45, .55],
  tile:     ['tile', 1.5, 0, 0x8C7C78, .55, .3],
  soft:     ['soft', 1.4, 0, 0x6A5550, .9, 0],
  flat:     ['flat', 3.0, 0, 0x8A8E88, .85, 0],
  deck:     ['deck', 2.0, 0, 0xD9C4A8, .85, 0],
  concrete: ['concrete', 2.0, 0, 0xDAD5CB, .9, 0]
};

let renderer, scene, camera, controls, host, loader, texLoader, ground, current = null, wanted = null, cfgNow = null;
const cache = {}, texCache = {}, mats = {};
let needsFrame = true, targetFit = null;

function tex(key) {
  if (texCache[key]) return texCache[key];
  const [file, tile, rot] = TEX[key];
  const wait = [];
  const mk = (suf, srgb) => {
    let done; wait.push(new Promise(r => { done = r; }));
    const t = texLoader.load('img/tex/' + file + '-' + suf + '.jpg', () => { needsFrame = true; done(); }, undefined, () => done());
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile);
    t.rotation = rot * Math.PI / 180; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const e = { map: mk('c', true), normalMap: mk('n', false) }; e.ready = Promise.all(wait);
  return (texCache[key] = e);
}
function texMat(key) {
  const t = tex(key), s = TEX[key];
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: s[3], roughness: s[4], metalness: s[5], normalScale: new THREE.Vector2(.8, .8) });
  m.userData.ready = t.ready; return m;
}
function plain(color, roughness, metalness) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }

function buildMats() {
  mats.ROOF_EDGE = plain(0x2a2d2a, .45, .5); mats.TRIM = plain(0x1d201d, .5, .2); mats.FRAME = plain(0x1c1e1c, .35, .4);
  mats.SILL = plain(0x222422, .3, .6); mats.POST = plain(0x1f211f, .45, .5); mats.GUTTER = plain(0x2c2f2c, .3, .7);
  mats.DOOR = plain(0x3a2a1c, .5, 0); mats.INTERIOR = plain(0xd8d0c0, .9, 0); mats.FLOORIN = plain(0x8a6a48, .6, 0);
  mats.CABLE = plain(0xaaaaaa, .2, 1); mats.STEEL = plain(0x262626, .4, .8);
  mats.CASING = plain(0x1b1d1b, .4, .3); mats.SOFFIT = plain(0x6e4f34, .7, 0); mats.SKIRT = plain(0x1a1918, .8, 0);
  mats.INSILL = plain(0x6b6964, .5, 0); mats.TIMBER = plain(0x6b4a30, .65, 0); mats.METAL = plain(0x2e3230, .36, .75);
  mats.LAMP = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 2.2 });
  mats.GLASS = new THREE.MeshStandardMaterial({ color: 0x1b2427, roughness: .04, metalness: .95, envMapIntensity: 1.4 });
  mats.DECK = texMat('deck'); mats.CONCRETE = texMat('concrete');
}

export function mount(el) {
  host = el;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.environmentIntensity = .55;
  camera = new THREE.PerspectiveCamera(30, 1, .5, 400);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.minPolarAngle = .35; controls.maxPolarAngle = 1.45; controls.rotateSpeed = .7;
  controls.addEventListener('change', () => { needsFrame = true; });
  const hemi = new THREE.HemisphereLight(0xf4f1ea, 0x7a7466, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1df, 3.0);
  sun.position.set(-14, 22, 16); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
  scene.add(sun);
  ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .22 }));
  ground.receiveShadow = true; scene.add(ground);
  loader = new GLTFLoader(); texLoader = new THREE.TextureLoader();
  buildMats();
  new ResizeObserver(resize).observe(el); resize();
  renderer.setAnimationLoop(tick);
}

/* один кадр немедленно (для снимков и фоновых вкладок) */
export function frame() { if (targetFit) { camera.position.copy(targetFit.pos); controls.target.copy(targetFit.look); targetFit = null; } controls.update(); renderer.render(scene, camera); }

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needsFrame = true;
}

function tick() {
  if (controls.update()) needsFrame = true;
  if (targetFit) {  /* плавный переход камеры к новому размеру дома */
    camera.position.lerp(targetFit.pos, .12); controls.target.lerp(targetFit.look, .12);
    if (camera.position.distanceTo(targetFit.pos) < .02) targetFit = null;
    needsFrame = true;
  }
  if (needsFrame) { renderer.render(scene, camera); needsFrame = false; }
}

function shapeOf(c) { return c.floors === '1' ? (c.roof === 'flat' ? 'f1' : 'g1') : c.floors === '1.5' ? 'g15' : 'g2'; }

function load(shape) {
  if (cache[shape]) return Promise.resolve(cache[shape]);
  return new Promise((res, rej) => loader.load('img/3d/' + shape + '.glb', g => {
    const root = g.scene;
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const n = (o.material && o.material.name || '').replace(/\.\d+$/, '');
      o.userData.mat = n;
      if (mats[n]) o.material = mats[n];
    });
    cache[shape] = root; res(root);
  }, undefined, rej));
}

let facadeMat = {}, roofMat = {};
/* оттенок фасада как на фото проекта — пока фасад тот же, что в проекте */
const PTINT = { vyg: ['imit', 0xF7BE86], ladoga: ['plank', 0x7a5640] };
function facade(key) { return facadeMat[key] || (facadeMat[key] = texMat(key)); }
function roofM(key) { return roofMat[key] || (roofMat[key] = texMat(key)); }

/* pid — id проекта: тогда берём его собственную модель (img/3d/p_<id>.glb) без растяжения */
export async function update(c, geom, pid, scale) {
  cfgNow = c; const shape = pid ? 'p_' + pid : shapeOf(c); wanted = shape;
  const pt = pid && PTINT[pid] && PTINT[pid][0] === c.facade ? PTINT[pid] : null;
  const fm = pt ? (facadeMat['p_' + pid] || (facadeMat['p_' + pid] = Object.assign(texMat(c.facade), { color: new THREE.Color(pt[1]) }))) : facade(c.facade), rm = c.roof === 'falz' ? mats.METAL : roofM(c.roof === 'flat' ? 'flat' : c.roof);
  /* дом показываем, только когда загружены и модель, и её текстуры — без промежуточных «голых» кадров */
  const [root] = await Promise.all([load(shape), fm.userData.ready, rm.userData.ready, mats.DECK.userData.ready, mats.CONCRETE.userData.ready]);
  if (wanted !== shape || cfgNow !== c) return;
  if (current !== root) { if (current) scene.remove(current); scene.add(root); current = root; }
  root.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.mat === 'FACADE') o.material = fm;
    if (pid && o.name.indexOf('falz') === 0) o.visible = c.roof === 'falz';
    if (pid && /^ROOF_(TILE|SOFT)/.test(o.userData.mat)) o.material = c.roof === 'falz' ? mats.METAL : rm;
    if (o.userData.mat === 'ROOF') o.material = (o.name.indexOf('canopy') === 0 || o.name.indexOf('falz') === 0 || o.name.indexOf('main_roof') === 0) ? mats.METAL : rm;
  });
  const show = (name, v) => { const g = root.getObjectByName(name); if (g) g.visible = v; };
  show('grp_front_plain', !c.glass); show('grp_front_glass', !!c.glass);
  if (!pid) show('grp_found_piles', c.found === 'piles');
  if (!pid) show('grp_found_strip', c.found === 'strip'); show('grp_found_slab', c.found === 'slab');
  show('grp_terrace', c.terrace > 0); show('grp_falz', c.roof === 'falz');
  if (!pid) {
    const [bw, bd] = BASE[shape];
    root.scale.set(geom.w / bw, 1, geom.d / bd);
  } else root.scale.set(scale || 1, 1, scale || 1);   /* проект под другую площадь — шире/уже в плане, высота та же */
  const ter = !pid && root.getObjectByName('grp_terrace');
  if (ter && c.terrace > 0) { const len = Math.min(geom.d, Math.max(2.4, c.terrace / 3)); ter.scale.set(1, 1, len / geom.d); }
  /* камера: охватить дом целиком */
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const tf = Math.tan(camera.fov * Math.PI / 360);
  const dist = Math.max(size.y * .62 / tf, Math.max(size.x, size.z) * .62 / (tf * camera.aspect)) + Math.max(size.x, size.z) * .35;
  const dir = (current === root && camera.position.lengthSq() > 1) ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(-.6, .2, .78).normalize();
  const look = new THREE.Vector3(mid.x, mid.y * .92, mid.z);
  const pos = look.clone().add(dir.multiplyScalar(dist));
  if (camera.position.lengthSq() < 1) { camera.position.copy(pos); controls.target.copy(look); }
  else targetFit = { pos, look };
  controls.minDistance = dist * .55; controls.maxDistance = dist * 1.8;
  needsFrame = true;
}
