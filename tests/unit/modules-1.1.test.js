import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedTimestep, Interpolator } from '../../src/timestep.js';
import { Profiler, StatWindow } from '../../src/profiler.js';
import { Easing, Track, AnimationClip, Animator } from '../../src/animation.js';
import { ParticleSystem } from '../../src/particles.js';
import { InputManager } from '../../src/input.js';
import { AudioSystem } from '../../src/audio.js';
import { ResourceManager, parseOBJ, validateGeometry, mergeGeometries } from '../../src/resources.js';
import { DebugDraw } from '../../src/debug.js';
import { CollisionWorld } from '../../src/collision/index.js';
import { PhysicsWorld } from '../../src/physics.js';
import { Geometry } from '../../src/geometry.js';
import { Node, InstancedMesh } from '../../src/node.js';
import { Material } from '../../src/material.js';
import { Frustum, mat4 } from '../../src/math.js';
import { rng } from '../../src/util.js';

/* ---------- 固定タイムステップ ---------- */
test('FixedTimestep: 実時間の揺れに関わらず同じ総ステップ数・決定的な simTime', () => {
  const run = dts => { const t = new FixedTimestep({ fixedDt: 1 / 60, maxSubSteps: 100, maxFrameDt: 10 }); let calls = 0; for (const d of dts) t.update(d, () => calls++); return { calls, t }; };
  const a = run(Array(600).fill(1 / 60)), r = rng(5), jit = []; let sum = 0; while (sum < 10) { const d = 0.005 + r() * 0.04; jit.push(d); sum += d; }
  const b = run(jit);
  assert.ok(Math.abs(a.calls - 600) <= 1); assert.ok(Math.abs(b.calls - Math.floor(sum * 60)) <= 1);
  assert.equal(a.t.simTime, a.calls * (1 / 60));
});
test('FixedTimestep: maxSubSteps で死の螺旋を防ぎ、停止/再開/timeScale/コマ送り', () => {
  const t = new FixedTimestep({ fixedDt: 0.01, maxSubSteps: 3, maxFrameDt: 10 }); let n = 0;
  t.update(1, () => n++); assert.equal(n, 3); assert.ok(t.droppedTime > 0); assert.ok(t.alpha >= 0 && t.alpha < 1);
  t.pause(); n = 0; t.update(1, () => n++); assert.equal(n, 0); t.stepOnce(() => n++); assert.equal(n, 1); t.resume();
  t.reset(); t.setTimeScale(0.5); n = 0; t.update(0.04, () => n++); assert.equal(n, 2); t.setTimeScale(0); n = 0; t.update(1, () => n++); assert.equal(n, 0);
  assert.throws(() => t.setTimeScale(-1)); t.update(NaN, () => n++); assert.equal(n, 0);
  const c = new FixedTimestep({ fixedDt: 0.01, maxFrameDt: 0.055, maxSubSteps: 100 }); n = 0; c.update(100, () => n++); assert.equal(n, 5); assert.equal(c.clampedFrames, 1);
});
test('Interpolator: 位置の線形補間・四元数の最短経路球面補間', () => {
  const ip = new Interpolator(1, { rotations: true }); ip.capture(new Float32Array([0, 0, 0]), new Float32Array([0, 0, 0, 1])); ip.capture(new Float32Array([10, 0, 0]), new Float32Array([0, 0, 0, 1]));
  const out = new Float32Array(3); ip.lerp(out, 0.25); assert.ok(Math.abs(out[0] - 2.5) < 1e-6);
  const q = new Interpolator(1, { rotations: true }); const s = Math.SQRT1_2;
  q.capture(new Float32Array(3), new Float32Array([0, 0, 0, 1])); q.capture(new Float32Array(3), new Float32Array([0, -s, 0, -s])); // -q と q は同じ回転 → 最短経路
  const o = new Float32Array(4); q.slerp(o, 0.5); assert.ok(Math.abs(Math.hypot(...o) - 1) < 1e-5); assert.ok(Math.abs(o[3]) > 0.9, 'w が反転せず最短経路: ' + o);
});
test('PhysicsWorld: 同じ操作で同じ stateHash（決定性）、pause 中は進まない、interpolate は物理状態を変えない', () => {
  const mk = interp => { const w = new PhysicsWorld({ interpolate: interp, bounds: { min: [-20, 0, -20], max: [20, 40, 20] } }); const r = rng(9); for (let i = 0; i < 200; i++) w.addBody({ shape: 'sphere', radius: 0.5, position: [r() * 30 - 15, 5 + r() * 20, r() * 30 - 15], velocity: [r() - 0.5, 0, r() - 0.5] }); return w; };
  const a = mk(false), b = mk(false), c = mk(true);
  for (let f = 0; f < 120; f++) for (const w of [a, b, c]) w.advance(1 / 60);
  assert.equal(a.stateHash(), b.stateHash()); assert.equal(a.stateHash(), c.stateHash(), '補間の有無で物理状態が変わらない');
  const before = a.stateHash(); a.pause(); a.advance(1); assert.equal(a.stateHash(), before); a.resume(); a.advance(0.1); assert.notEqual(a.stateHash(), before);
});
/* ---------- プロファイラ ---------- */
test('StatWindow: 平均/中央値/P95/P99/最大が既知の値で一致', () => {
  const w = new StatWindow(200); for (let i = 1; i <= 100; i++) w.push(i);
  assert.equal(w.mean(), 50.5); assert.equal(w.median(), 50); assert.equal(w.percentile(0.95), 95); assert.equal(w.percentile(0.99), 99); assert.equal(w.max(), 100);
  const s = new StatWindow(4); for (let i = 1; i <= 10; i++) s.push(i); assert.equal(s.n, 4); assert.equal(s.min(), 7);
});
test('Profiler: 区間合算・gauge・unsupported は null で明示・CSV・比較', () => {
  const p = new Profiler({ historyFrames: 10 });
  for (let f = 0; f < 5; f++) { p.record('t', 2, { kind: 'time' }); p.record('t', 3, { kind: 'time' }); p.gauge('n', f); p.unsupported('gpu', '非対応'); p.endFrame(); }
  const s = p.snapshot(); assert.equal(s.t.median, 5); assert.equal(s.n.last, 4);
  assert.equal(s.gpu.supported, false); assert.equal(s.gpu.median, null); assert.equal(s.gpu.reason, '非対応');
  const csv = p.toCSV(); assert.match(csv, /^metric,unit,supported/); assert.match(csv, /gpu,ms,false/); assert.equal(p.historyCSV().trim().split('\n').length, 6);
  const cmp = Profiler.compare({ t: { supported: true, unit: 'ms', median: 10, p95: 12 } }, { t: { supported: true, unit: 'ms', median: 5, p95: 6 } }); assert.equal(cmp.t.medianRatio, 0.5);
  p.enabled = false; p.begin('x'); assert.equal(p.end('x'), 0);
});
/* ---------- アニメーション ---------- */
test('Animation: キーフレーム補間・イージング・四元数・イベント・ループ・状態遷移', () => {
  const node = new Node(); const events = [];
  const clip = new AnimationClip('c', { loop: 'once', tracks: [{ path: 'position', keys: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [10, 0, 0] }] }, { path: 'rotation', keys: [{ time: 0, value: [0, 0, 0, 1] }, { time: 1, value: [0, 1, 0, 0] }] }, { path: 'value:hp', keys: [{ time: 0, value: 0 }, { time: 1, value: 4, easing: 'easeIn' }] }], events: [{ time: 0.5, name: 'mid' }] });
  const an = new Animator(node); an.addClip(clip); an.on('event', e => events.push(e.name)); let fin = 0; an.on('finished', () => fin++);
  an.play('c'); an.update(0.5); assert.ok(Math.abs(node.position[0] - 5) < 1e-6); assert.deepEqual(events, ['mid']);
  const q = node.quaternion; assert.ok(Math.abs(Math.hypot(q[0], q[1], q[2], q[3]) - 1) < 1e-6); assert.ok(Math.abs(q[1] - Math.SQRT1_2) < 1e-6, '90度の半分=45度回転');
  an.update(0.6); assert.equal(node.position[0], 10); assert.equal(fin, 1); assert.equal(events.length, 1);
  assert.ok(Math.abs(an.values.hp - 4) < 1e-6);
  assert.ok(Math.abs(Easing.easeInOut(0.5) - 0.5) < 1e-12 && Easing.bounceOut(1) === 1 && Easing.elasticOut(1) === 1);
  assert.throws(() => new Track('position', [{ time: 0, value: [1, 2] }]));
  const rep = new AnimationClip('r', { loop: 'repeat', tracks: [{ path: 'position', keys: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [1, 0, 0] }] }], events: [{ time: 0.2, name: 'e' }] }); const a2 = new Animator(new Node()); const ev = []; a2.on('event', e => ev.push(e.name)); a2.addClip(rep); a2.play('r'); for (let i = 0; i < 30; i++) a2.update(0.1); assert.equal(ev.length, 3);
  const st = new Animator(new Node()); st.addClip(clip).addClip(rep); st.addState('idle', 'r').addState('act', 'c'); st.go('idle'); st.update(0.1); st.go('act', { fade: 0.2 }); for (let i = 0; i < 5; i++) st.update(0.1); assert.equal(st.currentState, 'act'); assert.throws(() => st.go('nope'));
});
/* ---------- パーティクル ---------- */
test('ParticleSystem: 1回の update で生存粒子が正しく 1 ステップだけ進む（寿命は dt ぶんだけ減る・位置が速度どおり）', () => {
  const ps = new ParticleSystem({ capacity: 10, seed: 1 }); ps.emit({ count: 3, life: 10, lifeJitter: 0, speed: 2, spread: 0, direction: [1, 0, 0] });
  const v = Array.from(ps.vx.slice(0, 3)); ps.update(0.5); assert.equal(ps.count, 3); for (let i = 0; i < 3; i++) { assert.ok(Math.abs(ps.life[i] - 9.5) < 1e-5); assert.ok(Math.abs(ps.px[i] - v[i] * 0.5) < 1e-5); }
  assert.equal(ps.mesh.matrices[12], ps.px[0]);
  ps.emit({ count: 2, life: 0.1, lifeJitter: 0 }); ps.update(0.2); assert.equal(ps.count, 3, '短命の 2 個だけが消える'); assert.equal(ps.stats().died, 2);
});
test('ParticleSystem: 容量上限・overflow・swap-remove で生存数が正確・決定的・再利用でも配列を増やさない', () => {
  const mk = () => new ParticleSystem({ capacity: 500, glow: true, gravity: [0, -9.8, 0], seed: 7 });
  const a = mk(), b = mk(); assert.equal(a.emit({ count: 800, life: 1 }), 500); assert.equal(a.stats().overflow, 300); b.emit({ count: 800, life: 1 });
  const buf = a.px; for (let f = 0; f < 30; f++) { a.update(0.05); b.update(0.05); }
  assert.deepEqual(Array.from(a.px.subarray(0, a.count)), Array.from(b.px.subarray(0, b.count)), '同じ seed で同じ結果');
  assert.ok(a.count < 500 && a.count === a.mesh.count); assert.equal(a.stats().spawned - a.stats().died, a.count);
  for (let f = 0; f < 60; f++) a.update(0.05); assert.equal(a.count, 0); assert.equal(a.px, buf);
  for (let r = 0; r < 20; r++) { a.emit({ count: 400, life: 0.2 }); a.update(0.3); } assert.equal(a.count, 0); assert.equal(a.stats().died, a.stats().spawned);
  assert.equal(a.material.blending, 'additive'); assert.equal(a.material.depthWrite, false); assert.equal(new ParticleSystem({ capacity: 4 }).material.blending, 'normal');
});
/* ---------- 入力 ---------- */
const ev = (type, props = {}) => Object.assign(new Event(type), props);
test('InputManager: キー/マウス/タッチ/アクション/軸/blur/dispose', () => {
  const key = new EventTarget(), el = new EventTarget(); el.getBoundingClientRect = () => ({ left: 10, top: 20 });
  const inp = new InputManager({ element: el, keyTarget: key });
  inp.bindAction('jump', ['key:Space', 'mouse:0']).bindAxis('mx', { negative: ['key:KeyA'], positive: ['key:KeyD'] });
  key.dispatchEvent(ev('keydown', { code: 'Space' })); key.dispatchEvent(ev('keydown', { code: 'Space' }));
  assert.ok(inp.actionPressed('jump') && inp.actionDown('jump')); inp.endFrame(); assert.ok(!inp.actionPressed('jump') && inp.actionDown('jump'));
  key.dispatchEvent(ev('keyup', { code: 'Space' })); assert.ok(inp.actionReleased('jump') && !inp.actionDown('jump')); inp.endFrame();
  key.dispatchEvent(ev('keydown', { code: 'KeyD' })); assert.equal(inp.axis('mx'), 1); key.dispatchEvent(ev('keydown', { code: 'KeyA' })); assert.equal(inp.axis('mx'), 0, '左右同時押しは打ち消し合う'); 
  el.dispatchEvent(ev('pointerdown', { pointerType: 'mouse', button: 0, clientX: 110, clientY: 70 })); assert.ok(inp.isMouseDown(0) && inp.mouse.x === 100 && inp.mouse.y === 50 && inp.actionDown('jump'));
  el.dispatchEvent(ev('pointermove', { pointerType: 'mouse', clientX: 120, clientY: 70, movementX: 7, movementY: -2 })); assert.equal(inp.mouse.dx, 7); inp.endFrame(); assert.equal(inp.mouse.dx, 0);
  el.dispatchEvent(ev('wheel', { deltaY: 120 })); assert.equal(inp.mouse.wheel, 120);
  el.dispatchEvent(ev('pointerdown', { pointerType: 'touch', pointerId: 3, clientX: 30, clientY: 40 })); assert.equal(inp.touchCount, 1); el.dispatchEvent(ev('pointerup', { pointerType: 'touch', pointerId: 3 })); assert.equal(inp.touchCount, 0);
  key.dispatchEvent(ev('keydown', { code: 'KeyW' })); key.dispatchEvent(ev('blur')); assert.ok(!inp.isKeyDown('KeyW') && !inp.isMouseDown(0), 'フォーカス喪失で押しっぱなし解除');
  assert.throws(() => { inp.bindAction('x', ['bogus:1']); inp.actionDown('x'); });
  inp.dispose(); key.dispatchEvent(ev('keydown', { code: 'KeyZ' })); assert.ok(!inp.isKeyDown('KeyZ'));
});
test('InputManager: ゲームパッド（デッドゾーン・ボタン押下エッジ）', () => {
  const g = { connected: true, id: 'fake', axes: [0.05, 0.8], buttons: [{ pressed: true }, { pressed: false }] }; globalThis.navigator ??= {}; const orig = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [g] }, configurable: true });
  try {
    const inp = new InputManager({ element: new EventTarget(), keyTarget: new EventTarget() }); inp.bindAction('fire', ['pad:button:0']).bindAxis('lx', { pad: 0 }).bindAxis('ly', { pad: 1 });
    inp.poll(); assert.ok(inp.actionPressed('fire')); assert.equal(inp.axis('lx'), 0); assert.equal(inp.axis('ly'), 0.8); inp.poll(); assert.ok(!inp.actionPressed('fire') && inp.actionDown('fire'));
  } finally { if (orig) Object.defineProperty(globalThis, 'navigator', orig); else delete globalThis.navigator; }
});
/* ---------- 音声（偽 AudioContext） ---------- */
function fakeCtx() {
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }); const node = () => ({ connect() {}, gain: param(), start() { this.started = true; }, stop() { this.stopped = true; if (this.onended) this.onended(); }, playbackRate: param() });
  return { state: 'running', currentTime: 0, destination: {}, listener: { positionX: param(), positionY: param(), positionZ: param(), forwardX: param(), forwardY: param(), forwardZ: param(), upX: param(), upY: param(), upZ: param() },
    createGain: node, createBufferSource: node, createPanner: () => Object.assign(node(), { positionX: param(), positionY: param(), positionZ: param() }), suspend() { this.state = 'suspended'; return Promise.resolve(); }, resume() { this.state = 'running'; return Promise.resolve(); }, close() { return Promise.resolve(); } };
}
test('AudioSystem: 音量バス・3D・同時発音上限・BGM・一時停止・非対応環境で例外なし', async () => {
  const a = new AudioSystem({ contextFactory: fakeCtx, maxVoices: 3 }); a.add('s', {}); a.add('m', {});
  assert.ok(a.supported); a.setVolume('sfx', 0.5); assert.equal(a.sfxBus.gain.value, 0.5); assert.throws(() => a.setVolume('x', 1));
  const v = a.play('s', { position: [1, 2, 3] }); assert.ok(v.panner); assert.equal(v.panner.positionX.value, 1); a.setPosition(v, [4, 5, 6]); assert.equal(v.panner.positionZ.value, 6);
  for (let i = 0; i < 5; i++) a.play('s'); assert.equal(a.voices.size, 3); assert.equal(a.stolen, 3);
  assert.equal(a.play('missing'), null); a.playMusic('m', { fade: 1 }); assert.ok(a.music); a.stopMusic(); assert.equal(a.music, null);
  await a.pause(); assert.equal(a.ctx.state, 'suspended'); assert.ok(a.paused); await a.resume(); assert.equal(a.ctx.state, 'running'); a.setListener([0, 0, 0]);
  a.dispose(); assert.equal(a.supported, false);
  const n = new AudioSystem(); assert.equal(n.supported, false); assert.equal(n.play('x'), null); assert.equal(await n.load('x', 'u'), null); n.setVolume('master', 0.3); n.pause(); n.dispose();
});
/* ---------- リソース ---------- */
test('parseOBJ: n角形の三角形化・負インデックス・頂点共有・不正入力', () => {
  const o = parseOBJ('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nvn 0 0 1\nf 1/1/1 2/2/1 3/3/1 4/4/1\nf -4 -3 -2\n');
  const g = new Geometry(o); assert.equal(g.triangleCount, 3); assert.deepEqual(validateGeometry(g), []); assert.equal(g.vertexCount, 7, 'v/vt/vn の組が違う頂点は別頂点（同じ組だけ共有）');
  assert.throws(() => parseOBJ('v 0 0 0\nf 1 2 3\n')); assert.throws(() => parseOBJ('# 空')); assert.throws(() => parseOBJ('v 0 0 0\nv 1 0 0\nf 1 2\n'));
  const bad = Geometry.box(1, 1, 1); bad.positions[0] = NaN; assert.ok(validateGeometry(bad).length > 0);
});
test('mergeGeometries: 頂点/三角形数の保存・変換・境界', () => {
  const b = Geometry.box(1, 1, 1), T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1];
  const m = mergeGeometries([b, b, b], [null, T, T]); assert.equal(m.triangleCount, 3 * b.triangleCount); assert.equal(m.vertexCount, 3 * b.vertexCount); assert.deepEqual(validateGeometry(m), []);
  assert.ok(Math.abs(m.bounds.max[0] - 5.5) < 1e-6 && Math.abs(m.bounds.min[0] + 0.5) < 1e-6);
});
test('ResourceManager: 同じ設定の Material を共有・読み込み中の重複排除・OBJ キャッシュ', async () => {
  const r = new ResourceManager(); assert.equal(r.material({ color: 0xff0000 }), r.material({ color: 0xff0000 })); assert.notEqual(r.material({ color: 0xff0000 }), r.material({ color: 0x00ff00 })); assert.notEqual(r.material({ color: 1 }), r.material({ color: 1, blending: 'additive' }));
  let hits = 0; const orig = globalThis.fetch; globalThis.fetch = async () => { hits++; await new Promise(r => setTimeout(r, 10)); return { ok: true, text: async () => 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n', json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(1) }; };
  try {
    const [g1, g2] = await Promise.all([r.loadOBJ('a.obj'), r.loadOBJ('a.obj')]); assert.equal(g1, g2); assert.equal(hits, 1); const g3 = await r.loadOBJ('a.obj'); assert.equal(g3, g1); assert.equal(hits, 1); assert.equal(r.refs('geometry:a.obj'), 3);
    await Promise.all([r.loadText('x'), r.loadText('x'), r.loadJSON('y')]); assert.equal(hits, 3); assert.ok(r.stats().dedupeHits >= 3);
    globalThis.fetch = async () => ({ ok: false, status: 404 }); await assert.rejects(() => r.loadText('nope'), /404/); assert.equal(r.stats().inflight, 0);
  } finally { globalThis.fetch = orig; }
});
/* ---------- デバッグ描画 ---------- */
test('DebugDraw: OFF では何も積まない・描かない／ON で形ごとの線数・背面クリップ', () => {
  const calls = { stroke: 0, moveTo: 0, clear: 0 }; const ctx = { clearRect() { calls.clear++; }, beginPath() {}, stroke() { calls.stroke++; }, moveTo() { calls.moveTo++; }, lineTo() {}, fillText() {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {}, set fillStyle(v) {} };
  const overlay = { width: 800, height: 600, getContext: () => ctx }; const cam = { viewProjection: mat4.create() }; const p = mat4.create(); mat4.perspective(p, 1, 800 / 600, 0.1, 100); const v = mat4.create(); mat4.translate ? mat4.translate(v, v, [0, 0, -10]) : (v[14] = -10); mat4.multiply(cam.viewProjection, p, v);
  const d = new DebugDraw({ overlay, camera: cam }); d.aabb([0, 0, 0], [1, 1, 1]); d.sphere(0, 0, 0, 1); assert.equal(d.n, 0); d.flush(); assert.equal(calls.moveTo, 0);
  d.enabled = true; d.aabb([0, 0, 0], [1, 1, 1]); assert.equal(d.n, 12); d.sphere(0, 0, 0, 1); assert.equal(d.n, 12 + 72); const n = d.flush(); assert.equal(n, 84); assert.equal(d.n, 0); assert.ok(calls.moveTo > 70);
  const before = calls.moveTo; d.line(0, 0, 20, 0, 0, 30, '#fff'); d.flush(); assert.equal(calls.moveTo, before, 'カメラ背後(+Z 側)の線は描かない');
  const w = new CollisionWorld(); w.addSphere({ position: [0, 0, 0], radius: 1 }); w.addAABB({ position: [3, 0, 0], halfExtents: [1, 1, 1] }); w.addOBB({ position: [6, 0, 0], halfExtents: [1, 1, 1] }); w.addCapsule({ position: [9, 0, 0], radius: 0.5, halfLength: 1 }); w.addPlane({ normal: [0, 1, 0], offset: -2 });
  d.collisionWorld(w); assert.ok(d.n > 150); d.enabled = false; d.flush(); assert.equal(d.n, 0);
});
/* ---------- 描画: 差分転送 ---------- */
test('InstancedMesh: 変更範囲だけを dirty にする（チャンクごとの dLo/dHi）', () => {
  const m = new InstancedMesh(Geometry.box(1, 1, 1), new Material(), { count: 100 }); const ch = m.chunks[0];
  ch.uploadDirty = false; m.setPositionAt(10, 1, 2, 3); assert.equal(ch.dLo, 10); assert.equal(ch.dHi, 11); m.setPositionAt(40, 1, 2, 3); assert.equal(ch.dLo, 10); assert.equal(ch.dHi, 41); m.setColorAt(5, 1, 0, 0); assert.equal(ch.dLo, 5);
  ch.uploadDirty = false; m.markInstancesDirty(20, 30); assert.equal(ch.dLo, 20); assert.equal(ch.dHi, 30); ch.uploadDirty = false; m.removeInstance ? m.removeInstance(0) : 0;
  const big = new InstancedMesh(Geometry.box(1, 1, 1), new Material(), { count: 3 * m.chunkSize }); for (const c of big.chunks) c.uploadDirty = false; big.markInstancesDirty(m.chunkSize - 2, m.chunkSize + 2);
  assert.ok(big.chunks[0].uploadDirty && big.chunks[1].uploadDirty && !big.chunks[2].uploadDirty); assert.equal(big.chunks[0].dLo, m.chunkSize - 2); assert.equal(big.chunks[0].dHi, m.chunkSize); assert.equal(big.chunks[1].dLo, 0); assert.equal(big.chunks[1].dHi, 2);
});
test('Material: blending は additive のみ有効、それ以外は normal', () => { assert.equal(new Material({ blending: 'additive' }).blending, 'additive'); assert.equal(new Material({ blending: 'xx' }).blending, 'normal'); assert.equal(new Material().clone().blending, 'normal'); assert.equal(new Material({ blending: 'additive' }).clone().blending, 'additive'); });
test('Frustum: 総当たり参照と一致（カリングに漏れ/誤除外がない）', () => {
  const f = new Frustum(), vp = mat4.create(), p = mat4.create(), v = mat4.create(); mat4.perspective(p, 1.0, 1.5, 0.5, 50); mat4.lookAt ? mat4.lookAt(v, [3, 4, 20], [0, 0, 0], [0, 1, 0]) : 0; mat4.multiply(vp, p, v); f.setFromMatrix(vp);
  const r = rng(3); let bad = 0, vis = 0;
  for (let i = 0; i < 20000; i++) {
    const c = [r() * 80 - 40, r() * 80 - 40, r() * 80 - 40], h = r() * 3 + 0.1, mn = c.map(x => x - h), mx = c.map(x => x + h); const got = f.intersectsAABB(mn, mx);
    // 参照: 8 隅の全てがいずれか同じ平面の外側 → 外。クリップ座標で判定（保守的な AABB-平面判定は「外」を言い過ぎない）
    let outside = false; for (const [sign, ax] of [[1, 0], [-1, 0], [1, 1], [-1, 1], [1, 2], [-1, 2]]) { let all = true; for (let k = 0; k < 8; k++) { const x = k & 1 ? mx[0] : mn[0], y = k & 2 ? mx[1] : mn[1], z = k & 4 ? mx[2] : mn[2]; const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15], cc = vp[ax] * x + vp[4 + ax] * y + vp[8 + ax] * z + vp[12 + ax]; if (!(sign * cc > w)) { all = false; break; } } if (all) { outside = true; break; } }
    let nearAll = true, farAll = true; for (let k = 0; k < 8; k++) { const x = k & 1 ? mx[0] : mn[0], y = k & 2 ? mx[1] : mn[1], z = k & 4 ? mx[2] : mn[2]; const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15], z2 = vp[2] * x + vp[6] * y + vp[10] * z + vp[14]; if (!(z2 < -w)) nearAll = false; if (!(z2 > w)) farAll = false; } if (nearAll || farAll) outside = true;
    if (outside && got) { /* 保守的判定は許容（外でも true は可） */ } if (!outside && !got) bad++; if (got) vis++;
  }
  assert.equal(bad, 0, '見えているものを誤って除外した数'); assert.ok(vis > 100);
});
