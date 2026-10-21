import * as THREE from 'three';
import { Chess } from 'chess.js';
import { CONFIG as C } from './config.js';
const $ = id => document.getElementById(id);
const showErr = m => { const e = $('err'); e.style.display = 'block'; e.textContent = '⚠ ' + m; };
addEventListener('error', e => showErr(e.message));
addEventListener('unhandledrejection', e => showErr(String(e.reason)));

// ---------- state / timing ----------
let paused = false, lastLine = null;
const SPEED = +new URLSearchParams(location.search).get('speed') || 1; // testing only
const sleep = ms => new Promise(r => { let l = ms; (function t() { if (!paused) l -= 16 * SPEED; l <= 0 ? r() : setTimeout(t, 16); })(); });
const until = f => new Promise(r => (function t() { f() ? r() : setTimeout(t, 30); })());

// ---------- audio ----------
const A = { ctx: null, vol: .7, muted: false, step: 0, el: null, synth: null, cur: null };
A.init = () => {
  if (A.ctx) return;
  A.ctx = new (window.AudioContext || window.webkitAudioContext)();
  A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination); A.setVol();
  A.mg = A.ctx.createGain(); A.mg.gain.value = .3; A.mg.connect(A.master);
};
A.setVol = () => { if (A.master) A.master.gain.value = A.muted ? 0 : A.vol; if (A.trk?.el) A.trk.el.volume = (A.muted ? 0 : A.vol) * A.trk.lv; };
A.tone = (f, d, type = 'sine', g = .2, dest) => {
  if (!A.ctx) return; const o = A.ctx.createOscillator(), v = A.ctx.createGain(), t = A.ctx.currentTime;
  o.type = type; o.frequency.value = f; v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(v); v.connect(dest || A.master); o.start(t); o.stop(t + d);
};
A.sfx = n => {
  if (!A.ctx) return;
  const seq = { pop: [[660, .1]], whoosh: [[200, .15, 'triangle'], [400, .2, 'triangle']], buzz: [[110, .25, 'sawtooth', .15]],
    ding: [[880, .4], [1320, .5]], tada: [[523, .2], [659, .2], [784, .2], [1046, .6]], mwah: [[900, .08], [600, .12]], boo: [[300, .3, 'square', .08], [250, .4, 'square', .08]] }[n] || [];
  seq.forEach((s, i) => setTimeout(() => A.tone(s[0], s[1], s[2] || 'sine', s[3] || .2), i * 130));
};
const CH = [[220, 261, 329], [175, 220, 262], [262, 330, 392], [196, 247, 294]];
const fadeEl = (t, to, sec) => { const f = t.lv, st = performance.now(); const iv = setInterval(() => { const u = Math.min(1, (performance.now() - st) / (sec * 1000)); t.lv = f + (to - f) * u; if (t.el) t.el.volume = (A.muted ? 0 : A.vol) * t.lv; if (u >= 1) clearInterval(iv); }, 50); };
A.music = (file, ms = 330, alt = false, fadeS = 1.5) => { // crossfades: old track fades out, new one fades in
  A.init(); A.stopMusic(fadeS);
  const t = { g: A.ctx.createGain(), iv: null, el: null, lv: 0, step: 0 }; t.g.connect(A.master); t.g.gain.setValueAtTime(0, A.ctx.currentTime); t.g.gain.linearRampToValueAtTime(.3, A.ctx.currentTime + fadeS); A.trk = t;
  const synth = () => { if (t.iv) return; t.iv = setInterval(() => { if (paused) return; const ch = CH[(t.step >> 4) & 3], n = ch[t.step % 3] * (t.step % 8 > 5 ? 2 : 1) * (alt ? 1.5 : 1); A.tone(n, .5, 'triangle', .4, t.g); if (t.step % 4 === 0) A.tone(ch[0] / (alt ? 1.3 : 2), .6, 'sine', .5, t.g); t.step++; }, ms); };
  if (file) { const el = new Audio(file); el.loop = true; el.onerror = synth; t.el = el; el.volume = 0; el.play().catch(synth); fadeEl(t, 1, fadeS); } else synth();
};
A.stopMusic = (fadeS = 0) => { const t = A.trk; if (!t) return; A.trk = null; const f = Math.max(.05, fadeS), n = A.ctx.currentTime; t.g.gain.cancelScheduledValues(n); t.g.gain.setValueAtTime(t.g.gain.value, n); t.g.gain.linearRampToValueAtTime(0, n + f); if (t.el) fadeEl(t, 0, f); setTimeout(() => { clearInterval(t.iv); t.el?.pause(); }, f * 1000 + 300); };
A.sing = (notes, beat) => { A.init(); const t0 = A.ctx.currentTime + .05; let tot = 0; // temporary demo vocal: original arrangement of the public-domain tune
  notes.forEach(([f, b]) => { const d = b * beat, o = A.ctx.createOscillator(), v = A.ctx.createGain(), lp = A.ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 1300;
    v.gain.setValueAtTime(0, t0 + tot); v.gain.linearRampToValueAtTime(.1, t0 + tot + .06); v.gain.linearRampToValueAtTime(.001, t0 + tot + d * .96); o.connect(lp); lp.connect(v); v.connect(A.master); o.start(t0 + tot); o.stop(t0 + tot + d); tot += d; });
  return tot * 1000; };
const SONG = [[[392, .75], [392, .25], [440, 1], [392, 1], [523, 1], [494, 2]], [[392, .75], [392, .25], [440, 1], [392, 1], [587, 1], [523, 2]], [[392, .75], [392, .25], [784, 1], [659, 1], [523, 1], [494, 1], [440, 2]], [[698, .75], [698, .25], [659, 1], [523, 1], [587, 1], [523, 2]]];
A.cancelVoice = () => { speechSynthesis?.cancel(); if (A.cur) { A.cur.pause(); A.cur = null; } };
let VOICES = []; const loadV = () => VOICES = window.speechSynthesis?.getVoices() || []; window.speechSynthesis?.addEventListener?.('voiceschanged', loadV); loadV();
const pickVoice = who => { const en = VOICES.filter(v => /^en/i.test(v.lang)); return who === 'girl' ? en.find(v => /female|zira|samantha|aria|jenny|susan|hazel|victoria|karen|moira|tessa|fiona|google us english/i.test(v.name)) : en.find(v => /\bmale\b|david|mark|daniel|alex|fred|james|george/i.test(v.name)); };
A.speak = (text, who = 'girl', file = null, style = '') => new Promise(res => { if (SPEED > 1) return res(); // test-speed mode: skip real speech // never overlaps: cancels previous voice first
  A.cancelVoice(); let done = false; const fin = () => { if (!done) { done = true; res(); } };
  setTimeout(fin, text.length * 85 + 2500);
  if (file) { const a = new Audio(file); A.cur = a; a.volume = A.muted ? 0 : A.vol; a.onended = fin; a.onerror = () => { A.cur = null; A.speak(text, who).then(fin); }; a.play().catch(fin); return; }
  if (!window.speechSynthesis) return fin();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, '')); const vc = pickVoice(who); if (vc) u.voice = vc; const P = { sing: [.25, .6], soft: [-.05, .88], tease: [.1, 1.05] }[style] || [0, 1]; u.pitch = who === 'girl' ? (vc ? 1.3 : 1.7) + P[0] : .7; u.rate = P[1]; u.volume = A.muted ? 0 : A.vol;
  u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
});

// ---------- renderer / camera ----------
const low0 = navigator.maxTouchPoints > 0 && innerWidth < 900; let lowQ = low0;
const renderer = new THREE.WebGLRenderer({ antialias: !lowQ });
const setQ = () => { renderer.setPixelRatio(lowQ ? 1 : Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = !lowQ; sun.castShadow = !lowQ; $('bQ').textContent = lowQ ? 'LQ' : 'HQ'; };
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a1a22); scene.fog = new THREE.Fog(0x2a1a22, 14, 40);
const cam = new THREE.PerspectiveCamera(50, 1, .1, 100);
scene.add(new THREE.HemisphereLight(0xffe7c2, 0x4a2f45, .9));
const sun = new THREE.DirectionalLight(0xffd7a0, 1.4); sun.position.set(4, 8, 6); sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); scene.add(sun);
const T = { p: new THREE.Vector3(0, 3, 9), l: new THREE.Vector3(0, 1, 0) }, look = T.l.clone(), par = { x: 0, y: 0 };
cam.position.copy(T.p);
const shot = (px, py, pz, lx, ly, lz) => { T.p.set(px, py, pz); T.l.set(lx, ly, lz); };
addEventListener('pointermove', e => { par.x = e.clientX / innerWidth - .5; par.y = e.clientY / innerHeight - .5; });
const resize = () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent?.add(o); return o; };
const world = {}; const mk = n => (world[n] = new THREE.Group(), world[n].visible = false, scene.add(world[n]), world[n]);
const show = n => Object.entries(world).forEach(([k, g]) => g.visible = k === n);
const floor = (g, c = 0xf1e2c8) => { const f = mesh(new THREE.PlaneGeometry(40, 40), M(c), 0, 0, 0, g); f.rotation.x = -Math.PI / 2; };
const lights = (g, n = 14) => { for (let i = 0; i < n; i++) { const x = -7 + i, y = 4.2 - Math.sin(i / 13 * Math.PI) * -.0 - Math.sin(i * .9) * .2; mesh(new THREE.SphereGeometry(.08), new THREE.MeshBasicMaterial({ color: 0xffd98a }), x, y, -4, g); } };

// ---------- characters (procedural rigs) ----------
function makeChar(h, skin, shirt, pants, hair, long) {
  const k = h / 1.8, root = new THREE.Group(); root.rotation.order = 'YXZ'; const body = new THREE.Group(); root.add(body); body.scale.setScalar(k);
  const sk = M(skin), c = {};
  const leg = x => { const p = new THREE.Group(); p.position.set(x, .9, 0); body.add(p); mesh(new THREE.CylinderGeometry(.09, .08, .9), M(pants), 0, -.45, 0, p); mesh(new THREE.BoxGeometry(.16, .08, .28), M(0xf5f0e6), 0, -.9, .05, p); return p; };
  c.legL = leg(-.1); c.legR = leg(.1);
  mesh(new THREE.BoxGeometry(.46, .6, .24), M(shirt), 0, 1.2, 0, body);
  const arm = x => { const p = new THREE.Group(); p.position.set(x, 1.46, 0); body.add(p); mesh(new THREE.CylinderGeometry(.065, .055, .6), M(shirt), 0, -.28, 0, p); mesh(new THREE.SphereGeometry(.06), sk, 0, -.6, 0, p); return p; };
  c.armL = arm(-.29); c.armR = arm(.29);
  c.head = new THREE.Group(); c.head.position.y = 1.5; body.add(c.head);
  mesh(new THREE.SphereGeometry(.17, 20, 16), sk, 0, .17, 0, c.head);
  mesh(new THREE.SphereGeometry(.18, 20, 12, 0, 6.3, 0, 1.45), M(hair), 0, .19, -.01, c.head);
  if (long) for (let i = 0; i < 8; i++) { const a = -2.4 + i * .68; mesh(new THREE.SphereGeometry(.07, 8, 8), M(hair), Math.sin(a) * .17, .06 + (i % 2) * .05, -Math.cos(a) * .12 - .02, c.head); }
  [-.06, .06].forEach(x => mesh(new THREE.SphereGeometry(.02), M(0x111111), x, .2, .16, c.head));
  c.mouth = mesh(new THREE.BoxGeometry(.05, .015, .01), M(0x7a2a2a), 0, .09, .165, c.head);
  c.root = root; c.p = { hy: 0, hx: 0, alx: 0, alz: -.1, arx: 0, arz: .1, ry: 0, lean: 0, sm: 1, tw: 0 }; c.t = { ...c.p };
  c.tgt = null; c.amp = 1; c.talk = false; c.dance = false; c.endFace = null; c.k = k;
  return c;
}
const pose = (c, o) => Object.assign(c.t, o);
const idle = c => pose(c, { hy: 0, hx: 0, alx: 0, alz: -.1, arx: 0, arz: .1, lean: 0, sm: 1 });
const go = (c, x, z, face = null) => { c.tgt = [x, z]; c.endFace = face; };
const arrived = c => !c.tgt;
const angD = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function animChar(c, dt, t) {
  const p = c.p, q = c.t, e = Math.min(1, dt * 7); let walking = false;
  for (const k in q) if (k !== 'ry') p[k] += (q[k] - p[k]) * e;
  if (c.tgt) { const dx = c.tgt[0] - c.root.position.x, dz = c.tgt[1] - c.root.position.z, d = Math.hypot(dx, dz);
    if (d < .05) { c.tgt = null; if (c.endFace !== null) q.ry = c.endFace; } else { walking = true; const s = Math.min(d, 1.3 * c.k * dt); c.root.position.x += dx / d * s; c.root.position.z += dz / d * s; q.ry = Math.atan2(dx, dz); } }
  p.ry += angD(p.ry, q.ry) * Math.min(1, dt * 6);
  const w = walking ? Math.sin(t * 8) * .6 : 0, d = c.dance ? Math.sin(t * 5) * c.amp : 0;
  c.legL.rotation.x = w + d * .3; c.legR.rotation.x = -w - d * .3;
  c.head.rotation.set(p.hx + (c.talk ? Math.sin(t * 9) * .04 : 0), p.hy + d * .15, d * .1);
  c.armL.rotation.set(p.alx + (walking ? -w * .5 : 0) + (c.dance ? d * .5 : 0), 0, p.alz); c.armR.rotation.set(p.arx + (walking ? w * .5 : 0) - (c.dance ? d * .5 : 0), 0, p.arz);
  c.root.rotation.y = p.ry + p.tw; c.root.rotation.x = p.lean; c.root.rotation.z = c.dance ? d * .06 : 0;
  c.root.position.y = (walking ? Math.abs(Math.sin(t * 8)) * .03 : 0) + (c.dance ? Math.abs(d) * .06 : 0);
  c.mouth.scale.set(p.sm, c.talk ? 1 + Math.abs(Math.sin(t * 14)) * 3 : 1, 1);
}
const mkGirl = (h = 1.5) => makeChar(h, 0xc69063, 0xb98aa8, 0x3d4a66, 0x3a2418, true);
const mkOsb = () => makeChar(1.97, 0x8a5a3c, 0x8b6a4f, 0x2e3a52, 0x1a1210, false);

// ---------- dialogue ----------
const sub = $('sub'), NAME = { girl: 'Her', osb: 'Osborne' };
async function say(who, text, ms, chars = {}, voice = null, style = '') {
  lastLine = [who, text, voice]; sub.innerHTML = `<b>${NAME[who]}:</b> ${text}`; sub.style.opacity = 1;
  const c = chars[who]; if (c) c.talk = true;
  await Promise.all([sleep(ms || Math.max(1800, text.length * 65)), A.speak(text, who, voice || C.voiceFiles?.[text] || null, style)]);
  if (c) c.talk = false; sub.style.opacity = 0; await sleep(300);
}
async function singLine(i, text) { lastLine = ['girl', text, null]; sub.innerHTML = `<b>♪</b> ${text}`; sub.style.opacity = 1; girl.talk = true; const ms = A.sing(SONG[i], .62);
  await Promise.all([sleep(ms + 500), A.speak(text, 'girl', C.audio.song?.[i] || null, 'sing')]); girl.talk = false; sub.style.opacity = 0; await sleep(350); }
const chat = async (txt, ms = 3800) => { const e = $('chat'); e.textContent = txt; e.classList.add('on'); A.sfx('pop'); await sleep(ms); e.classList.remove('on'); };
const fade = async v => { $('fade').style.opacity = v; await sleep(1000); };
const btn = (txt, f) => new Promise(r => { const b = $('next'); b.textContent = txt; b.style.display = 'block'; b.onclick = () => { b.style.display = 'none'; f?.(); r(); }; });

// ---------- worlds ----------
const chars = [], ro = mk('room'), en = mk('env'), me = mk('mem'), ch = mk('chess'), ed = mk('end');
// room
floor(ro); const wall = mesh(new THREE.BoxGeometry(24, 8, .2), M(0x6b4561), 0, 4, -4.3, ro); lights(ro);
const table = mesh(new THREE.CylinderGeometry(1.5, 1.5, .08, 32), M(0x4a2f25), 0, .75, .2, ro); mesh(new THREE.CylinderGeometry(.12, .2, .75), M(0x4a2f25), 0, .37, .2, ro);
const cake = new THREE.Group(); cake.position.set(0, .8, .2); ro.add(cake);
[[.55, .22, 0xf6ecd9], [.4, .2, 0xe3b565]].forEach((l, i) => mesh(new THREE.CylinderGeometry(l[0], l[0], l[1], 32), M(l[2]), 0, l[1] / 2 + i * .22, 0, cake));
const slice = mesh(new THREE.BoxGeometry(.22, .1, .22), M(0xf3d9a0), .25, .46, .1, cake);
const flames = [-.15, 0, .15].map(x => { mesh(new THREE.CylinderGeometry(.015, .015, .14), M(0xffffff), x, .52, 0, cake); return mesh(new THREE.SphereGeometry(.03), new THREE.MeshBasicMaterial({ color: 0xffb040 }), x, .62, 0, cake); });
const cl = new THREE.PointLight(0xffa860, 1.2, 6); cl.position.set(0, 1.7, .4); ro.add(cl);
for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(.35), M([0xe3b565, 0x6b4561, 0xf6ecd9, 0xb98aa8][i], { roughness: .3 }), -4.5 + i * .6, 2.4 + (i % 2) * .3, -3, ro);
const girl = mkGirl(), osb = mkOsb(); ro.add(girl.root, osb.root); chars.push(girl, osb);
// envelope
floor(en, 0x5a3a2e); const envG = new THREE.Group(); envG.position.set(0, 1.4, 0); en.add(envG);
const eBody = mesh(new THREE.BoxGeometry(3, 2, .06), M(0xf6ecd9), 0, 0, 0, envG);
const flapPivot = new THREE.Group(); flapPivot.position.set(0, 1, .04); envG.add(flapPivot);
const fs = new THREE.Shape(); fs.moveTo(-1.5, 0); fs.lineTo(1.5, 0); fs.lineTo(0, -1.1); fs.closePath();
const flap = new THREE.Mesh(new THREE.ShapeGeometry(fs), M(0xe8d5b5, { side: THREE.DoubleSide })); flap.castShadow = true; flapPivot.add(flap);
const seal = mesh(new THREE.CircleGeometry(.18, 24), M(0x8a2f3a), 0, -.9, .02, flapPivot);
function letterTex(text) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 700; const x = cv.getContext('2d'); x.fillStyle = '#fbf3e0'; x.fillRect(0, 0, 512, 700);
  x.fillStyle = '#4a2f25'; x.font = '26px "Segoe Script","Bradley Hand",cursive'; let y = 70; text.split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w => { if (x.measureText(line + w).width > 440) { x.fillText(line, 36, y); y += 36; line = ''; } line += w + ' '; }); x.fillText(line, 36, y); y += 36; }); return new THREE.CanvasTexture(cv); }
const letter = mesh(new THREE.PlaneGeometry(2.4, 3.27), new THREE.MeshStandardMaterial({ map: letterTex(C.letter.text) }), 0, 0, -.02, envG); letter.scale.setScalar(.6);
{ const l = new THREE.PointLight(0xffd7a0, 1, 12); l.position.set(0, 3, 4); en.add(l); }
// memories
const memItems = []; const ml = new THREE.TextureLoader();
function ph(txt, col) { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 400, 300); g.addColorStop(0, col); g.addColorStop(1, '#e3b565'); x.fillStyle = g; x.fillRect(0, 0, 400, 300); x.fillStyle = '#fff'; x.font = '90px serif'; x.textAlign = 'center'; x.fillText(txt, 200, 190); return new THREE.CanvasTexture(cv); }
let loaded = 0;
C.memories.forEach((m, i) => {
  const g = new THREE.Group(); g.position.set(...m.pos); g.userData = { m, base: g.position.clone(), i }; me.add(g);
  let body; const mat = [];
  if (m.type === 'image' || m.type === 'video') {
    const t = ph(m.type === 'video' ? '▶' : '📷', '#6b4561'); const pm = new THREE.MeshBasicMaterial({ map: t, transparent: true }); mat.push(pm);
    if (m.type === 'image' && m.src) ml.load(m.src, tx => { pm.map = tx; pm.needsUpdate = true; }, undefined, () => {});
    const fr = new THREE.MeshBasicMaterial({ color: 0xf6ecd9, transparent: true }); mat.push(fr);
    body = new THREE.Group(); body.add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.35), fr)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), pm); pl.position.set(0, .08, .01); body.add(pl);
  } else {
    const col = { star: 0xe3b565, note: 0xf3e3a0, piece: 0xf6ecd9, keepsake: 0xb98aa8 }[m.type]; const mm = M(col, { transparent: true, emissive: m.type === 'star' ? 0xe3b565 : 0, emissiveIntensity: .6 }); mat.push(mm);
    body = new THREE.Mesh({ star: new THREE.OctahedronGeometry(.35), note: new THREE.BoxGeometry(.6, .8, .02), piece: new THREE.CylinderGeometry(.12, .25, .7, 16), keepsake: new THREE.TorusKnotGeometry(.2, .07, 48, 8) }[m.type], mm);
  }
  g.add(body); g.userData.mat = mat; g.userData.body = body; memItems.push(g);
});
const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 }, () => (Math.random() - .5) * 14), 3)), new THREE.PointsMaterial({ color: 0xffd98a, size: .04 })); me.add(pts);
// chess world
const chess = new Chess(); let sel = null, busy = false, locked = true, step = 0; const pieceMap = {}, marks = [];
const sqPos = s => new THREE.Vector3(s.charCodeAt(0) - 97 - 3.5, .05, 3.5 - (+s[1] - 1));
const board = new THREE.Group(); ch.add(board); mesh(new THREE.BoxGeometry(9, .3, 9), M(0x3b2233), 0, -.15, 0, ch); floor(ch, 0x2e1b26); ch.children[ch.children.length - 1].position.y = -.3;
for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) { const s = String.fromCharCode(97 + f) + (r + 1), q = mesh(new THREE.BoxGeometry(1, .1, 1), M((f + r) % 2 ? 0xf1e2c8 : 0x7a5240), 0, 0, 0, board); q.position.copy(sqPos(s)); q.position.y = 0; q.userData.sq = s; }
const PR = { p: [[0, 0], [.3, 0], [.3, .07], [.2, .13], [.11, .3], [.17, .36], [.13, .44], [0, .46]], r: [[0, 0], [.34, 0], [.34, .08], [.24, .14], [.2, .5], [.3, .56], [.3, .72], [0, .72]], n: [[0, 0], [.34, 0], [.34, .08], [.24, .14], [.2, .45], [0, .45]], b: [[0, 0], [.32, 0], [.32, .08], [.2, .14], [.12, .5], [.2, .56], [.14, .78], [0, .86]], q: [[0, 0], [.36, 0], [.36, .08], [.24, .14], [.14, .7], [.28, .8], [.2, .94], [0, .96]], k: [[0, 0], [.36, 0], [.36, .08], [.24, .14], [.14, .7], [.28, .8], [.2, .94], [0, .94]] };
function makePiece(type, color) {
  const g = new THREE.Group(), m = M(color === 'w' ? 0xf6ecd9 : 0x3b2233, { roughness: .35, metalness: .1 });
  mesh(new THREE.LatheGeometry(PR[type].map(v => new THREE.Vector2(...v)), 20), m, 0, 0, 0, g);
  if (type === 'n') { const h = mesh(new THREE.BoxGeometry(.22, .45, .42), m, 0, .65, .06, g); h.rotation.x = -.35; mesh(new THREE.ConeGeometry(.05, .12, 6), m, 0, .92, -.1, g); mesh(new THREE.BoxGeometry(.2, .14, .2), m, 0, .72, .3, g); }
  if (type === 'r') for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(.1, .1, .1), m, Math.cos(i * 1.57) * .23, .77, Math.sin(i * 1.57) * .23, g);
  if (type === 'b') mesh(new THREE.SphereGeometry(.06), m, 0, .9, 0, g);
  if (type === 'q') mesh(new THREE.SphereGeometry(.09), m, 0, 1.02, 0, g);
  if (type === 'k') { mesh(new THREE.BoxGeometry(.08, .3, .08), m, 0, 1.08, 0, g); mesh(new THREE.BoxGeometry(.24, .08, .08), m, 0, 1.1, 0, g); }
  g.traverse(o => o.userData.piece = g); return g;
}
function sync() {
  Object.values(pieceMap).forEach(g => board.remove(g)); for (const k in pieceMap) delete pieceMap[k];
  chess.board().flat().forEach(c => { if (!c) return; const g = makePiece(c.type, c.color); g.position.copy(sqPos(c.square)); g.userData.sq = c.square; g.traverse(o => o.userData.sq = c.square); pieceMap[c.square] = g; board.add(g); });
}
const ring = (s, col, r = .46, tube = .04) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = Math.PI / 2; m.position.copy(sqPos(s)); m.position.y = .12; m.userData.s = s; board.add(m); marks.push(m); return m; };
const dot = (s, col = 0xe3b565) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .03, 16), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(sqPos(s)); m.position.y = .12; board.add(m); marks.push(m); };
const clearMarks = () => { marks.forEach(m => board.remove(m)); marks.length = 0; };
function refreshMarks() { clearMarks(); if (locked) return; if (sel) { ring(sel, 0xffffff); chess.moves({ square: sel, verbose: true }).forEach(m => dot(m.to, m.to === C.chess.player[step]?.[1] && sel === C.chess.player[step][0] ? 0xe3b565 : 0x9a8a80)); } else if (C.chess.player[step]) ring(C.chess.player[step][0], 0xe3b565); if (chess.inCheck()) { const k = chess.board().flat().find(c => c && c.type === 'k' && c.color === chess.turn()); if (k) ring(k.square, 0xd03030, .5); } }
async function slide(from, to) { const g = pieceMap[from], a = g.position.clone(), b = sqPos(to); A.sfx('pop'); for (let i = 1; i <= 20; i++) { g.position.lerpVectors(a, b, i / 20); g.position.y = Math.sin(i / 20 * Math.PI) * .5; await sleep(16); } }
const ray = new THREE.Raycaster(), pv = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', e => {
  pv.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(pv, cam);
  if (world.chess.visible) { if (locked || busy) return; const h = ray.intersectObjects(board.children, true).find(x => x.object.userData.sq); if (h) onSquare(h.object.userData.sq); }
  else if (world.env.visible && onEnv) { if (ray.intersectObjects(envG.children, true).length) onEnv(); }
  else if (world.mem.visible && onMem) { const h = ray.intersectObjects(memItems, true)[0]; if (h) { let o = h.object; while (o && !o.userData.m) o = o.parent; if (o) onMem(o); } }
});
let onEnv = null, onMem = null, onFin = null;
async function onSquare(sq) {
  const pc = chess.get(sq), exp = C.chess.player[step];
  if (sel) {
    if (sq === sel) { sel = null; refreshMarks(); return; }
    const legal = chess.moves({ square: sel, verbose: true }).some(m => m.to === sq);
    if (legal) { if (sel === exp[0] && sq === exp[1]) return play(sel, sq); A.sfx('buzz'); sel = null; refreshMarks(); return chat("That's legal, but not today's plan. Follow the gold marks. 😏", 2500); }
    if (pc && pc.color === 'w') { sel = sq; A.sfx('pop'); return refreshMarks(); }
    A.sfx('buzz'); sel = null; refreshMarks(); return chat('Illegal move!', 1500);
  }
  if (pc && pc.color === 'w' && chess.turn() === 'w') { sel = sq; A.sfx('pop'); refreshMarks(); }
}
async function play(from, to) {
  busy = true; sel = null; clearMarks(); const i = step; const cap = pieceMap[to];
  await slide(from, to); chess.move({ from, to }); if (cap) board.remove(cap); sync();
  if (chess.isCheckmate()) { locked = true; busy = false; return onFin?.(); }
  await chat(C.chess.messages[i], 4200);
  const bm = C.chess.black[i]; await slide(bm.slice(0, 2), bm.slice(2, 4));
  try { chess.move({ from: bm.slice(0, 2), to: bm.slice(2, 4) }); } catch (e) { showErr('Black reply was illegal: ' + bm); }
  sync(); step++; busy = false; refreshMarks();
}
const resetChess = () => { chess.reset(); step = 0; sel = null; busy = false; sync(); refreshMarks(); };
// ending world
floor(ed, 0x6b4561); mesh(new THREE.BoxGeometry(30, 10, .2), M(0x3b2540), 0, 5, -5, ed); lights(ed, 14); mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xf6ecd9 }), -4, 5, -4.7, ed);
{ const l = new THREE.PointLight(0xffc07a, 1.5, 14); l.position.set(0, 4, 3); ed.add(l); }
const eg = mkGirl(), eo = mkOsb(); ed.add(eg.root, eo.root); chars.push(eg, eo);

// ---------- scenes ----------
const E = { girl: girl, osb: osb };
async function opening() {
  show('room'); idle(girl); idle(osb); girl.root.position.set(-6, 0, -.9); osb.root.position.set(2.4, 0, -.9); osb.t.ry = osb.p.ry = 0;
  shot(0, 4.5, 11, 0, 1.4, 0); await sleep(2200); shot(-.5, 1.9, 6.5, 0, 1.2, 0);
  go(girl, -.9, -.9, 0); go(osb, 1.2, -.9, 0); await until(() => arrived(girl) && arrived(osb)); pose(girl, { sm: 1.6 });
  pose(osb, { hy: -.5 }); shot(0, 1.6, 5.2, 0, 1.2, 0);
  const O = C.opening, K = O.cake, log = n => console.info('[scene] ' + n); log('opening:A-cake');
  pose(girl, { hy: .1, sm: 1.8, alx: -.5, arx: -.5, alz: -.3, arz: .3 }); const st = say('girl', O.start, 2600, E, null, 'sing'); await sleep(1000);
  pose(osb, { ry: -.45, arx: -1.2, arz: .3, lean: .12, hy: -.5 }); await sleep(1200); slice.position.x = .4; await st;
  pose(girl, { hy: .7, hx: .1, arx: -1.5, arz: .1, alx: 0, alz: -.1, sm: .6 }); shot(.4, 1.9, 4, .3, 1.7, 0); await say(...K[0], E, null, 'tease');
  pose(osb, { arx: 0, arz: .1, ry: 0, lean: 0, hy: .3, hx: -.25, sm: 1.4 }); slice.position.x = .25; await say(...K[1], E);
  shot(.3, 2, 3, .6, 1.9, 0); pose(girl, { hx: .15, hy: .6, sm: .5 }); await say(...K[2], E, null, 'tease');
  pose(osb, { hx: 0, hy: 0, alz: .6, arz: -.6, alx: -.3, arx: -.3, sm: 2 }); await say(...K[3], E);
  idle(osb); pose(girl, { sm: 1.9, hx: -.1, hy: .3, arx: -.4, arz: .5, alx: -.4, alz: -.5 }); shot(-.5, 1.9, 6.5, 0, 1.2, 0); await say(...K[4], E, null, 'tease');
  log('opening:B-song'); idle(girl); idle(osb); go(girl, -.7, -1.5, Math.PI / 2); go(osb, .7, -1.5, -Math.PI / 2); await until(() => arrived(girl) && arrived(osb));
  shot(.2, 1.8, 3.8, 0, 1.2, -1.5); pose(girl, { alx: -.8, arx: -.8, alz: .35, arz: -.35, sm: 1.8 }); pose(osb, { sm: 2, hx: .15 }); girl.dance = osb.dance = true; girl.amp = .2; osb.amp = .12;
  await singLine(0, O.song[0]); await sleep(300); pose(osb, { hy: .25 }); await singLine(1, O.song[1]); await sleep(300);
  shot(.2, 1.6, 3, 0, 1.5, -1.5); pose(osb, { arx: -1, arz: -.1, hy: 0, hx: .3 }); await singLine(2, O.song[2]); await sleep(300);
  idle(osb); pose(osb, { sm: 2.2, alz: .4, arz: -.4, hx: .1 }); pose(girl, { alz: -.9, arz: .9, alx: -.5, arx: -.5 }); await singLine(3, O.song[3]);
  girl.dance = osb.dance = false; A.sfx('tada'); await sleep(900);
  log('opening:C-love'); idle(girl); go(girl, .2, -1.5, Math.PI / 2); await until(() => arrived(girl)); shot(.1, 1.65, 2.7, 0, 1.45, -1.5);
  pose(girl, { hx: -.4, sm: 1.8 }); pose(osb, { hx: .5, sm: 2 }); await say('girl', O.love[0], 2600, E, null, 'soft'); await sleep(500); await say('girl', O.love[1], 2600, E, null, 'soft'); await sleep(600);
  await say('girl', O.love[2], 2800, E, null, 'tease'); osb.t.ry = -.4; pose(osb, { hx: 0, hy: 0, sm: 2.4, arx: -.6 }); pose(girl, { hy: -.5, hx: 0, sm: 2.2 }); shot(.8, 1.8, 4.5, 0, 1.2, -.5); await sleep(900);
  go(osb, .45, -1, -.3); await until(() => arrived(osb)); pose(osb, { arx: -1.2, arz: .2, hx: .3 }); await sleep(900); A.sfx('pop'); slice.visible = false; await sleep(1500); idle(osb); idle(girl); log('opening:done'); await fade(1);
}
const skipHandler = async () => { if (!inOpening) return; const g = $('ghost'); A.init(); A.sfx('boo'); g.style.opacity = 1; g.style.left = '40%'; g.style.top = '30%'; g.style.transform = 'scale(2.5)';
  chat(C.ghostLine, 3000); A.speak(C.ghostLine.replace('👻', ''), 'osb'); await sleep(3200); g.style.left = 'calc(100% - 80px)'; g.style.top = '10px'; g.style.transform = 'scale(1)'; await sleep(1400); g.style.opacity = 0; };
let inOpening = false;
async function envelope() {
  show('env'); flapPivot.rotation.x = 0; letter.position.set(0, 0, -.02); letter.scale.setScalar(.6); envG.rotation.set(-.2, 0, 0);
  shot(0, 2.4, 6.5, 0, 1.4, 0); await fade(0); $('hint').textContent = 'Tap the envelope ✉️'; await new Promise(r => onEnv = r); onEnv = null; $('hint').textContent = '';
  A.sfx('whoosh'); shot(0, 1.5, 4, 0, 1.4, 0); await sleep(1300);
  for (let i = 0; i <= 30; i++) { flapPivot.rotation.x = -Math.PI * .97 * (i / 30); await sleep(20); } A.sfx('ding');
  const nar = A.speak(C.letter.text.replace(/\n+/g, ' '), 'girl', C.letter.voice);
  for (let i = 0; i <= 50; i++) { const u = i / 50; letter.position.set(0, u * 1.6, .1 + u * .5); letter.scale.setScalar(.6 + u * .9); await sleep(20); }
  shot(0, 3.1, 4.8, 0, 3, 0); lastLine = ['girl', C.letter.text.replace(/\n+/g, ' '), C.letter.voice]; await nar;
  await btn('Explore the memories →');
}
async function memories() {
  show('mem'); shot(0, .8, 7, 0, .8, 0); let focus = null; $('hint').textContent = 'Tap the floating things ✨';
  onMem = async o => {
    if (focus) return; const m = o.userData.m; focus = o; focusItem = o; A.sfx('whoosh');
    memItems.forEach(g => g.userData.mat.forEach(x => x.opacity = g === o ? 1 : .12)); $('next').style.display = 'none';
    const p = o.position; shot(p.x, p.y, p.z + 2.2, p.x, p.y, p.z);
    if (m.type === 'video') { await sleep(900); $('ovc').innerHTML = ''; const v = document.createElement('video'); v.controls = true; v.playsInline = true; v.src = m.src; v.onerror = () => { $('ovc').innerHTML = '<p>Video not found yet — add ' + m.src + '</p>'; }; $('ovc').appendChild(v); $('ov').style.display = 'flex'; $('hint').textContent = m.date + ' — ' + m.caption; }
    else if (m.caption) { sub.innerHTML = `<b>${m.date}</b><br>${m.caption}`; sub.style.opacity = 1; }
    if (m.hidden) { await sleep(700); A.sfx('ding'); chat(m.hidden, 4200); }
    await new Promise(r => { $('ovb').onclick = () => { $('ov').style.display = 'none'; $('ovc').innerHTML = ''; r(); }; if (m.type !== 'video') { $('next').style.display = 'block'; $('next').textContent = '← Back to the memories'; $('next').onclick = () => { $('next').style.display = 'none'; r(); }; } });
    sub.style.opacity = 0; memItems.forEach(g => g.userData.mat.forEach(x => x.opacity = 1)); shot(0, .8, 7, 0, .8, 0); focus = null; focusItem = null; $('hint').textContent = 'Tap the floating things ✨'; showNext();
  };
  const showNext = () => { const b = $('next'); b.textContent = '♟ Take the chess challenge'; b.style.display = 'block'; b.onclick = () => { b.style.display = 'none'; done(); }; };
  let done; const fin = new Promise(r => done = r); await sleep(3000); showNext(); await fin; onMem = null; $('hint').textContent = '';
}
async function chessScene() {
  show('chess'); resetChess(); locked = false; refreshMarks(); shot(0, 7, 8, 0, 0, .8); $('hint').textContent = 'You are White. Follow the gold marks.\nAny legal move is checked by a real chess engine.';
  const rs = document.createElement('button'); rs.textContent = '↺ Reset'; rs.onclick = () => { if (!locked) resetChess(); }; $('bar').prepend(rs);
  await new Promise(r => onFin = r); onFin = null; rs.remove(); $('hint').textContent = '';
  const king = pieceMap['e8'];
  if (!chess.isCheckmate()) { showErr('Position is not checkmate!'); return; }
  A.sfx('tada'); const kr = ring('e8', 0xd03030, .55, .07); shot(1.1, 1.8, -.4, .9, .5, -2.8); await sleep(1800);
  const bg = mkGirl(4.2); ch.add(bg.root); chars.push(bg); bg.root.position.set(7, 0, -3.5); idle(bg); const F = C.chess.finale;
  await chat(F[0], 1800); await chat(F[1], 2800); A.sfx('boo'); await chat(F[2], 1600);
  go(bg, 4.2, -3.5, -.6); shot(-1, 3.4, 3.5, 2, 2.4, -3.5); await until(() => arrived(bg));
  pose(bg, { sm: 2, hx: -.15, hy: .3, alz: -.9, arz: .9, alx: .2, arx: .2 }); bg.talk = false; await chat(F[3], 3300);
  A.sfx('tada'); await chat(F[4], 2200); bg.talk = true; await chat(F[5], 3800); bg.talk = false; A.speak(F[5], 'girl');
  await sleep(3500); locked = true;
}
async function ending() {
  show('end'); await fade(1); [eg, eo].forEach(idle); eg.root.position.set(-5, 0, 0); eo.root.position.set(5, 0, 0); eg.t.ry = eg.p.ry = Math.PI / 2; eo.t.ry = eo.p.ry = -Math.PI / 2; eg.dance = eo.dance = false;
  A.music(C.audio.music, 380); shot(0, 2, 7.5, 0, 1.1, 0); await fade(0);
  const D = C.ending, ch2 = { girl: eg, osb: eo };
  go(eg, -1.1, 0, Math.PI / 2); go(eo, 1.1, 0, -Math.PI / 2); await until(() => arrived(eg) && arrived(eo)); shot(0, 1.6, 4.8, 0, 1.2, 0);
  pose(eg, { alx: -.5, arx: -.5, alz: -.7, arz: .7, sm: 1.8 }); await say('girl', D[0][1], 1800, ch2);
  pose(eo, { alx: -1.3, arx: -1.3, alz: .5, arz: -.5, hy: 1, sm: .6 }); eo.t.ry = -Math.PI / 2 + .5; await say('osb', D[1][1], 1800, ch2);
  idle(eg); pose(eg, { hx: .5, sm: .5 }); eg.t.ry = Math.PI / 2 + 2.2; await sleep(900); await say('girl', D[2][1], 1500, ch2); go(eg, -1.6, .3, Math.PI * .9);
  await sleep(1000); eo.t.ry = -Math.PI / 2; idle(eo); pose(eo, { sm: 2, alz: -1.3, arz: 1.3, alx: -.3, arx: -.3 }); A.sfx('ding'); await say('osb', D[3][1], 1800, ch2);
  eg.t.ry = Math.PI / 2; pose(eg, { sm: 2, hx: 0 }); go(eg, -.75, 0, Math.PI / 2); await until(() => arrived(eg));
  pose(eg, { alx: -1.4, arx: -1.4, alz: .1, arz: -.1 }); A.sfx('whoosh'); await sleep(500); pose(eo, { lean: -.5 }); eo.root.position.x += .3; await sleep(1000); pose(eo, { lean: 0 });
  go(eg, -.38, 0, Math.PI / 2); await until(() => arrived(eg)); shot(.2, 1.5, 3.2, 0, 1.2, 0);
  pose(eg, { alx: -1.1, arx: -1.1, alz: .3, arz: -.3, hx: -.6 }); pose(eo, { alx: -.8, arx: -.8, alz: .55, arz: -.55, hx: .6, hy: 0 }); await sleep(1800);
  A.sfx('mwah'); eg.t.hx = -.9; eo.t.hx = .85; await sleep(1200); chat('❤️', 1200); const log = n => console.info('[scene] ' + n); log('ending:hug-done');
  log('ending:sweet'); shot(0, 1.7, 3.4, 0, 1.3, 0); eg.t.hx = -.5; eo.t.hx = .35; pose(eg, { sm: 1.4 }); pose(eo, { sm: 1.6 });
  for (let i = 4; i <= 9; i++) { if (i === 6) shot(.1, 1.65, 2.9, 0, 1.35, 0); if (i === 8) pose(eg, { arz: -.7, alz: -1.2 }); await say('girl', D[i][1], null, ch2, null, 'soft'); await sleep(550); }
  log('ending:ask'); eg.t.hx = 0; eo.t.hx = 0; idle(eg); idle(eo); go(eg, -.8, 0, Math.PI / 2); go(eo, .8, 0, -Math.PI / 2); await until(() => arrived(eg) && arrived(eo)); shot(0, 1.7, 5, 0, 1.2, 0);
  pose(eg, { sm: 2.2, arx: -.3, arz: .9, alz: -.9, alx: -.3, hx: -.2 }); await say('girl', D[10][1], null, ch2, null, 'tease');
  pose(eo, { hy: .9, hx: .15, arx: -2.5, arz: -.3, sm: 1.2, tw: .2 }); await sleep(1300); pose(eo, { hy: .2, tw: -.2 }); await sleep(900); idle(eo); pose(eo, { sm: 1.8, hx: .1 }); pose(eg, { sm: 2.4 });
  await say('osb', D[11][1], null, ch2); eg.talk = true; await sleep(900); eg.talk = false;
  log('ending:music-change'); A.stopMusic(1.6); await sleep(1700); A.music(C.audio.dance, 230, true, 2.5);
  log('ending:dance-start'); eg.dance = eo.dance = true; eg.amp = .7; eo.amp = .35; go(eg, -.5, 0, Math.PI / 2); go(eo, .5, 0, -Math.PI / 2);
  pose(eg, { alz: -.9, arz: .9, alx: -.6, arx: -.6, hx: -.2, sm: 2 }); pose(eo, { alz: .5, arz: -.5, alx: -.7, arx: -.7, hx: .2, sm: 1.8 });
  let orbit = null; const seg = async (ms, fn) => { fn?.(); await sleep(ms); };
  await seg(7000, () => shot(0, 2.2, 7.5, 0, 1.2, 0));
  await seg(7000, () => { shot(2.6, 1.5, 3.8, 0, 1.3, 0); eo.amp = .55; eg.talk = true; });
  await seg(8000, () => { eg.talk = false; shot(-3.2, .8, 5, 0, 1.1, 0); eo.amp = .75; });
  await seg(8000, () => { shot(0, 4.4, 5.2, 0, .9, 0); eg.t.tw = Math.PI * 2; eo.amp = .9; });
  await seg(16000, () => { eg.p.tw = eg.t.tw = 0; eo.amp = 1; eg.amp = 1; let tt = 0; orbit = setInterval(() => { if (paused) return; tt += .008; shot(Math.sin(tt) * 5.5, 2, Math.cos(tt) * 5.5, 0, 1.2, 0); }, 20); });
  await seg(7000, () => { clearInterval(orbit); shot(0, 2, 6.5, 0, 1.2, 0); });
  await seg(4000, () => { A.stopMusic(5); eg.amp = eo.amp = .5; });
  eg.dance = eo.dance = false; idle(eg); idle(eo); go(eg, -.6, 0, Math.PI / 2); go(eo, .6, 0, -Math.PI / 2); pose(eg, { sm: 1.8, hx: -.3 }); pose(eo, { sm: 1.8, hx: .3 }); await sleep(2000);
  log('ending:dance-end'); log('ending:curtain'); $('cl').classList.add('shut'); $('cr').classList.add('shut'); await sleep(3400); log('ending:curtain-closed');
  const F = $('final'), lines = C.finalMessage; F.innerHTML = lines.map(t => `<div class="fl">${t}</div>`).join('') + [[20, 30], [75, 20], [35, 70], [60, 65]].map(p => `<span class="sp" style="left:${p[0]}%;top:${p[1]}%;animation-delay:${p[0] / 30}s">✨</span>`).join('');
  A.speak(lines.join(' ').replace(/soooo/, 'so'), 'girl', null, 'soft');
  for (const el of F.querySelectorAll('.fl')) { el.classList.add('on'); await sleep(2800); } log('ending:final-shown'); A.sfx('ding'); await sleep(3500);
  $('replay').style.display = 'block'; $('replay').onclick = () => location.reload(); log('ending:replay-offered');
}

// ---------- boot ----------
let focusItem = null; const memFocus = () => focusItem;
let last = performance.now(), time = 0;
(function loop(n) { requestAnimationFrame(loop); const dt = Math.min(.05, (n - last) / 1000) * SPEED; last = n; if (!paused) time += dt;
  const d = paused ? 0 : dt; chars.forEach(c => { if (c.root.parent?.visible) animChar(c, d, time); });
  cam.position.lerp(T.p, d * 2.2); look.lerp(T.l, d * 2.5); cam.position.x += par.x * .004; cam.lookAt(look);
  flames.forEach((f, i) => f.scale.y = 1 + Math.sin(time * 9 + i) * .25); cl.intensity = 1.2 + Math.sin(time * 11) * .15;
  memItems.forEach(g => { const u = g.userData; if (g === memFocus()) return; g.position.y = u.base.y + Math.sin(time * .7 + u.i) * .15; u.body.rotation.y = Math.sin(time * .4 + u.i) * .35; if (u.m.type !== 'image' && u.m.type !== 'video') u.body.rotation.x += d; });
  pts.rotation.y = time * .02; marks.forEach(m => m.scale.setScalar(m.userData.s ? 1 + Math.sin(time * 5) * .06 : 1)); renderer.render(scene, cam); })(last);
$('bPause').onclick = () => { paused = !paused; $('bPause').textContent = paused ? '▶' : '⏸'; if (A.ctx) paused ? A.ctx.suspend() : A.ctx.resume(); paused ? speechSynthesis?.pause() : speechSynthesis?.resume(); A.cur && (paused ? A.cur.pause() : A.cur.play()); };
$('bMute').onclick = () => { A.muted = !A.muted; A.setVol(); $('bMute').textContent = A.muted ? '🔇' : '🔊'; };
$('vol').oninput = e => { A.vol = +e.target.value; A.setVol(); };
$('bReplay').onclick = () => { if (lastLine) A.speak(lastLine[1], lastLine[0], lastLine[2]); };
$('bQ').onclick = () => { lowQ = !lowQ; setQ(); };
$('bSkip').onclick = skipHandler;
setQ(); sync(); $('load').textContent = 'Ready ✔';
const QP = new URLSearchParams(location.search);
$('start').onclick = async () => {
  try { A.init(); A.ctx.resume(); $('cover').style.display = 'none'; A.music(C.audio.music);
    if (QP.get('start') === 'ending') { $('bSkip').style.display = 'none'; await ending(); return; }
    inOpening = true; await opening(); inOpening = false; $('bSkip').style.display = 'none'; if (QP.get('stop') === 'opening') return; await envelope(); await memories(); await chessScene(); await ending();
  } catch (e) { showErr(e.message || e); console.error(e); }
};
