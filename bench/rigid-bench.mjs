// RigidBodyWorld (v1.2) ベンチマーク — Node.js・描画なし・CPU 時間のみ。
// 使い方: node --expose-gc bench/rigid-bench.mjs [--json out.json] [--quick] [--counts 100,1000] [--scenes 1,2]
// ヒープ増加量は「フェーズ開始時に gc() → 終了時の heapUsed 差 ÷ ステップ数」の正味値（JIT 等の雑音を含むため目安）。ステップごとの確保が無いことの確認は gcEvents（GC 発生回数）も併せて見る。
// 注意: ここで出る数値は「この実行環境の Node/CPU」の値のみ。ブラウザ・GPU・SwiftShader の値とは混ぜない。
//       旧 PhysicsWorld は球のみ・回転なし・別モデルのため、同じ配置・同数・同重力での参考比較であり、機能同等の比較ではない。
import { RigidBodyWorld } from '../src/rigid/world.js';
import { PhysicsWorld } from '../src/physics.js';
import { rng, percentileOf } from '../src/util.js';
import { PerformanceObserver } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import os from 'node:os';

const args = process.argv.slice(2), quick = args.includes('--quick');
const arg = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const jsonOut = arg('--json'), COUNTS = (arg('--counts') || (quick ? '100,1000' : '100,1000,5000,10000')).split(',').map(Number), SCENES = (arg('--scenes') || '1,2,3,4,5').split(',').map(Number);
const DT = 1 / 60, gc = typeof globalThis.gc === 'function' ? globalThis.gc : null;
let gcCount = 0; try { new PerformanceObserver(l => { gcCount += l.getEntries().length; }).observe({ entryTypes: ['gc'] }); } catch { /* 未対応環境 */ }
const quat = (r) => { const x = r() - 0.5, y = r() - 0.5, z = r() - 0.5, w = r() - 0.5, l = Math.hypot(x, y, z, w) || 1; return [x / l, y / l, z / l, w / l]; };
const walls = (w, s) => { // 床と4枚の壁（平面）
  w.addBody({ type: 'static', shape: 'plane', normal: [0, 1, 0], offset: 0 });
  for (const [n, o] of [[[1, 0, 0], -s], [[-1, 0, 0], -s], [[0, 0, 1], -s], [[0, 0, -1], -s]]) w.addBody({ type: 'static', shape: 'plane', normal: n, offset: o });
};
const mkWorld = (o = {}) => new RigidBodyWorld(Object.assign({ onWarning: () => {} }, o));

/* ---- シーン ---- */
const SCENE = {
  1: { name: '散らばった球', build(n) { // 疎な球が落下
    const r = rng(11), s = Math.max(6, Math.cbrt(n) * 1.3), w = mkWorld(); walls(w, s);
    for (let i = 0; i < n; i++) w.addBody({ shape: 'sphere', radius: 0.25, position: [(r() * 2 - 1) * s * 0.95, 0.5 + r() * s * 1.2, (r() * 2 - 1) * s * 0.95] });
    return w; } },
  2: { name: '箱の積み上げ', build(n) { // 高さ 8 の塔を格子状に
    const w = mkWorld(), H = 8, towers = Math.ceil(n / H), cols = Math.ceil(Math.sqrt(towers)), sp = 1.8, ext = cols * sp / 2 + 3;
    w.addBody({ type: 'static', shape: 'box', halfExtents: [ext + 5, 0.5, ext + 5], position: [0, -0.5, 0] }); let k = 0;
    for (let t = 0; t < towers && k < n; t++) for (let h = 0; h < H && k < n; h++, k++) w.addBody({ shape: 'box', halfExtents: [0.5, 0.5, 0.5], position: [(t % cols - cols / 2) * sp, 0.5 + h * 1.0 + 0.001 * h, (Math.floor(t / cols) - cols / 2) * sp] });
    return w; } },
  3: { name: '群衆(密集)', build(n) { // 球とカプセルを狭い囲いに高密度で落とす
    const r = rng(33), s = Math.max(4, Math.sqrt(n) * 0.28), w = mkWorld(); walls(w, s);
    for (let i = 0; i < n; i++) w.addBody({ shape: i % 2 ? 'capsule' : 'sphere', radius: 0.22, halfLength: 0.2, position: [(r() * 2 - 1) * s * 0.9, 0.5 + (i / n) * 8 + r() * 0.3, (r() * 2 - 1) * s * 0.9], orientation: quat(r) });
    return w; } },
  4: { name: '静的環境+動的球', build(n) { // 静的箱の起伏の上に球を降らせる
    const r = rng(44), nS = Math.floor(n / 4), nD = n - nS, s = Math.max(8, Math.sqrt(nS) * 1.0), w = mkWorld(); walls(w, s);
    for (let i = 0; i < nS; i++) w.addBody({ type: 'static', shape: 'box', halfExtents: [0.5 + r() * 0.6, 0.2 + r() * 0.6, 0.5 + r() * 0.6], position: [(r() * 2 - 1) * s * 0.95, r() * 0.8, (r() * 2 - 1) * s * 0.95], orientation: quat(r) });
    for (let i = 0; i < nD; i++) w.addBody({ shape: 'sphere', radius: 0.25, position: [(r() * 2 - 1) * s * 0.9, 2 + r() * s * 0.6, (r() * 2 - 1) * s * 0.9] });
    return w; } },
  5: { name: '混在負荷', build(n) { // 3 形状・ランダム姿勢・静的10%・動く kinematic・高速弾
    const r = rng(55), s = Math.max(6, Math.cbrt(n) * 1.5), w = mkWorld(); walls(w, s);
    for (let i = 0; i < n; i++) { const t = i % 10 === 0 ? 'static' : 'dynamic', k = i % 3, p = [(r() * 2 - 1) * s * 0.95, (t === 'static' ? r() * 1.5 : 1 + r() * s), (r() * 2 - 1) * s * 0.95];
      w.addBody({ type: t, shape: ['sphere', 'box', 'capsule'][k], radius: 0.3, halfExtents: [0.3, 0.25, 0.35], halfLength: 0.3, position: p, orientation: quat(r), velocity: i % 50 === 0 ? [(r() - 0.5) * 80, 0, (r() - 0.5) * 80] : [0, 0, 0], ccd: i % 50 === 0 }); }
    for (let i = 0; i < Math.max(2, Math.floor(n / 500)); i++) w.addBody({ type: 'kinematic', shape: 'box', halfExtents: [1.5, 0.2, 1.5], position: [(r() * 2 - 1) * s * 0.7, 0.8, (r() * 2 - 1) * s * 0.7], velocity: [(r() - 0.5) * 2, 0, (r() - 0.5) * 2] });
    return w; } },
};

/* ---- 計測 ---- */
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function phase(w, steps) {
  const t = [], sums = { cand: 0, pairs: 0, pts: 0, sleep: 0, ccd: 0 }; const gc0 = gcCount; if (gc) gc(); const h0 = process.memoryUsage();
  for (let i = 0; i < steps; i++) {
    const a = performance.now(); w.step(DT); t.push(performance.now() - a);
    const s = w.stats; sums.cand += s.candidatePairs; sums.pairs += s.contactPairs; sums.pts += s.contactPoints; sums.ccd += s.ccdCount;
  }
  const h1 = process.memoryUsage(), s = w.getStats();
  return { steps, medianMs: +percentileOf(t, 0.5).toFixed(3), meanMs: +mean(t).toFixed(3), p95Ms: +percentileOf(t, 0.95).toFixed(3), p99Ms: +percentileOf(t, 0.99).toFixed(3), maxMs: +Math.max(...t).toFixed(3),
    candidatePairs: Math.round(sums.cand / steps), contactPairs: Math.round(sums.pairs / steps), contactPoints: Math.round(sums.pts / steps), ccdPerStep: +(sums.ccd / steps).toFixed(2), solverIterations: s.solverIterations,
    sleepingBodies: s.sleepingBodies, activeBodies: s.activeBodies, maxPenetration: +s.maxPenetration.toFixed(4), broadphase: s.broadphase,
    heapNetBytesPerStep: Math.round((h1.heapUsed - h0.heapUsed) / steps), gcEvents: gcCount - gc0, heapUsedMB: +(h1.heapUsed / 1048576).toFixed(1), arrayBuffersMB: +(h1.arrayBuffers / 1048576).toFixed(1), rssMB: +(h1.rss / 1048576).toFixed(1) };
}
function runScene(id, n) {
  if (gc) gc(); const m0 = process.memoryUsage(), tb = performance.now(); const w = SCENE[id].build(n); const buildMs = performance.now() - tb;
  const mAfter = process.memoryUsage();
  const warm = Math.min(10, n >= 5000 ? 3 : 10); for (let i = 0; i < warm; i++) w.step(DT);
  const active = phase(w, n >= 10000 ? 20 : n >= 5000 ? 30 : 60);
  // 後期（落ち着いた後）: 計測前に最大 600 ステップ進める（実時間 45 秒で打ち切り）。眠った数 sleepingBodies を必ず併記する
  let settleN = 0; const tS = performance.now(); while (settleN < 600 && performance.now() - tS < 45000) { w.step(DT); settleN++; }
  const settled = phase(w, n >= 10000 ? 20 : 60); settled.settleStepsBeforeMeasure = settleN;
  const r = { scene: id, sceneName: SCENE[id].name, bodies: w.bodyCount, buildMs: +buildMs.toFixed(1), buildHeapMB: +((mAfter.heapUsed - m0.heapUsed) / 1048576).toFixed(1), buildArrayBuffersMB: +((mAfter.arrayBuffers - m0.arrayBuffers) / 1048576).toFixed(2), active, settled };
  w.dispose(); return r;
}
/* 旧 PhysicsWorld（球のみ）。Scene1 / Scene3 相当の球配置・同重力・箱型境界。機能は同等ではない（回転・箱・カプセル・安定した積み上げ・スリープ・CCD なし）。 */
function runOld(id, n) {
  const r = rng(id === 1 ? 11 : 33), s = id === 1 ? Math.max(6, Math.cbrt(n) * 1.3) : Math.max(4, Math.sqrt(n) * 0.28);
  const w = new PhysicsWorld({ bounds: { min: [-s, 0, -s], max: [s, s * 3, s] }, maxSubSteps: 1, restitution: 0.3, friction: 0.2 }); w.reserve(n);
  for (let i = 0; i < n; i++) w.addBody(id === 1 ? { radius: 0.25, position: [(r() * 2 - 1) * s * 0.95, 0.5 + r() * s * 1.2, (r() * 2 - 1) * s * 0.95] } : { radius: 0.22, position: [(r() * 2 - 1) * s * 0.9, 0.5 + (i / n) * 8 + r() * 0.3, (r() * 2 - 1) * s * 0.9] });
  for (let i = 0; i < 10; i++) w.step(DT);
  const steps = n >= 10000 ? 20 : n >= 5000 ? 30 : 60, t = []; for (let i = 0; i < steps; i++) { const a = performance.now(); w.step(DT); t.push(performance.now() - a); }
  for (let i = 0; i < 600; i++) w.step(DT);
  const t2 = []; for (let i = 0; i < (n >= 10000 ? 20 : 60); i++) { const a = performance.now(); w.step(DT); t2.push(performance.now() - a); }
  const pk = a => ({ medianMs: +percentileOf(a, 0.5).toFixed(3), p95Ms: +percentileOf(a, 0.95).toFixed(3), p99Ms: +percentileOf(a, 0.99).toFixed(3), maxMs: +Math.max(...a).toFixed(3) });
  return { scene: id, bodies: n, active: pk(t), settled: pk(t2), candidatePairs: w.stats.candidatePairs };
}

const env = { node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, platform: os.platform(), gcExposed: !!gc, note: 'Node.js CPU 時間のみ。GPU/SwiftShader/ブラウザの値とは別物' };
console.log(`環境: Node ${env.node} / ${env.cpu} x${env.cores} / ${env.platform} / gc=${env.gcExposed}\n`);
const rows = [], old = [];
console.log('シーン'.padEnd(16), '物体'.padStart(6), '| 動作中 median/P95/P99/max ms'.padEnd(34), '候補'.padStart(8), '接触対'.padStart(7), '接触点'.padStart(7), '| 後期 median/P95/P99/max ms'.padEnd(34), '眠'.padStart(6), 'B/step(正味)'.padStart(8), 'GC'.padStart(3));
for (const id of SCENES) for (const n of COUNTS) {
  const r = runScene(id, n); rows.push(r); const a = r.active, b = r.settled;
  console.log(`S${id} ${r.sceneName}`.padEnd(16), String(r.bodies).padStart(6), `| ${a.medianMs}/${a.p95Ms}/${a.p99Ms}/${a.maxMs}`.padEnd(34), String(a.candidatePairs).padStart(8), String(a.contactPairs).padStart(7), String(a.contactPoints).padStart(7), `| ${b.medianMs}/${b.p95Ms}/${b.p99Ms}/${b.maxMs}`.padEnd(34), String(b.sleepingBodies).padStart(6), String(a.heapNetBytesPerStep).padStart(8), String(a.gcEvents).padStart(3));
}
console.log('\n旧 PhysicsWorld（球のみ・参考比較）');
for (const id of [1, 3]) if (SCENES.includes(id)) for (const n of COUNTS) { const o = runOld(id, n); old.push(o); console.log(`S${id}`.padEnd(6), String(n).padStart(6), `動作中 ${o.active.medianMs}/${o.active.p95Ms}/${o.active.p99Ms}/${o.active.maxMs}`.padEnd(40), `後期 ${o.settled.medianMs}/${o.settled.p95Ms}/${o.settled.p99Ms}/${o.settled.maxMs}`); }
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify({ env, version: '1.2.0', dt: DT, rigid: rows, oldPhysicsWorld: old }, null, 2)); console.log('\nJSON を保存:', jsonOut); }
