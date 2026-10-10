// MakerChip Figure Studio — introduction page runtime.
// Hero: the real v11 part meshes from the Studio (app/assets), dressed up and swapped in place.
import * as THREE from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

const STOCK = 'app/assets/outfits-v11/';
const OUTFITS = [
  ['original', 'パーカー'], ['pocket-01', 'ポケットTシャツ', 'カーゴショーツ', 'スニーカー'],
  ['02-work-jacket', 'ワークジャケット'], ['03-varsity-jacket', 'スタジャン'], ['04-chef', 'コックコート'],
  ['05-tailored-suit', 'テーラードスーツ'], ['06-cable-knit', 'ケーブルニット'], ['07-sailor', 'セーラー'],
  ['08-tech-vest', 'テックベスト'], ['09-casual-shirt', 'カジュアルシャツ'], ['10-recruit-suit-men', 'リクルートスーツ(男性)'],
  ['11-recruit-suit-women', 'リクルートスーツ(女性)'], ['12-school-uniform-men', '学生服(男性)'], ['13-school-uniform-women', '学生服(女性)'],
  ['14-astronaut', '宇宙飛行士'], ['15-knight', '騎士'], ['16-pirate', '海賊'], ['17-festival-happi', 'お祭り法被'],
  ['18-dinosaur', '恐竜衣装'], ['19-clown', 'ピエロ'],
].map(([id, label, lower, shoes]) => ({id, label, lower: lower || label, shoes: shoes || label}));
const PALETTE = ['#eee9df', '#d8d4c9', '#6d7972', '#668598', '#cd8171', '#dda54f', '#444647'];
const CATEGORIES = {upper: ['upper-body'], lower: ['lower-body'], shoes: ['shoe-left', 'shoe-right']};
const HEAD = ['ring-front', 'ring-back', 'chip'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- data ----------
const cache = new Map();
function cached(key, load) {
  if (!cache.has(key)) cache.set(key, load().catch(e => { cache.delete(key); throw e; }));
  return cache.get(key);
}
async function fetchOk(url) { const r = await fetch(url); if (!r.ok) throw Error(`${url}: ${r.status}`); return r; }
function parseMesh(buffer) {
  const view = new DataView(buffer);
  if (new TextDecoder().decode(new Uint8Array(buffer, 0, 8)) !== 'MCMESH01') throw Error('invalid mesh');
  const nv = view.getUint32(8, true), nt = view.getUint32(12, true);
  const positions = new Float32Array(buffer.slice(16, 16 + nv * 12)), indices = new Uint32Array(buffer.slice(16 + nv * 12, 16 + nv * 12 + nt * 12));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  return g;
}
const mesh = (url, creased) => cached(url, async () => {
  let g = parseMesh(await (await fetchOk(url)).arrayBuffer());
  if (creased) { const smooth = toCreasedNormals(g, Math.PI / 4); g.dispose(); g = smooth; } else g.computeVertexNormals();
  return g;
});
const manifest = outfit => cached(outfit, async () => {
  const url = new URL(`${STOCK}${outfit}/r01/manifest.json`, location.href);
  return {url, data: await (await fetchOk(url)).json()};
});
async function partGeometry(outfit, part) {
  const {url, data} = await manifest(outfit);
  return mesh(new URL(data.files.find(f => f.part === part).file, url).href, false);
}

// ---------- hero ----------
const stage = document.querySelector('#hero-stage');
const state = {upper: 'pocket-01', lower: 'pocket-01', shoes: 'pocket-01', colors: {upper: '#d8d4c9', lower: '#6d7972', shoes: '#eee9df', head: '#eee9df'}};

function setCaption() {
  const find = id => OUTFITS.find(o => o.id === id);
  for (const [c, text] of [['upper', find(state.upper).label], ['lower', find(state.lower).lower], ['shoes', find(state.shoes).shoes]]) {
    const el = document.querySelector(`[data-hero="${c}"]`); el.textContent = el.title = text;
  }
  const hex = ['upper', 'lower', 'shoes', 'head'].map(k => state.colors[k].slice(1)).join(',');
  document.querySelector('#hero-make').href = `app/#upper=${state.upper}&lower=${state.lower}&shoes=${state.shoes}&colors=${hex}`;
}

function createHero(canvasHost) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasHost.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
  camera.up.set(0, 0, 1);
  const target = new THREE.Vector3(0, 0, 48), direction = new THREE.Vector3(130, -190, 70).normalize();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x77766f, 2.6));
  for (const [color, intensity, p] of [[0xfffaf0, 3, [-90, -120, 160]], [0xe6edff, 2, [70, 40, 130]]]) {
    const l = new THREE.DirectionalLight(color, intensity); l.position.set(...p); scene.add(l);
  }
  const root = new THREE.Group(); scene.add(root);
  const meshes = new Map(), pops = new Map();
  let spin = -0.35, velocity = 0, dragging = null, visible = true, last = performance.now();

  function resize() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Fit the ~100 mm tall figure with margin, also on narrow portrait stages.
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), fit = Math.max(62 / vertical, 50 / (vertical * camera.aspect));
    camera.position.copy(target).addScaledVector(direction, fit); camera.lookAt(target); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvasHost); resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvasHost);

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', e => { dragging = {x: e.clientX, spin, t: performance.now()}; velocity = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const next = dragging.spin + (e.clientX - dragging.x) * 0.012, now = performance.now();
    velocity = (next - spin) / Math.max(16, now - dragging.t) * 16; dragging.t = now; spin = next;
  });
  const release = () => { dragging = null; };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

  renderer.setAnimationLoop(now => {
    const dt = Math.min(64, now - last); last = now;
    if (!visible) return;
    if (!dragging) { velocity *= 0.94; spin += velocity + (reduced.matches ? 0 : dt * 0.00028); }
    root.rotation.z = spin;
    for (const [m, start] of pops) {
      const t = Math.max(0, Math.min(1, (now - start) / 520)), k = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
      m.scale.setScalar(0.82 + 0.18 * k); m.position.z = (1 - k) * 10; m.material.opacity = Math.min(1, t * 2.5);
      if (t === 1) { m.material.transparent = false; pops.delete(m); }
    }
    renderer.render(scene, camera);
  });

  function put(id, geometry, color, delay = 0) {
    const old = meshes.get(id);
    if (old) { root.remove(old); old.material.dispose(); pops.delete(old); }
    const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color, roughness: 0.76, metalness: 0.02}));
    meshes.set(id, m); root.add(m);
    if (!reduced.matches) { m.material.transparent = true; m.material.opacity = 0; m.scale.setScalar(0.82); pops.set(m, performance.now() + delay); }
  }
  return {put, color(ids, hex) { for (const id of ids) meshes.get(id)?.material.color.set(hex); }};
}

let hero, busy = false;
async function dress(next, {stagger = true} = {}) {
  if (busy) return; busy = true; stage.dataset.loading = 'true';
  try {
    const changed = Object.keys(CATEGORIES).filter(c => next[c] !== undefined);
    const loaded = await Promise.all(changed.flatMap(c => CATEGORIES[c].map(async part => [c, part, await partGeometry(next[c], part)])));
    Object.assign(state, next, {colors: {...state.colors, ...next.colors}});
    loaded.forEach(([c, part, g]) => hero.put(part, g, state.colors[c], stagger ? ['upper', 'lower', 'shoes'].indexOf(c) * 110 : 0));
    hero.color(['ring-front', 'ring-back'], state.colors.head);
    setCaption(); stage.dataset.error = '';
  } catch (e) {
    console.error(e); stage.dataset.error = 'true';
  } finally { busy = false; stage.dataset.loading = ''; }
}
const pick = (list, not) => { const options = list.filter(x => x !== not); return options[Math.floor(Math.random() * options.length)]; };
function shuffle(only) {
  const next = {colors: {}};
  // Colors stay distinct across the three garments so a new outfit reads clearly.
  const used = new Set(Object.keys(CATEGORIES).filter(c => !(only || Object.keys(CATEGORIES)).includes(c)).map(c => state.colors[c]));
  for (const c of only || Object.keys(CATEGORIES)) {
    next[c] = pick(OUTFITS.map(o => o.id), state[c]);
    const color = pick(PALETTE.filter(h => !used.has(h)), state.colors[c]); next.colors[c] = color; used.add(color);
  }
  if (!only) next.colors.head = pick(PALETTE.slice(0, 2), null);
  return dress(next);
}

async function startHero() {
  try {
    hero = createHero(document.querySelector('#hero-canvas'));
  } catch (e) { stage.dataset.error = 'webgl'; return; }
  const headBase = `${STOCK}head-r01/`;
  try {
    const head = await Promise.all(HEAD.map(id => mesh(`${headBase}${id}.mesh`, true)));
    HEAD.forEach((id, i) => hero.put(id, head[i], id === 'chip' ? '#f7f4ee' : state.colors.head, 0));
  } catch (e) { console.error(e); stage.dataset.error = 'true'; }
  await dress({upper: state.upper, lower: state.lower, shoes: state.shoes}, {stagger: false});
  stage.dataset.ready = 'true';
}

document.querySelector('#hero-shuffle').addEventListener('click', () => shuffle());
document.querySelectorAll('[data-swap]').forEach(b => b.addEventListener('click', () => shuffle([b.dataset.swap])));
setCaption();
startHero();

// ---------- lineup ----------
const grid = document.querySelector('#lineup-grid');
grid.innerHTML = OUTFITS.map((o, i) => `<li><a class="look" href="app/#upper=${o.id}&lower=${o.id}&shoes=${o.id}"><span class="look-no">${String(i + 1).padStart(2, '0')}</span><img src="assets/lineup/${o.id}.webp" alt="${o.label}の上着・ボトムス・靴" loading="lazy" width="320" height="480"><span class="look-name">${o.label}</span><span class="look-go">この衣装で作る</span></a></li>`).join('');

// ---------- header ----------
const header = document.querySelector('.site-header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 8), {passive: true});
